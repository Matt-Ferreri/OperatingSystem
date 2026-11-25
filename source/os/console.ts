/* ------------
     Console.ts

     The OS Console - stdIn and stdOut by default.
     Note: This is not the Shell. The Shell is the "command line interface" (CLI) or interpreter for this console.
     ------------ */

module TSOS {

    export class Console {

        public commandHistory: string[] = [];
        public historyIndex: number = 0;

        // Visual line history for scrollback. The last entry is the line being edited.
        public lines: string[] = [""];
        // 0 = pinned to the bottom (live view). Higher = looking further up in history.
        public scrollOffset: number = 0;
        private static MAX_SCROLLBACK_LINES = 1000;

        constructor(public currentFont = _DefaultFontFamily,
                    public currentFontSize = _DefaultFontSize,
                    public currentXPosition = 0,
                    public currentYPosition = _DefaultFontSize,
                    public buffer = "") {
        }

        public init(): void {
            this.clearScreen();
            this.resetXY();
        }

        public clearScreen(): void {
            this.lines = [""];
            this.scrollOffset = 0;
            this.clearCanvas();
        }

        private clearCanvas(): void {
            _DrawingContext.clearRect(0, 0, _Canvas.width, _Canvas.height);
        }

        public resetXY(): void {
            this.currentXPosition = 0;
            this.currentYPosition = this.currentFontSize;
        }

        public lineHeight(): number {
            return _DefaultFontSize +
                   _DrawingContext.fontDescent(this.currentFont, this.currentFontSize) +
                   _FontHeightMargin;
        }

        public visibleLineCount(): number {
            // First baseline sits at fontSize; each further row adds one lineHeight.
            return Math.max(1, Math.floor((_Canvas.height - this.currentFontSize) / this.lineHeight()) + 1);
        }

        public maxScrollOffset(): number {
            return Math.max(0, this.lines.length - this.visibleLineCount());
        }

        // delta > 0 scrolls up into history; delta < 0 scrolls down toward the live prompt.
        public scroll(delta: number): void {
            var next = this.scrollOffset + delta;
            if (next < 0) {
                next = 0;
            }
            var max = this.maxScrollOffset();
            if (next > max) {
                next = max;
            }
            if (next === this.scrollOffset) {
                return;
            }
            this.scrollOffset = next;
            this.redraw();
        }

        public followLive(): void {
            if (this.scrollOffset !== 0) {
                this.scrollOffset = 0;
            }
        }

        public redraw(): void {
            this.clearCanvas();
            var visible = this.visibleLineCount();
            var end = this.lines.length - this.scrollOffset;
            var start = Math.max(0, end - visible);
            var lh = this.lineHeight();

            for (var i = start; i < end; i++) {
                var row = i - start;
                var y = this.currentFontSize + row * lh;
                var text = this.lines[i];
                if (text !== "") {
                    _DrawingContext.drawText(this.currentFont, this.currentFontSize, 0, y, text);
                }
            }

            // Cursor tracks the live end of the buffer only while following the bottom.
            if (this.scrollOffset === 0) {
                var lastIndex = this.lines.length - 1;
                var lastRow = lastIndex - start;
                this.currentYPosition = this.currentFontSize + lastRow * lh;
                this.currentXPosition = _DrawingContext.measureText(
                    this.currentFont, this.currentFontSize, this.lines[lastIndex]);
            }
        }

        private trimScrollback(): void {
            var overflow = this.lines.length - Console.MAX_SCROLLBACK_LINES;
            if (overflow > 0) {
                this.lines = this.lines.slice(overflow);
                this.scrollOffset = Math.max(0, this.scrollOffset - overflow);
            }
        }

        private appendChar(ch: string): void {
            var charWidth = _DrawingContext.measureText(this.currentFont, this.currentFontSize, ch);
            var line = this.lines[this.lines.length - 1];
            var lineWidth = _DrawingContext.measureText(this.currentFont, this.currentFontSize, line);
            if (lineWidth + charWidth > _Canvas.width) {
                this.lines[this.lines.length] = "";
                this.trimScrollback();
            }
            this.lines[this.lines.length - 1] += ch;
        }

        private removeLastVisualChar(): void {
            var last = this.lines[this.lines.length - 1];
            if (last.length > 0) {
                this.lines[this.lines.length - 1] = last.substring(0, last.length - 1);
            } else if (this.lines.length > 1) {
                this.lines.pop();
                last = this.lines[this.lines.length - 1];
                this.lines[this.lines.length - 1] = last.substring(0, last.length - 1);
            }
        }

