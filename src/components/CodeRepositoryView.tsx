import React, { useState } from 'react';
import JSZip from 'jszip';
import { REPO_FILES } from '../data/repoFiles';
import { Code2, Download, Copy, Check, FileText, Terminal, ExternalLink, Folder } from 'lucide-react';

export const CodeRepositoryView: React.FC = () => {
  const [selectedFilePath, setSelectedFilePath] = useState<string>('backend/main.py');
  const [copied, setCopied] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const currentFile = REPO_FILES.find((f) => f.path === selectedFilePath) || REPO_FILES[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Add all project files into the zip archive
      REPO_FILES.forEach((file) => {
        zip.file(file.path, file.content);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'echoopen-voice-ai-source.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to create ZIP package:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Repository Header */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-zinc-900">
              Deliverable Source Code & Repository Explorer
            </h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
              Python FastAPI + Open-Weights
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Complete, runnable production code for Faster-Whisper, Ollama LLM, Kokoro/Piper TTS, and Docker Compose.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied File' : 'Copy Code'}</span>
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isZipping ? 'Packaging ZIP...' : 'Download Repository (ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* Code Browser Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* File Tree Sidebar */}
        <div className="md:col-span-4 bg-white rounded-xl border border-zinc-200 p-3 shadow-xs h-[560px] flex flex-col">
          <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-zinc-900 border-b border-zinc-100 mb-2">
            <Folder className="w-3.5 h-3.5 text-indigo-600" />
            <span>echoopen-voice-ai /</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {REPO_FILES.map((file) => {
              const isSelected = file.path === selectedFilePath;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFilePath(file.path)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg text-left transition-colors font-mono ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-900 font-semibold'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-zinc-400'}`} />
                    <span className="truncate">{file.path}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 uppercase font-sans">
                    {file.language}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Terminal Command */}
          <div className="mt-2 pt-2 border-t border-zinc-100 bg-zinc-50 p-2.5 rounded-lg text-[11px]">
            <div className="flex items-center gap-1 text-zinc-700 font-medium mb-1">
              <Terminal className="w-3 h-3 text-zinc-600" />
              <span>One-Click Launch</span>
            </div>
            <code className="text-zinc-800 font-mono block bg-white p-1 rounded border border-zinc-200 truncate">
              bash scripts/run_local.sh
            </code>
          </div>
        </div>

        {/* Code Content Viewer */}
        <div className="md:col-span-8 bg-zinc-950 rounded-xl border border-zinc-800 shadow-md flex flex-col h-[560px] overflow-hidden">
          {/* File Tab Bar */}
          <div className="px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-zinc-200 font-medium">{currentFile.path}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400 text-[11px]">{currentFile.description}</span>
            </div>
            <span className="font-mono text-[11px] text-zinc-500 uppercase">
              {currentFile.language}
            </span>
          </div>

          {/* Code Text Area */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs text-zinc-200 leading-relaxed bg-zinc-950">
            <pre className="whitespace-pre">
              {currentFile.content.split('\n').map((line, idx) => (
                <div key={idx} className="table-row">
                  <span className="table-cell select-none pr-4 text-zinc-600 text-right text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="table-cell">{line}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
