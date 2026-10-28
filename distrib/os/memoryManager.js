"use strict";
/* ------------
     MemoryManager.ts

     OS service that places programs into the three fixed memory segments
     starting at MEMORY_SEGMENT_BASES (0, 256, 512), assigns PIDs, and
     creates Process Control Blocks.
     ------------ */
var TSOS;
(function (TSOS) {
    class MemoryManager {
        segmentUsed = [false, false, false];
        nextPid = 0;
        residentList = [];
        // Load program bytes into the next free segment.
        // Returns the new PCB, or null on failure.
        loadProgram(bytes) {
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
            var pcb = new TSOS.Pcb(this.nextPid, base, MEMORY_SEGMENT_SIZE);
            pcb.segment = segment;
            this.nextPid++;
            this.residentList.push(pcb);
            TSOS.Control.hostUpdateMemoryDisplay(_Memory.cells);
            TSOS.Control.hostUpdatePcbDisplay();
            return pcb;
        }
        // Zero every segment and release the resident processes that occupied them.
        // Returns false when a process is still executing.
        clearMemory() {
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
            TSOS.Control.hostUpdateMemoryDisplay(_Memory.cells);
            TSOS.Control.hostUpdatePcbDisplay();
            return true;
        }
        findPcb(pid) {
            for (var i = 0; i < this.residentList.length; i++) {
                if (this.residentList[i].pid === pid) {
                    return this.residentList[i];
                }
            }
            return null;
        }
    }
    TSOS.MemoryManager = MemoryManager;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=memoryManager.js.map