import React, { useState } from 'react';
import {
  User,
  Bot,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Cpu,
  Layers,
  Sparkles,
  HelpCircle,
  FileQuestion
} from 'lucide-react';

export default function ChatSection({
  messages,
  isLoading,
  activeDoc,
  onSelectSuggestedPrompt,
  onInspectMessage,
}) {
  const [copiedId, setCopiedId] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSourceExpand = (msgId) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const sampleQuestions = [
    'What is an AVL tree and who invented it?',
    'What are the worst-case time complexities of AVL tree operations?',
    'How do hash collisions get resolved in hash tables?',
    'What is the difference between BFS and DFS?',
    'What is the recipe for baking chocolate chip cookies?', // Out-of-context test
  ];

  return (
    <div className="flex-1 flex flex-col justify-between overflow-y-auto px-1 sm:px-2 py-4 space-y-6">
      {/* Empty State: No messages yet */}
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 my-auto">
          {!activeDoc ? (
            /* Before Upload Empty State */
            <div className="max-w-md flex flex-col items-center gap-3.5">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shadow-inner">
                <FileQuestion className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white font-heading">
                Upload a PDF to start asking questions.
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                PDFMind extracts text with PyMuPDF, generates embeddings with all-MiniLM-L6-v2, and uses strict retrieval grounding to answer only from your document.
              </p>
            </div>
          ) : (
            /* After Upload Empty State */
            <div className="max-w-xl flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white font-heading">
                  Your document is ready. Ask me anything about it.
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Click a suggested question below or type your own question in the prompt box.
                </p>
              </div>

              {/* Suggested Questions */}
              <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-lg">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectSuggestedPrompt(q)}
                    className="text-left text-xs px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-indigo-500/40 transition-all shadow-sm cursor-pointer"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages List */}
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        const isUnavailable = msg.content.includes("I couldn't find this information in the uploaded document");

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-4xl ${
              isUser ? 'ml-auto' : 'mr-auto'
            } w-full`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-semibold shadow-md ${
                isUser
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-indigo-400 border border-slate-700'
              }`}
            >
              {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble Content */}
            <div
              className={`flex flex-col gap-2 max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed transition-all ${
                isUser
                  ? 'bg-indigo-600 text-white rounded-tr-sm shadow-lg shadow-indigo-600/10'
                  : isUnavailable
                  ? 'bg-amber-950/20 text-amber-200 border border-amber-500/20 rounded-tl-sm'
                  : 'bg-slate-900/90 text-slate-100 border border-slate-800/80 rounded-tl-sm shadow-xl'
              }`}
            >
              {/* Message Header (for AI responses) */}
              {!isUser && (
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60 text-xs text-slate-400">
                  <span className="font-medium text-slate-300 flex items-center gap-1.5">
                    PDFMind Assistant
                  </span>
                  <div className="flex items-center gap-2">
                    {msg.latency_ms && (
                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {msg.latency_ms}ms
                      </span>
                    )}
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Copy Answer"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {msg.sources && msg.sources.length > 0 && (
                      <button
                        onClick={() => onInspectMessage(msg)}
                        className="p-1 rounded hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 transition-colors"
                        title="Inspect RAG retrieval & evaluation metrics"
                      >
                        <Cpu className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Text Body */}
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Source Citations & Page Pills */}
              {!isUser && msg.source_pages && msg.source_pages.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/60">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300 font-medium">
                      <span className="text-slate-400 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        Sources:
                      </span>
                      {msg.source_pages.map((page) => (
                        <span
                          key={page}
                          className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-mono font-medium"
                        >
                          Page {page}
                        </span>
                      ))}
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <button
                        onClick={() => toggleSourceExpand(msg.id)}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
                      >
                        <span>
                          {expandedSources[msg.id]
                            ? 'Hide source text'
                            : `View ${msg.sources.length} source chunks`}
                        </span>
                        {expandedSources[msg.id] ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Expandable Source Text Snippets */}
                  {expandedSources[msg.id] && msg.sources && (
                    <div className="mt-3 space-y-2 text-xs">
                      {msg.sources.map((chunk, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-slate-300 space-y-1 font-sans"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span className="text-indigo-400 font-medium">
                              Page {chunk.page} • {chunk.chunk_id}
                            </span>
                            {chunk.similarity_score !== undefined && (
                              <span className="text-slate-400">
                                Similarity: {(chunk.similarity_score * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <p className="text-slate-300 italic font-mono text-[11px] leading-relaxed">
                            "{chunk.text}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-start gap-3.5 max-w-xl mr-auto w-full">
          <div className="w-8 h-8 rounded-xl bg-slate-800 text-indigo-400 border border-slate-700 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm p-4 text-xs text-slate-300 flex items-center gap-3 shadow-md">
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span>Searching ChromaDB & synthesizing answer...</span>
          </div>
        </div>
      )}
    </div>
  );
}
