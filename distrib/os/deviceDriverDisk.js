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
        isInUse(bytes) {
            return bytes[0] !== 0;
        }
        // Directory lives on track 0; 0:0:0 is reserved (MBR).
        isDirectoryTSB(track, sector, block) {
            return track === 0 && !(sector === 0 && block === 0);
        }
        readFilename(bytes) {
            var name = "";
            for (var i = DISK_HEADER_SIZE; i < DISK_BLOCK_SIZE; i++) {
                if (bytes[i] === 0) {
                    break;
                }
                name += String.fromCharCode(bytes[i]);
            }
            return name;
        }
        writeFilename(bytes, filename) {
            for (var i = DISK_HEADER_SIZE; i < DISK_BLOCK_SIZE; i++) {
                bytes[i] = 0;
            }
            for (var j = 0; j < filename.length && (DISK_HEADER_SIZE + j) < DISK_BLOCK_SIZE; j++) {
                bytes[DISK_HEADER_SIZE + j] = filename.charCodeAt(j) & 0xFF;
            }
        }
        findFreeDirectoryBlock() {
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
        findFreeDataBlock() {
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
        fileExists(filename) {
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
        create(filename) {
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
            TSOS.Control.hostUpdateDiskDisplay();
            return null;
        }
    }
    TSOS.DeviceDriverDisk = DeviceDriverDisk;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=deviceDriverDisk.js.map