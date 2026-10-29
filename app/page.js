"use client";

import { useRef, useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_MB = 10;

// Split text on commas, semicolons, spaces and new lines
function splitEmails(text) {
  return text
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

export default function Home() {
  const [emails, setEmails] = useState([]);
  const [emailInput, setEmailInput] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [results, setResults] = useState([]);
  const fileRef = useRef(null);

  // Add one or many emails from a string (typed or pasted)
  function addEmails(text) {
    const parts = splitEmails(text);
    if (parts.length === 0) return;

    const invalid = parts.filter((p) => !EMAIL_REGEX.test(p));
    const valid = parts.filter((p) => EMAIL_REGEX.test(p));

    setEmails((prev) => {
      const set = new Set(prev.map((e) => e.toLowerCase()));
      const next = [...prev];
      for (const v of valid) {
        if (!set.has(v.toLowerCase())) {
          set.add(v.toLowerCase());
          next.push(v);
        }
      }
      return next;
    });

    if (invalid.length) {
      setError(`Invalid email skipped: ${invalid.join(", ")}`);
    } else {
      setError("");
    }
  }

  function handleEmailKeyDown(e) {
    if (e.key === "Enter" || e.key === "," || e.key === ";" || e.key === " ") {
      if (emailInput.trim()) {
        e.preventDefault();
        addEmails(emailInput);
        setEmailInput("");
      } else if (e.key === "Enter") {
        e.preventDefault();
      }
    } else if (e.key === "Backspace" && !emailInput && emails.length) {
      setEmails((prev) => prev.slice(0, -1));
    }
  }

  function handleEmailPaste(e) {
    const text = e.clipboardData.getData("text");
    if (/[,;\s]/.test(text.trim())) {
      e.preventDefault();
      addEmails(text);
    }
  }

  function removeEmail(email) {
    setEmails((prev) => prev.filter((e) => e !== email));
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File is too large. Max ${MAX_FILE_MB} MB.`);
      e.target.value = "";
      return;
    }
    setError("");
    setFile(f);
  }

  function clearFile() {
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSend(e) {
    e.preventDefault();
    setError("");
    setSummary("");
    setResults([]);

    // Also take whatever is still typed in the input box
    const pending = splitEmails(emailInput);
    const pendingInvalid = pending.filter((p) => !EMAIL_REGEX.test(p));
    if (pendingInvalid.length) {
      setError(`Invalid email: ${pendingInvalid.join(", ")}`);
      return;
    }
    const finalEmails = [...emails];
    for (const p of pending) {
      if (!finalEmails.some((x) => x.toLowerCase() === p.toLowerCase())) {
        finalEmails.push(p);
      }
    }

    if (finalEmails.length === 0) return setError("Add at least one email address.");
    if (!subject.trim()) return setError("Please enter a heading / subject.");
    if (!message.trim()) return setError("Please enter a description / message.");
    if (!password) return setError("Enter the password to send emails.");

    setEmails(finalEmails);
    setEmailInput("");
    setSending(true);

    try {
      const formData = new FormData();
      formData.append("emails", JSON.stringify(finalEmails));
      formData.append("subject", subject);
      formData.append("message", message);
      formData.append("password", password);
      if (file) formData.append("resume", file);

      const res = await fetch("/api/send", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        if (res.status === 401) setPassword(""); // wrong password: clear it
      } else {
        setResults(data.results || []);
        setSummary(`Sent ${data.sent} of ${data.total} emails${data.failed ? ` (${data.failed} failed)` : ""}.`);
      }
    } catch (err) {
      setError(err.message || "Network error.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="container">
      <h1>📧 Mail Sender</h1>
      <p className="subtitle">
        Each recipient gets their own separate email with your heading, description and resume.
      </p>

      <form className="card" onSubmit={handleSend}>
        {error && <div className="alert error">{error}</div>}
        {summary && <div className="alert success">{summary}</div>}

        <div className="field">
          <label className="label">To (recipients)</label>
          <div className="chips">
            {emails.map((email) => (
              <span className="chip" key={email}>
                {email}
                <button type="button" onClick={() => removeEmail(email)} aria-label={`Remove ${email}`}>
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={emailInput}
              placeholder={emails.length ? "Add more..." : "ab@gmail.com, abc@gmail.com"}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={handleEmailKeyDown}
              onPaste={handleEmailPaste}
              onBlur={() => {
                if (emailInput.trim()) {
                  addEmails(emailInput);
                  setEmailInput("");
                }
              }}
            />
          </div>
          <div className="hint">
            Separate with comma, space or Enter. You can paste a whole list. {emails.length} added.
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="subject">Heading (subject)</label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Application for Software Engineer role"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="message">Description (message)</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={"Dear Hiring Manager,\n\nI am writing to apply for..."}
          />
        </div>

        <div className="field">
          <label className="label">Resume / attachment</label>
          <div className="file-row">
            <label className="file-btn" htmlFor="resume">
              {file ? "Change file" : "Upload resume"}
            </label>
            <input
              id="resume"
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            {file ? (
              <>
                <span className="file-name">
                  📎 {file.name} ({(file.size / 1024).toFixed(0)} KB)
                </span>
                <button type="button" className="link-btn" onClick={clearFile}>
                  remove
                </button>
              </>
            ) : (
              <span className="hint">PDF / DOC / DOCX, max {MAX_FILE_MB} MB (optional)</span>
            )}
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="password">🔒 Password (required to send)</label>
          <div className="password-row">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your send password"
              autoComplete="off"
            />
            <button
              type="button"
              className="link-btn muted"
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? "hide" : "show"}
            </button>
          </div>
          <div className="hint">Emails are sent only if this matches SEND_PASSWORD on the server.</div>
        </div>

        <button className="send-btn" type="submit" disabled={sending}>
          {sending ? "Sending... please wait" : "Send Emails"}
        </button>
      </form>

      {results.length > 0 && (
        <section className="results">
          <h2>Delivery report</h2>
          {results.map((r) => (
            <div key={r.email} className={`result-row ${r.success ? "ok" : "fail"}`}>
              <span>{r.email}</span>
              <span>{r.success ? "✓ Sent" : `✗ ${r.error}`}</span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
