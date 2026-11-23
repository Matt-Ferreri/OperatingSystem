"use strict";
/* ----------------------------------
   DeviceDriverDisk.ts

   Kernel Disk System Device Driver (dsDD).
   Insulates shell/kernel from raw TSB byte layout.
   ---------------------------------- */
var TSOS;
(function (TSOS) {
    class DeviceDriverDisk extends TSOS.DeviceDriver {
        constructor() {
            super();
            this.driverEntry = this.krnDiskDriverEntry;
        }
        krnDiskDriverEntry() {
            this.status = "loaded";
            if (_Disk && _Disk.isFormatted) {
                this.status = "loaded / formatted";
            }
        }
        isFormatted() {
            return !!(_Disk && _Disk.isFormatted);
        }
        // Empty block header: free + no next TSB (0xFF = "-").
        emptyHeader() {
            return [0x00, 0xFF, 0xFF, 0xFF];
        }
        emptyBlock() {
            var block = this.emptyHeader();
            for (var i = DISK_HEADER_SIZE; i < DISK_BLOCK_SIZE; i++) {
                block[i] = 0x00;
            }
            return block;
        }
        // format: initialize all blocks. format -quick: only rewrite the 4-byte header.
        format(quick = false) {
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
                        }
                        else {
                            _Disk.write(t, s, b, this.emptyBlock());
                        }
                    }
                }
            }
            _Disk.setFormatted(true);
            this.status = "loaded / formatted";
            TSOS.Control.hostUpdateDiskDisplay();
            return true;
        }
        // Helpers for later file ops / GUI.
        readBlock(track, sector, block) {
            if (!_Disk) {
                var empty = new Array(DISK_BLOCK_SIZE);
                for (var i = 0; i < DISK_BLOCK_SIZE; i++) {
                    empty[i] = 0;
                }
                return empty;
            }
            return _Disk.read(track, sector, block);
        }
        writeBlock(track, sector, block, data) {
            if (_Disk) {
                _Disk.write(track, sector, block, data);
            }
        }
    }
    TSOS.DeviceDriverDisk = DeviceDriverDisk;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=deviceDriverDisk.js.map