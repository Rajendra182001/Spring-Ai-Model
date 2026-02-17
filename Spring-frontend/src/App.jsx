import { useState, useRef, useEffect } from "react";
import "./App.css";

const API_BASE = "http://localhost:8080";

function TypingDots() {
  return (
    <div className="typing-indicator">
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}

// ── Parse text into segments: plain text or code blocks ──
function parseSegments(text) {
  const segments = [];
  // matches ```lang\n...code...\n``` or ```\n...code...\n```
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code", lang: match[1] || "code", content: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }
  return segments;
}

// ── Copy button with feedback ──
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={handleCopy} title="Copy code">
      {copied ? (
        <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
          <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      )}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ── Code Block ──
function CodeBlock({ lang, content }) {
  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-lang">{lang || "code"}</span>
        <CopyButton text={content} />
      </div>
      <pre className="code-pre"><code>{content}</code></pre>
    </div>
  );
}

// ── Message renderer ──
function MessageContent({ text }) {
  const segments = parseSegments(text);
  return (
    <div className="msg-content">
      {segments.map((seg, i) =>
        seg.type === "code" ? (
          <CodeBlock key={i} lang={seg.lang} content={seg.content} />
        ) : (
          seg.content.trim()
            ? <p key={i} className="msg-text">{seg.content.trim()}</p>
            : null
        )
      )}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`message-row ${isUser ? "user-row" : "ai-row"}`}>
      {!isUser && (
        <div className="avatar ai-avatar">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
          </svg>
        </div>
      )}
      <div className={`bubble ${isUser ? "user-bubble" : "ai-bubble"}`}>
        <MessageContent text={msg.text} />
        <span className="timestamp">{msg.time}</span>
      </div>
      {isUser && (
        <div className="avatar user-avatar">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: "ai",
      text: "Hello! I'm your AI assistant powered by Ollama. Ask me anything — I'm here to help.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const getTime = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now(), role: "user", text, time: getTime() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch(
        `${API_BASE}/ask?msg=${encodeURIComponent(text)}`
      );
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.text();
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "ai", text: data, time: getTime() },
      ]);
    } catch (err) {
      setError("Failed to reach the server. Is your Spring Boot app running?");
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          text: "⚠️ I couldn't connect to the backend. Please check that your Spring Boot server is running on port 8080.",
          time: getTime(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now(),
        role: "ai",
        text: "Chat cleared. How can I help you?",
        time: getTime(),
      },
    ]);
    setError(null);
  };

  return (
    <div className="shell">
      {/* Ambient background blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="chat-window">
        {/* Header */}
        <header className="chat-header">
          <div className="header-left">
            <div className="status-ring">
              <div className="status-dot" />
            </div>
            <div className="header-text">
              <h1>Ollama AI</h1>
              <span>Spring Boot · Local Model</span>
            </div>
          </div>
          <button className="clear-btn" onClick={clearChat} title="Clear chat">
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </header>

        {/* Messages */}
        <main className="messages-area">
          {messages.map((msg) => (
            <Message key={msg.id} msg={msg} />
          ))}
          {loading && (
            <div className="message-row ai-row">
              <div className="avatar ai-avatar">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="12" r="2" fill="currentColor"/>
                </svg>
              </div>
              <div className="bubble ai-bubble">
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </main>

        {/* Error Banner */}
        {error && (
          <div className="error-banner">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 7v5M12 16v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {error}
          </div>
        )}

        {/* Input */}
        <footer className="input-bar">
          <div className="input-wrapper">
            <textarea
              ref={(el) => {
                textareaRef.current = el;
                inputRef.current = el;
              }}
              rows={1}
              placeholder="Ask anything…"
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="chat-input"
            />
            <button
              className={`send-btn ${loading || !input.trim() ? "disabled" : ""}`}
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p className="hint">Press Enter to send · Shift+Enter for new line</p>
        </footer>
      </div>
    </div>
  );
}