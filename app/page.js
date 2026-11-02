"use client";

import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Input,
  List,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  CloudUploadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  LockOutlined,
  MailOutlined,
  PaperClipOutlined,
  SendOutlined,
  UndoOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { DEFAULT_MESSAGE, DEFAULT_SUBJECT } from "./defaults";

const { Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_MB = 10;
const ALLOWED_EXT = [".pdf", ".doc", ".docx"];

export default function Home() {
  const { message: toast } = App.useApp();

  const [emails, setEmails] = useState([]);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_MESSAGE);
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);

  // ----- recipients -----
  function handleEmailsChange(values) {
    const cleaned = [];
    const invalid = [];
    for (const raw of values) {
      const v = String(raw).trim().toLowerCase();
      if (!v) continue;
      if (!EMAIL_REGEX.test(v)) {
        invalid.push(raw);
        continue;
      }
      if (!cleaned.includes(v)) cleaned.push(v);
    }
    if (invalid.length) toast.warning(`Invalid email skipped: ${invalid.join(", ")}`);
    setEmails(cleaned);
  }

  // ----- attachment -----
  function beforeUpload(f) {
    const name = f.name.toLowerCase();
    if (!ALLOWED_EXT.some((ext) => name.endsWith(ext))) {
      toast.error("Only PDF, DOC or DOCX files are allowed.");
      return Upload.LIST_IGNORE;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`File is too large. Max ${MAX_FILE_MB} MB.`);
      return Upload.LIST_IGNORE;
    }
    setFile(f);
    setError("");
    return false; // do not auto-upload; we send it with the form
  }

  const fileList = file
    ? [{ uid: "resume", name: file.name, status: "done", size: file.size }]
    : [];

  // ----- send -----
  const canSend = !!file && !sending;

  async function handleSend() {
    setError("");
    setSummary(null);
    setResults([]);

    if (!file) return setError("Attach your resume first. Emails cannot be sent without an attachment.");
    if (emails.length === 0) return setError("Add at least one recipient email.");
    if (!subject.trim()) return setError("Please enter a heading / subject.");
    if (!body.trim()) return setError("Please enter a description / message.");
    if (!password) return setError("Enter the password to send emails.");

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("emails", JSON.stringify(emails));
      formData.append("subject", subject);
      formData.append("message", body);
      formData.append("password", password);
      formData.append("resume", file);

      const res = await fetch("/api/send", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        if (res.status === 401) setPassword("");
      } else {
        setResults(data.results || []);
        setSummary({ total: data.total, sent: data.sent, failed: data.failed });
        if (data.failed) toast.warning(`Sent ${data.sent} of ${data.total}. ${data.failed} failed.`);
        else toast.success(`All ${data.sent} emails sent!`);
      }
    } catch (err) {
      setError(err.message || "Network error.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-inner">
          <div className="hero-icon">
            <MailOutlined />
          </div>
          <div>
            <h1>Mail Sender</h1>
            <p>One personal email per recipient, with your resume attached.</p>
          </div>
        </div>
      </header>

      <main className="content">
        {error && (
          <Alert
            type="error"
            showIcon
            closable
            message={error}
            onClose={() => setError("")}
            style={{ marginBottom: 16, borderRadius: 12 }}
          />
        )}

        {/* ---------- Recipients ---------- */}
        <Card className="panel" styles={{ body: { padding: 20 } }}>
          <div className="field">
            <div className="section-title">
              <span className="name">
                <UserOutlined /> To (recipients)
              </span>
              <span className="actions">
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={emails.length === 0}
                  onClick={() => setEmails([])}
                >
                  Clear
                </Button>
              </span>
            </div>
            <Select
              mode="tags"
              size="large"
              style={{ width: "100%" }}
              value={emails}
              onChange={handleEmailsChange}
              tokenSeparators={[",", ";", " ", "\n"]}
              open={false}
              suffixIcon={null}
              placeholder="hr@company.com, jobs@company.com"
            />
            <div className="status-row">
              <Tag color={emails.length ? "blue" : "default"}>{emails.length} recipient(s)</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Type or paste a list. Separate with comma, space or Enter.
              </Text>
            </div>
          </div>
        </Card>

        {/* ---------- Subject & message ---------- */}
        <Card className="panel" styles={{ body: { padding: 20 } }}>
          <div className="field">
            <div className="section-title">
              <span className="name">
                <FileTextOutlined /> Heading (subject)
              </span>
              <span className="actions">
                <Tooltip title="Restore default heading">
                  <Button
                    size="small"
                    type="text"
                    icon={<UndoOutlined />}
                    onClick={() => setSubject(DEFAULT_SUBJECT)}
                  >
                    Reset
                  </Button>
                </Tooltip>
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!subject}
                  onClick={() => setSubject("")}
                >
                  Clear
                </Button>
              </span>
            </div>
            <Input
              size="large"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Write your email heading"
              allowClear
            />
          </div>

          <div className="field message-area">
            <div className="section-title">
              <span className="name">
                <MailOutlined /> Description (message)
              </span>
              <span className="actions">
                <Tooltip title="Restore default message">
                  <Button
                    size="small"
                    type="text"
                    icon={<UndoOutlined />}
                    onClick={() => setBody(DEFAULT_MESSAGE)}
                  >
                    Reset
                  </Button>
                </Tooltip>
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!body}
                  onClick={() => setBody("")}
                >
                  Clear
                </Button>
              </span>
            </div>
            <TextArea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              autoSize={{ minRows: 10, maxRows: 24 }}
              placeholder="Write your email message"
              showCount
            />
          </div>
        </Card>

        {/* ---------- Attachment ---------- */}
        <Card className="panel" styles={{ body: { padding: 20 } }}>
          <div className="section-title">
            <span className="name">
              <PaperClipOutlined /> Resume / attachment <Tag color="red">Required</Tag>
            </span>
          </div>
          <Dragger
            accept={ALLOWED_EXT.join(",")}
            maxCount={1}
            multiple={false}
            beforeUpload={beforeUpload}
            fileList={fileList}
            onRemove={() => setFile(null)}
            showUploadList={{ showRemoveIcon: true }}
          >
            <p className="ant-upload-drag-icon">
              <CloudUploadOutlined />
            </p>
            <p className="ant-upload-text">Tap or drop your resume here</p>
            <p className="ant-upload-hint">
              PDF / DOC / DOCX, max {MAX_FILE_MB} MB. Emails will not be sent without it.
            </p>
          </Dragger>
          {!file && (
            <Alert
              style={{ marginTop: 12, borderRadius: 10 }}
              type="warning"
              showIcon
              message="Attach your resume to enable sending."
            />
          )}
        </Card>

        {/* ---------- Password ---------- */}
        <Card className="panel" styles={{ body: { padding: 20 } }}>
          <div className="section-title">
            <span className="name">
              <LockOutlined /> Password (required to send)
            </span>
          </div>
          <Input.Password
            size="large"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your send password"
            autoComplete="off"
            onPressEnter={handleSend}
          />
        </Card>

        {/* ---------- Delivery report ---------- */}
        {summary && (
          <Card className="panel" title="Delivery report" styles={{ body: { padding: 20 } }}>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={8}>
                <Statistic title="Total" value={summary.total} />
              </Col>
              <Col span={8}>
                <Statistic title="Sent" value={summary.sent} valueStyle={{ color: "#16a34a" }} />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Failed"
                  value={summary.failed}
                  valueStyle={{ color: summary.failed ? "#dc2626" : undefined }}
                />
              </Col>
            </Row>
            <List
              size="small"
              dataSource={results}
              renderItem={(r) => (
                <List.Item>
                  <div className="result-item">
                    <span className="email">{r.email}</span>
                    {r.success ? (
                      <Tag icon={<CheckCircleFilled />} color="success">
                        Sent
                      </Tag>
                    ) : (
                      <Tooltip title={r.error}>
                        <Tag icon={<CloseCircleFilled />} color="error">
                          Failed
                        </Tag>
                      </Tooltip>
                    )}
                  </div>
                </List.Item>
              )}
            />
          </Card>
        )}
      </main>

      {/* ---------- Sticky action bar ---------- */}
      <div className="action-bar">
        <div className="action-bar-inner">
          <div className="action-meta">
            <b>{emails.length}</b> recipient(s) · {file ? <b>{file.name}</b> : "no attachment"}
          </div>
          <Tooltip title={!file ? "Attach your resume to send" : ""}>
            <span style={{ display: "contents" }}>
              <Button
                type="primary"
                className="send-btn"
                icon={<SendOutlined />}
                loading={sending}
                disabled={!canSend}
                onClick={handleSend}
              >
                {sending ? "Sending..." : "Send Emails"}
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
