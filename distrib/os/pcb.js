"use strict";
/* ------------
     pcb.ts

     Process Control Block — stores the state of one process.
     ------------ */
var TSOS;
(function (TSOS) {
    class Pcb {
        pid;
        base;
        limit;
        pc;
        acc;
        xReg;
        yReg;
        zFlag;
        ir;
        state;
        priority;
        location;
        segment;
        executeCycles;
        arrivalCycle;
        turnaroundTime;
        waitTime;
        metricsReported;
        constructor(pid, base, limit, pc = 0, acc = 0, xReg = 0, yReg = 0, zFlag = 0, ir = 0, state = "Resident", priority = 0, location = "Memory", segment = 0, executeCycles = 0, arrivalCycle = -1, turnaroundTime = 0, waitTime = 0, metricsReported = false) {
            this.pid = pid;
            this.base = base;
            this.limit = limit;
            this.pc = pc;
            this.acc = acc;
            this.xReg = xReg;
            this.yReg = yReg;
            this.zFlag = zFlag;
            this.ir = ir;
            this.state = state;
            this.priority = priority;
            this.location = location;
            this.segment = segment;
            this.executeCycles = executeCycles;
            this.arrivalCycle = arrivalCycle;
            this.turnaroundTime = turnaroundTime;
            this.waitTime = waitTime;
            this.metricsReported = metricsReported;
        }
    }
    TSOS.Pcb = Pcb;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=pcb.js.map