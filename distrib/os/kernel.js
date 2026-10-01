"use strict";
/* ------------
     Kernel.ts

     Routines for the Operating System, NOT the host.

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */
var TSOS;
(function (TSOS) {
    class Kernel {
        //
        // OS Startup and Shutdown Routines
        //
        krnBootstrap() {
            TSOS.Control.hostLog("bootstrap", "host"); // Use hostLog because we ALWAYS want this, even if _Trace is off.
            // Initialize our global queues.
            _KernelInterruptQueue = new TSOS.Queue(); // A (currently) non-priority queue for interrupt requests (IRQs).
            _KernelBuffers = new Array(); // Buffers... for the kernel.
            _KernelInputQueue = new TSOS.Queue(); // Where device input lands before being processed out somewhere.
            // Initialize the console.
            _Console = new TSOS.Console(); // The command line interface / console I/O device.
            _Console.init();
            // Initialize standard input and output to the _Console.
            _StdIn = _Console;
            _StdOut = _Console;
            // Load the Keyboard Device Driver
            this.krnTrace("Loading the keyboard device driver.");
            _krnKeyboardDriver = new TSOS.DeviceDriverKeyboard(); // Construct it.
            _krnKeyboardDriver.driverEntry(); // Call the driverEntry() initialization routine.
            this.krnTrace(_krnKeyboardDriver.status);
            //
            // ... more?
            //
            // Enable the OS Interrupts.  (Not the CPU clock interrupt, as that is done in the hardware sim.)
            this.krnTrace("Enabling the interrupts.");
            this.krnEnableInterrupts();
            // Launch the shell.
            this.krnTrace("Creating and Launching the shell.");
            _OsShell = new TSOS.Shell();
            _OsShell.init();
            // Finally, initiate student testing protocol.
            if (_GLaDOS) {
                _GLaDOS.afterStartup();
            }
        }
        krnShutdown() {
            this.krnTrace("begin shutdown OS");
            // TODO: Check for running processes.  If there are some, alert and stop. Else...
            // ... Disable the Interrupts.
            this.krnTrace("Disabling the interrupts.");
            this.krnDisableInterrupts();
            //
            // Unload the Device Drivers?
            // More?
            //
            this.krnTrace("end shutdown OS");
        }
        krnOnCPUClockPulse() {
            /* This gets called from the host hardware simulation every time there is a hardware clock pulse.
               This is NOT the same as a TIMER, which causes an interrupt and is handled like other interrupts.
               This, on the other hand, is the clock pulse from the hardware / VM / host that tells the kernel
               that it has to look for interrupts and process them if it finds any.
            */
            // Check for an interrupt, if there are any. Page 560
            if (_KernelInterruptQueue.getSize() > 0) {
                // Process the first interrupt on the interrupt queue.
                // TODO (maybe): Implement a priority queue based on the IRQ number/id to enforce interrupt priority.
                var interrupt = _KernelInterruptQueue.dequeue();
                this.krnInterruptHandler(interrupt.irq, interrupt.params);
            }
            else if (_CPU.isExecuting) { // If there are no interrupts then run one CPU cycle if there is anything being processed.
                _CPU.cycle();
            }
            else { // If there are no interrupts and there is nothing being executed then just be idle.
                this.krnTrace("Idle");
            }
        }
        //
        // Interrupt Handling
        //
        krnEnableInterrupts() {
            // Keyboard
            TSOS.Devices.hostEnableKeyboardInterrupt();
            // Put more here.
        }
        krnDisableInterrupts() {
            // Keyboard
            TSOS.Devices.hostDisableKeyboardInterrupt();
            // Put more here.
        }
        krnInterruptHandler(irq, params) {
            // This is the Interrupt Handler Routine.  See pages 8 and 560.
            // Trace our entrance here so we can compute Interrupt Latency by analyzing the log file later on. Page 766.
            this.krnTrace("Handling IRQ~" + irq);
            // Invoke the requested Interrupt Service Routine via Switch/Case rather than an Interrupt Vector.
            // TODO: Consider using an Interrupt Vector in the future.
            // Note: There is no need to "dismiss" or acknowledge the interrupts in our design here.
            //       Maybe the hardware simulation will grow to support/require that in the future.
            switch (irq) {
                case TIMER_IRQ:
                    this.krnTimerISR(); // Kernel built-in routine for timers (not the clock).
                    break;
                case KEYBOARD_IRQ:
                    _krnKeyboardDriver.isr(params); // Kernel mode device driver
                    _StdIn.handleInput();
                    break;
                default:
                    this.krnTrapError("Invalid Interrupt Request. irq=" + irq + " params=[" + params + "]");
            }
        }
        krnTimerISR() {
            // The built-in TIMER (not clock) Interrupt Service Routine (as opposed to an ISR coming from a device driver). {
            // Check multiprogramming parameters and enforce quanta here. Call the scheduler / context switch here if necessary.
            // Or do it elsewhere in the Kernel. We don't really need this.
        }
        //
        // System Calls... that generate software interrupts via tha Application Programming Interface library routines.
        //
        // Some ideas:
        // - ReadConsole
        // - WriteConsole
        // - CreateProcess
        // - ExitProcess
        // - WaitForProcessToExit
        // - CreateFile
        // - OpenFile
        // - ReadFile
        // - WriteFile
        // - CloseFile
        //
        // OS Utility Routines
        //
        krnTrace(msg) {
            // Check globals to see if trace is set ON.  If so, then (maybe) log the message.
            if (_Trace) {
                if (msg === "Idle") {
                    // We can't log every idle clock pulse because it would quickly lag the browser quickly.
                    if (_OSclock % 10 == 0) {
                        // Check the CPU_CLOCK_INTERVAL in globals.ts for an
                        // idea of the tick rate and adjust this line accordingly.
                        TSOS.Control.hostLog(msg, "OS");
                    }
                }
                else {
                    TSOS.Control.hostLog(msg, "OS");
                }
            }
        }
        krnTrapError(msg) {
            TSOS.Control.hostLog("OS ERROR - TRAP: " + msg);
            _KernelTrapped = true;
            this.krnDrawBSOD(msg);
            this.krnShutdown();
        }
        krnDrawBSOD(msg) {
            // Theme-matched crash screen (host palette: deep green + mint accent).
            var ctx = _DrawingContext;
            var w = _Canvas.width;
            var h = _Canvas.height;
            var cx = w / 2;
            var mono = "IBM Plex Mono, Consolas, Courier New, monospace";
            ctx.fillStyle = "#0f1412";
            ctx.fillRect(0, 0, w, h);
            // Soft accent wash so it feels like the host UI, not classic blue.
            var wash = ctx.createRadialGradient(cx, 80, 20, cx, 140, 280);
            wash.addColorStop(0, "rgba(62, 207, 142, 0.18)");
            wash.addColorStop(1, "rgba(15, 20, 18, 0)");
            ctx.fillStyle = wash;
            ctx.fillRect(0, 0, w, h);
            // OS mark badge (matches .host-mark).
            var badge = 44;
            var bx = cx - badge / 2;
            var by = 48;
            ctx.fillStyle = "#1f7a52";
            this.krnRoundRect(ctx, bx, by, badge, badge, 10);
            ctx.fill();
            ctx.fillStyle = "#3ecf8e";
            this.krnRoundRect(ctx, bx + 2, by + 2, badge - 4, badge - 4, 8);
            ctx.fill();
            ctx.fillStyle = "#04140c";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "600 15px " + mono;
            ctx.fillText("OS", cx, by + badge / 2 + 1);
            ctx.textBaseline = "alphabetic";
            ctx.fillStyle = "#e0a24a";
            ctx.font = "600 11px " + mono;
            ctx.fillText("KERNEL TRAP", cx, 120);
            ctx.fillStyle = "#d7e3d9";
            ctx.font = "600 18px " + mono;
            ctx.fillText("FATAL EXCEPTION", cx, 148);
            ctx.fillStyle = "#3ecf8e";
            ctx.font = "500 14px " + mono;
            ctx.fillText("Your session has been halted.", cx, 176);
            var stopMsg = String(msg).substring(0, 52);
            var lines = [
                "",
                "at OS_KERNEL::krnTrapError",
                "",
                "STOP: " + stopMsg,
                "",
                "The virtual OS encountered a fatal error",
                "and cannot continue.",
                "",
                "Host simulation is still running.",
                "Use Reset to boot again."
            ];
            ctx.fillStyle = "#8aa094";
            ctx.font = "400 13px " + mono;
            var y = 210;
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].indexOf("STOP:") === 0) {
                    ctx.fillStyle = "#e0a24a";
                }
                else {
                    ctx.fillStyle = "#8aa094";
                }
                ctx.fillText(lines[i], cx, y);
                y += 18;
            }
            // Bottom accent rule.
            ctx.strokeStyle = "#2f3d34";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(40, h - 36);
            ctx.lineTo(w - 40, h - 36);
            ctx.stroke();
            ctx.fillStyle = "#1f7a52";
            ctx.font = "500 11px " + mono;
            ctx.fillText("Operating System  ·  host console", cx, h - 18);
        }
        krnRoundRect(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }
    }
    TSOS.Kernel = Kernel;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=kernel.js.map