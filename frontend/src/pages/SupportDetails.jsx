import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  Tag,
  User,
  X,
  Paperclip,
  FileText,
  Download,
} from "lucide-react";
import API from "../api/axios";
import "./SupportDetails.css";

const STATUS_OPTIONS = ["OPEN", "PENDING", "RESOLVED", "CLOSED"];

const QUICK_RESPONSES = [
  {
    label: "🔑 Activation Issue",
    text: "Hi, please share a screenshot of your payment receipt or order ID so we can verify and activate your premium subscription manually.",
  },
  {
    label: "⚡ App Cache Reset",
    text: "Hi, please try clearing your browser cache or updating the GoliDoli app to the latest version. Let us know if the issue persists.",
  },
  {
    label: "📱 Request Specs",
    text: "Hi, could you please provide more details about this issue (e.g., your device model, system version, error message, or screen recording)?",
  },
  {
    label: "✅ Marked Resolved",
    text: "Hi, this issue has been resolved. Please check now and let us know if everything is working fine. Thank you for your patience!",
  }
];

const formatDate = (value) => {
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

export default function SupportDetails({ ticketId }) {
  const params = useParams();
  const navigate = useNavigate();
  const routeTicketId = ticketId || params.id;

  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [tickets, setTickets] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [error, setError] = useState("");
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [replyFiles, setReplyFiles] = useState([]);

  const threadEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = (behavior = "smooth") => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior });
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      // We need to trigger the form submit or call handleReply directly.
      // To ensure that the submit event is properly passed and handled,
      // we'll programmatically dispatch it or trigger a synthetic submit event.
      const submitBtn = document.getElementById("sendReplySubmitBtn");
      if (submitBtn) {
        submitBtn.click();
      }
    }
  };

  const activeTicketId = routeTicketId || selectedTicketId;
  const showTicketList = !routeTicketId;

  // Count tickets by status reactively
  const statusCounts = useMemo(() => {
    const counts = { ALL: tickets.length, OPEN: 0, PENDING: 0, RESOLVED: 0, CLOSED: 0 };
    tickets.forEach((t) => {
      const s = (t.status || "OPEN").toUpperCase();
      if (counts[s] !== undefined) {
        counts[s]++;
      }
    });
    return counts;
  }, [tickets]);

  // Filter tickets reactively based on status and search query
  const filteredTickets = useMemo(() => {
    let list = tickets;

    if (statusFilter !== "ALL") {
      list = list.filter((item) => (item.status || "OPEN").toUpperCase() === statusFilter);
    }

    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase().trim();
    return list.filter((item) => {
      const subject = (item.subject || "").toLowerCase();
      const userName = (item.user?.name || "").toLowerCase();
      const userEmail = (item.user?.email || "").toLowerCase();
      const itemStatus = (item.status || "").toLowerCase();
      const category = (item.category || "").toLowerCase();
      const ticketIdStr = (item._id || "").toLowerCase();
      return (
        subject.includes(query) ||
        userName.includes(query) ||
        userEmail.includes(query) ||
        itemStatus.includes(query) ||
        category.includes(query) ||
        ticketIdStr.includes(query)
      );
    });
  }, [tickets, statusFilter, searchQuery]);

  const user = ticket?.user || {};
  const userName = user.name || "Unknown User";

  const fetchTickets = useCallback(async () => {
    if (!showTicketList) return;

    try {
      setTicketsLoading(true);
      const res = await API.get("/admin/support");
      const nextTickets = res.data.tickets || [];

      setTickets(nextTickets);
      setSelectedTicketId((currentId) => {
        if (currentId) return currentId;
        return nextTickets[0]?._id || "";
      });
    } catch (err) {
      console.error("Fetch Support Tickets Error:", err);
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  }, [showTicketList]);

  const fetchTicket = useCallback(async () => {
    if (!activeTicketId) {
      setLoading(false);
      setTicket(null);
      setMessages([]);
      setStatus("");
      setError(showTicketList ? "" : "Ticket id is missing");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await API.get(`/admin/support/${activeTicketId}`);
      const nextTicket = res.data.ticket || null;

      setTicket(nextTicket);
      setMessages(res.data.messages || []);
      setStatus(nextTicket?.status || "");
    } catch (err) {
      console.error("Fetch Support Ticket Error:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load this support ticket"
      );
    } finally {
      setLoading(false);
    }
  }, [activeTicketId, showTicketList]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom("smooth");
    }
  }, [messages]);

  useEffect(() => {
    if (!loading) {
      // Small timeout to ensure the DOM has finished painting
      const timer = setTimeout(() => {
        scrollToBottom("auto");
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const timeline = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  }, [messages]);

  const handleStatusChange = async (nextStatus) => {
    if (!activeTicketId || nextStatus === status) return;

    const previousStatus = status;
    setStatus(nextStatus);
    setSavingStatus(true);

    try {
      const res = await API.patch(
        `/admin/support/status/${activeTicketId}`,
        { status: nextStatus }
      );
      setTicket(res.data.ticket || { ...ticket, status: nextStatus });
    } catch (err) {
      console.error("Update Support Status Error:", err);
      setStatus(previousStatus);
      alert(err.response?.data?.message || "Status update failed");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleReply = async (event) => {
    event.preventDefault();

    const trimmedReply = reply.trim();
    if (!activeTicketId) return;
    if (!trimmedReply && replyFiles.length === 0) return;

    try {
      setSendingReply(true);
      const formData = new FormData();
      formData.append("message", trimmedReply);
      replyFiles.forEach((file) => {
        formData.append("attachments", file);
      });

      await API.post(`/admin/support/reply/${activeTicketId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setReply("");
      setReplyFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      fetchTicket();
      fetchTickets();
    } catch (err) {
      console.error("Send Support Reply Error:", err);
      alert(err.response?.data?.message || "Reply failed");
    } finally {
      setSendingReply(false);
    }
  };

  const ticketList = showTicketList ? (
    <div className="support-ticket-list">
      <div className="support-ticket-list-head">
        <div>
          <h2>Tickets</h2>
          <p>
            {searchQuery.trim()
              ? `${filteredTickets.length} found`
              : `${tickets.length} total`}
          </p>
        </div>
        {ticketsLoading && <Loader2 className="spin" size={18} />}
      </div>

      {/* SEARCH BAR */}
      <div className="support-search-bar">
        <Search size={16} className="support-search-icon" />
        <input
          type="text"
          placeholder="Search tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="support-search-input"
        />
        {searchQuery && (
          <button
            type="button"
            className="support-search-clear"
            onClick={() => setSearchQuery("")}
            title="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* STATUS FILTER PILLS */}
      <div className="support-status-filters" style={{ display: "flex", gap: "6px", margin: "12px 0", flexWrap: "wrap" }}>
        {["ALL", "OPEN", "PENDING", "RESOLVED", "CLOSED"].map((s) => {
          const isActive = statusFilter === s;
          const count = statusCounts[s] || 0;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                border: "1px solid " + (isActive ? "var(--primary)" : "var(--border)"),
                background: isActive ? "var(--primary)" : "rgba(255,255,255,0.03)",
                color: isActive ? "#fff" : "var(--text-soft)",
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: isActive ? "0 4px 10px rgba(79, 70, 229, 0.2)" : "none"
              }}
            >
              <span>{s}</span>
              <span style={{
                background: isActive ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
                color: isActive ? "#fff" : "var(--text-muted)",
                padding: "1px 6px",
                borderRadius: "10px",
                fontSize: "0.65rem",
                fontWeight: 800
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filteredTickets.length === 0 ? (
        <div className="support-ticket-list-empty">
          <MessageSquare size={24} />
          <p>
            {searchQuery.trim()
              ? "No matching tickets found."
              : "No support tickets found."}
          </p>
        </div>
      ) : (
        <div className="support-ticket-items">
          {filteredTickets.map((item) => (
            <button
              className={`support-ticket-item ${
                item._id === activeTicketId ? "active" : ""
              }`}
              type="button"
              key={item._id}
              onClick={() => setSelectedTicketId(item._id)}
            >
              <span
                className={`support-status ${(
                  item.status || "OPEN"
                ).toLowerCase()}`}
              >
                {item.status || "OPEN"}
              </span>
              <strong>{item.subject}</strong>
              <small>
                {item.user?.name || "Unknown User"} ·{" "}
                {formatDate(item.createdAt)}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null;

  if (loading) {
    return (
      <div className="support-details-page">
        <div className="support-state">
          <Loader2 className="spin" size={28} />
          <p>Loading support ticket...</p>
        </div>
      </div>
    );
  }

  if (showTicketList && !activeTicketId && !ticket) {
    return (
      <div className="support-details-page">
        <div className="support-details-header">
          <div className="support-title-block">
            <div className="support-kicker">
              <MessageSquare size={16} />
              Support
            </div>
            <h1>Support Tickets</h1>
            <p>Review and respond to user tickets</p>
          </div>
        </div>

        <div className="support-state with-list">
          {ticketList}
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="support-details-page">
        <div className="support-state">
          <MessageSquare size={30} />
          <h2>Support Ticket</h2>
          <p>{error || "Ticket not found"}</p>
          <button className="support-btn primary" onClick={fetchTicket}>
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="support-details-page">
      <div className="support-details-header">
        <button
          className="support-icon-btn"
          type="button"
          onClick={() => navigate(-1)}
          title="Back"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="support-title-block">
          <div className="support-kicker">
            <MessageSquare size={16} />
            Support Ticket
          </div>
          <h1>{ticket.subject}</h1>
          <p>Created {formatDate(ticket.createdAt)}</p>
        </div>

        <div className="support-header-actions">
          <button
            className="support-btn ghost"
            type="button"
            onClick={fetchTicket}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          {status !== "CLOSED" && (
            <div className="support-quick-status-actions">
              {status === "OPEN" && (
                <button
                  type="button"
                  className="status-action-btn pending"
                  onClick={() => handleStatusChange("PENDING")}
                  disabled={savingStatus}
                  title="Mark as Pending"
                >
                  <Clock size={14} />
                  <span>Pending</span>
                </button>
              )}
              {(status === "OPEN" || status === "PENDING") && (
                <button
                  type="button"
                  className="status-action-btn resolved"
                  onClick={() => handleStatusChange("RESOLVED")}
                  disabled={savingStatus}
                  title="Mark as Resolved"
                >
                  <CheckCircle2 size={14} />
                  <span>Resolve</span>
                </button>
              )}
              <button
                type="button"
                className="status-action-btn closed"
                onClick={() => handleStatusChange("CLOSED")}
                disabled={savingStatus}
                title="Close Ticket"
              >
                <X size={14} />
                <span>Close Ticket</span>
              </button>
            </div>
          )}
          {status === "CLOSED" && (
            <button
              type="button"
              className="status-action-btn reopen"
              onClick={() => handleStatusChange("OPEN")}
              disabled={savingStatus}
              title="Reopen Ticket"
            >
              <RefreshCw size={14} />
              <span>Reopen</span>
            </button>
          )}

          <label className="support-status-select">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => handleStatusChange(event.target.value)}
              disabled={savingStatus}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="support-details-grid">
        <section className="support-main-panel">
          <div className="support-thread-head">
            <div>
              <h2>Conversation</h2>
              <p>{timeline.length} messages</p>
            </div>
            <span className={`support-status ${status.toLowerCase()}`}>
              {savingStatus ? "Updating..." : status}
            </span>
          </div>

          <div className="support-thread">
            {timeline.length === 0 ? (
              <div className="support-empty-thread">
                <MessageSquare size={28} />
                <p>No messages found for this ticket.</p>
              </div>
            ) : (
              timeline.map((message) => {
                const isAdmin = message.senderType === "ADMIN";

                return (
                  <article
                    className={`support-message ${
                      isAdmin ? "admin" : "user"
                    }`}
                    key={message._id}
                  >
                    <div className="support-message-avatar">
                      {isAdmin ? "A" : getInitials(userName)}
                    </div>
                    <div className="support-message-body">
                      <div className="support-message-meta">
                        <span>{isAdmin ? "Admin" : userName}</span>
                        <time>{formatDate(message.createdAt)}</time>
                      </div>
                      <p>{message.message}</p>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="support-message-attachments" style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 10 }}>
                          {message.attachments.map((url, idx) => {
                            const isImage = /\.(jpeg|jpg|gif|png|webp)($|\?)/i.test(url);
                            const filename = url.substring(url.lastIndexOf("/") + 1).split("-").slice(1).join("-") || `attachment-${idx + 1}`;
                            return (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="support-attachment-chip"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  background: "var(--bg)",
                                  padding: "6px 12px",
                                  borderRadius: 8,
                                  fontSize: "0.82rem",
                                  color: "var(--text-soft)",
                                  border: "1px solid var(--border)",
                                  textDecoration: "none",
                                  transition: "all 0.2s"
                                }}
                              >
                                {isImage ? (
                                  <img src={url} alt={filename} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }} />
                                ) : (
                                  <FileText size={16} style={{ color: "var(--primary)" }} />
                                )}
                                <span style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={filename}>{filename}</span>
                                <Download size={14} style={{ opacity: 0.6 }} />
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
            <div ref={threadEndRef} />
          </div>

          <form className="support-reply-box" onSubmit={handleReply}>
            <label htmlFor="supportReply">Reply</label>

            {status !== "CLOSED" && (
              <div className="quick-responses-container">
                <span className="quick-responses-label">Quick Responses:</span>
                <div className="quick-responses-row">
                  {QUICK_RESPONSES.map((qr, index) => (
                    <button
                      key={index}
                      type="button"
                      className="quick-response-chip"
                      onClick={() => {
                        setReply(qr.text);
                        const textarea = document.getElementById("supportReply");
                        if (textarea) {
                          textarea.focus();
                        }
                      }}
                      title={qr.text}
                    >
                      {qr.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              id="supportReply"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a response to the user..."
              disabled={sendingReply || status === "CLOSED"}
              rows={4}
            />

            {replyFiles.length > 0 && (
              <div className="support-reply-selected-files" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {replyFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="selected-file-chip"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid var(--border)",
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: "0.8rem"
                    }}
                  >
                    <FileText size={13} style={{ color: "var(--primary)" }} />
                    <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setReplyFiles(prev => prev.filter((_, i) => i !== idx))}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        padding: 2
                      }}
                      title="Remove file"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="support-reply-actions" style={{ marginTop: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                <input
                  type="file"
                  id="supportAttachmentInput"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      const filesArray = Array.from(e.target.files);
                      setReplyFiles(prev => [...prev, ...filesArray].slice(0, 5));
                    }
                  }}
                  disabled={sendingReply || status === "CLOSED"}
                />
                <button
                  type="button"
                  className="support-btn ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sendingReply || status === "CLOSED"}
                  title="Add attachments (Max 5)"
                  style={{ minWidth: "auto", minHeight: "38px", height: "38px", padding: "0 10px", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Paperclip size={18} />
                </button>
                <span className="reply-help-text">
                  {status === "CLOSED"
                    ? "Closed tickets cannot receive replies."
                    : "Replying will notify the user. Ctrl + Enter to send."}
                </span>
              </div>
              <button
                id="sendReplySubmitBtn"
                className="support-btn primary"
                type="submit"
                disabled={
                  sendingReply || status === "CLOSED" || (!reply.trim() && replyFiles.length === 0)
                }
              >
                {sendingReply ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <Send size={16} />
                )}
                Send Reply
              </button>
            </div>
          </form>
        </section>

        <aside className="support-side-panel">
          {ticketList}

          <div className="support-user-card">
            <div className="support-user-avatar">{getInitials(userName)}</div>
            <div>
              <h2>{userName}</h2>
              <p>User Details</p>
            </div>
          </div>

          <div className="support-info-list">
            <div className="support-info-item">
              <Mail size={17} />
              <div>
                <span>Email</span>
                <strong>{user.email || "N/A"}</strong>
              </div>
            </div>

            <div className="support-info-item">
              <Phone size={17} />
              <div>
                <span>Phone</span>
                <strong>{user.phone || "N/A"}</strong>
              </div>
            </div>

            <div className="support-info-item">
              <Tag size={17} />
              <div>
                <span>Category</span>
                <strong>{ticket.category || "OTHER"}</strong>
              </div>
            </div>

            <div className="support-info-item">
              <Clock size={17} />
              <div>
                <span>Last Updated</span>
                <strong>{formatDate(ticket.updatedAt)}</strong>
              </div>
            </div>

            <div className="support-info-item">
              <User size={17} />
              <div>
                <span>Ticket ID</span>
                <strong className="mono">{ticket._id}</strong>
              </div>
            </div>
          </div>

          <div className="support-last-message">
            <span>Last Message</span>
            <p>{ticket.lastMessage || "No recent message"}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
