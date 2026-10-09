import React from 'react';
import { BookOpen, Sparkles, Activity, Trash2, Cpu, ShieldCheck } from 'lucide-react';

export default function Header({
  activeDoc,
  health,
  onClearChat,
  onOpenUpload,
  hasMessages,
  showDebug,
  onToggleDebug,
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-heading tracking-tight text-white flex items-center gap-1.5">
                PDFMind
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-sans font-medium">
                  RAG Pipeline
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Ask questions. Get answers from your documents.
            </p>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          {/* Active Document Badge */}
          {activeDoc ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate max-w-[140px] sm:max-w-[180px]" title={activeDoc.filename}>
                {activeDoc.filename}
              </span>
              <span className="text-emerald-500/60 font-mono">
                ({activeDoc.page_count}p / {activeDoc.chunk_count}c)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400/80" />
              <span>No document loaded</span>
            </div>
          )}

          {/* RAG Debug Toggle */}
          <button
            onClick={onToggleDebug}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showDebug
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
            title="Toggle RAG Evaluation & Debug Inspector"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>RAG Inspector</span>
          </button>

          {/* Clear Chat */}
          {hasMessages && (
            <button
              onClick={onClearChat}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 text-xs font-medium transition-colors"
              title="Clear current chat messages"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          )}

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{activeDoc ? 'Upload New PDF' : 'Upload PDF'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
