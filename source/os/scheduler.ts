/* ------------
     Scheduler.ts

     Round-robin scheduler. runall places every resident program on the
     ready queue; each one runs for CPU_QUANTUM cycles, then yields.
     ------------ */

module TSOS {

    export class Scheduler {

        public loadToCpu(pcb): void {
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
            Control.hostUpdateCpuDisplay();
            Control.hostUpdatePcbDisplay();
            if (_Memory) {
                Control.hostUpdateMemoryDisplay(_Memory.cells);
            }
        }

        public dispatch(): void {
            if (!_ReadyQueue || _ReadyQueue.isEmpty()) {
                _CurrentPCB = null;
                _CPU.isExecuting = false;
                _QuantumCount = 0;
                Control.hostUpdateCpuDisplay();
                Control.hostUpdatePcbDisplay();
                if (_Memory) {
                    Control.hostUpdateMemoryDisplay(_Memory.cells);
                }
                return;
            }
            this.loadToCpu(_ReadyQueue.dequeue());
        }

        // Save the running process and run the next ready one.
        // If nothing else is waiting, the current process keeps the CPU.
        public contextSwitch(): void {
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

        public onCycle(): void {
            _QuantumCount++;
            if (_QuantumCount >= CPU_QUANTUM) {
                this.contextSwitch();
            }
        }

        // Count this cycle toward the quantum only if the same process is still on the CPU.
        public afterCycle(activePcb): void {
            if (_CPU.isExecuting && _CurrentPCB === activePcb) {
                this.onCycle();
            }
        }

        public onProcessExit(): void {
            _CurrentPCB = null;
            _QuantumCount = 0;
            this.dispatch();
        }
    }
}
