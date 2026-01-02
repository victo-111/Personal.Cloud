import React, { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sophistication?: 'low' | 'medium' | 'high' | 'very-high';
}

export const AnonAiModal: React.FC<Props> = ({ isOpen, onClose, sophistication = 'very-high' }) => {
  const [query, setQuery] = useState("");
  const [responses, setResponses] = useState<string[]>([]);
  const [terminalMode, setTerminalMode] = useState(false);
  const [terminalHistory, setTerminalHistory] = useState<Array<{ cmd: string; out: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string>("gpt-4o");
  const [temperature, setTemperature] = useState<number>(0.2);
  const [paneHeight, setPaneHeight] = useState<number>(220);
  const draggingRef = useRef(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Refs to hold response indices for streaming updates (avoid depending on changing state)
  const responseIndexRef = useRef<number>(-1);
  const terminalEntryIndexRef = useRef<number>(-1);

  const handleSend = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    const userQ = query.trim();
    setLoading(true);

    // Append user message and reserve a slot for the streaming response. Use ref to track index.
    setResponses((r) => {
      responseIndexRef.current = r.length + 1;
      return [...r, `You: ${userQ}`, `Anon Ai (defensive): `];
    });

    // Build URL with encoded params
    const params = new URLSearchParams();
    params.set('stream', '1');
    params.set('model', model);
    params.set('temperature', String(temperature));
    params.set('prompt', userQ);
    const url = `/api/anon-ai?${params.toString()}`;

    let es: EventSource | null = null;
    try {
      es = new EventSource(url);
      let buffer = '';
      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data || '{}');
          const chunk = payload?.chunk || '';
          if (chunk) {
            buffer += chunk;
            // update the response slot using ref index
            setResponses((prev) => {
              const copy = [...prev];
              copy[responseIndexRef.current] = `Anon Ai (defensive): ${buffer}`;
              return copy;
            });
          }
        } catch (err) {
          // non-json payload — append raw
          buffer += ev.data;
          setResponses((prev) => {
            const copy = [...prev];
            copy[responseIndexRef.current] = `Anon Ai (defensive): ${buffer}`;
            return copy;
          });
        }
      };
      es.addEventListener('done', () => {
        setLoading(false);
        es?.close();
        es = null;
      });
      es.onerror = (err) => {
        setLoading(false);
        es?.close();
        es = null;
        setResponses((r) => {
          const copy = [...r];
          copy[responseIndexRef.current] = (copy[responseIndexRef.current] || '') + '\n\n[Stream error]';
          return copy;
        });
      };
    } catch (err) {
      // fallback: non-streaming POST
      try {
        const res = await fetch('/api/anon-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userQ, sophistication, model, temperature }),
        });
        let text = '';
        try {
          const data = await res.json();
          text = data?.text || data?.response || JSON.stringify(data);
        } catch (e) {
          text = await res.text();
        }
        setResponses((r) => {
          const copy = [...r];
          copy[responseIndexRef.current] = `Anon Ai (defensive): ${text}`;
          return copy;
        });
      } catch (e) {
        setResponses((r) => {
          const copy = [...r];
          copy[responseIndexRef.current] = `Anon Ai (defensive): I can help with defensive cybersecurity tasks — recommend tooling and workflows for auditing, suggest safe log-analysis approaches, and outline forensic data collection best practices. You asked: "${userQ}"`;
          return copy;
        });
      } finally {
        setLoading(false);
      }
    } finally {
      setQuery('');
    }
  }, [model, temperature, sophistication, query]);

  const handleTerminalSend = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    const cmd = query.trim();
    setLoading(true);

    // Reserve terminal entry index via ref
    terminalEntryIndexRef.current = -1;
    setTerminalHistory((prev) => {
      terminalEntryIndexRef.current = prev.length;
      return [...prev, { cmd, out: '' }];
    });

    const params = new URLSearchParams();
    params.set('stream', '1');
    params.set('model', model);
    params.set('temperature', String(temperature));
    const prompt = `Act AS A TERMINAL: emulate execution of the following command and output only the result (no extra commentary). Command: ${cmd}`;
    params.set('prompt', prompt);
    const url = `/api/anon-ai?${params.toString()}`;

    let es: EventSource | null = null;
    try {
      es = new EventSource(url);
      let buffer = '';
      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data || '{}');
          const chunk = payload?.chunk || '';
          if (chunk) {
            buffer += chunk;
            setTerminalHistory((prev) => {
              const copy = [...prev];
              const idx = terminalEntryIndexRef.current;
              if (idx >= 0 && idx < copy.length) {
                copy[idx] = { ...copy[idx], out: buffer };
              }
              return copy;
            });
          }
        } catch (err) {
          buffer += ev.data;
          setTerminalHistory((prev) => {
            const copy = [...prev];
            const idx = terminalEntryIndexRef.current;
            if (idx >= 0 && idx < copy.length) {
              copy[idx] = { ...copy[idx], out: buffer };
            }
            return copy;
          });
        }
      };
      es.addEventListener('done', () => {
        setLoading(false);
        es?.close();
        es = null;
      });
      es.onerror = (err) => {
        setLoading(false);
        es?.close();
        es = null;
        setTerminalHistory((prev) => {
          const copy = [...prev];
          const idx = terminalEntryIndexRef.current;
          if (idx >= 0 && idx < copy.length) {
            copy[idx] = { ...copy[idx], out: (copy[idx].out || '') + '\n\n[Stream error]' };
          }
          return copy;
        });
      };
    } catch (err) {
      // fallback to POST
      try {
        const res = await fetch('/api/anon-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, sophistication, model, temperature }),
        });
        let text = '';
        try {
          const data = await res.json();
          text = data?.text || data?.response || JSON.stringify(data);
        } catch (e) {
          text = await res.text();
        }
        setTerminalHistory((prev) => {
          const copy = [...prev];
          const idx = terminalEntryIndexRef.current;
          if (idx >= 0 && idx < copy.length) {
            copy[idx] = { ...copy[idx], out: text };
          }
          return copy;
        });
      } catch (e) {
        setTerminalHistory((prev) => {
          const copy = [...prev];
          const idx = terminalEntryIndexRef.current;
          if (idx >= 0 && idx < copy.length) {
            copy[idx] = { ...copy[idx], out: 'Error: backend unreachable' };
          }
          return copy;
        });
      } finally {
        setLoading(false);
      }
    } finally {
      setQuery('');
    }
  }, [model, temperature, sophistication, query]);

  // Drag handlers for adjustable split
  useEffect(() => {
    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const dy = ev.clientY - startYRef.current;
      const next = Math.max(120, Math.min(720, startHeightRef.current + dy));
      setPaneHeight(next);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Keyboard shortcuts: Ctrl/Cmd+Enter send, Ctrl/Cmd+K focus, Esc close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (terminalMode) handleTerminalSend(); else handleSend();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, terminalMode, query, handleSend, handleTerminalSend, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[720px] max-w-[95%] neon-flash">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">🔐 Anon AI — Advanced Cybersecurity & Penetration Testing Intelligence</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Enterprise-grade defensive cybersecurity & ethical penetration testing expertise. Threat analysis, secure architecture, forensics, compliance, and authorized security auditing. Strictly lawful and defensive guidance only.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 mb-3 p-2 bg-card/50 border border-border rounded-lg">
          <div className="flex items-center gap-2">
            <button onClick={() => setTerminalMode(false)} className={`px-3 py-1.5 rounded text-sm transition-all ${!terminalMode ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card hover:bg-card/80'}`}>💬 Chat</button>
            <button onClick={() => setTerminalMode(true)} className={`px-3 py-1.5 rounded text-sm transition-all ${terminalMode ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card hover:bg-card/80'}`}>🖥️ Terminal</button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <label className="text-xs font-semibold text-foreground">🤖 Model:</label>
              <select value={model} onChange={(e) => setModel(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-xs neon-item">
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5">GPT-3.5</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs font-semibold text-foreground">Rigor:</label>
              <select value={temperature.toString()} onChange={(e) => setTemperature(Number(e.target.value))} className="px-2 py-1 bg-background border border-border rounded text-xs neon-item">
                <option value="0">Precise (0.0)</option>
                <option value="0.3">Analytical (0.3)</option>
                <option value="0.7">Balanced (0.7)</option>
              </select>
            </div>
          </div>
        </div>

        {!terminalMode ? (
          <>
            <div style={{ height: paneHeight }} className="overflow-auto bg-background border border-border rounded p-3 text-sm mb-1 neon-item space-y-2">
              {responses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <div className="text-4xl mb-3">🔐</div>
                  <p className="text-xs font-semibold">Anon AI - Cybersecurity & Penetration Testing Intelligence</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-3 leading-relaxed max-w-sm">
                    <strong>Defensive Security:</strong> 🛡️ Threat Assessment • 🔍 Forensics • 🏗️ Secure Architecture<br/>
                    <strong>Penetration Testing:</strong> 🎯 Vulnerability Assessment • 🔓 Exploitation Analysis • 📊 Reporting<br/>
                    <strong>Network Security:</strong> 🌐 Port Scanning • 🔎 Fingerprinting • 🛣️ Network Mapping<br/>
                    <strong>Compliance & Tools:</strong> 📋 OWASP/NIST • 🔧 Kali Linux Tools • 🔐 Cryptography<br/>
                    <strong>⚠️ Legal & Ethical:</strong> Authorization Verification • Legal Frameworks • Best Practices
                  </p>
                </div>
              ) : (
                responses.map((r, i) => (
                  <div key={i} className={`mb-2 whitespace-pre-wrap px-2.5 py-1.5 rounded text-xs ${
                    r.startsWith('You:')
                      ? 'bg-primary/20 border-l-2 border-primary text-primary-foreground font-medium'
                      : 'bg-card border-l-2 border-orange-400/50 text-foreground'
                  }`}>{r}</div>
                ))
              )}
            </div>
            <div
              onMouseDown={(e) => {
                draggingRef.current = true;
                startYRef.current = e.clientY;
                startHeightRef.current = paneHeight;
              }}
              className="h-1 mb-2 cursor-row-resize bg-border/50"
            />

            <form onSubmit={handleSend} className="space-y-2">
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setQuery("What are the OWASP Top 10 vulnerabilities for 2024?")}
                  className="px-2 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded text-xs border border-red-500/30 transition"
                  title="Quick query"
                >
                  🔓 OWASP Top 10
                </button>
                <button
                  type="button"
                  onClick={() => setQuery("How do I perform a network penetration test? What's the methodology?")}
                  className="px-2 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded text-xs border border-red-500/30 transition"
                  title="Quick query"
                >
                  🎯 PT Methodology
                </button>
                <button
                  type="button"
                  onClick={() => setQuery("Explain SQL injection attacks and how to detect/prevent them")}
                  className="px-2 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded text-xs border border-red-500/30 transition"
                  title="Quick query"
                >
                  💉 SQL Injection
                </button>
                <button
                  type="button"
                  onClick={() => setQuery("What is responsible disclosure and how do I report vulnerabilities?")}
                  className="px-2 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded text-xs border border-red-500/30 transition"
                  title="Quick query"
                >
                  📢 Disclosure
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded text-sm neon-border focus:border-red-400/50 focus:outline-none transition"
                  placeholder="Ask about threats, forensics, architecture, tools, compliance..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button type="submit" className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition disabled:opacity-50" disabled={!query.trim() || loading}>
                  {loading ? "Analyzing..." : "Send"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="h-48 overflow-auto bg-black text-green-300 font-mono border border-border rounded p-2 text-sm mb-3">
              {terminalHistory.length === 0 ? (
                <div className="text-muted-foreground">Terminal ready. Type a command below (simulated).</div>
              ) : (
                terminalHistory.map((t, i) => (
                  <div key={i} className="mb-2">
                    <div className="text-[12px] text-pink-300">$ {t.cmd}</div>
                    <pre className="whitespace-pre-wrap text-[13px]">{t.out}</pre>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleTerminalSend} className="space-y-2">
              <div className="flex gap-1.5 flex-wrap text-xs">
                <button
                  type="button"
                  onClick={() => setQuery("help")}
                  className="px-2 py-1 bg-green-600/30 hover:bg-green-600/50 text-green-300 rounded border border-green-500/30 transition font-mono"
                >
                  ?/ help
                </button>
                <button
                  type="button"
                  onClick={() => setQuery("nmap -sV target.com")}
                  className="px-2 py-1 bg-green-600/30 hover:bg-green-600/50 text-green-300 rounded border border-green-500/30 transition font-mono"
                >
                  nmap -sV
                </button>
                <button
                  type="button"
                  onClick={() => setQuery("sqlmap --help")}
                  className="px-2 py-1 bg-green-600/30 hover:bg-green-600/50 text-green-300 rounded border border-green-500/30 transition font-mono"
                >
                  sqlmap
                </button>
                <button
                  type="button"
                  onClick={() => setQuery("metasploit --version")}
                  className="px-2 py-1 bg-green-600/30 hover:bg-green-600/50 text-green-300 rounded border border-green-500/30 transition font-mono"
                >
                  metasploit
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  className="flex-1 px-3 py-2 bg-black border border-border rounded text-sm text-green-300 font-mono"
                  placeholder="simulate> ls -la"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleTerminalSend();
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const last = terminalHistory[terminalHistory.length - 1]?.cmd || '';
                      setQuery(last);
                    }
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setQuery('');
                    }
                  }}
                />
                <button type="submit" className="px-3 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50" disabled={!query.trim() || loading}>
                  {loading ? "Running..." : "Run"}
                </button>
              </div>
            </form>
          </>
        )}

        <DialogFooter>
          <div className="w-full">
            <div className="text-[11px] text-muted-foreground bg-red-950/30 px-2.5 py-1.5 rounded border border-red-400/20">
              ✅ Legal Penetration Testing • 🎯 Vulnerability Assessment • 🛡️ Defensive Strategies • 📊 Incident Response • 🔍 Forensics • 🔧 Kali Linux Guidance • 📋 OWASP/NIST Standards • ⚠️ Ethical & Authorized Only
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnonAiModal;
