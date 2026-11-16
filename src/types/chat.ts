export type ChatMode = 'standard' | 'deep-think' | 'web-search' | 'imagine';

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  data: string; // base64 without data URL prefix
  size: number;
  previewUrl?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface GeneratedArtwork {
  title: string;
  description: string;
  svgCode: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: ChatMode;
  attachments?: Attachment[];
  sources?: GroundingSource[];
  artwork?: GeneratedArtwork;
  error?: string;
  createdAt: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface CanvasArtifact {
  title: string;
  language: string;
  code: string;
}
