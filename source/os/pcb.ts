/* ------------
     pcb.ts

     Process Control Block — stores the state of one process.
     With demand paging, each process owns a page table instead of a
     fixed base/limit segment.
     ------------ */

module TSOS {

    export class PageTableEntry {
        constructor(
            public frame: number = -1,
            public valid: boolean = false,
            public dirty: boolean = false) {
        }
    }

    export class Pcb {

        public pageTable: PageTableEntry[] = [];
        // Canonical process image (backing store). Resident pages are copies in frames.
        public backing: number[] = [];

        constructor(
            public pid: number,
            public pc: number = 0,
            public acc: number = 0,
            public xReg: number = 0,
            public yReg: number = 0,
            public zFlag: number = 0,
            public ir: number = 0,
            public state: string = "Resident",
            public priority: number = DEFAULT_PRIORITY,
            public location: string = "Disk",
            public executeCycles: number = 0,
            public arrivalCycle: number = -1,
            public turnaroundTime: number = 0,
            public waitTime: number = 0,
            public metricsReported: boolean = false) {

            for (var i = 0; i < PAGES_PER_PROCESS; i++) {
                this.pageTable.push(new PageTableEntry());
            }
            for (var b = 0; b < LOGICAL_ADDRESS_SPACE; b++) {
                this.backing.push(0);
            }
        }

        // Refresh location from the page table: Memory if any page is resident.
        public syncLocation(): void {
            for (var i = 0; i < this.pageTable.length; i++) {
                if (this.pageTable[i].valid) {
                    this.location = "Memory";
                    return;
                }
            }
            this.location = "Disk";
        }

        // Frame number for a resident page, or -1.
        public residentFrame(page: number = 0): number {
            if (page < 0 || page >= this.pageTable.length) {
                return -1;
            }
            var entry = this.pageTable[page];
            return entry.valid ? entry.frame : -1;
        }
    }
}
