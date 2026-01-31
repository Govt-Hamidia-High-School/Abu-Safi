
import React, { useState, useEffect, useRef } from 'react';
import { GeminiService, createPcmBlob, decodeBase64, decodeAudioData } from '../services/geminiService';
import { LiveServerMessage } from '@google/genai';

interface VoiceInterfaceProps {
  onNewTranscription: (role: 'user' | 'assistant', text: string) => void;
}

const gemini = new GeminiService();

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onNewTranscription }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState('Standby');
  const [currentTranscription, setCurrentTranscription] = useState('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const startSession = async () => {
    try {
      setIsConnecting(true);
      setStatus('Initializing Audio...');

      // Setup audio contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus('Connecting to Gemini...');

      const sessionPromise = gemini.connectVoice({
        onOpen: () => {
          setStatus('Listening...');
          setIsActive(true);
          setIsConnecting(false);

          // Stream audio to model
          const source = inputCtx.createMediaStreamSource(stream);
          const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = scriptProcessor;

          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createPcmBlob(inputData);
            // Send audio only after the session promise resolves as per guidelines.
            sessionPromise.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };

          source.connect(scriptProcessor);
          scriptProcessor.connect(inputCtx.destination);
        },
        onMessage: async (message: LiveServerMessage) => {
          // Process model audio output
          const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audioData) {
            // Gapless playback using nextStartTimeRef
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
            const buffer = await decodeAudioData(decodeBase64(audioData), outputCtx, 24000, 1);
            const source = outputCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(outputCtx.destination);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            sourcesRef.current.add(source);
            source.onended = () => sourcesRef.current.delete(source);
          }

          // Handle interruptions
          if (message.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }

          // Handle transcriptions
          if (message.serverContent?.outputTranscription) {
            setCurrentTranscription(prev => prev + message.serverContent!.outputTranscription!.text);
          }

          if (message.serverContent?.turnComplete) {
            // Turn completed
          }
        },
        onError: (e) => {
          console.error("Voice Error:", e);
          stopSession();
          setStatus('Error occurred');
        },
        // Corrected property name from 'onclose' to 'onClose'
        onClose: () => {
          stopSession();
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start voice:", err);
      setStatus('Failed to access microphone');
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      // Use close() to release resources as per guidelines
      try {
        sessionRef.current.close();
      } catch (e) {
        console.debug("Session closing error", e);
      }
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    setIsActive(false);
    setIsConnecting(false);
    setStatus('Standby');
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <div className="w-full max-w-2xl flex flex-col items-center justify-center space-y-12">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Voice Assistant</h2>
        <p className="text-slate-500">Speak naturally. I'll guide you through CMSS services.</p>
      </div>

      <div className="relative flex items-center justify-center">
        {isActive && (
          <div className="absolute w-64 h-64 bg-blue-500/20 rounded-full voice-pulse"></div>
        )}
        <button
          onClick={isActive ? stopSession : startSession}
          disabled={isConnecting}
          className={`relative z-10 w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl ${
            isActive 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-600 hover:bg-blue-700'
          } ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <i className={`fas ${isActive ? 'fa-stop' : 'fa-microphone'} text-5xl text-white mb-3`}></i>
          <span className="text-white font-semibold text-sm">
            {isConnecting ? 'Connecting...' : (isActive ? 'Stop Listening' : 'Start Talking')}
          </span>
        </button>
      </div>

      <div className="flex flex-col items-center space-y-4 w-full">
        <div className={`px-4 py-2 rounded-full text-sm font-medium border flex items-center gap-2 ${
          isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
          {status}
        </div>

        {isActive && (
          <div className="w-full bg-white p-6 rounded-2xl shadow-inner border border-slate-100 h-24 overflow-y-auto italic text-slate-600 text-center">
            {currentTranscription || "Listening to your request..."}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-xs text-slate-400 px-4">
        <div className="flex items-center gap-2">
          <i className="fas fa-check-circle text-blue-500"></i>
          <span>Ask about CMSS Robotics Labs</span>
        </div>
        <div className="flex items-center gap-2">
          <i className="fas fa-check-circle text-blue-500"></i>
          <span>Enquire about 2024-25 Admissions</span>
        </div>
        <div className="flex items-center gap-2">
          <i className="fas fa-check-circle text-blue-500"></i>
          <span>STEM Curriculum details</span>
        </div>
        <div className="flex items-center gap-2">
          <i className="fas fa-check-circle text-blue-500"></i>
          <span>Jacobabad campus timings</span>
        </div>
      </div>
    </div>
  );
};
