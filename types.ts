
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type AppMode = 'chat' | 'voice';

export interface SchoolInfo {
  name: string;
  alias: string;
  location: string;
  focus: string[];
}
