"use strict";
/* ------------
     MemoryAccessor.ts

     All host memory reads/writes go through here so address translation
     can be added later without changing callers.
     ------------ */
var TSOS;
(function (TSOS) {
    class MemoryAccessor {
        // Translate a logical address using the current PCB base/limit.
        // With no running process, the address is treated as physical (for load).
        translate(address) {
            if (_CurrentPCB) {
                if (address < 0 || address >= _CurrentPCB.limit) {
                    _Kernel.krnTrapError("Memory access out of bounds: " + address);
                    return -1;
                }
                return _CurrentPCB.base + address;
            }
            if (address < 0 || address >= MEMORY_SIZE) {
                _Kernel.krnTrapError("Memory access out of bounds: " + address);
                return -1;
            }
            return address;
        }
        read(address) {
            var physical = this.translate(address);
            if (physical < 0) {
                return 0;
            }
            return _Memory.cells[physical];
        }
        write(address, value) {
            var physical = this.translate(address);
            if (physical < 0) {
                return;
            }
            _Memory.cells[physical] = value & 0xFF;
        }
    }
    TSOS.MemoryAccessor = MemoryAccessor;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=memoryAccessor.js.map
