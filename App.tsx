
import React, { useState, useEffect, useCallback } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { VoiceInterface } from './components/VoiceInterface';
import { AppMode, Message } from './types';
import { SCHOOL_INFO } from './constants';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  // Check for API key on mount
  useEffect(() => {
    const checkKey = async () => {
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        const isSelected = await (window as any).aistudio.hasSelectedApiKey();
        setHasKey(isSelected);
      } else {
        // Fallback for non-aistudio environments if key is in process.env
        setHasKey(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleConnect = async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      // Assume success as per guidelines to avoid race condition
      setHasKey(true);
    }
  };

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  useEffect(() => {
    if (hasKey && messages.length === 0) {
      addMessage('assistant', `Welcome to ${SCHOOL_INFO.name}, Jacobabad! I am your AI assistant. How can I help you today with admissions, STEM programs, or general school information?`);
    }
  }, [hasKey, addMessage, messages.length]);

  if (hasKey === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-blue-100">
          <div className="w-20 h-20 bg-blue-900 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-lg">
            <i className="fas fa-microchip text-3xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-4">{SCHOOL_INFO.alias} AI Hub</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Welcome to the AI Assistant for CASWA Model Science School. To access our STEM guidance and school services, please connect your AI credentials.
          </p>
          <button
            onClick={handleConnect}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all transform hover:scale-105 shadow-xl flex items-center justify-center gap-3"
          >
            <i className="fas fa-plug"></i>
            Connect to School AI
          </button>
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-2">Required for AI processing</p>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline text-xs flex items-center justify-center gap-1"
            >
              Learn about AI Billing <i className="fas fa-external-link-alt text-[10px]"></i>
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (hasKey === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-blue-900 text-white p-4 shadow-lg flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-900 shadow-md">
            <i className="fas fa-school text-xl"></i>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">{SCHOOL_INFO.alias} Assistant</h1>
            <p className="text-xs text-blue-100 opacity-80">{SCHOOL_INFO.location}</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setMode(mode === 'chat' ? 'voice' : 'chat')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
              mode === 'voice' 
                ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                : 'bg-blue-700 hover:bg-blue-600'
            }`}
          >
            <i className={`fas ${mode === 'voice' ? 'fa-keyboard' : 'fa-microphone'}`}></i>
            <span className="hidden sm:inline">{mode === 'voice' ? 'Switch to Chat' : 'Switch to Voice'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-4">
        {mode === 'chat' ? (
          <ChatInterface messages={messages} onSendMessage={(msg) => addMessage('user', msg)} onAssistantResponse={(msg) => addMessage('assistant', msg)} />
        ) : (
          <VoiceInterface onNewTranscription={(role, text) => addMessage(role, text)} />
        )}
      </main>

      {/* Footer Info */}
      <footer className="bg-white border-t p-2 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} {SCHOOL_INFO.name}, Jacobabad. Focused on {SCHOOL_INFO.focus.join(", ")}.
      </footer>
    </div>
  );
};

export default App;
