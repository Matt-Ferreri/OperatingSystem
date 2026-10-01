"use strict";
/* ------------
     MemoryAccessor.ts

     All host memory reads/writes go through here so address translation
     can be added later without changing callers.
     ------------ */
var TSOS;
(function (TSOS) {
    class MemoryAccessor {
        read(address) {
            if (address < 0 || address >= MEMORY_SIZE) {
                _Kernel.krnTrapError("Memory read out of bounds: " + address);
                return 0;
            }
            return _Memory.cells[address];
        }
        write(address, value) {
            if (address < 0 || address >= MEMORY_SIZE) {
                _Kernel.krnTrapError("Memory write out of bounds: " + address);
                return;
            }
            _Memory.cells[address] = value & 0xFF;
        }
    }
    TSOS.MemoryAccessor = MemoryAccessor;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=memoryAccessor.js.map