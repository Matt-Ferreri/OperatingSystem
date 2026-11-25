/* ------------
     Scheduler.ts

     CPU scheduler with Round Robin (default), FCFS, and non-preemptive
     priority. runall places every resident program on the ready queue;
     dispatch picks the next process according to _Schedule and rolls
     disk-backed processes into memory before they run.
     ------------ */

module TSOS {

    export class Scheduler {

        public noteArrival(pcb): void {
            if (pcb && pcb.arrivalCycle < 0) {
                pcb.arrivalCycle = _CpuCycles;
            }
        }

        // Turnaround is cycles from arrival until the process stops.
        // Wait time is the part of that spent off the CPU.
        public reportMetrics(pcb, restorePrompt: boolean): void {
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

        public loadToCpu(pcb): void {
            this.noteArrival(pcb);
            _CurrentPCB = pcb;
            _CPU.PC = pcb.pc;
            _CPU.Acc = pcb.acc;
            _CPU.Xreg = pcb.xReg;
            _CPU.Yreg = pcb.yReg;
            _CPU.Zflag = pcb.zFlag;
            _CPU.IR = pcb.ir;
            pcb.state = "Running";
            pcb.location = "Memory";
            _CPU.isExecuting = true;
            _QuantumCount = 0;
            Control.hostUpdateCpuDisplay();
            Control.hostUpdatePcbDisplay();
            if (_Memory) {
                Control.hostUpdateMemoryDisplay(_Memory.cells);
            }
        }

        // Choose the next ready process for the active scheduling algorithm.
        // RR and FCFS take the front of the queue; priority takes the lowest
        // priority value (ties keep ready-queue order = arrival order).
        public pickNext() {
            if (!_ReadyQueue || _ReadyQueue.isEmpty()) {
                return null;
            }

            if (_Schedule !== "priority") {
                return _ReadyQueue.dequeue();
            }

            var bestIndex = 0;
            var bestPriority = _ReadyQueue.q[0].priority;
            for (var i = 1; i < _ReadyQueue.q.length; i++) {
                if (_ReadyQueue.q[i].priority < bestPriority) {
                    bestPriority = _ReadyQueue.q[i].priority;
                    bestIndex = i;
                }
            }
            var chosen = _ReadyQueue.q[bestIndex];
            _ReadyQueue.q.splice(bestIndex, 1);
            return chosen;
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

            // Skip processes that cannot be rolled into memory right now.
            var skipped = [];
            var next = null;
            while (!_ReadyQueue.isEmpty()) {
                var candidate = this.pickNext();
                if (_MemoryManager && !_MemoryManager.ensureInMemory(candidate)) {
                    if (_Kernel) {
                        _Kernel.krnTrace("Failed to roll in PID " + candidate.pid);
                    }
                    candidate.state = "Ready";
                    skipped[skipped.length] = candidate;
                    continue;
                }
                next = candidate;
                break;
            }
            for (var i = 0; i < skipped.length; i++) {
                _ReadyQueue.enqueue(skipped[i]);
            }

            if (!next) {
                _CurrentPCB = null;
                _CPU.isExecuting = false;
                _QuantumCount = 0;
                Control.hostUpdateCpuDisplay();
                Control.hostUpdatePcbDisplay();
                return;
            }

            this.loadToCpu(next);
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
            // Only Round Robin preempts on a quantum; FCFS and priority run to completion.
            if (_Schedule !== "rr") {
                return;
            }
            _QuantumCount++;
            if (_QuantumCount >= _Quantum) {
                this.contextSwitch();
            }
        }

        // Count this cycle toward the quantum only if the same process is still on the CPU.
        public afterCycle(activePcb): void {
            if (_CPU.isExecuting && _CurrentPCB === activePcb) {
                this.onCycle();
            }
            // Quantum changes after the instruction, so refresh once the slice counter is current.
            Control.hostUpdatePcbDisplay();
        }

        public onProcessExit(): void {
            _CurrentPCB = null;
            _QuantumCount = 0;
            this.dispatch();
        }

        // Drop a waiting process so it will not be dispatched.
        public removeFromReady(pcb): void {
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
}
