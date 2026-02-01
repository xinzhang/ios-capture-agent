# Technical Requirements Document
## iOS Screen Capture & Question Extraction Agent

**Version:** 2.0 (Node.js + Electron)
**Date:** 2025-02-01
**Status:** Draft

---

## 1. System Overview

### 1.1 Technology Stack

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **Platform** | macOS 12.0+ | Screen capture APIs available |
| **Runtime** | Electron 28+ | Cross-platform desktop apps with web technologies |
| **Language** | TypeScript 5.3+ | Type safety, better developer experience |
| **UI Framework** | React 18+ | Component-based, familiar ecosystem |
| **Styling** | Tailwind CSS | Rapid UI development, responsive design |
| **State Management** | Zustand or Redux Toolkit | Simple, scalable state management |
| **Screen Capture** | screenshot-desktop npm | Cross-platform screen capture |
| **Window Detection** | node-mac-window-manager or AppleScript | Enumerate and select macOS windows |
| **OCR Engine** | Tesseract.js | JavaScript port of Tesseract OCR |
| **OCR Fallback** | Google Vision API (optional) | Higher accuracy cloud option |
| **LLM Integration** | OpenAI SDK (JavaScript) | Official OpenAI client library |
| **Data Storage** | SQLite (better-sqlite3) | Embedded database, no server needed |
| **Image Processing** | sharp (Node.js) | Fast image processing |
| **Build Tool** | Vite or Electron Builder | Fast build, optimized bundles |

### 1.2 Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                   Electron Renderer Process                 │
│                    (React UI Layer)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Window  │  │ Controls │  │  Content │  │   List   │   │
│  │ Preview  │  │          │  │  Window  │  │  View    │   │
│  │ (React)  │  │ (React)  │  │ (React)  │  │ (React)  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ IPC (Inter-Process Communication)
┌────────────────────────▼────────────────────────────────────┐
│                Electron Main Process                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              IPC Message Handlers                     │  │
│  │  - Bridge UI and native services                      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Service Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Screen     │  │     OCR      │  │     LLM      │     │
│  │  Capture     │  │  Service     │  │  Service     │     │
│  │  Service     │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │   Change     │  │    Storage   │                       │
│  │  Detection   │  │   Service    │                       │
│  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Data Layer                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              SQLite Database                          │  │
│  │  - sessions table                                     │  │
│  │  - captures table                                     │  │
│  │  - processed_content table                            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              File System Storage                      │  │
│  │  - ~/Library/Application Support/ios-capture-agent/  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Requirements by Module

### 2.1 Screen Capture Service

**Module ID:** TR-SC-001
**Priority:** Critical

#### 2.1.1 Window Detection & Selection

**Challenge:** Node.js has limited access to macOS window APIs

**Solutions (Priority Order):**

**Option 1: node-window-manager (Recommended)**
```javascript
import { WindowManager } from 'node-window-manager';

const wm = new WindowManager();

// Get all windows
const windows = wm.getWindows();

// Filter for iPhone mirroring windows
const iPhoneWindows = windows.filter(win => {
  const title = win.title.toLowerCase();
  const matchesPattern =
    title.includes('quicktime') ||
    title.includes('airplay') ||
    title.includes('iphone') ||
    title.includes('ipad');

  // Check aspect ratio (iPhone: 9:16, 9:19.5)
  const bounds = win.bounds;
  const aspectRatio = bounds.width / bounds.height;
  const isPhoneRatio = aspectRatio >= 0.45 && aspectRatio <= 0.6;

  return matchesPattern && isPhoneRatio;
});
```

**Option 2: AppleScript via child_process (Fallback)**
```javascript
import { execSync } from 'child_process';

function getWindowsViaAppleScript() {
  const script = `
    tell application "System Events"
      set windowList to every window of every process
      return windowList
    end tell
  `;

  const result = execSync(`osascript -e '${script}'`, {
    encoding: 'utf-8'
  });

  // Parse result and extract window info
  return parseWindows(result);
}
```

**Option 3: Manual Selection by User**
- If auto-detection fails, show screen picker
- User selects window from list or screen region

