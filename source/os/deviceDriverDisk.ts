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

        private isInUse(bytes: number[]): boolean {
            return bytes[0] !== 0;
        }

        // Directory lives on track 0; 0:0:0 is reserved (MBR).
        private isDirectoryTSB(track: number, sector: number, block: number): boolean {
            return track === 0 && !(sector === 0 && block === 0);
        }

        private readFilename(bytes: number[]): string {
            var name = "";
            for (var i = DISK_HEADER_SIZE; i < DISK_BLOCK_SIZE; i++) {
                if (bytes[i] === 0) {
                    break;
                }
                name += String.fromCharCode(bytes[i]);
            }
            return name;
        }

        private writeFilename(bytes: number[], filename: string): void {
            for (var i = DISK_HEADER_SIZE; i < DISK_BLOCK_SIZE; i++) {
                bytes[i] = 0;
            }
            for (var j = 0; j < filename.length && (DISK_HEADER_SIZE + j) < DISK_BLOCK_SIZE; j++) {
                bytes[DISK_HEADER_SIZE + j] = filename.charCodeAt(j) & 0xFF;
            }
        }

        private findFreeDirectoryBlock(): number[] | null {
            for (var s = 0; s < DISK_SECTORS; s++) {
                for (var b = 0; b < DISK_BLOCKS; b++) {
                    if (!this.isDirectoryTSB(0, s, b)) {
                        continue;
                    }
                    var bytes = this.readBlock(0, s, b);
                    if (!this.isInUse(bytes)) {
                        return [0, s, b];
                    }
                }
            }
            return null;
        }

        private findFreeDataBlock(): number[] | null {
            for (var t = 1; t < DISK_TRACKS; t++) {
                for (var s = 0; s < DISK_SECTORS; s++) {
                    for (var b = 0; b < DISK_BLOCKS; b++) {
                        var bytes = this.readBlock(t, s, b);
                        if (!this.isInUse(bytes)) {
                            return [t, s, b];
                        }
                    }
                }
            }
            return null;
        }

        private fileExists(filename: string): boolean {
            for (var s = 0; s < DISK_SECTORS; s++) {
                for (var b = 0; b < DISK_BLOCKS; b++) {
                    if (!this.isDirectoryTSB(0, s, b)) {
                        continue;
                    }
                    var bytes = this.readBlock(0, s, b);
                    if (this.isInUse(bytes) && this.readFilename(bytes) === filename) {
                        return true;
                    }
                }
            }
            return false;
        }

        // create <filename>: allocate a directory entry + empty first data block.
        // Returns null on success, or an error message string.
        public create(filename: string): string | null {
            if (!this.isFormatted()) {
                return "Disk is not formatted.";
            }
            if (!filename || filename.length === 0) {
                return "Filename required.";
            }
            if (filename.length > DISK_DATA_SIZE) {
                return "Filename too long (max " + DISK_DATA_SIZE + " characters).";
            }
            if (this.fileExists(filename)) {
                return "File already exists.";
            }

            var dirTSB = this.findFreeDirectoryBlock();
            if (!dirTSB) {
                return "Directory is full.";
            }

            var dataTSB = this.findFreeDataBlock();
            if (!dataTSB) {
                return "Disk is full.";
            }

            var dataBlock = this.emptyBlock();
            dataBlock[0] = 0x01; // in use, no next link yet
            this.writeBlock(dataTSB[0], dataTSB[1], dataTSB[2], dataBlock);

            var dirBlock = this.emptyBlock();
            dirBlock[0] = 0x01;
            dirBlock[1] = dataTSB[0];
            dirBlock[2] = dataTSB[1];
            dirBlock[3] = dataTSB[2];
            this.writeFilename(dirBlock, filename);
            this.writeBlock(dirTSB[0], dirTSB[1], dirTSB[2], dirBlock);

            Control.hostUpdateDiskDisplay();
            return null;
        }
    }
}
