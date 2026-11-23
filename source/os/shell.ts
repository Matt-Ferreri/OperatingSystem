/* ------------
   Shell.ts

   The OS Shell - The "command line interface" (CLI) for the console.

    Note: While fun and learning are the primary goals of all enrichment center activities,
          serious injuries may occur when trying to write your own Operating System.
   ------------ */

// TODO: Write a base class / prototype for system services and let Shell inherit from it.

module TSOS {
    export class Shell {
        // Properties
        public promptStr = ">";
        public commandList = [];
        public curses = "[fuvg],[cvff],[shpx],[phag],[pbpxfhpxre],[zbgureshpxre],[gvgf]";
        public apologies = "[sorry]";

        constructor() {
        }

        public init() {
            var sc: ShellCommand;
            //
            // Load the command list.

            // ver
            sc = new ShellCommand(this.shellVer,
                "ver",
                "- Displays the current version data.");
            this.commandList[this.commandList.length] = sc;

            // help
            sc = new ShellCommand(this.shellHelp,
                "help",
                "- This is the help command. Seek help.");
            this.commandList[this.commandList.length] = sc;

            // shutdown
            sc = new ShellCommand(this.shellShutdown,
                "shutdown",
                "- Shuts down the virtual OS but leaves the underlying host / hardware simulation running.");
            this.commandList[this.commandList.length] = sc;

            // cls
            sc = new ShellCommand(this.shellCls,
                "cls",
                "- Clears the screen and resets the cursor position.");
            this.commandList[this.commandList.length] = sc;

            // man <topic>
            sc = new ShellCommand(this.shellMan,
                "man",
                "<topic> - Displays the MANual page for <topic>.");
            this.commandList[this.commandList.length] = sc;

            // trace <on | off>
            sc = new ShellCommand(this.shellTrace,
                "trace",
                "<on | off> - Turns the OS trace on or off.");
            this.commandList[this.commandList.length] = sc;

            // rot13 <string>
            sc = new ShellCommand(this.shellRot13,
                "rot13",
                "<string> - Does rot13 obfuscation on <string>.");
            this.commandList[this.commandList.length] = sc;

            // prompt <string>
            sc = new ShellCommand(this.shellPrompt,
                "prompt",
                "<string> - Sets the prompt.");
            this.commandList[this.commandList.length] = sc;

            // date - displays the current date and time
            sc = new ShellCommand(this.shellDate,
                "date",
                "- Displays the current date and time.");
            this.commandList[this.commandList.length] = sc;

            // whereami - somewhat displays current location
            sc = new ShellCommand(this.shellWhereami,
                "whereami",
                "- Displays the current location.");
            this.commandList[this.commandList.length] = sc;

            // inspire - displays a random quote from an athlete
            sc = new ShellCommand(this.shellInspire,
                "inspire",
                "- Displays a random quote from an athlete.");
            this.commandList[this.commandList.length] = sc;

            // whoami - displays the current user creatively
            sc = new ShellCommand(this.shellWhoami,
                "whoami",
                "- Displays the current user sort of.");
            this.commandList[this.commandList.length] = sc;

            // status <string> - updates the task bar status message
            sc = new ShellCommand(this.shellStatus,
                "status",
                "<string> - Sets the task bar status message.");
            this.commandList[this.commandList.length] = sc;

            // bsod - intentionally crash the OS to test the trap / BSOD screen
            sc = new ShellCommand(this.shellBsod,
                "bsod",
                "- Triggers a kernel trap and displays the BSOD.");
            this.commandList[this.commandList.length] = sc;

            // load - validates user program input and writes it into memory
            sc = new ShellCommand(this.shellLoad,
                                  "load",
                                  "- Loads a user program into memory from the input box.");
            this.commandList[this.commandList.length] = sc;

            // run <pid> - execute a loaded process
            sc = new ShellCommand(this.shellRun,
                                  "run",
                                  "<pid> - Runs the process with the given PID.");
            this.commandList[this.commandList.length] = sc;

            // clearmem - zero every memory segment
            sc = new ShellCommand(this.shellClearmem,
                                  "clearmem",
                                  "- Clears all memory segments back to 0.");
            this.commandList[this.commandList.length] = sc;

            // runall - run every loaded program together
            sc = new ShellCommand(this.shellRunall,
                                  "runall",
                                  "- Runs every loaded program at once.");
            this.commandList[this.commandList.length] = sc;


            // ps - list the PID and state of every process
            sc = new ShellCommand(this.shellPs,
                                  "ps",
                                  "- Displays the PID and state of all processes.");
            this.commandList[this.commandList.length] = sc;

            // kill <pid> - stop one process
            sc = new ShellCommand(this.shellKill,
                                  "kill",
                                  "<pid> - Kills the process with the given PID.");
            this.commandList[this.commandList.length] = sc;

            // killall - stop every process
            sc = new ShellCommand(this.shellKillall,
                                  "killall",
                                  "- Kills all processes.");
            this.commandList[this.commandList.length] = sc;

            // q <int> - set the round-robin quantum
            sc = new ShellCommand(this.shellQuantum,
                                  "q",
                                  "<int> - Sets the Round Robin quantum in CPU cycles.");
            this.commandList[this.commandList.length] = sc;

            // format [-quick] - initialize the hard drive
            sc = new ShellCommand(this.shellFormat,
                                  "format",
                                  "[-quick] - Formats the disk (all blocks, or headers only with -quick).");
            this.commandList[this.commandList.length] = sc;

            // create <filename> - create an empty file on disk
            sc = new ShellCommand(this.shellCreate,
                                  "create",
                                  "<filename> - Creates a file on disk.");
            this.commandList[this.commandList.length] = sc;

            // read <filename> - display file contents
            sc = new ShellCommand(this.shellRead,
                                  "read",
                                  "<filename> - Reads and displays the contents of a file.");
            this.commandList[this.commandList.length] = sc;

            // write <filename> "data" - write quoted data to a file
            sc = new ShellCommand(this.shellWrite,
                                  "write",
                                  "<filename> \"data\" - Writes the quoted data to a file.");
            this.commandList[this.commandList.length] = sc;

            // delete <filename> - delete a file
            sc = new ShellCommand(this.shellDelete,
                                  "delete",
                                  "<filename> - Deletes a file.");
            this.commandList[this.commandList.length] = sc;

            // copy <existing filename> <new filename> - copy a file
            sc = new ShellCommand(this.shellCopy,
                                  "copy",
                                  "<existing filename> <new filename> - Copies a file.");
            this.commandList[this.commandList.length] = sc;

            // rename <current filename> <new filename> - rename a file
            sc = new ShellCommand(this.shellRename,
                                  "rename",
                                  "<current filename> <new filename> - Renames a file.");
            this.commandList[this.commandList.length] = sc;

            // ls [-a] - list files on disk (hidden files start with '.')
            sc = new ShellCommand(this.shellLs,
                                  "ls",
                                  "[-a] - Lists files on disk. -a shows hidden files with size and create date.");
            this.commandList[this.commandList.length] = sc;

            // link <existing> <new> - hard-link: both names share the same file data
            sc = new ShellCommand(this.shellLink,
                                  "link",
                                  "<existing filename> <new filename> - Makes both names point to the same file data.");
            this.commandList[this.commandList.length] = sc;

            // recover [filename] - undelete soft-deleted files
            sc = new ShellCommand(this.shellRecover,
                                  "recover",
                                  "[filename] - Recovers deleted file(s) whose data has not been overwritten.");
            this.commandList[this.commandList.length] = sc;

            // chkdsk - reclaim orphaned in-use data blocks
            sc = new ShellCommand(this.shellChkdsk,
                                  "chkdsk",
                                  "- Reclaims data blocks that are in use but not indexed by any directory entry.");
            this.commandList[this.commandList.length] = sc;

            // fsck - same as chkdsk
            sc = new ShellCommand(this.shellChkdsk,
                                  "fsck",
                                  "- Same as chkdsk: reclaims unindexed in-use data blocks.");
            this.commandList[this.commandList.length] = sc;

            // defrag - pack file data into contiguous blocks
            sc = new ShellCommand(this.shellDefrag,
                                  "defrag",
                                  "- Defragments data blocks so each file occupies contiguous TSBs.");
            this.commandList[this.commandList.length] = sc;

            // alias <command1> <command2> - invoke a command under another name
            sc = new ShellCommand(this.shellAlias,
                                  "alias",
                                  "<command1> <command2> - Aliases command1 as command2 so either name works.");
            this.commandList[this.commandList.length] = sc;

            // Display the initial prompt.
            this.putPrompt();
        }