#### 2.1.2 Capture Implementation

**Package:** `screenshot-desktop`

```javascript
import screenshot from 'screenshot-desktop';

class ScreenCaptureService {
  private captureInterval: NodeJS.Timeout | null = null;

  async captureWindow(windowId: string): Promise<Buffer> {
    // Option 1: Capture entire screen and crop to window bounds
    const screens = await screenshot.listDisplays();
    const imgBuffer = await screenshot({ screen: screens[0].id });

    // Option 2: Use screencapture command (macOS native)
    const result = await execAsync(
      `screencapture -R${windowId} -x -t png /tmp/capture.png`
    );
    const buffer = await fs.readFile('/tmp/capture.png');

    return buffer;
  }

  async startCapture(config: CaptureConfig): Promise<NodeJS.ReadableStream> {
    // Return a stream of captured images
    return new Observable((subscriber) => {
      this.captureInterval = setInterval(async () => {
        try {
          const buffer = await this.captureWindow(config.windowId);
          subscriber.next(buffer);
        } catch (error) {
          subscriber.error(error);
        }
      }, 1000 / config.fps); // FPS control
    });
  }

  stopCapture() {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
  }
}
```

**Technical Specifications:**
```typescript
interface CaptureConfig {
  windowId: string;
  fps: number;           // Default: 15
  changeThreshold: number; // Default: 0.10 (10%)
  minInterval: number;   // Default: 1000ms
  autoDetect: boolean;   // Default: true
}
```

#### 2.1.3 Screen Change Detection Algorithm

**Approach:** Pixel difference using `sharp`

```javascript
import sharp from 'sharp';

class ChangeDetector {
  private previousHistogram: Uint8Array | null = null;
  private threshold = 0.10; // 10% difference

  async detectChange(imageBuffer: Buffer): Promise<boolean> {
    // Calculate histogram of current image
    const currentHist = await this.calculateHistogram(imageBuffer);

    if (!this.previousHistogram) {
      this.previousHistogram = currentHist;
      return true; // First frame
    }

    // Compare histograms using cosine similarity
    const difference = this.cosineDistance(
      this.previousHistogram,
      currentHist
    );

    this.previousHistogram = currentHist;
    return difference > this.threshold;
  }

  private async calculateHistogram(buffer: Buffer): Promise<Uint8Array> {
    // Use sharp for fast image processing
    const { channels } = await sharp(buffer)
      .resize(32, 32) // Downsample for performance
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Calculate 256-bin histogram
    const histogram = new Uint8Array(256).fill(0);
    for (let i = 0; i < channels.data.length; i++) {
      histogram[channels.data[i]]++;
    }

    return histogram;
  }

  private cosineDistance(hist1: Uint8Array, hist2: Uint8Array): number {
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < hist1.length; i++) {
      dotProduct += hist1[i] * hist2[i];
      magnitude1 += hist1[i] * hist1[i];
      magnitude2 += hist2[i] * hist2[i];
    }

    const similarity = dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
    return 1 - similarity; // Convert to distance
  }
}
```

#### 2.1.4 Error Handling

| Error Scenario | Recovery Strategy |
|----------------|-------------------|
| Window not found | Show manual picker UI with available windows |
| Window closed during capture | Pause recording, show notification, re-detect windows |
| Permission denied | Show instructions to grant screen recording permission |
| Capture timeout (5s) | Retry 3x with exponential backoff, then fail gracefully |
| screenshot-desktop fails | Fallback to `screencapture` command-line tool |

---

### 2.2 OCR Service

**Module ID:** TR-OCR-001
**Priority:** Critical

#### 2.2.1 OCR Engine: Tesseract.js

**Why Tesseract.js:**
- Pure JavaScript/TypeScript
- Runs in Node.js (backend)
- No native dependencies required
- Free and open source
- Works offline

**Trade-offs vs Apple Vision:**
- ⚠️ Lower accuracy (70-85% vs 90%+)
- ⚠️ Slower processing (3-5s vs 1-2s)
- ✅ Cross-platform
- ✅ No macOS dependency

