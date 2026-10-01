/* ------------
     MemoryAccessor.ts

     All host memory reads/writes go through here so address translation
     can be added later without changing callers.
     ------------ */

module TSOS {

    export class MemoryAccessor {

        public read(address: number): number {
            if (address < 0 || address >= MEMORY_SIZE) {
                _Kernel.krnTrapError("Memory read out of bounds: " + address);
                return 0;
            }
            return _Memory.cells[address];
        }

        public write(address: number, value: number): void {
            if (address < 0 || address >= MEMORY_SIZE) {
                _Kernel.krnTrapError("Memory write out of bounds: " + address);
                return;
            }
            _Memory.cells[address] = value & 0xFF;
        }
    }
}
