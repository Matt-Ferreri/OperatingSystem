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
        // Directory data layout: [filename...][0x00][creationDate ms ASCII...][0x00...]
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
        readCreationDate(bytes) {
            // Skip past null-terminated filename, then read timestamp digits.
            var i = DISK_HEADER_SIZE;
            while (i < DISK_BLOCK_SIZE && bytes[i] !== 0) {
                i++;
            }
            if (i >= DISK_BLOCK_SIZE) {
                return null;
            }
            i++; // skip filename null
            var stamp = "";
            while (i < DISK_BLOCK_SIZE && bytes[i] !== 0) {
                stamp += String.fromCharCode(bytes[i]);
                i++;
            }
            if (stamp.length === 0) {
                return null;
            }
            var ms = parseInt(stamp, 10);
            return isNaN(ms) ? null : ms;
        }
        writeFilename(bytes, filename, createdMs) {
            var existingDate = this.readCreationDate(bytes);
            for (var i = DISK_HEADER_SIZE; i < DISK_BLOCK_SIZE; i++) {
                bytes[i] = 0;
            }
            for (var j = 0; j < filename.length && (DISK_HEADER_SIZE + j) < DISK_BLOCK_SIZE; j++) {
                bytes[DISK_HEADER_SIZE + j] = filename.charCodeAt(j) & 0xFF;
            }
            var dateMs = (createdMs !== undefined) ? createdMs : existingDate;
            if (dateMs === null || dateMs === undefined) {
                return;
            }
            var stamp = String(dateMs);
            var offset = DISK_HEADER_SIZE + filename.length + 1; // after filename null
            for (var k = 0; k < stamp.length && (offset + k) < DISK_BLOCK_SIZE; k++) {
                bytes[offset + k] = stamp.charCodeAt(k) & 0xFF;
            }
        }
        fileSize(startTSB) {
            var size = 0;
            var chain = this.collectDataChain(startTSB);
            for (var i = 0; i < chain.length; i++) {
                var tsb = chain[i];
                var bytes = this.readBlock(tsb[0], tsb[1], tsb[2]);
                for (var j = DISK_HEADER_SIZE; j < DISK_BLOCK_SIZE; j++) {
                    if (bytes[j] === 0) {
                        return size;
                    }
                    size++;
                }
            }
            return size;
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
            return this.findDirectoryEntry(filename) !== null;
        }
        // Returns [dirTrack, dirSector, dirBlock, dataTrack, dataSector, dataBlock] or null.
        findDirectoryEntry(filename) {
            for (var s = 0; s < DISK_SECTORS; s++) {
                for (var b = 0; b < DISK_BLOCKS; b++) {
                    if (!this.isDirectoryTSB(0, s, b)) {
                        continue;
                    }
                    var bytes = this.readBlock(0, s, b);
                    if (this.isInUse(bytes) && this.readFilename(bytes) === filename) {
                        return [0, s, b, bytes[1], bytes[2], bytes[3]];
                    }
                }
            }
            return null;
        }
        getNextTSB(bytes) {
            if (bytes[1] === 0xFF && bytes[2] === 0xFF && bytes[3] === 0xFF) {
                return null;
            }
            return [bytes[1], bytes[2], bytes[3]];
        }
        setNextTSB(bytes, tsb) {
            if (!tsb) {
                bytes[1] = 0xFF;
                bytes[2] = 0xFF;
                bytes[3] = 0xFF;
            }
            else {
                bytes[1] = tsb[0];
                bytes[2] = tsb[1];
                bytes[3] = tsb[2];
            }
        }
        // Walk a data-block chain; returns list of [t, s, b].
        collectDataChain(startTSB) {
            var chain = [];
            var current = startTSB;
            var guard = 0;
            var maxBlocks = DISK_TRACKS * DISK_SECTORS * DISK_BLOCKS;
            while (current && guard < maxBlocks) {
                chain[chain.length] = current;
                var bytes = this.readBlock(current[0], current[1], current[2]);
                current = this.getNextTSB(bytes);
                guard++;
            }
            return chain;
        }
        freeBlock(track, sector, block) {
            this.writeBlock(track, sector, block, this.emptyBlock());
        }
        countFreeDataBlocks() {
            var count = 0;
            for (var t = 1; t < DISK_TRACKS; t++) {
                for (var s = 0; s < DISK_SECTORS; s++) {
                    for (var b = 0; b < DISK_BLOCKS; b++) {
                        if (!this.isInUse(this.readBlock(t, s, b))) {
                            count++;
                        }
                    }
                }
            }
            return count;
        }
        // Reserve room after the filename null for a millisecond creation stamp.
        static MAX_FILENAME_LENGTH = DISK_DATA_SIZE - 14;
        // create <filename>: allocate a directory entry + empty first data block.
        // Names that begin with '.' are hidden from plain ls (visible with ls -a).
        // Returns null on success, or an error message string.
        create(filename) {
            if (!this.isFormatted()) {
                return "Disk is not formatted.";
            }
            if (!filename || filename.length === 0) {
                return "Filename required.";
            }
            if (filename.length > DeviceDriverDisk.MAX_FILENAME_LENGTH) {
                return "Filename too long (max " + DeviceDriverDisk.MAX_FILENAME_LENGTH + " characters).";
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
            this.writeFilename(dirBlock, filename, Date.now());
            this.writeBlock(dirTSB[0], dirTSB[1], dirTSB[2], dirBlock);
            TSOS.Control.hostUpdateDiskDisplay();
            return null;
        }
        // list: return directory entries. Hidden files (name starts with '.') are
        // omitted unless showHidden is true. Each entry includes size and create date.
        list(showHidden = false) {
            if (!this.isFormatted()) {
                return { error: "Disk is not formatted." };
            }
            var files = [];
            for (var s = 0; s < DISK_SECTORS; s++) {
                for (var b = 0; b < DISK_BLOCKS; b++) {
                    if (!this.isDirectoryTSB(0, s, b)) {
                        continue;
                    }
                    var bytes = this.readBlock(0, s, b);
                    if (!this.isInUse(bytes)) {
                        continue;
                    }
                    var name = this.readFilename(bytes);
                    if (!showHidden && name.length > 0 && name.charAt(0) === ".") {
                        continue;
                    }
                    var createdMs = this.readCreationDate(bytes);
                    var created = createdMs !== null
                        ? new Date(createdMs).toLocaleString()
                        : "unknown";
                    files[files.length] = {
                        name: name,
                        size: this.fileSize([bytes[1], bytes[2], bytes[3]]),
                        created: created
                    };
                }
            }
            return { files: files };
        }
        // read <filename>: return file contents, or { error } on failure.
        read(filename) {
            if (!this.isFormatted()) {
                return { error: "Disk is not formatted." };
            }
            if (!filename || filename.length === 0) {
                return { error: "Filename required." };
            }
            var entry = this.findDirectoryEntry(filename);
            if (!entry) {
                return { error: "File not found." };
            }
            var content = "";
            var chain = this.collectDataChain([entry[3], entry[4], entry[5]]);
            for (var i = 0; i < chain.length; i++) {
                var tsb = chain[i];
                var bytes = this.readBlock(tsb[0], tsb[1], tsb[2]);
                for (var j = DISK_HEADER_SIZE; j < DISK_BLOCK_SIZE; j++) {
                    if (bytes[j] === 0) {
                        return { data: content };
                    }
                    content += String.fromCharCode(bytes[j]);
                }
            }
            return { data: content };
        }
        // write <filename> data: overwrite file contents. Returns null on success.
        write(filename, data) {
            if (!this.isFormatted()) {
                return "Disk is not formatted.";
            }
            if (!filename || filename.length === 0) {
                return "Filename required.";
            }
            var entry = this.findDirectoryEntry(filename);
            if (!entry) {
                return "File not found.";
            }
            if (data === null || data === undefined) {
                data = "";
            }
            var firstTSB = [entry[3], entry[4], entry[5]];
            var chain = this.collectDataChain(firstTSB);
            var blocksNeeded = Math.max(1, Math.ceil(data.length / DISK_DATA_SIZE));
            if (data.length === 0) {
                blocksNeeded = 1;
            }
            var extraNeeded = blocksNeeded - chain.length;
            if (extraNeeded > 0 && this.countFreeDataBlocks() < extraNeeded) {
                return "Disk is full.";
            }
            // Free unused trailing blocks from a previous longer write.
            while (chain.length > blocksNeeded) {
                var drop = chain.pop();
                this.freeBlock(drop[0], drop[1], drop[2]);
            }
            // Allocate any additional blocks required for this write.
            while (chain.length < blocksNeeded) {
                var free = this.findFreeDataBlock();
                if (!free) {
                    return "Disk is full.";
                }
                var newBlock = this.emptyBlock();
                newBlock[0] = 0x01;
                this.writeBlock(free[0], free[1], free[2], newBlock);
                chain[chain.length] = free;
            }
            // Write data across the chain and link next pointers.
            var offset = 0;
            for (var i = 0; i < chain.length; i++) {
                var tsb = chain[i];
                var block = this.emptyBlock();
                block[0] = 0x01;
                if (i < chain.length - 1) {
                    this.setNextTSB(block, chain[i + 1]);
                }
                else {
                    this.setNextTSB(block, null);
                }
                for (var j = 0; j < DISK_DATA_SIZE; j++) {
                    if (offset < data.length) {
                        block[DISK_HEADER_SIZE + j] = data.charCodeAt(offset) & 0xFF;
                        offset++;
                    }
                    else {
                        block[DISK_HEADER_SIZE + j] = 0x00;
                    }
                }
                this.writeBlock(tsb[0], tsb[1], tsb[2], block);
            }
            TSOS.Control.hostUpdateDiskDisplay();
            return null;
        }
        // How many directory entries point at the same first data TSB?
        countLinksToData(dataTrack, dataSector, dataBlock) {
            var count = 0;
            for (var s = 0; s < DISK_SECTORS; s++) {
                for (var b = 0; b < DISK_BLOCKS; b++) {
                    if (!this.isDirectoryTSB(0, s, b)) {
                        continue;
                    }
                    var bytes = this.readBlock(0, s, b);
                    if (this.isInUse(bytes) &&
                        bytes[1] === dataTrack &&
                        bytes[2] === dataSector &&
                        bytes[3] === dataBlock) {
                        count++;
                    }
                }
            }
            return count;
        }
        // link <existing> <new>: second directory name for the same file data.
        // Returns null on success, or an error message string.
        link(existingFilename, newFilename) {
            if (!this.isFormatted()) {
                return "Disk is not formatted.";
            }
            if (!existingFilename || existingFilename.length === 0 ||
                !newFilename || newFilename.length === 0) {
                return "Usage: link <existing filename> <new filename>";
            }
            if (newFilename.length > DeviceDriverDisk.MAX_FILENAME_LENGTH) {
                return "Filename too long (max " + DeviceDriverDisk.MAX_FILENAME_LENGTH + " characters).";
            }
            if (existingFilename === newFilename) {
                return "Source and link filenames must differ.";
            }
            var entry = this.findDirectoryEntry(existingFilename);
            if (!entry) {
                return "File not found.";
            }
            if (this.fileExists(newFilename)) {
                return "File already exists.";
            }
            var dirTSB = this.findFreeDirectoryBlock();
            if (!dirTSB) {
                return "Directory is full.";
            }
            // New directory entry points at the same first data block (hard link).
            var dirBlock = this.emptyBlock();
            dirBlock[0] = 0x01;
            dirBlock[1] = entry[3];
            dirBlock[2] = entry[4];
            dirBlock[3] = entry[5];
            this.writeFilename(dirBlock, newFilename, Date.now());
            this.writeBlock(dirTSB[0], dirTSB[1], dirTSB[2], dirBlock);
            TSOS.Control.hostUpdateDiskDisplay();
            return null;
        }
        // delete <filename>: remove a directory name.
        // Data blocks are freed only when this was the last link to them.
        // Returns null on success, or an error message string.
        delete(filename) {
            if (!this.isFormatted()) {
                return "Disk is not formatted.";
            }
            if (!filename || filename.length === 0) {
                return "Filename required.";
            }
            var entry = this.findDirectoryEntry(filename);
            if (!entry) {
                return "File not found.";
            }
            // Free data only if no other name still points at this chain.
            if (this.countLinksToData(entry[3], entry[4], entry[5]) <= 1) {
                var chain = this.collectDataChain([entry[3], entry[4], entry[5]]);
                for (var i = 0; i < chain.length; i++) {
                    this.freeBlock(chain[i][0], chain[i][1], chain[i][2]);
                }
            }
            this.writeBlock(entry[0], entry[1], entry[2], this.emptyBlock());
            TSOS.Control.hostUpdateDiskDisplay();
            return null;
        }
        // copy <existing> <new>: duplicate a file under a new name.
        // Returns null on success, or an error message string.
        copy(existingFilename, newFilename) {
            if (!this.isFormatted()) {
                return "Disk is not formatted.";
            }
            if (!existingFilename || existingFilename.length === 0 ||
                !newFilename || newFilename.length === 0) {
                return "Usage: copy <existing filename> <new filename>";
            }
            if (newFilename.length > DeviceDriverDisk.MAX_FILENAME_LENGTH) {
                return "Filename too long (max " + DeviceDriverDisk.MAX_FILENAME_LENGTH + " characters).";
            }
            if (existingFilename === newFilename) {
                return "Source and destination filenames must differ.";
            }
            if (!this.fileExists(existingFilename)) {
                return "File not found.";
            }
            if (this.fileExists(newFilename)) {
                return "File already exists.";
            }
            var result = this.read(existingFilename);
            if (result.error) {
                return result.error;
            }
            var createErr = this.create(newFilename);
            if (createErr) {
                return createErr;
            }
            var writeErr = this.write(newFilename, result.data || "");
            if (writeErr) {
                this.delete(newFilename);
                return writeErr;
            }
            return null;
        }
        // rename <current> <new>: change a file's directory name in place.
        // Returns null on success, or an error message string.
        rename(currentFilename, newFilename) {
            if (!this.isFormatted()) {
                return "Disk is not formatted.";
            }
            if (!currentFilename || currentFilename.length === 0 ||
                !newFilename || newFilename.length === 0) {
                return "Usage: rename <current filename> <new filename>";
            }
            if (newFilename.length > DeviceDriverDisk.MAX_FILENAME_LENGTH) {
                return "Filename too long (max " + DeviceDriverDisk.MAX_FILENAME_LENGTH + " characters).";
            }
            if (currentFilename === newFilename) {
                return "Current and new filenames must differ.";
            }
            var entry = this.findDirectoryEntry(currentFilename);
            if (!entry) {
                return "File not found.";
            }
            if (this.fileExists(newFilename)) {
                return "File already exists.";
            }
            var dirBlock = this.readBlock(entry[0], entry[1], entry[2]);
            this.writeFilename(dirBlock, newFilename);
            this.writeBlock(entry[0], entry[1], entry[2], dirBlock);
            TSOS.Control.hostUpdateDiskDisplay();
            return null;
        }
    }
    TSOS.DeviceDriverDisk = DeviceDriverDisk;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=deviceDriverDisk.js.map