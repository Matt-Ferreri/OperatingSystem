/* ------------
     MemoryAccessor.ts

     All host memory reads/writes go through here so address translation
     can be added later without changing callers.
     ------------ */

module TSOS {

    export class MemoryAccessor {

        // Translate a logical address using the current PCB base/limit.
        // With no running process, the address is treated as physical (for load).
        private translate(address: number): number {
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

        public read(address: number): number {
            var physical = this.translate(address);
            if (physical < 0) {
                return 0;
            }
            return _Memory.cells[physical];
        }

        public write(address: number, value: number): void {
            var physical = this.translate(address);
            if (physical < 0) {
                return;
            }
            _Memory.cells[physical] = value & 0xFF;
        }
    }
}
