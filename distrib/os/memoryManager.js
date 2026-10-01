"use strict";
/* ------------
     MemoryManager.ts

     OS service that places programs into the three fixed memory segments
     starting at MEMORY_SEGMENT_BASES (0, 256, 512).
     ------------ */
var TSOS;
(function (TSOS) {
    class MemoryManager {
        segmentUsed = [false, false, false];
        // Load program bytes into the next free segment. Returns base address, or -1 on failure.
        loadProgram(bytes) {
            if (bytes.length > MEMORY_SEGMENT_SIZE) {
                return -1;
            }
            var segment = -1;
            for (var i = 0; i < this.segmentUsed.length; i++) {
                if (!this.segmentUsed[i]) {
                    segment = i;
                    break;
                }
            }
            if (segment < 0) {
                return -1;
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
            TSOS.Control.hostUpdateMemoryDisplay(_Memory.cells);
            return base;
        }
    }
    TSOS.MemoryManager = MemoryManager;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=memoryManager.js.map