#### 2.2.2 Implementation Specifications

```typescript
import Tesseract from 'tesseract.js';
import path from 'path';

interface OCRConfig {
  language: string;          // Default: 'eng'
  oem: number;              // OCR Engine Mode: 3 (default)
  psm: number;              // Page Segmentation Mode: 6 (single block)
}

interface OCRResult {
  rawText: string;
  textBlocks: TextBlock[];
  confidence: number;
  processingTime: number;
}

interface TextBlock {
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

class OCRService {
  private worker: Tesseract.Worker | null = null;

  async initialize(): Promise<void> {
    // Create Tesseract worker
    this.worker = await Tesseract.createWorker({
      logger: (m) => console.log(m), // Log progress
    });

    // Load language and configure
    await this.worker.loadLanguage('eng');
    await this.worker.initialize('eng');
    await this.worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      preserve_interword_spaces: '1',
    });
  }

  async processImage(imageBuffer: Buffer, config: OCRConfig): Promise<OCRResult> {
    if (!this.worker) {
      await this.initialize();
    }

    const startTime = Date.now();

    // Perform OCR
    const result = await this.worker!.recognize(imageBuffer);

    // Extract text blocks with bounding boxes
    const textBlocks: TextBlock[] = result.data.words.map((word) => ({
      text: word.text,
      bbox: {
        x: word.bbox.x0,
        y: word.bbox.y0,
        width: word.bbox.x1 - word.bbox.x0,
        height: word.bbox.y1 - word.bbox.y0,
      },
      confidence: word.confidence,
    }));

    // Group text blocks by lines (similar y-coordinates)
    const groupedBlocks = this.groupByLines(textBlocks);

    return {
      rawText: result.data.text,
      textBlocks: groupedBlocks,
      confidence: result.data.confidence,
      processingTime: Date.now() - startTime,
    };
  }

  private groupByLines(blocks: TextBlock[]): TextBlock[] {
    // Group blocks with similar y-coordinates into lines
    const lines: TextBlock[][] = [];
    const lineThreshold = 10; // pixels

    for (const block of blocks) {
      let added = false;
      for (const line of lines) {
        if (Math.abs(line[0].bbox.y - block.bbox.y) < lineThreshold) {
          line.push(block);
          added = true;
          break;
        }
      }
      if (!added) {
        lines.push([block]);
      }
    }

    // Sort lines by y-coordinate and concatenate text
    const sortedLines = lines.sort((a, b) => a[0].bbox.y - b[0].bbox.y);

    return sortedLines.map((line) => {
      const sortedLine = line.sort((a, b) => a.bbox.x - b.bbox.x);
      return {
        text: sortedLine.map((b) => b.text).join(' '),
        bbox: {
          x: Math.min(...sortedLine.map((b) => b.bbox.x)),
          y: Math.min(...sortedLine.map((b) => b.bbox.y)),
          width: Math.max(...sortedLine.map((b) => b.bbox.x + b.bbox.width)),
          height: Math.max(...sortedLine.map((b) => b.bbox.height)),
        },
        confidence: sortedLine.reduce((sum, b) => sum + b.confidence, 0) / sortedLine.length,
      };
    });
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
```

#### 2.2.3 Performance Optimization

**Strategies:**
1. **Pre-initialize worker** at app startup
2. **Use worker pool** for parallel processing
3. **Cache results** to avoid re-processing
4. **Image preprocessing** with sharp (grayscale, contrast enhancement)

```typescript
import sharp from 'sharp';

class OptimizedOCRService extends OCRService {
  async preprocessImage(buffer: Buffer): Promise<Buffer> {
    return await sharp(buffer)
      .grayscale()
      .normalize() // Improve contrast
      .sharpen()   // Enhance edges
      .toBuffer();
  }

  async processImage(buffer: Buffer, config: OCRConfig): Promise<OCRResult> {
    // Preprocess for better accuracy
    const preprocessed = await this.preprocessImage(buffer);
    return super.processImage(preprocessed, config);
  }
}
```

