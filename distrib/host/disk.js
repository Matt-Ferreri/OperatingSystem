"use strict";
/* ------------
     Disk.ts

     Host hard-drive simulation: tracks x sectors x blocks, persisted in sessionStorage.
     ------------ */
var TSOS;
(function (TSOS) {
    class Disk {
        isFormatted = false;
        init() {
            this.isFormatted = sessionStorage.getItem(DISK_STORAGE_PREFIX + "formatted") === "1";
        }
        tsbKey(track, sector, block) {
            return track + ":" + sector + ":" + block;
        }
        storageKey(track, sector, block) {
            return DISK_STORAGE_PREFIX + this.tsbKey(track, sector, block);
        }
        // Read one block as DISK_BLOCK_SIZE bytes. Missing/unformatted blocks return zeros.
        read(track, sector, block) {
            var raw = sessionStorage.getItem(this.storageKey(track, sector, block));
            var bytes = new Array(DISK_BLOCK_SIZE);
            for (var i = 0; i < DISK_BLOCK_SIZE; i++) {
                bytes[i] = 0;
            }
            if (!raw || raw.length < DISK_BLOCK_SIZE * 2) {
                return bytes;
            }
            for (var j = 0; j < DISK_BLOCK_SIZE; j++) {
                bytes[j] = parseInt(raw.substr(j * 2, 2), 16) & 0xFF;
            }
            return bytes;
        }
        write(track, sector, block, data) {
            var hex = "";
            for (var i = 0; i < DISK_BLOCK_SIZE; i++) {
                var value = (i < data.length) ? (data[i] & 0xFF) : 0;
                hex += value.toString(16).toUpperCase().padStart(2, "0");
            }
            sessionStorage.setItem(this.storageKey(track, sector, block), hex);
        }
        setFormatted(formatted) {
            this.isFormatted = formatted;
            if (formatted) {
                sessionStorage.setItem(DISK_STORAGE_PREFIX + "formatted", "1");
            }
            else {
                sessionStorage.removeItem(DISK_STORAGE_PREFIX + "formatted");
            }
        }
        // Drop every block key we own (format / reset).
        clearStorage() {
            var toRemove = [];
            for (var i = 0; i < sessionStorage.length; i++) {
                var key = sessionStorage.key(i);
                if (key && key.indexOf(DISK_STORAGE_PREFIX) === 0) {
                    toRemove.push(key);
                }
            }
            for (var j = 0; j < toRemove.length; j++) {
                sessionStorage.removeItem(toRemove[j]);
            }
            this.isFormatted = false;
        }
    }
    TSOS.Disk = Disk;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=disk.js.map