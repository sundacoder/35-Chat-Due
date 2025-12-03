export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  isThinking?: boolean;
}

export interface PdfDocument {
  name: string;
  size: number;
  pageCount: number;
  uploadDate: Date;
  processed: boolean;
}

export interface TextChunk {
  id: string;
  text: string;
  pageNumber: number;
  vector?: number[];
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING',
  CHAT = 'CHAT',
  ERROR = 'ERROR'
}

export interface ProcessingStatus {
  step: string;
  progress: number; // 0 to 100
}