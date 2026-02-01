# iOS Capture Agent

Electron app for capturing iPhone mirroring windows and extracting quiz content with AI.

## Phase 1: Basic UI Foundation ✅

This is a Phase 1 demo showing the complete UI framework.

## Quick Start (Phase 1 Demo)

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the App

**Option A: Easy startup script (Recommended)**
```bash
./start.sh
```

**Option B: Manual startup**
```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Build and run Electron (after Vite is ready)
npm run electron
```

### 3. What You Should See

✅ **Electron window opens** with a dark themed UI containing:
- **Left panel:** iPhone Window Preview (placeholder icon)
- **Right panel:**
  - Controls (Start Recording button, window selector)
  - OCR Content text area
  - Captured Screens grid (empty)
- **Bottom bar:** Status indicators

### 4. Verify It's Working

- You should see an Electron window (not a browser tab)
- The UI should have all panels visible
- The status bar should show "Status: Idle"
- DevTools console will be open (for debugging)

## Troubleshooting

### "I see a browser at localhost:5173, not an Electron app"

That's just the Vite dev server. Look for a separate Electron window titled "iOS Capture Agent".

### "Electron window opens but shows blank screen"

- Check the DevTools console (it should open automatically)
- Make sure both terminals are running (Vite + Electron)
- Look for error messages in the console

### "Nothing happens when I click buttons"

This is expected in Phase 1! The buttons will work in Phase 2 when we add the actual functionality.

### "I get an error about missing modules"

Try running:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Project Structure

```
ios-capture-agent/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts      # Entry point
│   │   └── preload/      # IPC bridge
│   ├── renderer/          # React UI
│   │   ├── components/   # UI components
│   │   ├── store/        # Zustand state
│   │   └── App.tsx
│   └── shared/           # Shared types
├── dist/                 # Compiled main process
├── package.json
├── tsconfig.json
├── vite.config.ts
└── start.sh             # Easy startup script
```

## Phase 1 Features

- ✅ Electron app with React + TypeScript
- ✅ Complete UI layout with all panels
- ✅ Responsive design with Tailwind CSS
- ✅ State management with Zustand
- ✅ IPC bridge between main and renderer processes

## Next Phases

**Phase 2:** Screen Capture & OCR
- Window detection via AppleScript
- Screen capture with screenshot-desktop
- Change detection algorithm
- Tesseract.js OCR integration
- Real-time recording functionality

**Phase 3:** LLM Processing & Storage
- OpenAI integration for Q&A extraction
- SQLite database persistence
- Review & edit functionality
- Export to JSON/TXT/CSV

## Development

```bash
# Build main process only
npm run build:main

# Build renderer only
npm run build:renderer

# Build everything
npm run build

# Development mode (both Vite and Electron)
npm run electron:dev

# Production build
npm run electron:build
```

## Platform Requirements

- **macOS 12.0+** (for screen capture functionality)
- **Node.js 20+**
- Screen recording permission (will be requested on first run)

## License

MIT
