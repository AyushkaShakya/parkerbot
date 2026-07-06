// components/Sidebar.js
"use client";
import { useRef, useState } from "react";

export default function Sidebar({
  uploadedFiles,
  activeFile,
  onFileUpload,
  onSelectFile,
  onDeleteFile,
  onNewChat,
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        onFileUpload(data.fileName);
      }
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="w-72 h-screen bg-[var(--cream-sidebar)] border-r border-[var(--tan-border)] flex flex-col">

      {/* Logo */}
      <div className="p-5 border-b border-[var(--tan-border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--coffee)] rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold leading-none pt-[1px] block">P</span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-[var(--text-dark)]">Parker AI</h1>
            <p className="text-xs text-[var(--text-muted)]">Chat with your PDFs</p>
          </div>
        </div>
      </div>

      {/* Upload Button */}
      <div className="p-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 bg-[var(--coffee)] hover:bg-[var(--coffee-dark)] disabled:opacity-50 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload PDF
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        {error && (
          <p className="text-xs text-red-600 mt-2 text-center">{error}</p>
        )}
      </div>

      {/* New Chat Button */}
      <div className="px-4 pb-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 border border-[var(--tan-border)] hover:bg-[var(--cream-card)] text-[var(--text-dark)] text-sm font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto px-3">
        {uploadedFiles.length > 0 && (
          <>
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-2 mb-2">
              Your Documents
            </p>
            {uploadedFiles.map((fileName) => (
              <div
                key={fileName}
                onClick={() => onSelectFile(fileName)}
                className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer mb-1 transition-colors ${
                  activeFile === fileName
                    ? "bg-[var(--coffee-light)] border border-[var(--coffee)]/30"
                    : "hover:bg-[var(--cream-card)]"
                }`}
              >
                <div className="w-7 h-7 bg-[#f6e3d3] rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-[#8a4a2e] text-xs font-bold">PDF</span>
                </div>
                <span className={`text-sm flex-1 truncate ${
                  activeFile === fileName ? "text-[var(--coffee-dark)] font-medium" : "text-[var(--text-dark)]"
                }`}>
                  {fileName}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(fileName);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-600 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </>
        )}

        {uploadedFiles.length === 0 && (
          <div className="text-center py-8 px-4">
            <div className="w-12 h-12 bg-[var(--cream-card)] border border-[var(--tan-border)] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--text-muted)]">No documents yet</p>
            <p className="text-xs text-[var(--text-muted)] opacity-70 mt-1">Upload a PDF to get started</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--tan-border)]">
        <p className="text-xs text-[var(--text-muted)] text-center">
          Powered by Groq + LLaMA
        </p>
      </div>
    </div>
  );
}