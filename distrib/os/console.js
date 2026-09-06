"use strict";
/* ------------
     Console.ts

     The OS Console - stdIn and stdOut by default.
     Note: This is not the Shell. The Shell is the "command line interface" (CLI) or interpreter for this console.
     ------------ */
var TSOS;
(function (TSOS) {
    class Console {
        currentFont;
        currentFontSize;
        currentXPosition;
        currentYPosition;
        buffer;
        commandHistory = [];
        historyIndex = 0;
        constructor(currentFont = _DefaultFontFamily, currentFontSize = _DefaultFontSize, currentXPosition = 0, currentYPosition = _DefaultFontSize, buffer = "") {
            this.currentFont = currentFont;
            this.currentFontSize = currentFontSize;
            this.currentXPosition = currentXPosition;
            this.currentYPosition = currentYPosition;
            this.buffer = buffer;
        }
        init() {
            this.clearScreen();
            this.resetXY();
        }
        clearScreen() {
            _DrawingContext.clearRect(0, 0, _Canvas.width, _Canvas.height);
        }
        resetXY() {
            this.currentXPosition = 0;
            this.currentYPosition = this.currentFontSize;
        }
        handleInput() {
            while (_KernelInputQueue.getSize() > 0) {
                // Get the next character from the kernel input queue.
                var chr = _KernelInputQueue.dequeue();
                // Check to see if it's "special" (enter or ctrl-c) or "normal" (anything else that the keyboard device driver gave us).
                if (chr === String.fromCharCode(13)) { // the Enter key
                    // Remember non-empty commands for up/down recall.
                    if (this.buffer !== "") {
                        this.commandHistory[this.commandHistory.length] = this.buffer;
                    }
                    this.historyIndex = this.commandHistory.length;
                    // The enter key marks the end of a console command, so ...
                    // ... tell the shell ...
                    _OsShell.handleInput(this.buffer);
                    // ... and reset our buffer.
                    this.buffer = "";
                }
                else if (chr === String.fromCharCode(8)) { // the Backspace key
                    this.handleBackspace();
                }
                else if (chr === String.fromCharCode(9)) { // the Tab key
                    this.handleTabComplete();
                }
                else if (chr === "up") {
                    this.recallHistory(-1);
                }
                else if (chr === "down") {
                    this.recallHistory(1);
                }
                else {
                    // This is a "normal" character, so ...
                    // ... draw it on the screen...
                    this.putText(chr);
                    // ... and add it to our buffer.
                    this.buffer += chr;
                }
                // TODO: Add a case for Ctrl-C that would allow the user to break the current program.
            }
        }
        handleBackspace() {
            // Only erase user-typed input for the current command line.
            if (this.buffer.length > 0) {
                var lastChar = this.buffer.charAt(this.buffer.length - 1);
                var charWidth = _DrawingContext.measureText(this.currentFont, this.currentFontSize, lastChar);
                this.currentXPosition = this.currentXPosition - charWidth;
                var clearHeight = this.currentFontSize +
                    _DrawingContext.fontDescent(this.currentFont, this.currentFontSize) +
                    _FontHeightMargin;
                _DrawingContext.clearRect(this.currentXPosition, this.currentYPosition - this.currentFontSize, charWidth + 1, clearHeight);
                this.buffer = this.buffer.substring(0, this.buffer.length - 1);
            }
        }
        clearCurrentInput() {
            while (this.buffer.length > 0) {
                this.handleBackspace();
            }
        }
        setInputLine(text) {
            this.clearCurrentInput();
            this.putText(text);
            this.buffer = text;
        }
        recallHistory(direction) {
            if (this.commandHistory.length === 0) {
                return;
            }
            var nextIndex = this.historyIndex + direction;
            if (nextIndex < 0) {
                nextIndex = 0;
            }
            if (nextIndex > this.commandHistory.length) {
                nextIndex = this.commandHistory.length;
            }
            this.historyIndex = nextIndex;
            if (this.historyIndex === this.commandHistory.length) {
                this.setInputLine("");
            }
            else {
                this.setInputLine(this.commandHistory[this.historyIndex]);
            }
        }
        handleTabComplete() {
            var matches = [];
            for (var i = 0; i < _OsShell.commandList.length; i++) {
                var cmd = _OsShell.commandList[i].command;
                if (cmd.indexOf(this.buffer) === 0) {
                    matches[matches.length] = cmd;
                }
            }
            if (matches.length === 0) {
                return;
            }
            if (matches.length === 1) {
                var completion = matches[0].substring(this.buffer.length);
                this.putText(completion);
                this.buffer += completion;
                return;
            }
            // Multiple matches: fill in the shared prefix, or list options.
            var prefix = this.commonPrefix(matches);
            if (prefix.length > this.buffer.length) {
                var shared = prefix.substring(this.buffer.length);
                this.putText(shared);
                this.buffer += shared;
            }
            else {
                this.listCompletions(matches);
            }
        }
        commonPrefix(matches) {
            if (matches.length === 0) {
                return "";
            }
            var prefix = matches[0];
            for (var i = 1; i < matches.length; i++) {
                var j = 0;
                while (j < prefix.length &&
                    j < matches[i].length &&
                    prefix.charAt(j) === matches[i].charAt(j)) {
                    j++;
                }
                prefix = prefix.substring(0, j);
            }
            return prefix;
        }
        listCompletions(matches) {
            _StdOut.advanceLine();
            _StdOut.putText(matches.join("  "));
            _StdOut.advanceLine();
            _OsShell.putPrompt();
            this.putText(this.buffer);
        }
        putText(text) {
            /*  My first inclination here was to write two functions: putChar() and putString().
                Then I remembered that JavaScript is (sadly) untyped and it won't differentiate
                between the two. (Although TypeScript would. But we're compiling to JavaScipt anyway.)
                So rather than be like PHP and write two (or more) functions that
                do the same thing, thereby encouraging confusion and decreasing readability, I
                decided to write one function and use the term "text" to connote string or char.
            */
            if (text !== "") {
                // Draw the text at the current X and Y coordinates.
                _DrawingContext.drawText(this.currentFont, this.currentFontSize, this.currentXPosition, this.currentYPosition, text);
                // Move the current X position.
                var offset = _DrawingContext.measureText(this.currentFont, this.currentFontSize, text);
                this.currentXPosition = this.currentXPosition + offset;
            }
        }
        advanceLine() {
            this.currentXPosition = 0;
            /*
             * Font size measures from the baseline to the highest point in the font.
             * Font descent measures from the baseline to the lowest point in the font.
             * Font height margin is extra spacing between the lines.
             */
            var lineHeight = _DefaultFontSize +
                _DrawingContext.fontDescent(this.currentFont, this.currentFontSize) +
                _FontHeightMargin;
            this.currentYPosition += lineHeight;
            // Auto-follow: when the cursor would leave the canvas, shift content up.
            if (this.currentYPosition > _Canvas.height) {
                var imageData = _DrawingContext.getImageData(0, lineHeight, _Canvas.width, _Canvas.height - lineHeight);
                this.clearScreen();
                _DrawingContext.putImageData(imageData, 0, 0);
                this.currentYPosition -= lineHeight;
            }
        }
    }
    TSOS.Console = Console;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=console.js.map
