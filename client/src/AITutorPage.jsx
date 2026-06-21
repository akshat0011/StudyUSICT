import { API_URL } from "./api";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { branchCodes as branches } from "./branches"; // CHANGED: shared list

const semesters = ["1", "2", "3", "4", "5", "6", "7", "8"];

function AITutorPage() {
  const [branch, setBranch] = useState("CSE");
  const [semester, setSemester] = useState("3");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
const messagesRef = useRef(null); // CHANGED

  useEffect(() => {                               // CHANGED
    const el = messagesRef.current;               // scroll only the message box,
    if (el) el.scrollTop = el.scrollHeight;        // not the whole page
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(API_URL + "/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, branch, semester }),
      });
      const data = await res.json();
      const reply = res.ok ? data.reply : data.error || "Something went wrong. Please try again.";
      setMessages([...newMessages, { role: "model", content: reply }]);
    } catch {
      setMessages([...newMessages, { role: "model", content: "Couldn't reach the tutor. Is the backend running?" }]);
    }
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function resetThread() {
    setMessages([]);
    setInput("");
  }

  return (
    <div className="page">
      <div className="tutor-grid">
        <aside className="tutor-sidebar">
          <div className="tutor-guide-head">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8L16.5 17.5l1.8-.7z"/></svg>
            <span>AI Study Guide</span>
          </div>
          <p className="tutor-guide-sub">
            Pick your branch and semester — the tutor is tuned to that syllabus and answers from it.
          </p>

          <div className="tutor-field">
            <label className="field-label">USICT Branch</label>
            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
              {branches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="tutor-field">
            <label className="field-label">Semester</label>
            <select value={semester} onChange={(e) => setSemester(e.target.value)}>
              {semesters.map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          <div className="tutor-workspace">
            <div className="tutor-workspace-head">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              <span>Active Workspace</span>
            </div>
            <div className="tutor-workspace-row">Branch: <strong>{branch}</strong></div>
            <div className="tutor-workspace-row">Semester: <strong>{String(semester).padStart(2, "0")}</strong></div>
            <button className="reset-thread-btn" onClick={resetThread}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>
              Reset Thread
            </button>
          </div>
        </aside>

        <main className="tutor-chat">
          <div className="tutor-messages" ref={messagesRef}>
            <div className="chat-msg ai">
              <p>Hello! I am your <strong>StudyUSICT AI Companion</strong>.</p>
              <p>I am context-sensitive and can assist you with your GGSIPU odd/even semester preparations. I am currently tuned to <strong>{branch} – Semester {semester}</strong>.</p>
              <p>Ask me standard analytical doubts, request pseudocode, or let's practice MCQs and university exam questions together!</p>
            </div>

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div className="chat-msg user" key={i}>{m.content}</div>
              ) : (
                <div className="chat-msg ai" key={i}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              )
            )}

            {loading && (
              <div className="chat-msg ai chat-loading">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            )}
          </div>

          <div className="tutor-input-row">
            <input
              type="text"
              className="tutor-input"
              placeholder={`Ask any doubt from GGSIPU ${branch} Sem ${semester} subjects...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="tutor-send" onClick={sendMessage} disabled={loading} aria-label="Send">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>
            </button>
          </div>

          <p className="tutor-disclaimer">
            StudyUSICT Companion AI drafts standard explanations. Verify code blocks and theorem proofs before exam submission.
          </p>
        </main>
      </div>
    </div>
  );
}

export default AITutorPage;