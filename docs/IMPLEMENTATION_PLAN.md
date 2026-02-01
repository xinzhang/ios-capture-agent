# Implementation Plan
## iOS Screen Capture & Question Extraction Agent

**Version:** 3.0 (Simplified for Iterative Development)
**Date:** 2025-02-01
**Status:** Draft

---

## Overview

This plan organizes development into **3 phases**, each ending with a **demo** to verify functionality before proceeding. I will implement all the code - you just review and approve each phase.

### Tech Stack
- **Runtime:** Electron + Node.js
- **UI:** React + TypeScript + Tailwind CSS
- **Database:** SQLite (better-sqlite3)
- **OCR:** Tesseract.js
- **LLM:** OpenAI (your API key already configured)
- **Image Processing:** sharp

---

## Phase 1: Basic UI Foundation

**Goal:** Create a working Electron app with a responsive UI

### Tasks

#### 1.1 Project Setup
- Initialize Node.js project with TypeScript
- Set up Electron + Vite
- Configure Tailwind CSS
- Set up project structure

#### 1.2 Main Window UI
Create these React components:
- **MainWindow** - Main layout with 2-column grid
- **WindowPreview** - Left panel showing iPhone preview area
- **Controls** - Start/Stop/Export buttons
- **OCRContent** - Text area for OCR results
- **CapturedScreensList** - Grid of captured thumbnails
- **StatusBar** - Status indicators

#### 1.3 State Management
- Set up Zustand store
- Create state for: recording status, selected window, captured screens list

#### 1.4 IPC Bridge
- Set up Electron preload script
- Create basic IPC handlers between main and renderer

### Demo 1: UI Preview
**What you'll see:**
- ✅ Electron app opens and displays full UI
- ✅ All panels render correctly (preview, controls, content, list)
- ✅ Buttons are clickable (recording won't work yet - that's Phase 2)
- ✅ Responsive layout that adapts to window size

**Files created:**
```
src/
├── main/index.ts
├── main/preload/index.ts
├── renderer/App.tsx
├── renderer/components/*.tsx
└── renderer/store/captureSession.ts
```

---

## Phase 2: Screen Capture & OCR

**Goal:** Capture iPhone mirroring window and extract text with OCR

### Tasks

#### 2.1 Window Detection
- Implement AppleScript-based window enumeration
- Filter for iPhone mirroring windows (QuickTime, AirPlay)
- Create window picker dropdown

#### 2.2 Screen Capture
- Integrate `screenshot-desktop` npm package
- Add macOS `screencapture` command fallback
- Implement capture loop (15 FPS)
- Send captured frames to renderer via IPC

#### 2.3 Change Detection
- Implement histogram-based algorithm using `sharp`
- Detect when screen changes significantly (>10% difference)
- Trigger capture only on new screens

#### 2.4 OCR Integration
- Set up Tesseract.js worker
- Implement text extraction from captured images
- Add image preprocessing (grayscale, sharpen, normalize)
- Display OCR results in UI in real-time

#### 2.5 Recording Controls
- Wire up Start/Stop buttons
- Implement capture state machine
- Save captures to array in state
- Show capture count and recording indicator

### Demo 2: Working Capture
**What you'll see:**
- ✅ App detects and lists iPhone mirroring windows
- ✅ Select a window and click "Start Recording"
- ✅ Preview shows live capture from selected window
- ✅ OCR text appears in real-time as you swipe on iPhone
- ✅ Each screen change creates a new capture in the list
- ✅ Stop recording ends capture session

**Test scenario:**
1. Open QuickTime Player and start iPhone mirroring
2. Launch our app
3. Select QuickTime window from dropdown
4. Click "Start Recording"
5. Swipe through some quiz questions on iPhone
6. Watch OCR text populate in the content panel
7. Click "Stop Recording"

---

## Phase 3: LLM Processing & Storage

**Goal:** Process OCR text with OpenAI and save to database

### Tasks

#### 3.1 Database Setup
- Create SQLite schema (sessions, captures, processed_content tables)
- Implement DatabaseService class
- Create repository layer
- Add migration system

#### 3.2 OpenAI Integration
- Set up OpenAI SDK with your API key
- Create prompt templates for Q&A extraction
- Implement retry logic with exponential backoff
- Add rate limiting and error handling

