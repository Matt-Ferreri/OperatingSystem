/* ------------
     CPU.ts

     Routines for the host CPU simulation, NOT for the OS itself.
     In this manner, it's A LITTLE BIT like a hypervisor,
     in that the Document environment inside a browser is the "bare metal" (so to speak) for which we write code
     that hosts our client OS. But that analogy only goes so far, and the lines are blurred, because we are using
     TypeScript/JavaScript in both the host and client environments.

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */

module TSOS {

    export class Cpu {

        constructor(public PC: number = 0,
                    public Acc: number = 0,
                    public Xreg: number = 0,
                    public Yreg: number = 0,
                    public Zflag: number = 0,
                    public IR: number = 0,
                    public isExecuting: boolean = false) {

        }

        public init(): void {
            this.PC = 0;
            this.Acc = 0;
            this.Xreg = 0;
            this.Yreg = 0;
            this.Zflag = 0;
            this.IR = 0;
            this.isExecuting = false;
        }

        public cycle(): void {
            _Kernel.krnTrace('CPU cycle');

            // Fetch
            this.IR = _MemoryAccessor.read(this.PC);
            this.PC = (this.PC + 1) & 0xFF;

            // Decode + Execute (one instruction per clock cycle)
            switch (this.IR) {
                case 0xA9: // LDA immediate
                    this.Acc = _MemoryAccessor.read(this.PC);
                    this.PC = (this.PC + 1) & 0xFF;
                    break;

                case 0xAD: // LDA absolute
                    this.Acc = _MemoryAccessor.read(this.fetchAddressOperand());
                    break;

                case 0x8D: // STA absolute
                    _MemoryAccessor.write(this.fetchAddressOperand(), this.Acc);
                    break;

                case 0x6D: // ADC absolute
                    this.Acc = (this.Acc + _MemoryAccessor.read(this.fetchAddressOperand())) & 0xFF;
                    break;

                case 0xA2: // LDX immediate
                    this.Xreg = _MemoryAccessor.read(this.PC);
                    this.PC = (this.PC + 1) & 0xFF;
                    break;

                case 0xAE: // LDX absolute
                    this.Xreg = _MemoryAccessor.read(this.fetchAddressOperand());
                    break;

                case 0xA0: // LDY immediate
                    this.Yreg = _MemoryAccessor.read(this.PC);
                    this.PC = (this.PC + 1) & 0xFF;
                    break;

                case 0xAC: // LDY absolute
                    this.Yreg = _MemoryAccessor.read(this.fetchAddressOperand());
                    break;

                case 0xEA: // NOP
                    break;

                case 0x00: // BRK — end process, keep OS running
                    this.terminateProcess();
                    break;

                case 0xEC: // CPX — Z = 1 if mem == X
                    this.Zflag = (_MemoryAccessor.read(this.fetchAddressOperand()) === this.Xreg) ? 1 : 0;
                    break;

                case 0xD0: // BNE — branch if Z == 0
                    var offset = _MemoryAccessor.read(this.PC);
                    this.PC = (this.PC + 1) & 0xFF;
                    if (this.Zflag === 0) {
                        if (offset >= 0x80) {
                            offset = offset - 0x100;
                        }
                        this.PC = (this.PC + offset) & 0xFF;
                    }
                    break;

                case 0xEE: // INC absolute
                    var incAddr = this.fetchAddressOperand();
                    var incVal = (_MemoryAccessor.read(incAddr) + 1) & 0xFF;
                    _MemoryAccessor.write(incAddr, incVal);
                    break;

                case 0xFF: // SYS
                    if (this.Xreg === 1) {
                        _StdOut.putText(String(this.Yreg));
                    } else if (this.Xreg === 2) {
                        var addr = this.Yreg;
                        while (true) {
                            var byte = _MemoryAccessor.read(addr);
                            if (byte === 0x00) {
                                break;
                            }
                            _StdOut.putText(String.fromCharCode(byte));
                            addr = (addr + 1) & 0xFF;
                        }
                    }
                    break;

                default:
                    _Kernel.krnTrapError("Invalid opcode: " + this.IR.toString(16).toUpperCase());
                    this.terminateProcess();
                    break;
            }

            this.syncPcb();
            Control.hostUpdateCpuDisplay();
            Control.hostUpdateMemoryDisplay(_Memory.cells);
        }

        // Little-endian 2-byte address operand; advances PC by 2.
        private fetchAddressOperand(): number {
            var lowByte = _MemoryAccessor.read(this.PC);
            this.PC = (this.PC + 1) & 0xFF;
            var highByte = _MemoryAccessor.read(this.PC);
            this.PC = (this.PC + 1) & 0xFF;
            return ((highByte << 8) | lowByte) & 0xFFFF;
        }

        private syncPcb(): void {
            if (!_CurrentPCB) {
                return;
            }
            _CurrentPCB.pc = this.PC;
            _CurrentPCB.acc = this.Acc;
            _CurrentPCB.xReg = this.Xreg;
            _CurrentPCB.yReg = this.Yreg;
            _CurrentPCB.zFlag = this.Zflag;
            _CurrentPCB.ir = this.IR;
        }

        private terminateProcess(): void {
            this.isExecuting = false;
            if (_CurrentPCB) {
                this.syncPcb();
                _CurrentPCB.state = "Terminated";
                Control.hostUpdatePcbDisplay();
                _CurrentPCB = null;
            }
            Control.hostUpdateCpuDisplay();
        }
    }
}
