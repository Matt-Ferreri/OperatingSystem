"use strict";
/* ------------
     Scheduler.ts

     Round-robin scheduler. runall places every resident program on the
     ready queue; each one runs for CPU_QUANTUM cycles, then yields.
     ------------ */
var TSOS;
(function (TSOS) {
    class Scheduler {
        noteArrival(pcb) {
            if (pcb && pcb.arrivalCycle < 0) {
                pcb.arrivalCycle = _CpuCycles;
            }
        }
        // Turnaround is cycles from arrival until the process stops.
        // Wait time is the part of that spent off the CPU.
        reportMetrics(pcb, restorePrompt) {
            if (!pcb || pcb.metricsReported || pcb.arrivalCycle < 0) {
                return;
            }
            pcb.turnaroundTime = _CpuCycles - pcb.arrivalCycle;
            pcb.waitTime = pcb.turnaroundTime - pcb.executeCycles;
            if (pcb.waitTime < 0) {
                pcb.waitTime = 0;
            }
            pcb.metricsReported = true;
            var finished = 0;
            var waitSum = 0;
            if (_MemoryManager && _MemoryManager.residentList) {
                for (var i = 0; i < _MemoryManager.residentList.length; i++) {
                    var other = _MemoryManager.residentList[i];
                    if (other.metricsReported) {
                        finished++;
                        waitSum += other.waitTime;
                    }
                }
            }
            var average = finished > 0 ? waitSum / finished : 0;
            var rule = "-------------------------";
            var lines = [
                "Process Metrics:",
                rule,
                "Process " + pcb.pid + " - Turnaround Time = " + pcb.turnaroundTime +
                    " cycles, Wait Time = " + pcb.waitTime.toFixed(1) + " cycles",
                "",
                "Average Wait Time: " + average.toFixed(2) + " cycles",
                rule
            ];
            if (_StdOut && _StdOut.writeBlock) {
                _StdOut.writeBlock(lines, restorePrompt);
            }
        }
        loadToCpu(pcb) {
            this.noteArrival(pcb);
            _CurrentPCB = pcb;
            _CPU.PC = pcb.pc;
            _CPU.Acc = pcb.acc;
            _CPU.Xreg = pcb.xReg;
            _CPU.Yreg = pcb.yReg;
            _CPU.Zflag = pcb.zFlag;
            _CPU.IR = pcb.ir;
            pcb.state = "Running";
            _CPU.isExecuting = true;
            _QuantumCount = 0;
            TSOS.Control.hostUpdateCpuDisplay();
            TSOS.Control.hostUpdatePcbDisplay();
            if (_Memory) {
                TSOS.Control.hostUpdateMemoryDisplay(_Memory.cells);
            }
        }
        dispatch() {
            if (!_ReadyQueue || _ReadyQueue.isEmpty()) {
                _CurrentPCB = null;
                _CPU.isExecuting = false;
                _QuantumCount = 0;
                TSOS.Control.hostUpdateCpuDisplay();
                TSOS.Control.hostUpdatePcbDisplay();
                if (_Memory) {
                    TSOS.Control.hostUpdateMemoryDisplay(_Memory.cells);
                }
                return;
            }
            this.loadToCpu(_ReadyQueue.dequeue());
        }
        // Save the running process and run the next ready one.
        // If nothing else is waiting, the current process keeps the CPU.
        contextSwitch() {
            if (!_ReadyQueue || _ReadyQueue.isEmpty()) {
                _QuantumCount = 0;
                return;
            }
            if (_CurrentPCB) {
                _CurrentPCB.pc = _CPU.PC;
                _CurrentPCB.acc = _CPU.Acc;
                _CurrentPCB.xReg = _CPU.Xreg;
                _CurrentPCB.yReg = _CPU.Yreg;
                _CurrentPCB.zFlag = _CPU.Zflag;
                _CurrentPCB.ir = _CPU.IR;
                _CurrentPCB.state = "Ready";
                _ReadyQueue.enqueue(_CurrentPCB);
                _CurrentPCB = null;
            }
            this.dispatch();
        }
        onCycle() {
            _QuantumCount++;
            if (_QuantumCount >= _Quantum) {
                this.contextSwitch();
            }
        }
        // Count this cycle toward the quantum only if the same process is still on the CPU.
        afterCycle(activePcb) {
            if (_CPU.isExecuting && _CurrentPCB === activePcb) {
                this.onCycle();
            }
            // Quantum changes after the instruction, so refresh once the slice counter is current.
            TSOS.Control.hostUpdatePcbDisplay();
        }
        onProcessExit() {
            _CurrentPCB = null;
            _QuantumCount = 0;
            this.dispatch();
        }
        // Drop a waiting process so it will not be dispatched.
        removeFromReady(pcb) {
            if (!_ReadyQueue) {
                return;
            }
            var kept = [];
            while (!_ReadyQueue.isEmpty()) {
                var next = _ReadyQueue.dequeue();
                if (next !== pcb) {
                    kept[kept.length] = next;
                }
            }
            for (var i = 0; i < kept.length; i++) {
                _ReadyQueue.enqueue(kept[i]);
            }
        }
    }
    TSOS.Scheduler = Scheduler;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=scheduler.js.map