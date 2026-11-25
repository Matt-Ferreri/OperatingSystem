/* ------------
     MemoryAccessor.ts

     All host memory reads/writes go through here. With demand paging,
     logical addresses are translated through the current process page
     table (page faults are handled by the MemoryManager).
     ------------ */

module TSOS {

    export class MemoryAccessor {

        // Translate a logical address for the running process, or treat the
        // address as physical when no process is current (host/kernel use).
        private translate(address: number, isWrite: boolean): number {
            if (_CurrentPCB) {
                if (!_MemoryManager) {
                    _Kernel.krnTrapError("Memory access with no memory manager");
                    return -1;
                }
                return _MemoryManager.translateAddress(_CurrentPCB, address, isWrite);
            }

            if (address < 0 || address >= MEMORY_SIZE) {
                _Kernel.krnTrapError("Memory access out of bounds: " + address);
                return -1;
            }
            return address;
        }

        public read(address: number): number {
            var physical = this.translate(address, false);
            if (physical < 0) {
                return 0;
            }
            return _Memory.cells[physical];
        }

        public write(address: number, value: number): void {
            var physical = this.translate(address, true);
            if (physical < 0) {
                return;
            }
            _Memory.cells[physical] = value & 0xFF;
        }
    }
}
