import React from 'react';
import { PdfDocument } from '../types';
import { formatBytes } from '../services/pdfService';

interface SidebarProps {
  document: PdfDocument | null;
  onReset: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ document, onReset }) => {
  if (!document) return null;

  return (
    <div className="w-80 bg-surface border-r border-slate-800 flex flex-col h-full flex-shrink-0 transition-all">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          Active Document
        </h2>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        <div className="bg-darker rounded-xl p-4 border border-slate-800 mb-6">
            <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>
                <div className="overflow-hidden">
                    <h3 className="font-medium text-slate-200 truncate" title={document.name}>
                        {document.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                        {formatBytes(document.size)}
                    </p>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-slate-800/50 p-2 rounded text-center">
                    <span className="block text-slate-400 text-xs uppercase tracking-wider">Pages</span>
                    <span className="font-semibold text-slate-200">{document.pageCount}</span>
                </div>
                <div className="bg-slate-800/50 p-2 rounded text-center">
                     <span className="block text-slate-400 text-xs uppercase tracking-wider">Type</span>
                    <span className="font-semibold text-slate-200">PDF</span>
                </div>
            </div>
        </div>

        <div className="text-xs text-slate-500 leading-relaxed">
            <p className="mb-2">
                This document has been processed and indexed.
            </p>
            <p>
                The AI will use RAG (Retrieval Augmented Generation) to find specific sections relevant to your questions.
            </p>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onReset}
          className="w-full py-3 px-4 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Upload New File
        </button>
      </div>
    </div>
  );
};

export default Sidebar;