        public putPrompt() {
            _StdOut.putText(this.promptStr);
        }

        public handleInput(buffer) {
            _Kernel.krnTrace("Shell Command~" + buffer);
            //
            // Parse the input...
            //
            var userCommand = this.parseInput(buffer);
            // ... and assign the command and args to local variables.
            var cmd = userCommand.command;
            var args = userCommand.args;
            //
            // Determine the command and execute it.
            //
            // TypeScript/JavaScript may not support associative arrays in all browsers so we have to iterate over the
            // command list in attempt to find a match. 
            // TODO: Is there a better way? Probably. Someone work it out and tell me in class.
            var index: number = 0;
            var found: boolean = false;
            var fn = undefined;
            while (!found && index < this.commandList.length) {
                if (this.commandList[index].command === cmd) {
                    found = true;
                    fn = this.commandList[index].func;
                } else {
                    ++index;
                }
            }
            if (found) {
                this.execute(fn, args);  // Note that args is always supplied, though it might be empty.
            } else {
                // It's not found, so check for curses and apologies before declaring the command invalid.
                if (this.curses.indexOf("[" + Utils.rot13(cmd) + "]") >= 0) {     // Check for curses.
                    this.execute(this.shellCurse);
                } else if (this.apologies.indexOf("[" + cmd + "]") >= 0) {        // Check for apologies.
                    this.execute(this.shellApology);
                } else { // It's just a bad command. {
                    this.execute(this.shellInvalidCommand);
                }
            }
        }

