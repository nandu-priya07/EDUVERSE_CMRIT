import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UploadSection from './components/UploadSection';
import ChatSection from './components/ChatSection';
import ChatInput from './components/ChatInput';
import RagDebugModal from './components/RagDebugModal';
import {
  getHealth,
  getCurrentDocument,
  uploadPDF,
  deleteCurrentDocument,
  loadSampleDocument,
  sendQuestion,
} from './services/api';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export default function App() {
  const [activeDoc, setActiveDoc] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [health, setHealth] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [selectedDebugData, setSelectedDebugData] = useState(null);

  // Initialize application state
  useEffect(() => {
    async function init() {
      try {
        const healthData = await getHealth();
        setHealth(healthData);

        const docData = await getCurrentDocument();
        if (docData) {
          setActiveDoc(docData);
        }
      } catch (err) {
        console.error('Initial state fetch error:', err);
      }
    }
    init();
  }, []);

  const notifyError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 6000);
  };

  const notifySuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Upload handler
  const handleUploadFile = async (file) => {
    setIsUploading(true);
    setErrorMessage(null);
    try {
      const response = await uploadPDF(file);
      setActiveDoc(response.document);
      setMessages([]);
      notifySuccess(`"${response.document.filename}" is processed and ready.`);
    } catch (err) {
      notifyError(err.message || 'Failed to upload and process PDF.');
    } finally {
      setIsUploading(false);
    }
  };

  // Sample document load handler
  const handleLoadSample = async () => {
    setIsLoadingSample(true);
    setErrorMessage(null);
    try {
      const response = await loadSampleDocument();
      setActiveDoc(response.document);
      setMessages([]);
      notifySuccess('Sample document (Data Structures Guide) loaded successfully.');
    } catch (err) {
      notifyError(err.message || 'Failed to load sample document.');
    } finally {
      setIsLoadingSample(false);
    }
  };

  // Remove active document handler
  const handleDeleteDoc = async () => {
    try {
      await deleteCurrentDocument();
      setActiveDoc(null);
      setMessages([]);
      notifySuccess('Active document and vector embeddings cleared.');
    } catch (err) {
      notifyError(err.message || 'Failed to clear document.');
    }
  };

  // Chat query handler
  const handleSendMessage = async (question) => {
    if (!question.trim()) return;

    if (!activeDoc) {
      notifyError('Please upload a PDF document first.');
      return;
    }

    const userMsgId = `user_${Date.now()}`;
    const newMessages = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        content: question,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await sendQuestion(question);

      const aiMsg = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        source_pages: response.source_pages,
        latency_ms: response.latency_ms,
        debug_info: response.debug_info,
        question: question,
      };

      setMessages([...newMessages, aiMsg]);
      setSelectedDebugData(aiMsg);
    } catch (err) {
      const errorMsg = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message || 'An error occurred while answering your question.'}`,
        sources: [],
        source_pages: [],
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear current chat
  const handleClearChat = () => {
    setMessages([]);
  };

  // Open RAG Inspector modal for a specific message
  const handleInspectMessage = (msg) => {
    setSelectedDebugData(msg);
    setShowDebugModal(true);
  };

  // Toggle RAG Inspector modal
  const handleToggleDebug = () => {
    if (!selectedDebugData && messages.length > 0) {
      const lastAiMsg = [...messages].reverse().find((m) => m.role === 'assistant');
      if (lastAiMsg) setSelectedDebugData(lastAiMsg);
    }
    setShowDebugModal(!showDebugModal);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white relative">
      {/* Header */}
      <Header
        activeDoc={activeDoc}
        health={health}
        onClearChat={handleClearChat}
        onOpenUpload={() => {
          const fileInput = document.getElementById('pdf-file-upload');
          if (fileInput) fileInput.click();
        }}
        hasMessages={messages.length > 0}
        showDebug={showDebugModal}
        onToggleDebug={handleToggleDebug}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Floating Notification Alerts */}
        {errorMessage && (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:bg-rose-500/20 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="p-1 hover:bg-emerald-500/20 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Top: Upload & Document Status Section */}
        <UploadSection
          activeDoc={activeDoc}
          isUploading={isUploading}
          uploadProgress={0}
          onUploadFile={handleUploadFile}
          onDeleteDoc={handleDeleteDoc}
          onLoadSample={handleLoadSample}
          isLoadingSample={isLoadingSample}
        />

        {/* Center: Conversation & Source Citations Panel */}
        <div className="flex-1 flex flex-col min-h-[460px] bg-slate-900/40 rounded-2xl border border-slate-800/80 p-4 sm:p-6 backdrop-blur-sm shadow-xl">
          <ChatSection
            messages={messages}
            isLoading={isLoading}
            activeDoc={activeDoc}
            onSelectSuggestedPrompt={(prompt) => handleSendMessage(prompt)}
            onInspectMessage={handleInspectMessage}
          />

          {/* Bottom: Prompt Input Bar */}
          <div className="pt-4 border-t border-slate-800/60 mt-auto">
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={isLoading || isUploading}
              placeholder={
                activeDoc
                  ? 'Ask something about your PDF...'
                  : 'Upload a PDF to start asking questions...'
              }
            />
          </div>
        </div>
      </main>

      {/* RAG Evaluation & Debug Modal */}
      <RagDebugModal
        isOpen={showDebugModal}
        onClose={() => setShowDebugModal(false)}
        debugData={selectedDebugData}
      />
    </div>
  );
}
