"use strict";
/* ------------
     pcb.ts

     Process Control Block — stores the state of one process.
     With demand paging, each process owns a page table instead of a
     fixed base/limit segment.
     ------------ */
var TSOS;
(function (TSOS) {
    class PageTableEntry {
        frame;
        valid;
        dirty;
        constructor(frame = -1, valid = false, dirty = false) {
            this.frame = frame;
            this.valid = valid;
            this.dirty = dirty;
        }
    }
    TSOS.PageTableEntry = PageTableEntry;
    class Pcb {
        pid;
        pc;
        acc;
        xReg;
        yReg;
        zFlag;
        ir;
        state;
        priority;
        location;
        executeCycles;
        arrivalCycle;
        turnaroundTime;
        waitTime;
        metricsReported;
        pageTable = [];
        // Canonical process image (backing store). Resident pages are copies in frames.
        backing = [];
        constructor(pid, pc = 0, acc = 0, xReg = 0, yReg = 0, zFlag = 0, ir = 0, state = "Resident", priority = DEFAULT_PRIORITY, location = "Disk", executeCycles = 0, arrivalCycle = -1, turnaroundTime = 0, waitTime = 0, metricsReported = false) {
            this.pid = pid;
            this.pc = pc;
            this.acc = acc;
            this.xReg = xReg;
            this.yReg = yReg;
            this.zFlag = zFlag;
            this.ir = ir;
            this.state = state;
            this.priority = priority;
            this.location = location;
            this.executeCycles = executeCycles;
            this.arrivalCycle = arrivalCycle;
            this.turnaroundTime = turnaroundTime;
            this.waitTime = waitTime;
            this.metricsReported = metricsReported;
            for (var i = 0; i < PAGES_PER_PROCESS; i++) {
                this.pageTable.push(new PageTableEntry());
            }
            for (var b = 0; b < LOGICAL_ADDRESS_SPACE; b++) {
                this.backing.push(0);
            }
        }
        // Refresh location from the page table: Memory if any page is resident.
        syncLocation() {
            for (var i = 0; i < this.pageTable.length; i++) {
                if (this.pageTable[i].valid) {
                    this.location = "Memory";
                    return;
                }
            }
            this.location = "Disk";
        }
        // Frame number for a resident page, or -1.
        residentFrame(page = 0) {
            if (page < 0 || page >= this.pageTable.length) {
                return -1;
            }
            var entry = this.pageTable[page];
            return entry.valid ? entry.frame : -1;
        }
    }
    TSOS.Pcb = Pcb;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=pcb.js.map