        // Note: args is an optional parameter, ergo the ? which allows TypeScript to understand that.
        public execute(fn, args?) {
            // We just got a command, so advance the line...
            _StdOut.advanceLine();
            // ... call the command function passing in the args with some über-cool functional programming ...
            fn(args);
            // If the kernel trapped (BSOD), do not redraw a prompt over the crash screen.
            if (_KernelTrapped) {
                return;
            }
            // Check to see if we need to advance the line again
            if (_StdOut.currentXPosition > 0) {
                _StdOut.advanceLine();
            }
            // ... and finally write the prompt again.
            this.putPrompt();
        }

        public parseInput(buffer: string): UserCommand {
            var retVal = new UserCommand();

            // 1. Remove leading and trailing spaces.
            buffer = Utils.trim(buffer);

            // 2. Split off the command (lower-cased); keep the rest for arg parsing
            //    so quoted write data can preserve case and spaces.
            var firstSpace = buffer.indexOf(" ");
            var cmd: string;
            var rest: string;
            if (firstSpace < 0) {
                cmd = buffer.toLowerCase();
                rest = "";
            } else {
                cmd = Utils.trim(buffer.substring(0, firstSpace)).toLowerCase();
                rest = Utils.trim(buffer.substring(firstSpace + 1));
            }
            retVal.command = cmd;

            // 3. Parse args: double-quoted strings stay one arg (original case);
            //    everything else is space-split and lower-cased.
            var i = 0;
            while (i < rest.length) {
                while (i < rest.length && rest.charAt(i) === " ") {
                    i++;
                }
                if (i >= rest.length) {
                    break;
                }

                if (rest.charAt(i) === "\"") {
                    i++; // skip opening quote
                    var qStart = i;
                    while (i < rest.length && rest.charAt(i) !== "\"") {
                        i++;
                    }
                    retVal.args[retVal.args.length] = rest.substring(qStart, i);
                    if (i < rest.length) {
                        i++; // skip closing quote
                    }
                } else {
                    var aStart = i;
                    while (i < rest.length && rest.charAt(i) !== " ") {
                        i++;
                    }
                    retVal.args[retVal.args.length] = rest.substring(aStart, i).toLowerCase();
                }
            }
            return retVal;
        }

        //
        // Shell Command Functions. Kinda not part of Shell() class exactly, but
        // called from here, so kept here to avoid violating the law of least astonishment.
        //
        public shellInvalidCommand() {
            _StdOut.putText("Invalid Command. ");
            if (_SarcasticMode) {
                _StdOut.putText("Unbelievable. You, [subject name here],");
                _StdOut.advanceLine();
                _StdOut.putText("must be the pride of [subject hometown here].");
            } else {
                _StdOut.putText("Type 'help' for, well... help.");
            }
        }

