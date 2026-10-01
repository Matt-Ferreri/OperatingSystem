"use strict";
/* ------------
     Memory.ts

     Host memory simulation: one contiguous block of MEMORY_SIZE bytes.
     ------------ */
var TSOS;
(function (TSOS) {
    class Memory {
        cells = [];
        init() {
            this.cells = new Array(MEMORY_SIZE);
            for (var i = 0; i < MEMORY_SIZE; i++) {
                this.cells[i] = 0;
            }
        }
    }
    TSOS.Memory = Memory;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=memory.js.map