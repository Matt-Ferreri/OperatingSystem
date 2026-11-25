/* ------------
     MemoryManager.ts

     Demand paging memory manager. Physical RAM is FRAME_COUNT frames of
     PAGE_SIZE bytes. Each process has a page table and a backing image;
     pages are brought into frames on fault and written back on eviction.
     ------------ */

module TSOS {

    export class MemoryManager {

        // frameTable[f] = { pid, page } while frame f is occupied; null if free.
        private frameTable: ({ pid: number; page: number } | null)[] = [];
        private nextPid: number = 0;
        // FIFO victim cursor among physical frames.
        private nextVictimFrame: number = 0;
        public residentList: Pcb[] = [];

        constructor() {
            this.resetFrames();
        }

        private resetFrames(): void {
            this.frameTable = [];
            for (var i = 0; i < FRAME_COUNT; i++) {
                this.frameTable.push(null);
            }
            this.nextVictimFrame = 0;
        }

        private pageFilename(pid: number): string {
            return ".page" + pid;
        }

        private bytesToHex(bytes: number[]): string {
            var hex = "";
            for (var i = 0; i < bytes.length; i++) {
                hex += (bytes[i] & 0xFF).toString(16).toUpperCase().padStart(2, "0");
            }
            return hex;
        }

        private hexToBytes(hex: string): number[] | null {
            if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
                return null;
            }
            var bytes: number[] = [];
            for (var i = 0; i < hex.length; i += 2) {
                bytes.push(parseInt(hex.substring(i, i + 2), 16));
            }
            return bytes;
        }

        private findFreeFrame(): number {
            for (var i = 0; i < this.frameTable.length; i++) {
                if (!this.frameTable[i]) {
                    return i;
                }
            }
            return -1;
        }

        private clearFrame(frame: number): void {
            var base = frame * PAGE_SIZE;
            for (var offset = 0; offset < PAGE_SIZE; offset++) {
                _Memory.cells[base + offset] = 0;
            }
        }

        private writeFrame(frame: number, bytes: number[]): void {
            var base = frame * PAGE_SIZE;
            for (var offset = 0; offset < PAGE_SIZE; offset++) {
                _Memory.cells[base + offset] = (offset < bytes.length) ? (bytes[offset] & 0xFF) : 0;
            }
        }

        private readFrame(frame: number): number[] {
            var base = frame * PAGE_SIZE;
            var bytes: number[] = [];
            for (var offset = 0; offset < PAGE_SIZE; offset++) {
                bytes.push(_Memory.cells[base + offset] & 0xFF);
            }
            return bytes;
        }

        // Persist the process backing image to disk (creates the file if needed).
        private writeBackingToDisk(pcb: Pcb): boolean {
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
        private readBackingFromDisk(pcb: Pcb): boolean {
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

        private deletePageFile(pcb: Pcb): void {
            if (!_krnDiskDriver || !_krnDiskDriver.isFormatted()) {
                return;
            }
            _krnDiskDriver.delete(this.pageFilename(pcb.pid));
        }

        private pageBytesFromBacking(pcb: Pcb, page: number): number[] {
            var start = page * PAGE_SIZE;
            var bytes: number[] = [];
            for (var i = 0; i < PAGE_SIZE; i++) {
                bytes.push(pcb.backing[start + i] & 0xFF);
            }
            return bytes;
        }

        private writePageIntoBacking(pcb: Pcb, page: number, bytes: number[]): void {
            var start = page * PAGE_SIZE;
            for (var i = 0; i < PAGE_SIZE; i++) {
                pcb.backing[start + i] = (i < bytes.length) ? (bytes[i] & 0xFF) : 0;
            }
        }

        // Evict one resident page from a frame back to its process backing store.
        public pageOut(frame: number): boolean {
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
        private findVictimFrame(exclude: Pcb): number {
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
        public pageIn(pcb: Pcb, page: number): boolean {
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
            Control.hostUpdateMemoryDisplay(_Memory.cells);
            Control.hostUpdatePcbDisplay();
            Control.hostUpdateDiskDisplay();
            return true;
        }

        // Guarantee the page holding logicalAddr is resident; used by the MMU.
        public ensurePage(pcb: Pcb, logicalAddr: number): boolean {
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
        public ensureInMemory(pcb: Pcb): boolean {
            if (!pcb) {
                return false;
            }
            return this.ensurePage(pcb, pcb.pc & 0xFF);
        }

        // Translate a logical address to a physical one, faulting the page in if needed.
        // Returns -1 on failure (bounds or unrecoverable fault).
        public translateAddress(pcb: Pcb, logicalAddr: number, isWrite: boolean = false): number {
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
        public peekPhysical(pcb: Pcb, logicalAddr: number): number {
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
        public releaseFrames(pcb: Pcb): void {
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
        public freeProcess(pcb: Pcb): void {
            if (!pcb) {
                return;
            }
            this.releaseFrames(pcb);
            this.deletePageFile(pcb);
            Control.hostUpdateMemoryDisplay(_Memory.cells);
            Control.hostUpdatePcbDisplay();
            Control.hostUpdateDiskDisplay();
        }

        // Load program bytes: keep a backing image, page into a free frame if one
        // exists, otherwise leave the process on disk for a later page fault.
        public loadProgram(bytes: number[], priority: number = DEFAULT_PRIORITY): Pcb | null {
            if (bytes.length > LOGICAL_ADDRESS_SPACE) {
                return null;
            }

            var pcb = new Pcb(this.nextPid);
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
            } else {
                pcb.syncLocation();
                if (_Kernel) {
                    _Kernel.krnTrace("Loaded PID " + pcb.pid + " onto disk (demand page)");
                }
                Control.hostUpdatePcbDisplay();
                Control.hostUpdateDiskDisplay();
            }

            return pcb;
        }

        // Zero every frame and drop all resident processes.
        public clearMemory(): boolean {
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

            Control.hostUpdateMemoryDisplay(_Memory.cells);
            Control.hostUpdatePcbDisplay();
            Control.hostUpdateDiskDisplay();
            return true;
        }

        public findPcb(pid: number): Pcb | null {
            for (var i = 0; i < this.residentList.length; i++) {
                if (this.residentList[i].pid === pid) {
                    return this.residentList[i];
                }
            }
            return null;
        }
    }
}