#### 2.2.4 Performance Targets

| Metric | Target | Acceptable |
|--------|--------|------------|
| Processing Time | < 5s per screen (1080p) | < 10s |
| Accuracy | > 80% on standard fonts | > 70% |
| Memory Usage | < 200MB per worker | < 400MB |
| Concurrency | 2 workers max | 3 workers |

#### 2.2.5 Optional Cloud OCR Fallback

**If Tesseract accuracy is insufficient:**

```typescript
import { ImageAnnotatorClient } from '@google-cloud/vision';

class GoogleVisionOCR {
  private client: ImageAnnotatorClient;

  constructor(apiKey: string) {
    this.client = new ImageAnnotatorClient({ keyFilename: apiKey });
  }

  async processImage(imageBuffer: Buffer): Promise<OCRResult> {
    const [result] = await this.client.documentTextDetection({
      image: { content: imageBuffer },
    });

    const fullTextAnnotation = result.fullTextAnnotation;
    const textBlocks = fullTextAnnotation.pages.map((page) => {
      return page.blocks.map((block) => ({
        text: block.paragraphs.map((p) =>
          p.words.map((w) => w.symbols.map((s) => s.text).join('')).join(' ')
        ).join('\n'),
        bbox: {
          x: block.boundingBox.vertices[0].x,
          y: block.boundingBox.vertices[0].y,
          width: block.boundingBox.vertices[2].x - block.boundingBox.vertices[0].x,
          height: block.boundingBox.vertices[2].y - block.boundingBox.vertices[0].y,
        },
        confidence: block.confidence,
      }));
    }).flat();

    return {
      rawText: fullTextAnnotation.text,
      textBlocks,
      confidence: 0.95, // Google Vision is typically very accurate
      processingTime: 0,
    };
  }
}
```

---

### 2.3 LLM Service

**Module ID:** TR-LLM-001
**Priority:** Critical

#### 2.3.1 OpenAI Integration

**Package:** `openai` (Official SDK)

```typescript
import OpenAI from 'openai';

interface LLMConfig {
  apiKey: string;
  model: string;        // Default: 'gpt-4o' or 'gpt-4-vision-preview'
  maxTokens: number;    // Default: 1000
  temperature: number;  // Default: 0.3
}

interface ProcessedContent {
  question: string;
  choices: Choice[];
  correctAnswer: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  rawResponse: string;
  processingTime: number;
  modelUsed: string;
}

interface Choice {
  label: string;
  text: string;
}

class OpenAIService {
  private client: OpenAI;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async processContent(
    ocrText: string,
    screenshot?: Buffer
  ): Promise<ProcessedContent> {
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: this.getUserPrompt(ocrText),
          },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }, // Enable JSON mode
      });

      const content = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(content);

      return {
        question: parsed.question || '',
        choices: parsed.choices || [],
        correctAnswer: parsed.correctAnswer || '',
        explanation: parsed.explanation || '',
        confidence: parsed.confidence || 'medium',
        rawResponse: content,
        processingTime: Date.now() - startTime,
        modelUsed: this.config.model,
      };
    } catch (error) {
      throw new Error(`OpenAI API error: ${error}`);
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert at extracting structured educational quiz content from OCR text.

Your task:
1. Extract the question text
2. Extract answer choices (A, B, C, D, etc.)
3. Identify the correct answer
4. Generate an explanation based on context

Rules:
- Questions are typically at the top or center
- Answer choices are labeled A, B, C, D or similar
- If uncertain, mark confidence as "low"
- For explanations, infer from context or mark as "not provided"

Output Format (valid JSON only):
{
  "question": "string",
  "choices": [
    {"label": "A", "text": "string"},
    {"label": "B", "text": "string"}
  ],
  "correctAnswer": "A",
  "explanation": "string",
  "confidence": "high|medium|low"
}`;
  }

  private getUserPrompt(ocrText: string): string {
    return `Extract the question, answer choices, correct answer, and generate an explanation from this OCR text:

${ocrText}

Return the result as valid JSON.`;
  }

  validate(content: ProcessedContent): ValidationResult {
    const errors: string[] = [];

    if (!content.question) errors.push('Missing question');
    if (content.choices.length < 2) errors.push('Need at least 2 choices');
    if (!content.choices.some((c) => c.label === content.correctAnswer)) {
      errors.push('Correct answer not in choices');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
```

#### 2.3.2 Retry Logic & Rate Limiting

```typescript
class RobustOpenAIService extends OpenAIService {
  private async callWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        if (error.status === 429) {
          // Rate limited - wait with exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Rate limited, waiting ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else if (error.status >= 500) {
          // Server error - retry
          if (attempt === maxRetries - 1) throw error;
          console.log(`Server error, retrying (${attempt + 1}/${maxRetries})...`);
        } else {
          // Other errors - don't retry
          throw error;
        }
      }
    }
    throw new Error('Max retries exceeded');
  }

  async processContent(ocrText: string, screenshot?: Buffer): Promise<ProcessedContent> {
    return this.callWithRetry(() => super.processContent(ocrText, screenshot));
  }
}
```

#### 2.3.3 Environment Configuration

```bash
# .env file (already set up by user)
OPENAI_API_KEY=sk-...

