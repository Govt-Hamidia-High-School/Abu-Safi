
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { SYSTEM_INSTRUCTION } from '../constants';

export class GeminiService {
  /**
   * Generates a text response using the Gemini chat interface.
   */
  async getChatResponse(message: string, history: { role: string; parts: { text: string }[] }[]) {
    try {
      // Re-initialize to ensure latest API key is used
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
        history: history as any,
      });

      const result = await chat.sendMessage({ message });
      return result.text || "I'm sorry, I couldn't process that. Please try again.";
    } catch (error: any) {
      console.error("Chat Error:", error);
      if (error.message?.includes("Requested entity was not found")) {
        // Trigger key re-selection if possible
        if (typeof window !== 'undefined' && (window as any).aistudio) {
          (window as any).aistudio.openSelectKey();
        }
        return "I need to reconnect to the CMSS servers. Please re-select the API key when prompted.";
      }
      return "I'm having trouble connecting to my brain right now. Please check your connection.";
    }
  }

  /**
   * Connects to the Live API for real-time audio interaction.
   */
  async connectVoice(callbacks: {
    onOpen: () => void;
    onMessage: (message: LiveServerMessage) => void;
    onError: (e: ErrorEvent) => void;
    onClose: (e: CloseEvent) => void;
  }) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: callbacks.onOpen,
        onmessage: callbacks.onMessage,
        onerror: callbacks.onError,
        onclose: callbacks.onClose,
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        systemInstruction: SYSTEM_INSTRUCTION + "\nIMPORTANT: Your responses must be extremely short, conversational, and encouraging for students. Use a teacher-like tone.",
      },
    });
  }
}

// Audio Utils
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function encodeAudio(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encodeAudio(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}
