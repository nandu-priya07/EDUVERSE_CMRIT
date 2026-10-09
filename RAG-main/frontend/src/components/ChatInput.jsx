import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';

export default function ChatInput({ onSendMessage, disabled, placeholder }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-end gap-2 p-2 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-md focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder || 'Ask something about your PDF...'}
        className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-32 min-h-[40px] leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
      />

      <div className="flex items-center gap-1.5 pb-1 pr-1">
        <span className="hidden sm:inline text-[11px] text-slate-500 font-mono flex items-center gap-0.5">
          <CornerDownLeft className="w-3 h-3" /> Enter
        </span>
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-600 flex items-center justify-center transition-all shadow-md shadow-indigo-600/20 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
          title="Send question"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
