import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import { extractTextFromPdf } from './services/pdfService';
import { generateEmbeddings } from './services/geminiService';
import { vectorStore } from './services/vectorStore';
import { AppState, Message, PdfDocument, ProcessingStatus } from './types';
import { generateRAGResponse } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [currentDocument, setCurrentDocument] = useState<PdfDocument | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({ step: '', progress: 0 });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Handle File Upload and Processing
  const handleFileSelected = async (file: File) => {
    try {
      setAppState(AppState.PROCESSING);
      
      // 1. Extract Text
      setProcessingStatus({ step: 'Parsing PDF...', progress: 10 });
      const chunks = await extractTextFromPdf(file, (page, total) => {
        const percentage = 10 + Math.floor((page / total) * 40); // 10% to 50%
        setProcessingStatus({ step: `Reading page ${page} of ${total}...`, progress: percentage });
      });

      if (chunks.length === 0) {
        throw new Error("No text found in PDF");
      }

      // 2. Generate Embeddings
      setProcessingStatus({ step: 'Generating embeddings with Gemini...', progress: 50 });
      
      // Note: In a real app, you might want to limit the number of chunks processed here 
      // if the file is huge, to avoid rate limits or long waits.
      const chunksWithVectors = await generateEmbeddings(chunks);
      
      setProcessingStatus({ step: 'Indexing vectors...', progress: 90 });
      vectorStore.clear();
      vectorStore.addChunks(chunksWithVectors);

      // 3. Finalize
      setCurrentDocument({
        name: file.name,
        size: file.size,
        pageCount: chunks[chunks.length - 1]?.pageNumber || 0,
        uploadDate: new Date(),
        processed: true
      });

      setAppState(AppState.CHAT);
    } catch (error) {
      console.error(error);
      alert("Error processing file. See console for details.");
      setAppState(AppState.UPLOAD);
    }
  };

  // Handle Chat Message
  const handleSendMessage = async (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    };

    setMessages(prev => [...prev, newMessage]);
    setIsGenerating(true);

    try {
      // Create a simplified history string for context
      const historyStr = messages.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n');
      
      const responseText = await generateRAGResponse(text, historyStr);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "I'm sorry, something went wrong processing your request."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetApp = () => {
    setAppState(AppState.UPLOAD);
    setCurrentDocument(null);
    setMessages([]);
    vectorStore.clear();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-darker font-sans text-slate-200">
      
      {/* Sidebar - Only show in chat mode on desktop, or if we have a doc */}
      {(appState === AppState.CHAT) && (
        <div className="hidden md:block h-full">
            <Sidebar document={currentDocument} onReset={resetApp} />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative">
        
        {/* Mobile Header (if in chat mode) */}
        {appState === AppState.CHAT && (
            <div className="md:hidden p-4 border-b border-slate-800 bg-surface flex justify-between items-center">
                <span className="font-bold truncate max-w-[200px]">{currentDocument?.name}</span>
                <button onClick={resetApp} className="text-xs bg-slate-700 px-3 py-1 rounded">New</button>
            </div>
        )}

        {/* View: Upload */}
        {appState === AppState.UPLOAD && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
             <FileUpload onFileSelected={handleFileSelected} isProcessing={false} />
          </div>
        )}

        {/* View: Processing */}
        {appState === AppState.PROCESSING && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
             <div className="max-w-md w-full text-center space-y-6">
                <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                    <div 
                        className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"
                    ></div>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">{processingStatus.step}</h3>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div 
                            className="bg-primary h-full transition-all duration-300 ease-out"
                            style={{ width: `${processingStatus.progress}%` }}
                        ></div>
                    </div>
                    <p className="text-slate-400 mt-2 text-sm">{processingStatus.progress}% complete</p>
                </div>
             </div>
          </div>
        )}

        {/* View: Chat */}
        {appState === AppState.CHAT && (
          <ChatInterface 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            isGenerating={isGenerating} 
          />
        )}
      </main>
    </div>
  );
};

export default App;