# Optional: Override defaults
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.3
```

```typescript
// Load from environment
import dotenv from 'dotenv';
dotenv.config();

const config: LLMConfig = {
  apiKey: process.env.OPENAI_API_KEY!,
  model: process.env.OPENAI_MODEL || 'gpt-4o',
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
};
```

---

### 2.4 User Interface (React)

**Module ID:** TR-UI-001
**Priority:** High

#### 2.4.1 Main Window Layout

```tsx
// App.tsx
import React from 'react';
import { CaptureSessionProvider } from './contexts/CaptureSessionContext';
import MainWindow from './components/MainWindow';

function App() {
  return (
    <CaptureSessionProvider>
      <MainWindow />
    </CaptureSessionProvider>
  );
}

// MainWindow.tsx
function MainWindow() {
  return (
    <div className="h-screen flex flex-col p-4 bg-gray-900 text-white">
      <Header />

      <div className="flex-1 grid grid-cols-2 gap-4">
        <WindowPreview />
        <div className="flex flex-col gap-4">
          <Controls />
          <OCRContent />
          <CapturedScreensList />
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
```

#### 2.4.2 Window Preview Component

```tsx
// WindowPreview.tsx
import React, { useEffect, useRef } from 'react';
import { useCaptureSession } from '../contexts/CaptureSessionContext';

export default function WindowPreview() {
  const { currentPreview, isRecording } = useCaptureSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (currentPreview && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx?.drawImage(img, 0, 0);
      };
      img.src = `data:image/png;base64,${currentPreview.toString('base64')}`;
    }
  }, [currentPreview]);

  return (
    <div className={`border-4 rounded-lg overflow-hidden ${isRecording ? 'border-red-500' : 'border-gray-700'}`}>
      <h2 className="bg-gray-800 px-4 py-2 text-sm font-semibold">
        iPhone Window Preview
      </h2>
      <div className="bg-black aspect-[9/16] flex items-center justify-center">
        {currentPreview ? (
          <canvas ref={canvasRef} className="max-h-full max-w-full" />
        ) : (
          <p className="text-gray-500">No window selected</p>
        )}
      </div>
    </div>
  );
}
```

#### 2.4.3 Controls Component

```tsx
// Controls.tsx
import React from 'react';
import { useCaptureSession } from '../contexts/CaptureSessionContext';