        public shellCurse() {
            _StdOut.putText("Oh, so that's how it's going to be, eh? Fine.");
            _StdOut.advanceLine();
            _StdOut.putText("Bitch.");
            _SarcasticMode = true;
        }

        public shellApology() {
            if (_SarcasticMode) {
                _StdOut.putText("I think we can put our differences behind us.");
                _StdOut.advanceLine();
                _StdOut.putText("For science . . . You monster.");
                _SarcasticMode = false;
            } else {
                _StdOut.putText("For what?");
            }
        }

        // Although args is unused in some of these functions, it is always provided in the 
        // actual parameter list when this function is called, so I feel like we need it.

        public shellVer(args: string[]) {
            _StdOut.putText(APP_NAME + " version " + APP_VERSION);
        }

        public shellHelp(args: string[]) {
            _StdOut.putText("Commands:");
            for (var i in _OsShell.commandList) {
                _StdOut.advanceLine();
                _StdOut.putText("  " + _OsShell.commandList[i].command + " " + _OsShell.commandList[i].description);
            }
        }

        public shellShutdown(args: string[]) {
            _StdOut.putText("Shutting down...");
            // Call Kernel shutdown routine.
            _Kernel.krnShutdown();
            // TODO: Stop the final prompt from being displayed. If possible. Not a high priority. (Damn OCD!)
        }

        public shellCls(args: string[]) {
            _StdOut.clearScreen();
            _StdOut.resetXY();
        }

        public shellMan(args: string[]) {
            if (args.length > 0) {
                var topic = args[0];
                switch (topic) {
                    case "help":
                        _StdOut.putText("Help displays a list of (hopefully) valid commands.");
                        break;
                    case "format":
                        _StdOut.putText("Formats the disk. Optional -quick clears only block headers.");
                        break;
                    case "create":
                        _StdOut.putText("Creates a file on disk. Usage: create <filename>.");
                        break;
                    case "read":
                        _StdOut.putText("Reads and displays a file. Usage: read <filename>.");
                        break;
                    case "write":
                        _StdOut.putText("Writes quoted data to a file. Usage: write <filename> \"data\".");
                        break;
                    case "delete":
                        _StdOut.putText("Soft-deletes a file name from disk. Usage: delete <filename>.");
                        _StdOut.advanceLine();
                        _StdOut.putText("If other links still point to the data, only the name is removed.");
                        _StdOut.advanceLine();
                        _StdOut.putText("Otherwise data is marked free but kept so recover can undelete it.");
                        break;
                    case "copy":
                        _StdOut.putText("Copies a file. Usage: copy <existing filename> <new filename>.");
                        break;
                    case "rename":
                        _StdOut.putText("Renames a file. Usage: rename <current filename> <new filename>.");
                        break;
                    case "ls":
                        _StdOut.putText("Lists files on disk. Names starting with '.' are hidden.");
                        _StdOut.advanceLine();
                        _StdOut.putText("Usage: ls [-a]. -a shows hidden files plus size and create date.");
                        break;
                    case "link":
                        _StdOut.putText("Creates a hard link so two names share the same file data.");
                        _StdOut.advanceLine();
                        _StdOut.putText("Usage: link <existing filename> <new filename>.");
                        _StdOut.advanceLine();
                        _StdOut.putText("delete removes a name; data stays until the last link is deleted.");
                        break;
                    case "recover":
                        _StdOut.putText("Recovers soft-deleted files whose data was not overwritten.");
                        _StdOut.advanceLine();
                        _StdOut.putText("Usage: recover [filename]. Omitting the name recovers all possible.");
                        break;
                    case "chkdsk":
                    case "fsck":
                        _StdOut.putText("Reclaims in-use data blocks that no directory entry indexes.");
                        _StdOut.advanceLine();
                        _StdOut.putText("Usage: chkdsk | fsck.");
                        break;
                    case "defrag":
                        _StdOut.putText("Defragments disk data so each file uses contiguous blocks.");
                        _StdOut.advanceLine();
                        _StdOut.putText("Usage: defrag.");
                        break;
                    case "alias":
                        _StdOut.putText("Aliases a shell command under another name.");
                        _StdOut.advanceLine();
                        _StdOut.putText("Usage: alias <command1> <command2>.");
                        break;
                    // TODO: Make descriptive MANual page entries for the the rest of the shell commands here.
                    default:
                        _StdOut.putText("No manual entry for " + args[0] + ".");
                }
            } else {
                _StdOut.putText("Usage: man <topic>  Please supply a topic.");
            }
        }

