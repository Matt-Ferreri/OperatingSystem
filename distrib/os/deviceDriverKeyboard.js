"use strict";
/* ----------------------------------
   DeviceDriverKeyboard.ts

   The Kernel Keyboard Device Driver.
   ---------------------------------- */
var TSOS;
(function (TSOS) {
    // Extends DeviceDriver
    class DeviceDriverKeyboard extends TSOS.DeviceDriver {
        constructor() {
            // Override the base method pointers.
            // The code below cannot run because "this" can only be
            // accessed after calling super.
            // super(this.krnKbdDriverEntry, this.krnKbdDispatchKeyPress);
            // So instead...
            super();
            this.driverEntry = this.krnKbdDriverEntry;
            this.isr = this.krnKbdDispatchKeyPress;
        }
        krnKbdDriverEntry() {
            // Initialization routine for this, the kernel-mode Keyboard Device Driver.
            this.status = "loaded";
            // More?
        }
        krnKbdDispatchKeyPress(params) {
            // Parse the params.  TODO: Check that the params are valid and osTrapError if not.
            var keyCode = params[0];
            var isShifted = params[1];
            _Kernel.krnTrace("Key code:" + keyCode + " shifted:" + isShifted);
            var chr = "";
            // Check to see if we even want to deal with the key that was pressed.
            if ((keyCode >= 65) && (keyCode <= 90)) { // letter
                if (isShifted === true) {
                    chr = String.fromCharCode(keyCode); // Uppercase A-Z
                }
                else {
                    chr = String.fromCharCode(keyCode + 32); // Lowercase a-z
                }
                // TODO: Check for caps-lock and handle as shifted if so.
                _KernelInputQueue.enqueue(chr);
            }
            else if ((keyCode >= 48) && (keyCode <= 57)) { // digits and their shifted symbols
                if (isShifted === true) {
                    var shiftedDigits = [")", "!", "@", "#", "$", "%", "^", "&", "*", "("];
                    chr = shiftedDigits[keyCode - 48];
                }
                else {
                    chr = String.fromCharCode(keyCode);
                }
                _KernelInputQueue.enqueue(chr);
            }
            else if ((keyCode == 32) || (keyCode == 13) || (keyCode == 8) || (keyCode == 9)) {
                // space, enter, backspace, or tab
                chr = String.fromCharCode(keyCode);
                _KernelInputQueue.enqueue(chr);
            }
            else if (keyCode == 38) { // up arrow
                _KernelInputQueue.enqueue("up");
            }
            else if (keyCode == 40) { // down arrow
                _KernelInputQueue.enqueue("down");
            }
            else if (this.isPunctuationKey(keyCode)) {
                chr = this.punctuationChar(keyCode, isShifted);
                _KernelInputQueue.enqueue(chr);
            }
        }
        isPunctuationKey(keyCode) {
            return (keyCode == 186) || (keyCode == 187) || (keyCode == 188) ||
                (keyCode == 189) || (keyCode == 190) || (keyCode == 191) ||
                (keyCode == 192) || (keyCode == 219) || (keyCode == 220) ||
                (keyCode == 221) || (keyCode == 222);
        }
        punctuationChar(keyCode, isShifted) {
            // US keyboard punctuation keyed by event.which / keyCode.
            var map = {
                186: [";", ":"],
                187: ["=", "+"],
                188: [",", "<"],
                189: ["-", "_"],
                190: [".", ">"],
                191: ["/", "?"],
                192: ["`", "~"],
                219: ["[", "{"],
                220: ["\\", "|"],
                221: ["]", "}"],
                222: ["'", "\""]
            };
            return isShifted ? map[keyCode][1] : map[keyCode][0];
        }
    }
    TSOS.DeviceDriverKeyboard = DeviceDriverKeyboard;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=deviceDriverKeyboard.js.map