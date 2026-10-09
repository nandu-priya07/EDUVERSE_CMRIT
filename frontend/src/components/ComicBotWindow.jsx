import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Sparkles,
  X,
  FileText,
  Loader2,
  BookOpen,
  Send,
  FileCheck,
  Paperclip,
  Trash2
} from "lucide-react";
import "./comicbotwindow.css";

const RAG_API_BASE = "http://127.0.0.1:8001";

export default function ComicBotWindow({ isOpen, onClose, courseName = "Big Data Architecture" }) {
  // Active Document loaded in RAG
  const [activeDocName, setActiveDocName] = useState(null);
  const [isUploadingRAG, setIsUploadingRAG] = useState(false);

  // Chat Messages Timeline
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      sender: "assistant",
      type: "text",
      text: `Hello Teacher! 👋 I am your **Smart AI Assistant** for **${courseName}**.\n\nYou can ask any questions grounded directly in your uploaded PDF materials or course syllabus.`,
      sources: []
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isAskingRAG, setIsAskingRAG] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    fetchActiveDocumentInfo();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAskingRAG]);

  const fetchActiveDocumentInfo = async () => {
    try {
      const res = await fetch(`${RAG_API_BASE}/api/document`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.filename) {
          setActiveDocName(data.filename);
        }
      }
    } catch (err) {
      console.log("RAG doc check:", err);
    }
  };

  // Upload PDF into RAG Vector Store
  const handleRAGFileUpload = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    const selected = e.target.files[0];
    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a valid PDF document.");
      return;
    }

    setIsUploadingRAG(true);

    try {
      const formData = new FormData();
      formData.append("file", selected);

      const res = await fetch(`${RAG_API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to index PDF document.");
      }

      const data = await res.json();
      setActiveDocName(selected.name);
      
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "assistant",
          type: "doc_indexed",
          filename: selected.name,
          pageCount: data.document?.page_count || 0,
          chunkCount: data.document?.chunk_count || 0,
          text: `indexed document`
        }
      ]);
    } catch (err) {
      console.error("RAG upload error:", err);
      alert(`Document indexing error: ${err.message}`);
    } finally {
      setIsUploadingRAG(false);
    }
  };

  // Submit Question to RAG Assistant
  const handleSendRAGQuestion = async (e) => {
    if (e) e.preventDefault();
    const q = inputQuestion.trim();
    if (!q) return;

    setInputQuestion("");
    const userMsgId = Date.now().toString();
    setMessages((prev) => [...prev, { id: userMsgId, sender: "user", type: "text", text: q }]);
    setIsAskingRAG(true);

    try {
      const res = await fetch(`${RAG_API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, top_k: 4 })
      });

      if (!res.ok) {
        throw new Error("Failed to get answer from RAG chatbot backend.");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          type: "text",
          text: data.answer || "No response received.",
          sources: data.sources || []
        }
      ]);
    } catch (err) {
      console.error("RAG chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          type: "text",
          text: `⚠️ **Error querying material**: ${err.message}. Please ensure the RAG backend server is running.`
        }
      ]);
    } finally {
      setIsAskingRAG(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome-1",
        sender: "assistant",
        type: "text",
        text: `Hello Teacher! 👋 I am your **Smart AI Assistant** for **${courseName}**.\n\nYou can ask any questions grounded directly in your uploaded PDF materials or course syllabus.`,
        sources: []
      }
    ]);
  };

  if (isOpen === false) return null;

  return (
    <div className="cbw-chat-container">
      <div className="cbw-chat-window">
        {/* Chat Window Top Bar Header */}
        <header className="cbw-chat-header">
          <div className="cbw-header-left">
            <div className="cbw-assistant-avatar-badge">
              <Bot size={22} />
            </div>
            <div>
              <div className="cbw-header-title">
                <h3>Smart AI Teaching Assistant</h3>
                <span className="cbw-header-chip">
                  <Sparkles size={11} /> RAG Assistant
                </span>
              </div>
              <p>RAG Course Material Q&A for {courseName}</p>
            </div>
          </div>

          <div className="cbw-header-actions">
            {/* Active Document Indicator Chip */}
            <div className="cbw-doc-chip" title={activeDocName ? `Indexed PDF: ${activeDocName}` : "No PDF uploaded yet"}>
              <FileText size={14} className="cbw-doc-chip-icon" />
              <span className="cbw-doc-chip-name">
                {activeDocName ? activeDocName : "No Material Indexed"}
              </span>
            </div>

            <button className="cbw-icon-btn" onClick={handleClearChat} title="Clear Chat History">
              <Trash2 size={16} />
            </button>

            {onClose && (
              <button className="cbw-icon-btn" onClick={onClose} title="Close Assistant">
                <X size={18} />
              </button>
            )}
          </div>
        </header>

        {/* Chat Messages Stream Area */}
        <div className="cbw-chat-stream">
          {messages.map((msg) => (
            <div key={msg.id} className={`cbw-chat-bubble-row ${msg.sender}`}>
              <div className="cbw-avatar-col">
                {msg.sender === "assistant" ? (
                  <div className="cbw-assistant-avatar">🤖</div>
                ) : (
                  <div className="cbw-user-avatar">👤</div>
                )}
              </div>

              <div className="cbw-bubble-body">
                {/* 1. TEXT MESSAGE */}
                {msg.type === "text" && (
                  <div className="cbw-text-content">
                    <p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>

                    {/* Source Citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="cbw-sources-container">
                        <div className="cbw-sources-header">
                          <BookOpen size={12} /> Grounded Sources & Citations
                        </div>
                        <div className="cbw-sources-list">
                          {msg.sources.map((src, sIdx) => (
                            <div key={sIdx} className="cbw-source-chip">
                              <span className="cbw-page-badge">Page {src.page}</span>
                              <span className="cbw-snippet-text">"{src.text.slice(0, 150)}..."</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. DOCUMENT INDEXED CARD */}
                {msg.type === "doc_indexed" && (
                  <div className="cbw-doc-indexed-card">
                    <div className="cbw-doc-card-icon">
                      <FileCheck size={24} />
                    </div>
                    <div>
                      <span className="cbw-doc-card-tag">DOCUMENT INDEXED</span>
                      <h4 className="cbw-doc-card-title">{msg.filename}</h4>
                      <p className="cbw-doc-card-meta">
                        {msg.pageCount} Pages · {msg.chunkCount} Vector Chunks · Ready for Q&A
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* RAG Loading state */}
          {isAskingRAG && (
            <div className="cbw-chat-bubble-row assistant">
              <div className="cbw-assistant-avatar">🤖</div>
              <div className="cbw-loading-bubble">
                <Loader2 size={16} className="cbw-animate-spin" />
                <span>Searching course materials & generating grounded response...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="cbw-quick-suggestions">
          <button
            onClick={() => setInputQuestion("Explain the key architecture of Apache Spark and RDD lineage.")}
          >
            💬 Explain Spark Architecture
          </button>
          <button
            onClick={() => setInputQuestion("What are the main topics covered in the uploaded material?")}
          >
            📄 Summarize Uploaded PDF Material
          </button>
          <button
            onClick={() => setInputQuestion("What are the key concepts in Unit 4 Big Data Architecture?")}
          >
            ❓ Key Concepts in Unit 4
          </button>
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSendRAGQuestion} className="cbw-chat-input-bar">
          <input
            type="file"
            accept=".pdf"
            onChange={handleRAGFileUpload}
            id="cbw-file-upload-input"
            style={{ display: "none" }}
          />
          <label
            htmlFor="cbw-file-upload-input"
            className="cbw-attach-btn"
            title="Upload PDF material for RAG Q&A"
          >
            {isUploadingRAG ? <Loader2 size={18} className="cbw-animate-spin" /> : <Paperclip size={18} />}
          </label>

          <input
            type="text"
            className="cbw-main-chat-input"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="Ask a question about your course materials or type a topic..."
            disabled={isAskingRAG}
          />

          <button
            type="submit"
            className="cbw-send-btn"
            disabled={isAskingRAG || !inputQuestion.trim()}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