        public shellTrace(args: string[]) {
            if (args.length > 0) {
                var setting = args[0];
                switch (setting) {
                    case "on":
                        if (_Trace && _SarcasticMode) {
                            _StdOut.putText("Trace is already on, doofus.");
                        } else {
                            _Trace = true;
                            _StdOut.putText("Trace ON");
                        }
                        break;
                    case "off":
                        _Trace = false;
                        _StdOut.putText("Trace OFF");
                        break;
                    default:
                        _StdOut.putText("Invalid arguement.  Usage: trace <on | off>.");
                }
            } else {
                _StdOut.putText("Usage: trace <on | off>");
            }
        }
        public shellDate(args: string[]) {
            _StdOut.putText(new Date().toLocaleString());
        }

        public shellWhereami(args: string[]) {
            _StdOut.putText("You are currently in McDonalds. Please get me a Big Mac.");
        }
        public shellInspire(args: string[]) {
            var quotes = [
                "Never let the fear of striking out keep you from playing the game. - Babe Ruth",
                "I don't think limits. - Usain Bolt",
                "You can't put a limit on anything. The more you dream, the farther you get. - Michael Phelps",
                "I've failed over and over and over again in my life. And that is why I succeed. - Michael Jordan",
                "It's hard to beat a person who never gives up. - Babe Ruth",
                "I hated every minute of training, but I said, 'Don't quit. Suffer now and live the rest of your life as a champion.' - Muhammad Ali",
                "You miss 100% of the shots you don't take. - Wayne Gretzky",
                "The more difficult the victory, the greater the happiness in winning. - Pele",
                "I am building a fire, and every day I train, I add more fuel. At just the right moment, I light the match. - Mia Hamm",
                "Success is no accident. It is hard work, perseverance, learning, studying, sacrifice and most of all, love of what you are doing. - Pele"
            ];
            var index = Math.floor(Math.random() * quotes.length);
            _StdOut.putText(quotes[index]);
        }

        public shellWhoami(args: string[]) {
            _StdOut.putText("LOL no one cares, but I hope your OS is almost done.");
        }

        public shellStatus(args: string[]) {
            if (args.length > 0) {
                Control.hostUpdateTaskBarStatus(args.join(" "));
                _StdOut.putText("Status updated.");
            } else {
                _StdOut.putText("Usage: status <string>  Please supply a status message.");
            }
        }

        public shellBsod(args: string[]) {
            _Kernel.krnTrapError("User requested kernel trap.");
        }

        public shellLoad(args: string[]) {
            var input = (<HTMLTextAreaElement>document.getElementById("taProgramInput")).value.trim();
            // Require space-separated byte pairs, e.g. "FF 0F 45" (not "4 f 5f").
            var isValid = /^[0-9a-fA-F]{2}( [0-9a-fA-F]{2})*$/.test(input);
            if (!isValid) {
                _StdOut.putText("Invalid user program. Use hex byte pairs separated by spaces.");
                return;
            }

            var hexBytes = input.split(" ");
            var bytes: number[] = [];
            for (var i = 0; i < hexBytes.length; i++) {
                bytes.push(parseInt(hexBytes[i], 16));
            }

            if (bytes.length > MEMORY_SEGMENT_SIZE) {
                _StdOut.putText("Program too large. Max " + MEMORY_SEGMENT_SIZE + " bytes per segment.");
                return;
            }

            var pcb = _MemoryManager.loadProgram(bytes);
            if (!pcb) {
                _StdOut.putText("No free memory segment. All three slots are in use.");
                return;
            }

            _StdOut.putText("Process with pid " + pcb.pid + " loaded at " + pcb.base + " (" + bytes.length + " bytes).");
        }

