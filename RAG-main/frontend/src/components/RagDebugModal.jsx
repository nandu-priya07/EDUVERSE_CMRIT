import React from 'react';
import { X, Cpu, Layers, CheckCircle2, Clock, Sparkles, BookOpen, ExternalLink } from 'lucide-react';

export default function RagDebugModal({ isOpen, onClose, debugData }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white font-heading">
                RAG Pipeline Inspector & Evaluation
              </h2>
              <p className="text-xs text-slate-400">
                Detailed metrics for similarity retrieval, grounding, and generation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {!debugData ? (
            <div className="text-center py-12 text-slate-400">
              <Cpu className="w-12 h-12 mx-auto text-slate-600 mb-2" />
              <p>No query evaluation data available yet.</p>
              <p className="text-xs text-slate-500 mt-1">Ask a question about the document to inspect the RAG retrieval pipeline.</p>
            </div>
          ) : (
            <>
              {/* Question & Answer Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    User Question
                  </span>
                  <p className="text-slate-200 font-medium">{debugData.question}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Retrieval Performance
                  </span>
                  <div className="flex flex-wrap gap-4 text-xs font-mono mt-1">
                    <div>
                      <span className="text-slate-400">Latency: </span>
                      <span className="text-indigo-400 font-bold">{debugData.latency_ms || 0} ms</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Chunks: </span>
                      <span className="text-emerald-400 font-bold">{debugData.sources?.length || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Pages: </span>
                      <span className="text-amber-400 font-bold">{debugData.source_pages?.join(', ') || 'None'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RAG Verification Status */}
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-indigo-300">Grounding Guarantee</p>
                  <p className="text-slate-400 leading-relaxed">
                    Context was restricted strictly to the {debugData.sources?.length || 0} chunks retrieved from ChromaDB.
                    The embedding model used was <code className="text-indigo-300 bg-indigo-950/60 px-1 py-0.5 rounded font-mono">sentence-transformers/all-MiniLM-L6-v2</code>.
                  </p>
                </div>
              </div>

              {/* Retrieved Chunks with Similarity Scores */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Retrieved Chunks Ranked by Cosine Similarity</span>
                  <span className="text-[11px] font-mono text-slate-500 lowercase">
                    {debugData.sources?.length || 0} chunks retrieved
                  </span>
                </h3>

                <div className="space-y-3">
                  {debugData.sources?.map((chunk, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 font-mono text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2 text-[11px]">
                        <span className="text-indigo-400 font-semibold flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />
                          Rank #{idx + 1} • {chunk.chunk_id} • Page {chunk.page}
                        </span>
                        <div className="flex items-center gap-3">
                          {chunk.similarity_score !== undefined && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                              Similarity: {(chunk.similarity_score * 100).toFixed(1)}%
                            </span>
                          )}
                          {chunk.distance !== undefined && (
                            <span className="text-slate-400">
                              Dist: {chunk.distance.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-300 font-sans text-xs leading-relaxed whitespace-pre-wrap italic">
                        "{chunk.text}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated Answer */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Generated Answer Output
                </span>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {debugData.answer}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>Vector DB: ChromaDB • Embeddings: all-MiniLM-L6-v2 (Local)</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
