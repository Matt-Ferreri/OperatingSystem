/* ------------
     pcb.ts

     Process Control Block — stores the state of one process.
     ------------ */

module TSOS {

    export class Pcb {

        constructor(
            public pid: number,
            public base: number,
            public limit: number,
            public pc: number = 0,
            public acc: number = 0,
            public xReg: number = 0,
            public yReg: number = 0,
            public zFlag: number = 0,
            public ir: number = 0,
            public state: string = "Resident",
            public priority: number = 0,
            public location: string = "Memory",
            public segment: number = 0,
            public executeCycles: number = 0,
            public arrivalCycle: number = -1,
            public turnaroundTime: number = 0,
            public waitTime: number = 0,
            public metricsReported: boolean = false) {
        }
    }
}
