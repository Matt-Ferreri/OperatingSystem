/* ------------
     Memory.ts

     Host memory simulation: one contiguous block of MEMORY_SIZE bytes.
     ------------ */

module TSOS {

    export class Memory {

        public cells: number[] = [];

        public init(): void {
            this.cells = new Array(MEMORY_SIZE);
            for (var i = 0; i < MEMORY_SIZE; i++) {
                this.cells[i] = 0;
            }
        }
    }
}
