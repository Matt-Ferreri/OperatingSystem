/* ------------
     Control.ts

     Routines for the hardware simulation, NOT for our client OS itself.
     These are static because we are never going to instantiate them, because they represent the hardware.
     In this manner, it's A LITTLE BIT like a hypervisor, in that the Document environment inside a browser
     is the "bare metal" (so to speak) for which we write code that hosts our client OS.
     But that analogy only goes so far, and the lines are blurred, because we are using TypeScript/JavaScript
     in both the host and client environments.

     This (and other host/simulation scripts) is the only place that we should see "web" code, such as
     DOM manipulation and event handling, and so on.  (Index.html is -- obviously -- the only place for markup.)

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */

//
// Control Services
//
module TSOS {

    export class Control {

        public static hostInit(): void {
            // This is called from index.html's onLoad event via the onDocumentLoad function pointer.

            // Get a global reference to the canvas.  TODO: Should we move this stuff into a Display Device Driver?
            _Canvas = <HTMLCanvasElement>document.getElementById('display');

            // Get a global reference to the drawing context.
            _DrawingContext = _Canvas.getContext("2d");

            // Enable the added-in canvas text functions (see canvastext.ts for provenance and details).
            CanvasTextFunctions.enable(_DrawingContext);   // Text functionality is now built in to the HTML5 canvas. But this is old-school, and fun, so we'll keep it.

            // Clear the log text box.
            // Use the TypeScript cast to HTMLInputElement
            (<HTMLInputElement> document.getElementById("taHostLog")).value="";

            // Set focus on the start button.
            // Use the TypeScript cast to HTMLInputElement
            (<HTMLInputElement> document.getElementById("btnStartOS")).focus();

            // Initialize the task bar status and keep the date/time current.
            Control.hostUpdateTaskBarStatus(_Status);
            Control.hostUpdateTaskBarDateTime();
            setInterval(Control.hostUpdateTaskBarDateTime, 1000);

            // Build the initial empty memory display.
            Control.hostUpdateMemoryDisplay();
            Control.hostUpdateCpuDisplay();
            Control.hostUpdatePcbDisplay();

            // Check for our testing and enrichment core, which
            // may be referenced here (from index.html) as function Glados().
            if (typeof Glados === "function") {
                // function Glados() is here, so instantiate Her into
                // the global (and properly capitalized) _GLaDOS variable.
                _GLaDOS = new Glados();
                _GLaDOS.init();
            }
        }

        public static hostUpdateTaskBarDateTime(): void {
            var dateTimeElement = document.getElementById("taskBarDateTime");
            if (dateTimeElement) {
                dateTimeElement.textContent = new Date().toLocaleString();
            }
        }

        public static hostUpdateTaskBarStatus(status: string): void {
            _Status = status;
            var statusElement = document.getElementById("taskBarStatus");
            if (statusElement) {
                statusElement.textContent = _Status;
            }
        }

        // Render memory as one continuous block (0-767).
        // Program load bases (0, 256, 512) are marked in the table for later use.
        public static hostUpdateMemoryDisplay(memory?: number[]): void {
            var container = document.getElementById("memoryDisplay");
            if (!container) {
                return;
            }

            const BYTES_PER_ROW = 8;
            var html = "<table class='memory-table'><tbody>";

            for (var addr = 0; addr < MEMORY_SIZE; addr += BYTES_PER_ROW) {
                var addrHex = addr.toString(16).toUpperCase().padStart(3, "0");
                var isSegmentBase = MEMORY_SEGMENT_BASES.indexOf(addr) >= 0;
                var rowClass = isSegmentBase ? " class='mem-segment-base'" : "";
                html += "<tr" + rowClass + "><td class='mem-addr'>" + addrHex + "</td>";

                for (var col = 0; col < BYTES_PER_ROW; col++) {
                    var index = addr + col;
                    var value = (memory && index < memory.length) ? memory[index] : 0;
                    var byteHex = (value & 0xFF).toString(16).toUpperCase().padStart(2, "0");
                    html += "<td>" + byteHex + "</td>";
                }

                html += "</tr>";
            }

            html += "</tbody></table>";
            container.innerHTML = html;
        }

