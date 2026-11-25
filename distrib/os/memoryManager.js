"use strict";
/* ------------
     MemoryManager.ts

     OS service that places programs into the three fixed memory segments
     starting at MEMORY_SEGMENT_BASES (0, 256, 512), assigns PIDs, and
     creates Process Control Blocks. When all segments are full, additional
     programs are swapped to disk via the dsDD (roll-out / roll-in).
     ------------ */
var TSOS;
(function (TSOS) {
    class MemoryManager {
        segmentUsed = [false, false, false];
        nextPid = 0;
        residentList = [];
        swapFilename(pid) {
            return ".swap" + pid;
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
        findFreeSegment() {
            for (var i = 0; i < this.segmentUsed.length; i++) {
                if (!this.segmentUsed[i]) {
                    return i;
                }
            }
            return -1;
        }
        readSegmentBytes(base) {
            var bytes = [];
            for (var offset = 0; offset < MEMORY_SEGMENT_SIZE; offset++) {
                bytes.push(_Memory.cells[base + offset] & 0xFF);
            }
            return bytes;
        }
        writeSegmentBytes(base, bytes) {
            for (var offset = 0; offset < MEMORY_SEGMENT_SIZE; offset++) {
                _Memory.cells[base + offset] = (offset < bytes.length) ? (bytes[offset] & 0xFF) : 0;
            }
        }
        clearSegment(base) {
            for (var offset = 0; offset < MEMORY_SEGMENT_SIZE; offset++) {
                _Memory.cells[base + offset] = 0;
            }
        }
        // Release a process's physical partition (does not remove the PCB).
        releaseSegment(pcb) {
            if (!pcb || pcb.location !== "Memory") {
                return;
            }
            if (pcb.segment >= 0 && pcb.segment < this.segmentUsed.length) {
                this.segmentUsed[pcb.segment] = false;
                this.clearSegment(pcb.base);
            }
        }
        // Delete the on-disk swap image for a process, if any.
        deleteSwapFile(pcb) {
            if (!_krnDiskDriver || !_krnDiskDriver.isFormatted()) {
                return;
            }
            var name = this.swapFilename(pcb.pid);
            _krnDiskDriver.delete(name);
        }
        // Free memory and/or disk backing when a process ends.
        freeProcess(pcb) {
            if (!pcb) {
                return;
            }
            if (pcb.location === "Memory") {
                this.releaseSegment(pcb);
            }
            this.deleteSwapFile(pcb);
            TSOS.Control.hostUpdateMemoryDisplay(_Memory.cells);
            TSOS.Control.hostUpdatePcbDisplay();
        }
        // Write a memory-resident process to disk and free its segment.
        rollOut(pcb) {
            if (!pcb || pcb.location !== "Memory") {
                return false;
            }
            if (!_krnDiskDriver || !_krnDiskDriver.isFormatted()) {
                return false;
            }
            if (pcb === _CurrentPCB || pcb.state === "Running") {
                return false;
            }
            var bytes = this.readSegmentBytes(pcb.base);
            var hex = this.bytesToHex(bytes);
            var name = this.swapFilename(pcb.pid);
            // Reuse an existing swap file when possible so soft-deletes do not fill the directory.
            var existing = _krnDiskDriver.read(name);
            if (existing && existing.error) {
                var createErr = _krnDiskDriver.create(name);
                if (createErr) {
                    return false;
                }
            }
            var writeErr = _krnDiskDriver.write(name, hex);
            if (writeErr) {
                return false;
            }
            this.segmentUsed[pcb.segment] = false;
            this.clearSegment(pcb.base);
            pcb.location = "Disk";
            pcb.segment = -1;
            pcb.base = 0;
            if (_Kernel) {
                _Kernel.krnTrace("Roll-out PID " + pcb.pid + " to " + name);
            }
            TSOS.Control.hostUpdateMemoryDisplay(_Memory.cells);
            TSOS.Control.hostUpdatePcbDisplay();
            TSOS.Control.hostUpdateDiskDisplay();
            return true;
        }
        // Choose a memory-resident victim to roll out (Ready preferred over Resident).
        findRollOutVictim(exclude) {
            var residentCandidate = null;
            for (var i = 0; i < this.residentList.length; i++) {
                var pcb = this.residentList[i];
                if (pcb === exclude || pcb.location !== "Memory") {
                    continue;
                }
                if (pcb.state === "Running" || pcb === _CurrentPCB) {
                    continue;
                }
                if (pcb.state === "Terminated" || pcb.state === "Killed") {
                    continue;
                }
                if (pcb.state === "Ready") {
                    return pcb;
                }
                if (!residentCandidate && pcb.state === "Resident") {
                    residentCandidate = pcb;
                }
            }
            return residentCandidate;
        }
        // Load a disk-backed process into a free (or newly freed) memory segment.
        rollIn(pcb) {
            if (!pcb || pcb.location !== "Disk") {
                return pcb && pcb.location === "Memory";
            }
            if (!_krnDiskDriver || !_krnDiskDriver.isFormatted()) {
                return false;
            }
            var segment = this.findFreeSegment();
            if (segment < 0) {
                var victim = this.findRollOutVictim(pcb);
                if (!victim || !this.rollOut(victim)) {
                    return false;
                }
                segment = this.findFreeSegment();
                if (segment < 0) {
                    return false;
                }
            }
            var name = this.swapFilename(pcb.pid);
            var result = _krnDiskDriver.read(name);
            if (!result || result.error || result.data === undefined) {
                return false;
            }
            var bytes = this.hexToBytes(result.data);
            if (!bytes) {
                return false;
            }
            var base = MEMORY_SEGMENT_BASES[segment];
            this.writeSegmentBytes(base, bytes);
            this.segmentUsed[segment] = true;
            pcb.segment = segment;
            pcb.base = base;
            pcb.limit = MEMORY_SEGMENT_SIZE;
            pcb.location = "Memory";
            // Keep the swap file until the process exits so roll-out can overwrite it.
            if (_Kernel) {
                _Kernel.krnTrace("Roll-in PID " + pcb.pid + " to segment " + segment);
            }
            TSOS.Control.hostUpdateMemoryDisplay(_Memory.cells);
            TSOS.Control.hostUpdatePcbDisplay();
            TSOS.Control.hostUpdateDiskDisplay();
            return true;
        }
        // Guarantee a process is in physical memory before the CPU runs it.
        ensureInMemory(pcb) {
            if (!pcb) {
                return false;
            }
            if (pcb.location === "Memory") {
                return true;
            }
            return this.rollIn(pcb);
        }
        // Store a new program image on disk (used when all segments are full).
        loadProgramToDisk(bytes, priority) {
            if (!_krnDiskDriver || !_krnDiskDriver.isFormatted()) {
                return null;
            }
            var padded = [];
            for (var i = 0; i < MEMORY_SEGMENT_SIZE; i++) {
                padded.push(i < bytes.length ? (bytes[i] & 0xFF) : 0);
            }
            var pid = this.nextPid;
            var name = this.swapFilename(pid);
            var createErr = _krnDiskDriver.create(name);
            if (createErr) {
                return null;
            }
            var writeErr = _krnDiskDriver.write(name, this.bytesToHex(padded));
            if (writeErr) {
                _krnDiskDriver.delete(name);
                return null;
            }
            var pcb = new TSOS.Pcb(pid, 0, MEMORY_SEGMENT_SIZE);
            pcb.segment = -1;
            pcb.priority = priority;
            pcb.location = "Disk";
            this.nextPid++;
            this.residentList.push(pcb);
            if (_Kernel) {
                _Kernel.krnTrace("Loaded PID " + pcb.pid + " onto disk swap");
            }
            TSOS.Control.hostUpdatePcbDisplay();
            TSOS.Control.hostUpdateDiskDisplay();
            return pcb;
        }
        // Load program bytes into the next free segment, or onto disk when full.
        // Optional priority overrides DEFAULT_PRIORITY (lower = higher priority).
        // Returns the new PCB, or null on failure.
        loadProgram(bytes, priority = DEFAULT_PRIORITY) {
            if (bytes.length > MEMORY_SEGMENT_SIZE) {
                return null;
            }
            var segment = this.findFreeSegment();
            if (segment < 0) {
                return this.loadProgramToDisk(bytes, priority);
            }
            var base = MEMORY_SEGMENT_BASES[segment];
            // Clear the segment, then write the program.
            this.clearSegment(base);
            for (var j = 0; j < bytes.length; j++) {
                _Memory.cells[base + j] = bytes[j] & 0xFF;
            }
            this.segmentUsed[segment] = true;
            var pcb = new TSOS.Pcb(this.nextPid, base, MEMORY_SEGMENT_SIZE);
            pcb.segment = segment;
            pcb.priority = priority;
            pcb.location = "Memory";
            this.nextPid++;
            this.residentList.push(pcb);
            TSOS.Control.hostUpdateMemoryDisplay(_Memory.cells);
            TSOS.Control.hostUpdatePcbDisplay();
            return pcb;
        }
        // Zero every segment and release the resident processes that occupied them.
        // Returns false when a process is still executing.
        clearMemory() {
            if (_CPU && _CPU.isExecuting) {
                return false;
            }
            for (var i = 0; i < this.residentList.length; i++) {
                this.deleteSwapFile(this.residentList[i]);
            }
            for (var addr = 0; addr < MEMORY_SIZE; addr++) {
                _Memory.cells[addr] = 0;
            }
            this.segmentUsed = [false, false, false];
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