"use strict";
/* ------------
     MemoryManager.ts

     Demand paging memory manager. Physical RAM is FRAME_COUNT frames of
     PAGE_SIZE bytes. Each process has a page table and a backing image;
     pages are brought into frames on fault and written back on eviction.
     ------------ */
var TSOS;
(function (TSOS) {
    class MemoryManager {
        // frameTable[f] = { pid, page } while frame f is occupied; null if free.
        frameTable = [];
        nextPid = 0;
        // FIFO victim cursor among physical frames.
        nextVictimFrame = 0;
        residentList = [];
        constructor() {
            this.resetFrames();
        }
        resetFrames() {
            this.frameTable = [];
            for (var i = 0; i < FRAME_COUNT; i++) {
                this.frameTable.push(null);
            }
            this.nextVictimFrame = 0;
        }
        pageFilename(pid) {
            return ".page" + pid;
        }
        bytesToHex(bytes) {
            var hex = "";
            for (var i = 0; i < bytes.length; i++) {
                hex += (bytes[i] & 0xFF).toString(16).toUpperCase().padStart(2, "0");
            }
            return hex;
        }
        hexToBytes(hex) {
            if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
                return null;
            }
            var bytes = [];
            for (var i = 0; i < hex.length; i += 2) {
                bytes.push(parseInt(hex.substring(i, i + 2), 16));
            }
            return bytes;
        }
        findFreeFrame() {
            for (var i = 0; i < this.frameTable.length; i++) {
                if (!this.frameTable[i]) {
                    return i;
                }
            }
            return -1;
        }
        clearFrame(frame) {
            var base = frame * PAGE_SIZE;
            for (var offset = 0; offset < PAGE_SIZE; offset++) {
                _Memory.cells[base + offset] = 0;
            }
        }
        writeFrame(frame, bytes) {
            var base = frame * PAGE_SIZE;
            for (var offset = 0; offset < PAGE_SIZE; offset++) {
                _Memory.cells[base + offset] = (offset < bytes.length) ? (bytes[offset] & 0xFF) : 0;
            }
        }
        readFrame(frame) {
            var base = frame * PAGE_SIZE;
            var bytes = [];
            for (var offset = 0; offset < PAGE_SIZE; offset++) {
                bytes.push(_Memory.cells[base + offset] & 0xFF);
            }
            return bytes;
        }
        // Persist the process backing image to disk (creates the file if needed).
        writeBackingToDisk(pcb) {
            if (!_krnDiskDriver || !_krnDiskDriver.isFormatted()) {
                return false;
            }
            var name = this.pageFilename(pcb.pid);
            var existing = _krnDiskDriver.read(name);
            if (existing && existing.error) {
                var createErr = _krnDiskDriver.create(name);
                if (createErr) {
                    return false;
                }
            }
            var writeErr = _krnDiskDriver.write(name, this.bytesToHex(pcb.backing));
            return !writeErr;
        }
        // Refresh backing from the on-disk page file when present.
        readBackingFromDisk(pcb) {
            if (!_krnDiskDriver || !_krnDiskDriver.isFormatted()) {
                return false;
            }
            var name = this.pageFilename(pcb.pid);
            var result = _krnDiskDriver.read(name);
            if (!result || result.error || result.data === undefined) {
                return false;
            }
            var bytes = this.hexToBytes(result.data);
            if (!bytes) {
                return false;
            }
            for (var i = 0; i < LOGICAL_ADDRESS_SPACE; i++) {
                pcb.backing[i] = (i < bytes.length) ? (bytes[i] & 0xFF) : 0;
            }
            return true;
        }
        deletePageFile(pcb) {
            if (!_krnDiskDriver || !_krnDiskDriver.isFormatted()) {
                return;
            }
            _krnDiskDriver.delete(this.pageFilename(pcb.pid));
        }
        pageBytesFromBacking(pcb, page) {
            var start = page * PAGE_SIZE;
            var bytes = [];
            for (var i = 0; i < PAGE_SIZE; i++) {
                bytes.push(pcb.backing[start + i] & 0xFF);
            }
            return bytes;
        }
        writePageIntoBacking(pcb, page, bytes) {
            var start = page * PAGE_SIZE;
            for (var i = 0; i < PAGE_SIZE; i++) {
                pcb.backing[start + i] = (i < bytes.length) ? (bytes[i] & 0xFF) : 0;
            }
        }
        // Evict one resident page from a frame back to its process backing store.
        pageOut(frame) {
            if (frame < 0 || frame >= this.frameTable.length || !this.frameTable[frame]) {
                return false;
            }
            var owner = this.frameTable[frame];
            var pcb = this.findPcb(owner.pid);
            if (!pcb) {
                this.frameTable[frame] = null;
                this.clearFrame(frame);
                return true;
            }
            // Never evict a page belonging to the running process.
            if (pcb === _CurrentPCB || pcb.state === "Running") {
                return false;
            }
            var entry = pcb.pageTable[owner.page];
            if (entry && entry.valid && entry.dirty) {
                this.writePageIntoBacking(pcb, owner.page, this.readFrame(frame));
                this.writeBackingToDisk(pcb);
            }
            if (entry) {
                entry.valid = false;
                entry.dirty = false;
                entry.frame = -1;
            }
            pcb.syncLocation();
            this.frameTable[frame] = null;
            this.clearFrame(frame);
            if (_Kernel) {
                _Kernel.krnTrace("Page-out PID " + owner.pid + " page " + owner.page +
                    " from frame " + frame);
            }
            return true;
        }
        // Choose a victim frame via FIFO, skipping the running process's frames.
        findVictimFrame(exclude) {
            for (var attempt = 0; attempt < FRAME_COUNT; attempt++) {
                var frame = this.nextVictimFrame;
                this.nextVictimFrame = (this.nextVictimFrame + 1) % FRAME_COUNT;
                var owner = this.frameTable[frame];
                if (!owner) {
                    return frame;
                }
                var pcb = this.findPcb(owner.pid);
                if (!pcb || pcb === exclude || pcb === _CurrentPCB || pcb.state === "Running") {
                    continue;
                }
                if (pcb.state === "Terminated" || pcb.state === "Killed") {
                    continue;
                }
                return frame;
            }
            return -1;
        }
        // Bring one logical page into a physical frame (page fault handler).
        pageIn(pcb, page) {
            if (!pcb || page < 0 || page >= PAGES_PER_PROCESS) {
                return false;
            }
            var entry = pcb.pageTable[page];
            if (entry.valid) {
                return true;
            }
            var frame = this.findFreeFrame();
            if (frame < 0) {
                var victim = this.findVictimFrame(pcb);
                if (victim < 0 || !this.pageOut(victim)) {
                    return false;
                }
                frame = this.findFreeFrame();
                if (frame < 0) {
                    return false;
                }
            }
            // Prefer live backing; refresh from disk when the process was fully on disk.
            if (pcb.location === "Disk") {
                this.readBackingFromDisk(pcb);
            }
            this.writeFrame(frame, this.pageBytesFromBacking(pcb, page));
            this.frameTable[frame] = { pid: pcb.pid, page: page };
            entry.frame = frame;
            entry.valid = true;
            entry.dirty = false;
            pcb.syncLocation();
            if (_Kernel) {
                _Kernel.krnTrace("Page-in PID " + pcb.pid + " page " + page +
                    " to frame " + frame);
            }
            TSOS.Control.hostUpdateMemoryDisplay(_Memory.cells);
            TSOS.Control.hostUpdatePcbDisplay();
            TSOS.Control.hostUpdateDiskDisplay();
            return true;
        }
        // Guarantee the page holding logicalAddr is resident; used by the MMU.
        ensurePage(pcb, logicalAddr) {
            if (!pcb) {
                return false;
            }
            if (logicalAddr < 0 || logicalAddr >= LOGICAL_ADDRESS_SPACE) {
                return false;
            }
            var page = Math.floor(logicalAddr / PAGE_SIZE);
            return this.pageIn(pcb, page);
        }
        // Ensure the process can start executing (page containing PC is resident).
        ensureInMemory(pcb) {
            if (!pcb) {
                return false;
            }
            return this.ensurePage(pcb, pcb.pc & 0xFF);
        }
        // Translate a logical address to a physical one, faulting the page in if needed.
        // Returns -1 on failure (bounds or unrecoverable fault).
        translateAddress(pcb, logicalAddr, isWrite = false) {
            if (!pcb) {
                return -1;
            }
            if (logicalAddr < 0 || logicalAddr >= LOGICAL_ADDRESS_SPACE) {
                _Kernel.krnTrapError("Memory access out of bounds: " + logicalAddr);
                return -1;
            }
            var page = Math.floor(logicalAddr / PAGE_SIZE);
            var offset = logicalAddr % PAGE_SIZE;
            var entry = pcb.pageTable[page];
            if (!entry.valid) {
                if (_Kernel) {
                    _Kernel.krnTrace("Page fault PID " + pcb.pid + " page " + page);
                }
                if (!this.pageIn(pcb, page)) {
                    _Kernel.krnTrapError("Page fault failed for PID " + pcb.pid +
                        " page " + page);
                    return -1;
                }
                entry = pcb.pageTable[page];
            }
            if (isWrite) {
                entry.dirty = true;
            }
            return entry.frame * PAGE_SIZE + offset;
        }
        // Translate without faulting (for UI highlighting). Returns -1 if not resident.
        peekPhysical(pcb, logicalAddr) {
            if (!pcb || logicalAddr < 0 || logicalAddr >= LOGICAL_ADDRESS_SPACE) {
                return -1;
            }
            var page = Math.floor(logicalAddr / PAGE_SIZE);
            var entry = pcb.pageTable[page];
            if (!entry.valid) {
                return -1;
            }
            return entry.frame * PAGE_SIZE + (logicalAddr % PAGE_SIZE);
        }
        // Release every frame owned by this process (does not remove the PCB).
        releaseFrames(pcb) {
            if (!pcb) {
                return;
            }
            for (var page = 0; page < pcb.pageTable.length; page++) {
                var entry = pcb.pageTable[page];
                if (!entry.valid) {
                    continue;
                }
                // Write dirty pages back into backing before freeing.
                if (entry.dirty) {
                    this.writePageIntoBacking(pcb, page, this.readFrame(entry.frame));
                }
                this.frameTable[entry.frame] = null;
                this.clearFrame(entry.frame);
                entry.valid = false;
                entry.dirty = false;
                entry.frame = -1;
            }
            pcb.syncLocation();
        }
        // Free frames and delete the on-disk page file when a process ends.
        freeProcess(pcb) {
            if (!pcb) {
                return;
            }
            this.releaseFrames(pcb);
            this.deletePageFile(pcb);
            TSOS.Control.hostUpdateMemoryDisplay(_Memory.cells);
            TSOS.Control.hostUpdatePcbDisplay();
            TSOS.Control.hostUpdateDiskDisplay();
        }
        // Load program bytes: keep a backing image, page into a free frame if one
        // exists, otherwise leave the process on disk for a later page fault.
        loadProgram(bytes, priority = DEFAULT_PRIORITY) {
            if (bytes.length > LOGICAL_ADDRESS_SPACE) {
                return null;
            }
            var pcb = new TSOS.Pcb(this.nextPid);
            pcb.priority = priority;
            for (var i = 0; i < LOGICAL_ADDRESS_SPACE; i++) {
                pcb.backing[i] = (i < bytes.length) ? (bytes[i] & 0xFF) : 0;
            }
            var hasDisk = _krnDiskDriver && _krnDiskDriver.isFormatted();
            var freeFrame = this.findFreeFrame();
            if (freeFrame < 0 && !hasDisk) {
                return null;
            }
            // Always keep a disk page file when the disk is available so eviction works.
            if (hasDisk && !this.writeBackingToDisk(pcb)) {
                return null;
            }
            this.nextPid++;
            this.residentList.push(pcb);
            if (freeFrame >= 0) {
                // Eager page-in of page 0 so load still shows up in the memory display.
                this.pageIn(pcb, 0);
            }
            else {
                pcb.syncLocation();
                if (_Kernel) {
                    _Kernel.krnTrace("Loaded PID " + pcb.pid + " onto disk (demand page)");
                }
                TSOS.Control.hostUpdatePcbDisplay();
                TSOS.Control.hostUpdateDiskDisplay();
            }
            return pcb;
        }
        // Zero every frame and drop all resident processes.
        clearMemory() {
            if (_CPU && _CPU.isExecuting) {
                return false;
            }
            for (var i = 0; i < this.residentList.length; i++) {
                this.deletePageFile(this.residentList[i]);
            }
            for (var addr = 0; addr < MEMORY_SIZE; addr++) {
                _Memory.cells[addr] = 0;
            }
            this.resetFrames();
            this.residentList = [];
            _CurrentPCB = null;
            _QuantumCount = 0;
            _CpuCycles = 0;
            if (_ReadyQueue) {
                while (!_ReadyQueue.isEmpty()) {
                    _ReadyQueue.dequeue();
                }
            }
            TSOS.Control.hostUpdateMemoryDisplay(_Memory.cells);
            TSOS.Control.hostUpdatePcbDisplay();
            TSOS.Control.hostUpdateDiskDisplay();
            return true;
        }
        findPcb(pid) {
            for (var i = 0; i < this.residentList.length; i++) {
                if (this.residentList[i].pid === pid) {
                    return this.residentList[i];
                }
            }
            return null;
        }
    }
    TSOS.MemoryManager = MemoryManager;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=memoryManager.js.map