        public static hostUpdateCpuDisplay(): void {
            var toHex = function (value: number, width: number = 2): string {
                return (value & ((1 << (width * 4)) - 1)).toString(16).toUpperCase().padStart(width, "0");
            };

            var pc = document.getElementById("cpuPC");
            var ir = document.getElementById("cpuIR");
            var acc = document.getElementById("cpuAcc");
            var x = document.getElementById("cpuX");
            var y = document.getElementById("cpuY");
            var z = document.getElementById("cpuZ");
            var exec = document.getElementById("cpuExec");

            if (!pc) {
                return;
            }

            if (_CPU) {
                pc.textContent = toHex(_CPU.PC);
                ir.textContent = toHex(_CPU.IR);
                acc.textContent = toHex(_CPU.Acc);
                x.textContent = toHex(_CPU.Xreg);
                y.textContent = toHex(_CPU.Yreg);
                z.textContent = String(_CPU.Zflag);
                exec.textContent = String(_CPU.isExecuting);
            } else {
                pc.textContent = "00";
                ir.textContent = "00";
                acc.textContent = "00";
                x.textContent = "00";
                y.textContent = "00";
                z.textContent = "0";
                exec.textContent = "false";
            }
        }

        public static hostUpdatePcbDisplay(): void {
            var body = document.getElementById("pcbTableBody");
            if (!body) {
                return;
            }

            var toHex = function (value: number, width: number = 2): string {
                return (value & ((1 << (width * 4)) - 1)).toString(16).toUpperCase().padStart(width, "0");
            };

            if (!_MemoryManager || !_MemoryManager.residentList || _MemoryManager.residentList.length === 0) {
                body.innerHTML = "<tr><td colspan='10'>No processes</td></tr>";
                return;
            }

            var html = "";
            for (var i = 0; i < _MemoryManager.residentList.length; i++) {
                var pcb = _MemoryManager.residentList[i];
                html += "<tr>" +
                    "<td>" + pcb.pid + "</td>" +
                    "<td>" + pcb.state + "</td>" +
                    "<td>" + toHex(pcb.pc) + "</td>" +
                    "<td>" + toHex(pcb.ir) + "</td>" +
                    "<td>" + toHex(pcb.acc) + "</td>" +
                    "<td>" + toHex(pcb.xReg) + "</td>" +
                    "<td>" + toHex(pcb.yReg) + "</td>" +
                    "<td>" + pcb.zFlag + "</td>" +
                    "<td>" + pcb.base + "</td>" +
                    "<td>" + pcb.limit + "</td>" +
                    "</tr>";
            }
            body.innerHTML = html;
        }

        public static hostLog(msg: string, source: string = "?"): void {
            // Note the OS CLOCK.
            var clock: number = _OSclock;

            // Note the REAL clock in milliseconds since January 1, 1970.
            var now: number = new Date().getTime();

            // Build the log string.
            var str: string = "({ clock:" + clock + ", source:" + source + ", msg:" + msg + ", now:" + now  + " })"  + "\n";

            // Update the log console.
            var taLog = <HTMLInputElement> document.getElementById("taHostLog");
            taLog.value = str + taLog.value;

            // TODO in the future: Optionally update a log database or some streaming service.
        }


        //
        // Host Events
        //
        public static hostBtnStartOS_click(btn): void {
            // Disable the (passed-in) start button...
            btn.disabled = true;

            // .. enable the Halt and Reset buttons ...
            (<HTMLButtonElement>document.getElementById("btnHaltOS")).disabled = false;
            (<HTMLButtonElement>document.getElementById("btnReset")).disabled = false;

            // .. set focus on the OS console display ...
            document.getElementById("display").focus();

            // ... Create and initialize the CPU (because it's part of the hardware)  ...
            _CPU = new Cpu();  // Note: We could simulate multi-core systems by instantiating more than one instance of the CPU here.
            _CPU.init();       //       There's more to do, like dealing with scheduling and such, but this would be a start. Pretty cool.

            // ... Create and initialize host memory ...
            _Memory = new Memory();
            _Memory.init();
            _MemoryAccessor = new MemoryAccessor();
            Control.hostUpdateMemoryDisplay(_Memory.cells);

            // ... then set the host clock pulse ...
            _hardwareClockID = setInterval(Devices.hostClockPulse, CPU_CLOCK_INTERVAL);
            // .. and call the OS Kernel Bootstrap routine.
            _Kernel = new Kernel();
            _Kernel.krnBootstrap();  // _GLaDOS.afterStartup() will get called in there, if configured.
        }

        public static hostBtnHaltOS_click(btn): void {
            Control.hostLog("Emergency halt", "host");
            Control.hostLog("Attempting Kernel shutdown.", "host");
            // Call the OS shutdown routine.
            _Kernel.krnShutdown();
            // Stop the interval that's simulating our clock pulse.
            clearInterval(_hardwareClockID);
            // TODO: Is there anything else we need to do here?
        }

        public static hostBtnReset_click(btn): void {
            // The easiest and most thorough way to do this is to reload (not refresh) the document.
            location.reload();
        }
    }
}