#### 3.3 Processing Pipeline
- Create processing queue for LLM calls
- Process captured screens in batch
- Extract: question, choices, correct answer, explanation
- Save results to database

#### 3.4 Review & Edit UI
- Create detail edit view
- Allow manual editing of extracted content
- Add "Reprocess with LLM" button
- Implement validation and error display

#### 3.5 Export Functionality
- Implement JSON export
- Implement TXT export (human-readable)
- Implement CSV export (for spreadsheets)

### Demo 3: Complete Workflow
**What you'll see:**
- ✅ After recording, click "Process with AI" button
- ✅ OpenAI processes all captures (with progress indicator)
- ✅ Each capture shows: question, choices, answer, explanation
- ✅ Click any capture to view/edit details
- ✅ Make manual edits and save
- ✅ Export session to JSON/TXT/CSV
- ✅ All data persisted to SQLite database

**Test scenario:**
1. Record 5-10 quiz questions from your iPhone
2. Click "Process with AI"
3. Watch progress as OpenAI processes each capture
4. Click on processed captures to review
5. Edit any incorrect extractions
6. Export to JSON file
7. Quit and restart app - verify data persists

---

## File Structure (After All Phases)

```
ios-capture-agent/
├── src/
│   ├── main/                      # Electron main process
│   │   ├── index.ts              # Entry point
│   │   ├── preload/
│   │   │   └── index.ts          # IPC bridge
│   │   ├── ipc/                  # IPC handlers
│   │   │   ├── window.ts         # Window detection
│   │   │   ├── capture.ts        # Screen capture
│   │   │   ├── ocr.ts            # OCR processing
│   │   │   └── llm.ts            # OpenAI processing
│   │   ├── services/
│   │   │   ├── WindowDetector.ts
│   │   │   ├── ScreenCapture.ts
│   │   │   ├── ChangeDetector.ts
│   │   │   ├── OCRService.ts
│   │   │   ├── OpenAIService.ts
│   │   │   ├── Database.ts
│   │   │   └── ExportService.ts
│   │   └── repositories/
│   │       └── CaptureRepository.ts
│   ├── renderer/                  # React UI
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── MainWindow.tsx
│   │   │   ├── WindowPreview.tsx
│   │   │   ├── Controls.tsx
│   │   │   ├── OCRContent.tsx
│   │   │   ├── CapturedScreensList.tsx
│   │   │   ├── DetailEdit.tsx
│   │   │   └── StatusBar.tsx
│   │   └── store/
│   │       └── captureSession.ts
│   └── shared/
│       └── types.ts              # Shared TypeScript types
├── docs/
│   ├── BUSINESS_REQUIREMENTS.md
│   ├── TECHNICAL_REQUIREMENTS.md
│   └── IMPLEMENTATION_PLAN.md
├── .env                          # OPENAI_API_KEY already here
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.json
└── tailwind.config.js
```

---

## Implementation Order

I'll implement **Phase 1 first**, then show you the demo. Once you approve, I'll move to **Phase 2**, and so on.

### Phase 1 → Demo → Your Approval → Phase 2 → Demo → Your Approval → Phase 3 → Demo → Final Review

At any point, if you want changes or have feedback, let me know and I'll adjust before proceeding.

---

## Dependencies Summary

**Core Dependencies:**
```json
{
  "openai": "^4.20.0",
  "better-sqlite3": "^9.2.2",
  "screenshot-desktop": "^1.15.0",
  "tesseract.js": "^5.0.3",
  "sharp": "^0.33.1",
  "zustand": "^4.4.7",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "dotenv": "^16.3.1"
}
```

**Dev Dependencies:**
```json
{
  "electron": "^28.0.0",
  "electron-builder": "^24.9.1",
  "vite": "^5.0.11",
  "typescript": "^5.3.3",
  "tailwindcss": "^3.4.0"
}
```

---

## Next Steps

Ready to start **Phase 1**?

Just say **"start Phase 1"** and I'll:
1. Create the project structure
2. Set up all configurations
3. Build the React UI components
4. Set up Electron with IPC
5. Show you a working demo

Then we'll iterate based on your feedback before moving to Phase 2.

---

**Plan Status:** Ready to begin
**Approach:** Iterative development with demo after each phase
**Your Role:** Review demos and provide feedback
**My Role:** Implement all code across all 3 phases