        public handleInput(): void {
            while (_KernelInputQueue.getSize() > 0) {
                // Get the next character from the kernel input queue.
                var chr = _KernelInputQueue.dequeue();
                // Check to see if it's "special" (enter or ctrl-c) or "normal" (anything else that the keyboard device driver gave us).
                if (chr === String.fromCharCode(13)) { // the Enter key
                    this.followLive();
                    // Remember non-empty commands for up/down recall.
                    if (Utils.trim(this.buffer) !== "") {
                        this.commandHistory[this.commandHistory.length] = this.buffer;
                    }
                    this.historyIndex = this.commandHistory.length;
                    // The enter key marks the end of a console command, so ...
                    // ... tell the shell ...
                    _OsShell.handleInput(this.buffer);
                    // ... and reset our buffer.
                    this.buffer = "";
                } else if (chr === String.fromCharCode(8)) { // the Backspace key
                    this.followLive();
                    this.handleBackspace();
                } else if (chr === String.fromCharCode(9)) { // the Tab key
                    this.followLive();
                    this.handleTabComplete();
                } else if (chr === "up") {
                    this.followLive();
                    this.recallHistory(-1);
                } else if (chr === "down") {
                    this.followLive();
                    this.recallHistory(1);
                } else if (chr === "pageup") {
                    this.scroll(this.visibleLineCount() - 1);
                } else if (chr === "pagedown") {
                    this.scroll(-(this.visibleLineCount() - 1));
                } else if (chr === String.fromCharCode(3)) { // Ctrl+C
                    this.followLive();
                    this.handleBreak();
                } else {
                    this.followLive();
                    // This is a "normal" character, so ...
                    // ... draw it on the screen...
                    this.putText(chr);
                    // ... and add it to our buffer.
                    this.buffer += chr;
                }
            }
        }

        public handleBreak(): void {
            this.clearCurrentInput();
            this.advanceLine();
            this.putText("^C");
            this.advanceLine();

            if (_CPU && _CPU.isExecuting) {
                var pid = _CurrentPCB ? _CurrentPCB.pid : "?";
                _CPU.killProcess();
                this.putText("Process " + pid + " killed.");
                this.advanceLine();
            }

            _OsShell.putPrompt();
        }

        public handleBackspace(): void {
            // Only erase user-typed input for the current command line.
            if (this.buffer.length > 0) {
                this.buffer = this.buffer.substring(0, this.buffer.length - 1);
                this.removeLastVisualChar();
                this.followLive();
                this.redraw();
            }
        }

        public clearCurrentInput(): void {
            while (this.buffer.length > 0) {
                this.handleBackspace();
            }
        }

        public setInputLine(text: string): void {
            this.clearCurrentInput();
            this.putText(text);
            this.buffer = text;
        }

        public recallHistory(direction: number): void {
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
            } else {
                this.setInputLine(this.commandHistory[this.historyIndex]);
            }
        }

        public handleTabComplete(): void {
            var matches: string[] = [];
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
            } else {
                this.listCompletions(matches);
            }
        }

        public commonPrefix(matches: string[]): string {
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

        public listCompletions(matches: string[]): void {
            _StdOut.advanceLine();
            _StdOut.putText(matches.join("  "));
            _StdOut.advanceLine();
            _OsShell.putPrompt();
            this.putText(this.buffer);
        }

        // Print a block of lines. When restorePrompt is set, put the prompt
        // (and any in-progress typing) back underneath the block.
        public writeBlock(lines: string[], restorePrompt: boolean): void {
            var saved = this.buffer;
            this.clearCurrentInput();
            if (this.currentXPosition > 0) {
                this.advanceLine();
            }
            for (var i = 0; i < lines.length; i++) {
                if (lines[i] !== "") {
                    this.putText(lines[i]);
                }
                this.advanceLine();
            }
            if (restorePrompt && _OsShell) {
                _OsShell.putPrompt();
                if (saved.length > 0) {
                    this.putText(saved);
                    this.buffer = saved;
                }
            }
        }

        public putText(text): void {
            /*  My first inclination here was to write two functions: putChar() and putString().
                Then I remembered that JavaScript is (sadly) untyped and it won't differentiate
                between the two. (Although TypeScript would. But we're compiling to JavaScipt anyway.)
                So rather than be like PHP and write two (or more) functions that
                do the same thing, thereby encouraging confusion and decreasing readability, I
                decided to write one function and use the term "text" to connote string or char.
            */
            if (text !== "") {
                this.followLive();
                for (var i = 0; i < text.length; i++) {
                    this.appendChar(text.charAt(i));
                }
                this.redraw();
            }
         }

        public advanceLine(): void {
            this.followLive();
            this.lines[this.lines.length] = "";
            this.trimScrollback();
            this.redraw();
        }
    }
 }
