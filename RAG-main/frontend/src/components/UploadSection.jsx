import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Sparkles,
  Layers,
  FileCheck
} from 'lucide-react';

export default function UploadSection({
  activeDoc,
  isUploading,
  uploadProgress,
  onUploadFile,
  onDeleteDoc,
  onLoadSample,
  isLoadingSample,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragError, setDragError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    setDragError(null);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only turn off if leaving the container
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
    // Reset input value so selecting the same file triggers onChange
    if (e.target) {
      e.target.value = '';
    }
  };

  const validateAndUpload = (file) => {
    setDragError(null);
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setDragError('Only .pdf documents are supported.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setDragError('File exceeds the 25MB maximum size limit.');
      return;
    }
    onUploadFile(file);
  };

  const triggerBrowse = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full bg-slate-900/60 rounded-2xl border transition-all p-5 backdrop-blur-sm shadow-xl shadow-black/20 ${
        isDragOver
          ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-950/20'
          : 'border-slate-800/80'
      }`}
    >
      {/* Single persistent file input accessible via ref and id */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,application/pdf"
        className="hidden"
        id="pdf-file-upload"
      />

      {/* Dragging Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-20 rounded-2xl bg-indigo-950/85 border-2 border-dashed border-indigo-400 flex flex-col items-center justify-center gap-2 backdrop-blur-sm pointer-events-none animate-fadeIn">
          <UploadCloud className="w-12 h-12 text-indigo-300 animate-bounce" />
          <p className="text-base font-semibold text-white">Drop your PDF here</p>
          <p className="text-xs text-indigo-200">
            {activeDoc ? 'Will replace currently active document' : 'Will index document for question answering'}
          </p>
        </div>
      )}

      {/* Empty State: No Document Loaded */}
      {!activeDoc ? (
        <div className="border-2 border-dashed border-slate-700/80 hover:border-slate-600 rounded-xl p-8 text-center transition-all bg-slate-950/40">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              {isUploading ? (
                <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
              ) : (
                <UploadCloud className="w-7 h-7 text-indigo-400" />
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-200">
                {isUploading ? 'Extracting, Chunking & Embedding Document...' : 'Drag and drop your PDF document here'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports standard PDFs with text up to 25MB
              </p>
            </div>

            {dragError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{dragError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              <button
                type="button"
                onClick={triggerBrowse}
                disabled={isUploading}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
              >
                Browse Files
              </button>

              <button
                type="button"
                onClick={onLoadSample}
                disabled={isUploading || isLoadingSample}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
                title="Load sample PDF on Data Structures & AVL Trees"
              >
                {isLoadingSample ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Try Sample Document (Data Structures)</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Active Document Status Card */
        <div className="space-y-3">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <FileCheck className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md" title={activeDoc.filename}>
                    {activeDoc.filename}
                  </h3>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    Ready
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                  <span>{activeDoc.formatted_file_size || `${activeDoc.file_size_bytes} B`}</span>
                  <span>•</span>
                  <span>{activeDoc.page_count} {activeDoc.page_count === 1 ? 'Page' : 'Pages'}</span>
                  <span>•</span>
                  <span>{activeDoc.chunk_count} Chunks Indexed</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              <button
                type="button"
                onClick={triggerBrowse}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                title="Replace currently loaded document with a new PDF"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>{isUploading ? 'Uploading...' : 'Upload New PDF'}</span>
              </button>
              <button
                type="button"
                onClick={onDeleteDoc}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
                title="Delete active document and vector store"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {/* Helper hint for drag-and-drop replacement */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>Tip: Drag & drop any new PDF file directly into this area to replace the current document.</span>
            {dragError && (
              <span className="text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {dragError}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
