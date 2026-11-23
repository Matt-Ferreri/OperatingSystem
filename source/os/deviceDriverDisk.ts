/* ----------------------------------
   DeviceDriverDisk.ts

   Kernel Disk System Device Driver (dsDD).
   Insulates shell/kernel from raw TSB byte layout.
   ---------------------------------- */

module TSOS {

    export class DeviceDriverDisk extends DeviceDriver {

        constructor() {
            super();
            this.driverEntry = this.krnDiskDriverEntry;
        }

        public krnDiskDriverEntry() {
            this.status = "loaded";
            if (_Disk && _Disk.isFormatted) {
                this.status = "loaded / formatted";
            }
        }

        public isFormatted(): boolean {
            return !!(_Disk && _Disk.isFormatted);
        }

        // Empty block header: free + no next TSB (0xFF = "-").
        private emptyHeader(): number[] {
            return [0x00, 0xFF, 0xFF, 0xFF];
        }

        private emptyBlock(): number[] {
            var block = this.emptyHeader();
            for (var i = DISK_HEADER_SIZE; i < DISK_BLOCK_SIZE; i++) {
                block[i] = 0x00;
            }
            return block;
        }

        // format: initialize all blocks. format -quick: only rewrite the 4-byte header.
        public format(quick: boolean = false): boolean {
            if (!_Disk) {
                return false;
            }

            for (var t = 0; t < DISK_TRACKS; t++) {
                for (var s = 0; s < DISK_SECTORS; s++) {
                    for (var b = 0; b < DISK_BLOCKS; b++) {
                        if (quick && _Disk.isFormatted) {
                            var existing = _Disk.read(t, s, b);
                            var header = this.emptyHeader();
                            for (var i = 0; i < DISK_HEADER_SIZE; i++) {
                                existing[i] = header[i];
                            }
                            _Disk.write(t, s, b, existing);
                        } else {
                            _Disk.write(t, s, b, this.emptyBlock());
                        }
                    }
                }
            }

            _Disk.setFormatted(true);
            this.status = "loaded / formatted";
            Control.hostUpdateDiskDisplay();
            return true;
        }

        // Helpers for later file ops / GUI.
        public readBlock(track: number, sector: number, block: number): number[] {
            if (!_Disk) {
                var empty = new Array(DISK_BLOCK_SIZE);
                for (var i = 0; i < DISK_BLOCK_SIZE; i++) {
                    empty[i] = 0;
                }
                return empty;
            }
            return _Disk.read(track, sector, block);
        }

        public writeBlock(track: number, sector: number, block: number, data: number[]): void {
            if (_Disk) {
                _Disk.write(track, sector, block, data);
            }
        }
    }
}