export default function Controls() {
  const {
    isRecording,
    isPaused,
    selectedWindow,
    availableWindows,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    selectWindow,
  } = useCaptureSession();

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-sm font-semibold mb-4">Controls</h2>

      <div className="flex gap-2 mb-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
            disabled={!selectedWindow}
          >
            Start Recording
          </button>
        ) : (
          <>
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={stopRecording}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Stop Recording
            </button>
          </>
        )}

        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
          Export
        </button>
      </div>

      <div>
        <label className="block text-sm mb-2">Window Source:</label>
        <select
          value={selectedWindow?.id || ''}
          onChange={(e) => {
            const window = availableWindows.find((w) => w.id === e.target.value);
            if (window) selectWindow(window);
          }}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
        >
          <option value="">Select a window...</option>
          {availableWindows.map((win) => (
            <option key={win.id} value={win.id}>
              {win.title} ({win.bounds.width}x{win.bounds.height})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

#### 2.4.4 State Management (Zustand)

```typescript
// store/captureSession.ts
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri'; // IPC bridge

interface Capture {
  id: string;
  screenshot: Buffer;
  ocrText: string;
  processedContent: ProcessedContent | null;
  timestamp: number;
}

interface CaptureSessionStore {
  isRecording: boolean;
  isPaused: boolean;
  selectedWindow: WindowInfo | null;
  availableWindows: WindowInfo[];
  capturedScreens: Capture[];
  currentPreview: Buffer | null;
  ocrText: string;

  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  selectWindow: (window: WindowInfo) => void;
  loadWindows: () => Promise<void>;
}

export const useCaptureSession = create<CaptureSessionStore>((set, get) => ({
  isRecording: false,
  isPaused: false,
  selectedWindow: null,
  availableWindows: [],
  capturedScreens: [],
  currentPreview: null,
  ocrText: '',

  loadWindows: async () => {
    const windows = await invoke('get_windows');
    set({ availableWindows: windows });
  },

  selectWindow: (window) => {
    set({ selectedWindow: window });
  },

  startRecording: async () => {
    const { selectedWindow } = get();
    if (!selectedWindow) return;

    set({ isRecording: true, isPaused: false });

    // Start IPC channel to main process
    await invoke('start_capture', { windowId: selectedWindow.id });
  },

  stopRecording: async () => {
    set({ isRecording: false, isPaused: false });
    await invoke('stop_capture');
  },

  pauseRecording: () => {
    set({ isPaused: true });
    await invoke('pause_capture');
  },

  resumeRecording: () => {
    set({ isPaused: false });
    await invoke('resume_capture');
  },
}));
```

---

### 2.5 Data Storage

**Module ID:** TR-DS-001
**Priority:** High

#### 2.5.1 SQLite Database Schema

```sql
-- sessions.sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  start_date INTEGER NOT NULL,
  end_date INTEGER,
  window_title TEXT NOT NULL,
  window_id INTEGER NOT NULL
);

-- captures.sql
CREATE TABLE IF NOT EXISTS captures (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  capture_date INTEGER NOT NULL,
  screenshot BLOB NOT NULL,
  ocr_text TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  is_deleted INTEGER DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- processed_content.sql
CREATE TABLE IF NOT EXISTS processed_content (
  id TEXT PRIMARY KEY,
  capture_id TEXT NOT NULL,
  question TEXT NOT NULL,
  choices JSON NOT NULL,  -- Store as JSON array
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  confidence TEXT NOT NULL,
  is_manually_edited INTEGER DEFAULT 0,
  model_used TEXT NOT NULL,
  FOREIGN KEY (capture_id) REFERENCES captures(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_captures_session ON captures(session_id);
CREATE INDEX idx_captures_date ON captures(capture_date);
```

#### 2.5.2 Database Service (TypeScript)

```typescript
// services/Database.ts
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

interface Session {
  id: string;
  startDate: number;
  endDate?: number;
  windowTitle: string;
  windowId: number;
}

interface Capture {
  id: string;
  sessionId: string;
  captureDate: number;
  screenshot: Buffer;
  ocrText: string;
  orderIndex: number;
  isDeleted: boolean;
}

interface ProcessedContent {
  id: string;
  captureId: string;
  question: string;
  choices: Choice[];
  correctAnswer: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  isManuallyEdited: boolean;
  modelUsed: string;
}

class DatabaseService {
  private db: Database.Database;

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'ios-capture-agent.db');

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Better performance
    this.initializeSchema();
  }

  private initializeSchema() {
    // Create tables (see SQL above)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (...)
      CREATE TABLE IF NOT EXISTS captures (...)
      CREATE TABLE IF NOT EXISTS processed_content (...)
    `);
  }

  // Session CRUD
  createSession(session: Omit<Session, 'id'>): Session {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, start_date, window_title, window_id)
      VALUES (?, ?, ?, ?)
    `);

    const id = generateUUID();
    stmt.run(id, session.startDate, session.windowTitle, session.windowId);

    return { ...session, id };
  }

  getSessions(): Session[] {
    const stmt = this.db.prepare('SELECT * FROM sessions ORDER BY start_date DESC');
    return stmt.all() as Session[];
  }

  // Capture CRUD
  addCapture(capture: Omit<Capture, 'id'>): Capture {
    const stmt = this.db.prepare(`
      INSERT INTO captures (id, session_id, capture_date, screenshot, ocr_text, order_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const id = generateUUID();
    stmt.run(id, capture.sessionId, capture.captureDate, capture.screenshot, capture.ocrText, capture.orderIndex);

    return { ...capture, id };
  }

  getCapturesBySession(sessionId: string): Capture[] {
    const stmt = this.db.prepare('SELECT * FROM captures WHERE session_id = ? AND is_deleted = 0 ORDER BY order_index');
    return stmt.all(sessionId) as Capture[];
  }

  // ProcessedContent CRUD
  upsertProcessedContent(content: Omit<ProcessedContent, 'id'>): ProcessedContent {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO processed_content
      (id, capture_id, question, choices, correct_answer, explanation, confidence, is_manually_edited, model_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = generateUUID();
    stmt.run(
      id,
      content.captureId,
      content.question,
      JSON.stringify(content.choices),
      content.correctAnswer,
      content.explanation,
      content.confidence,
      content.isManuallyEdited ? 1 : 0,
      content.modelUsed
    );

    return { ...content, id };
  }
}

export default DatabaseService;
```

#### 2.5.3 File Storage

```
~/Library/Application Support/ios-capture-agent/
├── ios-capture-agent.db          # SQLite database
├── ios-capture-agent.db-wal      # WAL file
├── sessions/                      # Per-session exports
│   └── 2025-02-01_143022_session001/
│       ├── screenshots/
│       │   ├── capture_001.png
│       │   └── capture_002.png
│       ├── export.json
│       └── export.txt
└── config/
    └── settings.json              # User preferences
```

---

## 3. Performance Requirements (Node.js)

### 3.1 Response Time Targets

| Operation | Target | Acceptable |
|-----------|--------|------------|
| Window detection | < 3s | < 5s |
| Screen capture | < 150ms | < 300ms |
| OCR processing | < 5s per screen | < 10s |
| LLM processing | < 5s | < 10s |
| Export (100 records) | < 3s | < 10s |

### 3.2 Resource Limits (Electron)

| Resource | Limit | Monitoring |
|----------|-------|------------|
| Memory (idle) | < 300MB | Electron process monitor |
| Memory (active) | < 800MB | Chrome devtools |
| CPU (idle) | < 3% | Activity Monitor |
| CPU (capturing) | < 20% | During capture |
| Disk space (100 captures) | < 200MB | Per session |

**Note:** Electron apps are heavier than native (due to Chromium + Node.js runtime)

### 3.3 Concurrency Strategy

```typescript
// Worker pool for parallel OCR processing
import { Worker } from 'worker_threads';
import path from 'path';

class OCRWorkerPool {
  private workers: Worker[] = [];
  private queue: OCRJob[] = [];
  private maxWorkers = 2; // Tesseract.js is resource-intensive

  constructor() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(path.join(__dirname, 'ocr-worker.js'));
      worker.on('message', (result) => this.onJobComplete(result));
      this.workers.push(worker);
    }
  }

  async process(buffer: Buffer): Promise<OCRResult> {
    return new Promise((resolve, reject) => {
      const job: OCRJob = { buffer, resolve, reject };
      this.queue.push(job);
      this.processNext();
    });
  }

  private processNext() {
    const worker = this.workers.find((w) => !w.isBusy);
    if (worker && this.queue.length > 0) {
      const job = this.queue.shift()!;
      worker.isBusy = true;
      worker.postMessage(job.buffer);
    }
  }

  private onJobComplete(result: OCRResult) {
    // Find and resolve corresponding job
  }
}
```

---

## 4. Development Environment Setup

### 4.1 Prerequisites

```bash
# Required
- Node.js 20+ (LTS)
- npm 10+ or pnpm 8+
- macOS 12.0+ development machine

