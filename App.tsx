
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { VoiceInterface } from './components/VoiceInterface';
import { AppMode, Message } from './types';
import { SCHOOL_INFO } from './constants';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    if (messages.length === 0) {
      addMessage('assistant', `Welcome to ${SCHOOL_INFO.name}, Jacobabad! I am your AI assistant. How can I help you today with admissions, STEM programs, or general school information?`);
    }
  }, [addMessage, messages.length]);

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
