// Shared types between main and renderer processes

export interface WindowInfo {
  id: number;
  title: string;
  appName: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isDisplay?: boolean;
}

export interface Capture {
  id: string | number;
  windowId: number;
  timestamp: string; // ISO string
  screenshot: string; // base64 or data URL
  ocrResult?: OCRResult;
  processedContent?: ProcessedContent;
}

export interface ProcessedContent {
  question: string;
  choices: Choice[];
  correctAnswer: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  isManuallyEdited: boolean;
}

export interface Choice {
  label: string;
  text: string;
}

export interface TextBlock {
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface OCRResult {
  rawText: string;
  textBlocks: TextBlock[];
  confidence: number;
  processingTime: number;
}

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface CaptureSessionStore {
  // State
  isRecording: boolean;
  isPaused: boolean;
  selectedWindow: WindowInfo | null;
  availableWindows: WindowInfo[];
  capturedScreens: Capture[];
  currentPreview: string | null; // base64 image
  ocrText: string;
  processingStatus: 'idle' | 'processing' | 'completed' | 'failed';

  // Actions
  loadWindows: () => Promise<void>;
  selectWindow: (window: WindowInfo) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  addCapture: (capture: Capture) => void;
  updatePreview: (image: string) => void;
  updateOCRText: (text: string) => void;
  clearCaptures: () => void;
}