# Environment variables (already configured)
OPENAI_API_KEY=sk-...
```

### 4.2 Project Structure

```
ios-capture-agent/
├── src/
│   ├── main/                      # Electron main process
│   │   ├── index.ts              # Entry point
│   │   ├── ipc/                  # IPC handlers
│   │   │   ├── capture.ts
│   │   │   ├── ocr.ts
│   │   │   └── llm.ts
│   │   └── services/             # Backend services
│   │       ├── ScreenCapture.ts
│   │       ├── OCRService.ts
│   │       ├── OpenAIService.ts
│   │       ├── Database.ts
│   │       └── ChangeDetector.ts
│   ├── renderer/                  # React UI
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── WindowPreview.tsx
│   │   │   ├── Controls.tsx
│   │   │   ├── OCRContent.tsx
│   │   │   └── CapturedScreensList.tsx
│   │   ├── contexts/
│   │   │   └── CaptureSessionContext.tsx
│   │   └── store/
│   │       └── captureSession.ts
│   └── shared/                    # Shared types
│       └── types.ts
├── tests/                         # Tests
│   ├── unit/
│   └── e2e/
├── docs/                          # Documentation
├── package.json
├── tsconfig.json
├── vite.config.ts                 # Vite config for React
├── electron-builder.json          # Build config
└── .env                           # Environment variables
```

### 4.3 Package.json Dependencies

```json
{
  "name": "ios-capture-agent",
  "version": "1.0.0",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder"
  },
  "dependencies": {
    "openai": "^4.20.0",
    "better-sqlite3": "^9.2.2",
    "screenshot-desktop": "^1.15.0",
    "tesseract.js": "^5.0.3",
    "sharp": "^0.33.1",
    "zustand": "^4.4.7",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.47",
    "@types/react-dom": "^18.2.18",
    "@types/better-sqlite3": "^7.6.8",
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1",
    "vite": "^5.0.11",
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.0",
    "concurrently": "^8.2.2",
    "wait-on": "^7.2.0",
    "vitest": "^1.1.0"
  }
}
```

---

## 5. Technical Risks & Mitigation (Node.js)

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Tesseract.js accuracy lower than expected** | High | Medium | Use image preprocessing; offer Google Vision fallback |
| **Window detection unreliable in Node.js** | High | Medium | Multiple detection strategies; manual picker UI |
| **Electron memory leaks** | Medium | Low | Regular profiling; proper cleanup; worker threads |
| **Screen capture permissions denied** | High | Low | Clear instructions; graceful degradation |
| **OpenAI API rate limits** | Medium | Medium | Request queue; exponential backoff; caching |
| **Performance worse than native** | Medium | High | Optimize with worker threads; caching |

---

## 6. Key Differences from Swift Version

| Aspect | Swift/SwiftUI | Node.js/Electron |
|--------|---------------|------------------|
| **OCR** | Apple Vision (90%+ accuracy) | Tesseract.js (70-85%) |
| **Window Detection** | Native APIs (CGWindowList) | npm packages or AppleScript |
| **Performance** | Excellent (~150MB idle) | Good (~300MB idle) |
| **Bundle Size** | ~10MB | ~150-200MB |
| **Cross-platform** | macOS only | macOS, Windows, Linux |
| **Development Speed** | Slower (need Swift knowledge) | Faster (web technologies) |

---

**Document Status:** Updated for Node.js + Electron Stack
**Next Steps:** Implementation Planning
**Tech Stack Decision:** Finalized - Node.js + Electron + React + OpenAI
