import { useState, useRef, useEffect, KeyboardEvent } from "react";

interface CommandOutput {
  command: string;
  output: string[];
  isError?: boolean;
}

interface InteractiveTerminalProps {
  username?: string;
}

export const InteractiveTerminal = ({ username = "user" }: InteractiveTerminalProps) => {
  const [history, setHistory] = useState<CommandOutput[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentDir, setCurrentDir] = useState("~");
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const fileSystem: Record<string, string[]> = {
    "~": ["Documents", "Downloads", "Pictures", "Music", ".bashrc"],
    "~/Documents": ["notes.txt", "projects", "readme.md"],
    "~/Downloads": ["file1.zip", "image.png"],
    "~/Pictures": ["wallpaper.jpg", "screenshot.png"],
    "~/Music": ["song1.mp3", "song2.mp3"],
    "~/Documents/projects": ["webapp", "api"],
  };

  const fileContents: Record<string, string> = {
    "~/.bashrc": "# CloudSpace Terminal Configuration\nexport PS1='\\u@cloudspace:\\w$ '\nalias ll='ls -la'",
    "~/Documents/notes.txt": "Welcome to CloudSpace!\nThis is your personal cloud desktop.",
    "~/Documents/readme.md": "# CloudSpace\n\nYour virtual desktop in the cloud.\n\n## Features\n- File management\n- Code editor\n- Music player\n- And more!",
  };

  useEffect(() => {
    terminalRef.current?.scrollTo(0, terminalRef.current.scrollHeight);
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const resolvePath = (path: string): string => {
    if (path.startsWith("~/")) return path;
    if (path === "~") return "~";
    if (path.startsWith("/")) return path;
    if (path === "..") {
      const parts = currentDir.split("/");
      if (parts.length > 1) {
        parts.pop();
        return parts.join("/") || "~";
      }
      return "~";
    }
    if (path === ".") return currentDir;
    return currentDir === "~" ? `~/${path}` : `${currentDir}/${path}`;
  };

  const executeCommand = (cmd: string): { output: string[]; isError?: boolean } => {
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case "help":
        return {
          output: [
            "Available commands:",
            "  help          - Show this help message",
            "  ls [dir]      - List directory contents",
            "  cd <dir>      - Change directory",
            "  pwd           - Print working directory",
            "  cat <file>    - Display file contents",
            "  echo <text>   - Print text to terminal",
            "  whoami        - Display current user",
            "  date          - Display current date/time",
            "  clear         - Clear the terminal",
            "  uname         - System information",
            "  neofetch      - Display system info",
            "  history       - Show command history",
          ],
        };

      case "ls":
        const lsPath = args[0] ? resolvePath(args[0]) : currentDir;
        const contents = fileSystem[lsPath];
        if (!contents) {
          return { output: [`ls: cannot access '${args[0] || "."}': No such file or directory`], isError: true };
        }
        return {
          output: contents.map(item => 
            fileSystem[lsPath === "~" ? `~/${item}` : `${lsPath}/${item}`] 
              ? `📁 ${item}/` 
              : `📄 ${item}`
          ),
        };

      case "cd":
        if (!args[0] || args[0] === "~") {
          setCurrentDir("~");
          return { output: [] };
        }
        const cdPath = resolvePath(args[0]);
        if (fileSystem[cdPath]) {
          setCurrentDir(cdPath);
          return { output: [] };
        }
        return { output: [`cd: ${args[0]}: No such file or directory`], isError: true };

      case "pwd":
        return { output: [currentDir.replace("~", "/home/" + username)] };

      case "cat":
        if (!args[0]) {
          return { output: ["cat: missing file operand"], isError: true };
        }
        const catPath = resolvePath(args[0]);
        const content = fileContents[catPath];
        if (content) {
          return { output: content.split("\n") };
        }
        return { output: [`cat: ${args[0]}: No such file or directory`], isError: true };

      case "echo":
        return { output: [args.join(" ")] };

      case "whoami":
        return { output: [username] };

      case "date":
        return { output: [new Date().toString()] };

      case "clear":
        setHistory([]);
        return { output: [] };

      case "uname":
        if (args[0] === "-a") {
          return { output: ["CloudSpace 1.0.0 cloudspace-kernel x86_64 GNU/Linux"] };
        }
        return { output: ["CloudSpace"] };

      case "neofetch":
        return {
          output: [
            "       ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄       " + username + "@cloudspace",
            "     ▄▀░░░░░░░░░░░░░░░░░░▀▄     ──────────────────",
            "    █░░░░░░░░░░░░░░░░░░░░░░█    OS: CloudSpace 1.0",
            "   █░░░░░░░░░░░░░░░░░░░░░░░░█   Host: Virtual Desktop",
            "  █░░░░░░░░░░░░░░░░░░░░░░░░░░█  Kernel: cloudspace-1.0",
            "  █░░░▀▀▀░░░░░░░░░░░▀▀▀░░░░░█  Uptime: Just now",
            "  █░░░░░░░░░░░░░░░░░░░░░░░░░█  Shell: csh 1.0",
            "  █░░░░░░░░░░░░░░░░░░░░░░░░░█  Terminal: CloudSpace",
            "   █░░░░░░░░░░░░░░░░░░░░░░░█   Memory: ∞ GB",
            "    ▀▄░░░░░░░░░░░░░░░░░░▄▀    ",
            "      ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀       ",
          ],
        };

      case "history":
        return {
          output: commandHistory.map((cmd, i) => `  ${i + 1}  ${cmd}`),
        };

      case "":
        return { output: [] };

      default:
        return { output: [`${command}: command not found. Type 'help' for available commands.`], isError: true };
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const result = executeCommand(currentInput);
      
      if (currentInput.trim() && currentInput.trim() !== "clear") {
        setHistory(prev => [...prev, { command: currentInput, ...result }]);
        setCommandHistory(prev => [...prev, currentInput]);
      }
      
      setCurrentInput("");
      setHistoryIndex(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentInput("");
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Simple tab completion for current directory
      const contents = fileSystem[currentDir] || [];
      const match = contents.find(item => item.startsWith(currentInput.split(/\s+/).pop() || ""));
      if (match) {
        const parts = currentInput.split(/\s+/);
        parts[parts.length - 1] = match;
        setCurrentInput(parts.join(" "));
      }
    }
  };

  return (
    <div 
      ref={terminalRef}
      className="h-full bg-black/95 p-4 font-mono text-sm overflow-auto cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <p className="text-cyan-400">CloudSpace Terminal v1.0.0</p>
      <p className="text-muted-foreground mb-2">Type 'help' for available commands</p>
      
      {history.map((entry, i) => (
        <div key={i} className="mb-2">
          <div className="flex items-center gap-2">
            <span className="text-green-400">{username}@cloudspace</span>
            <span className="text-muted-foreground">:</span>
            <span className="text-blue-400">{currentDir}</span>
            <span className="text-muted-foreground">$</span>
            <span className="text-foreground">{entry.command}</span>
          </div>
          {entry.output.map((line, j) => (
            <p key={j} className={entry.isError ? "text-red-400 pl-0" : "text-foreground/80 pl-0"}>
              {line}
            </p>
          ))}
        </div>
      ))}

      <div className="flex items-center gap-2">
        <span className="text-green-400">{username}@cloudspace</span>
        <span className="text-muted-foreground">:</span>
        <span className="text-blue-400">{currentDir}</span>
        <span className="text-muted-foreground">$</span>
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-foreground caret-primary"
          autoFocus
          spellCheck={false}
        />
      </div>
    </div>
  );
};