        public shellRun(args: string[]) {
            if (args.length < 1) {
                _StdOut.putText("Usage: run <pid>");
                return;
            }

            var pid = parseInt(args[0], 10);
            if (isNaN(pid)) {
                _StdOut.putText("Invalid PID.");
                return;
            }

            if (_CPU.isExecuting) {
                _StdOut.putText("A process is already running.");
                return;
            }

            var pcb = _MemoryManager.findPcb(pid);
            if (!pcb) {
                _StdOut.putText("No process found with PID " + pid + ".");
                return;
            }

            if (pcb.state === "Running") {
                _StdOut.putText("Process " + pid + " is already running.");
                return;
            }

            if (pcb.state === "Terminated" || pcb.state === "Killed") {
                _StdOut.putText("Process " + pid + " has " +
                    (pcb.state === "Killed" ? "been killed." : "terminated."));
                return;
            }

            _Scheduler.loadToCpu(pcb);
            _StdOut.putText("Running process " + pid + ".");
        }

        public shellRunall(args: string[]) {
            if (_CPU.isExecuting) {
                _StdOut.putText("A process is already running.");
                return;
            }

            var waiting = [];
            for (var i = 0; i < _MemoryManager.residentList.length; i++) {
                var pcb = _MemoryManager.residentList[i];
                if (pcb.state === "Resident" || pcb.state === "Ready") {
                    waiting[waiting.length] = pcb;
                }
            }

            if (waiting.length === 0) {
                _StdOut.putText("No programs are loaded.");
                return;
            }

            for (var j = 0; j < waiting.length; j++) {
                waiting[j].state = "Ready";
                _Scheduler.noteArrival(waiting[j]);
                _ReadyQueue.enqueue(waiting[j]);
            }
            _Scheduler.dispatch();
            _StdOut.putText("Running all programs.");
        }

        public shellPs(args: string[]) {
            if (!_MemoryManager || _MemoryManager.residentList.length === 0) {
                _StdOut.putText("No processes.");
                return;
            }

            _StdOut.putText("PID  State");
            for (var i = 0; i < _MemoryManager.residentList.length; i++) {
                var pcb = _MemoryManager.residentList[i];
                _StdOut.advanceLine();
                _StdOut.putText("  " + pcb.pid + "    " + pcb.state);
            }
        }

        public shellKill(args: string[]) {
            if (args.length < 1) {
                _StdOut.putText("Usage: kill <pid>");
                return;
            }

            var pid = parseInt(args[0], 10);
            if (isNaN(pid)) {
                _StdOut.putText("Invalid PID.");
                return;
            }

            var pcb = _MemoryManager.findPcb(pid);
            if (!pcb) {
                _StdOut.putText("No process found with PID " + pid + ".");
                return;
            }

            if (pcb.state === "Terminated" || pcb.state === "Killed") {
                _StdOut.putText("Process " + pid + " has already " +
                    (pcb.state === "Killed" ? "been killed." : "terminated."));
                return;
            }

            if (_CPU.isExecuting && _CurrentPCB === pcb) {
                _CPU.killProcess();
            } else {
                _Scheduler.removeFromReady(pcb);
                pcb.state = "Killed";
                _Scheduler.reportMetrics(pcb, false);
                Control.hostUpdatePcbDisplay();
            }
            _StdOut.putText("Process " + pid + " killed.");
        }

        public shellKillall(args: string[]) {
            if (!_MemoryManager || _MemoryManager.residentList.length === 0) {
                _StdOut.putText("No processes.");
                return;
            }

            var killed = 0;
            var running = null;
            for (var i = 0; i < _MemoryManager.residentList.length; i++) {
                var pcb = _MemoryManager.residentList[i];
                if (pcb.state === "Terminated" || pcb.state === "Killed") {
                    continue;
                }
                if (_CPU.isExecuting && _CurrentPCB === pcb) {
                    running = pcb;
                    continue;
                }
                _Scheduler.removeFromReady(pcb);
                pcb.state = "Killed";
                _Scheduler.reportMetrics(pcb, false);
                killed++;
            }

            if (running) {
                _CPU.killProcess();
                killed++;
            } else {
                Control.hostUpdatePcbDisplay();
            }

            if (killed === 0) {
                _StdOut.putText("No processes to kill.");
                return;
            }
            _StdOut.putText("All processes killed.");
        }

        public shellQuantum(args: string[]) {
            if (args.length < 1) {
                _StdOut.putText("Usage: q <int>  Quantum is " + _Quantum + ".");
                return;
            }

            var text = args[0];
            if (!/^\d+$/.test(text)) {
                _StdOut.putText("Quantum must be a positive integer.");
                return;
            }

            var quantum = parseInt(text, 10);
            if (quantum < 1) {
                _StdOut.putText("Quantum must be a positive integer.");
                return;
            }

            _Quantum = quantum;
            _QuantumCount = 0;
            Control.hostUpdatePcbDisplay();
            _StdOut.putText("Quantum set to " + _Quantum + ".");
        }

