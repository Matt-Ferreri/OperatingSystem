/* ------------
     MemoryManager.ts

     OS service that places programs into the three fixed memory segments
     starting at MEMORY_SEGMENT_BASES (0, 256, 512), assigns PIDs, and
     creates Process Control Blocks.
     ------------ */

module TSOS {

    export class MemoryManager {

        private segmentUsed: boolean[] = [false, false, false];
        private nextPid: number = 0;
        public residentList: Pcb[] = [];

        // Load program bytes into the next free segment.
        // Returns the new PCB, or null on failure.
        public loadProgram(bytes: number[]): Pcb {
            if (bytes.length > MEMORY_SEGMENT_SIZE) {
                return null;
            }

            var segment = -1;
            for (var i = 0; i < this.segmentUsed.length; i++) {
                if (!this.segmentUsed[i]) {
                    segment = i;
                    break;
                }
            }
            if (segment < 0) {
                return null;
            }

            var base = MEMORY_SEGMENT_BASES[segment];

            // Clear the segment, then write the program.
            for (var offset = 0; offset < MEMORY_SEGMENT_SIZE; offset++) {
                _MemoryAccessor.write(base + offset, 0);
            }
            for (var j = 0; j < bytes.length; j++) {
                _MemoryAccessor.write(base + j, bytes[j]);
            }

            this.segmentUsed[segment] = true;

            var pcb = new Pcb(this.nextPid, base, MEMORY_SEGMENT_SIZE);
            pcb.segment = segment;
            this.nextPid++;
            this.residentList.push(pcb);

            Control.hostUpdateMemoryDisplay(_Memory.cells);
            Control.hostUpdatePcbDisplay();
            return pcb;
        }

        // Zero every segment and release the resident processes that occupied them.
        // Returns false when a process is still executing.
        public clearMemory(): boolean {
            if (_CPU && _CPU.isExecuting) {
                return false;
            }

            for (var i = 0; i < MEMORY_SIZE; i++) {
                _Memory.cells[i] = 0;
            }

            this.segmentUsed = [false, false, false];
            this.residentList = [];
            _CurrentPCB = null;
            _QuantumCount = 0;
            _CpuCycles = 0;
            if (_ReadyQueue) {
                while (!_ReadyQueue.isEmpty()) {
                    _ReadyQueue.dequeue();
                }
            }

            Control.hostUpdateMemoryDisplay(_Memory.cells);
            Control.hostUpdatePcbDisplay();
            return true;
        }

        public findPcb(pid: number): Pcb {
            for (var i = 0; i < this.residentList.length; i++) {
                if (this.residentList[i].pid === pid) {
                    return this.residentList[i];
                }
            }
            return null;
        }
    }
}