        public shellClearmem(args: string[]) {
            if (!_MemoryManager.clearMemory()) {
                _StdOut.putText("Cannot clear memory while a process is running.");
                return;
            }
            _StdOut.putText("Memory cleared.");
        }

        public shellRot13(args: string[]) {
            if (args.length > 0) {
                // Requires Utils.ts for rot13() function.
                _StdOut.putText(args.join(' ') + " = '" + Utils.rot13(args.join(' ')) + "'");
            } else {
                _StdOut.putText("Usage: rot13 <string>  Please supply a string.");
            }
        }

        public shellPrompt(args: string[]) {
            if (args.length > 0) {
                _OsShell.promptStr = args[0];
            } else {
                _StdOut.putText("Usage: prompt <string>  Please supply a string.");
            }
        }
        public shellFormat(args: string[]) {
            if (!_krnDiskDriver) {
                _StdOut.putText("Disk driver is not loaded.");
                return;
            }

            var quick = false;
            if (args.length > 0) {
                if (args[0] === "-quick") {
                    quick = true;
                } else {
                    _StdOut.putText("Usage: format [-quick]");
                    return;
                }
            }

            if (_krnDiskDriver.format(quick)) {
                _StdOut.putText(quick ? "Disk quick-formatted." : "Disk formatted.");
            } else {
                _StdOut.putText("Disk format failed.");
            }
        }

        public shellCreate(args: string[]) {
            if (!_krnDiskDriver) {
                _StdOut.putText("Disk driver is not loaded.");
                return;
            }
            if (args.length < 1) {
                _StdOut.putText("Usage: create <filename>");
                return;
            }

            var err = _krnDiskDriver.create(args[0]);
            if (err) {
                _StdOut.putText(err);
            } else {
                _StdOut.putText("File created: " + args[0]);
            }
        }

        public shellRead(args: string[]) {
            if (!_krnDiskDriver) {
                _StdOut.putText("Disk driver is not loaded.");
                return;
            }
            if (args.length < 1) {
                _StdOut.putText("Usage: read <filename>");
                return;
            }

            var result = _krnDiskDriver.read(args[0]);
            if (result.error) {
                _StdOut.putText(result.error);
            } else {
                _StdOut.putText(result.data);
            }
        }

        public shellWrite(args: string[]) {
            if (!_krnDiskDriver) {
                _StdOut.putText("Disk driver is not loaded.");
                return;
            }
            if (args.length < 2) {
                _StdOut.putText("Usage: write <filename> \"data\"");
                return;
            }

            var err = _krnDiskDriver.write(args[0], args[1]);
            if (err) {
                _StdOut.putText(err);
            } else {
                _StdOut.putText("File written: " + args[0]);
            }
        }

        public shellDelete(args: string[]) {
            if (!_krnDiskDriver) {
                _StdOut.putText("Disk driver is not loaded.");
                return;
            }
            if (args.length < 1) {
                _StdOut.putText("Usage: delete <filename>");
                return;
            }

            var err = _krnDiskDriver.delete(args[0]);
            if (err) {
                _StdOut.putText(err);
            } else {
                _StdOut.putText("File deleted: " + args[0]);
            }
        }

        public shellCopy(args: string[]) {
            if (!_krnDiskDriver) {
                _StdOut.putText("Disk driver is not loaded.");
                return;
            }
            if (args.length < 2) {
                _StdOut.putText("Usage: copy <existing filename> <new filename>");
                return;
            }

            var err = _krnDiskDriver.copy(args[0], args[1]);
            if (err) {
                _StdOut.putText(err);
            } else {
                _StdOut.putText("File copied: " + args[0] + " -> " + args[1]);
            }
        }

        public shellRename(args: string[]) {
            if (!_krnDiskDriver) {
                _StdOut.putText("Disk driver is not loaded.");
                return;
            }
            if (args.length < 2) {
                _StdOut.putText("Usage: rename <current filename> <new filename>");
                return;
            }

            var err = _krnDiskDriver.rename(args[0], args[1]);
            if (err) {
                _StdOut.putText(err);
            } else {
                _StdOut.putText("File renamed: " + args[0] + " -> " + args[1]);
            }
        }

        public shellLs(args: string[]) {
            if (!_krnDiskDriver) {
                _StdOut.putText("Disk driver is not loaded.");
                return;
            }

            var showAll = false;
            if (args.length > 0) {
                if (args[0] === "-a") {
                    showAll = true;
                } else {
                    _StdOut.putText("Usage: ls [-a]");
                    return;
                }
            }

            var result = _krnDiskDriver.list(showAll);
            if (result.error) {
                _StdOut.putText(result.error);
                return;
            }

            var files = result.files;
            if (!files || files.length === 0) {
                _StdOut.putText("No files on disk.");
                return;
            }

            for (var i = 0; i < files.length; i++) {
                if (i > 0) {
                    _StdOut.advanceLine();
                }
                if (showAll) {
                    _StdOut.putText(files[i].name + "  " + files[i].size + " bytes  " + files[i].created);
                } else {
                    _StdOut.putText(files[i].name);
                }
            }
        }

        public shellLink(args: string[]) {
            if (!_krnDiskDriver) {
                _StdOut.putText("Disk driver is not loaded.");
                return;
            }
            if (args.length < 2) {
                _StdOut.putText("Usage: link <existing filename> <new filename>");
                return;
            }

            var err = _krnDiskDriver.link(args[0], args[1]);
            if (err) {
                _StdOut.putText(err);
            } else {
                _StdOut.putText("Linked: " + args[0] + " <-> " + args[1]);
            }
        }

        public shellRecover(args: string[]) {
            if (!_krnDiskDriver) {
                _StdOut.putText("Disk driver is not loaded.");
                return;
            }

            var filename = (args.length > 0) ? args[0] : undefined;
            var result = _krnDiskDriver.recover(filename);
            if (result.error) {
                _StdOut.putText(result.error);
                return;
            }

            var recovered = result.recovered || [];
            var skipped = result.skipped || [];
            if (recovered.length === 0) {
                _StdOut.putText(filename
                    ? "Could not recover " + filename + " (data overwritten or name in use)."
                    : "No recoverable deleted files.");
            } else {
                _StdOut.putText("Recovered: " + recovered.join(", "));
            }
            if (skipped.length > 0) {
                _StdOut.advanceLine();
                _StdOut.putText("Skipped (not recoverable): " + skipped.join(", "));
            }
        }

        public shellChkdsk(args: string[]) {
            if (!_krnDiskDriver) {
                _StdOut.putText("Disk driver is not loaded.");
                return;
            }

            var result = _krnDiskDriver.reclaim();
            if (result.error) {
                _StdOut.putText(result.error);
                return;
            }

            var n = result.reclaimed || 0;
            if (n === 0) {
                _StdOut.putText("Disk check complete. No orphaned data blocks.");
            } else {
                _StdOut.putText("Disk check complete. Reclaimed " + n + " orphaned data block(s).");
            }
        }

        public shellDefrag(args: string[]) {
            if (!_krnDiskDriver) {
                _StdOut.putText("Disk driver is not loaded.");
                return;
            }

            var result = _krnDiskDriver.defrag();
            if (result.error) {
                _StdOut.putText(result.error);
                return;
            }

            _StdOut.putText("Defrag complete. " +
                (result.files || 0) + " file(s) packed into " +
                (result.blocks || 0) + " contiguous data block(s).");
        }

        public shellAlias(args: string[]) {
            if (args.length < 2) {
                _StdOut.putText("Usage: alias <command1> <command2>");
                return;
            }

            var command1 = args[0];
            var command2 = args[1];
            if (command1 === command2) {
                _StdOut.putText("Alias names must differ.");
                return;
            }

            var source = undefined;
            for (var i = 0; i < this.commandList.length; i++) {
                if (this.commandList[i].command === command1) {
                    source = this.commandList[i];
                }
                if (this.commandList[i].command === command2) {
                    _StdOut.putText("Command already exists: " + command2);
                    return;
                }
            }

            if (!source) {
                _StdOut.putText("Unknown command: " + command1);
                return;
            }

            // Same function / description under the new name so either works.
            var sc = new ShellCommand(source.func, command2, source.description);
            this.commandList[this.commandList.length] = sc;
            _StdOut.putText("Aliased: " + command1 + " -> " + command2);
        }
    }
}
