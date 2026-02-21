import { create } from 'zustand';
import type { CaptureSessionStore, WindowInfo, Capture, Page, ScreenshotWithDirection } from '@shared/types';

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Setup IPC listeners
function setupIPCListeners(set: any) {
  // Listen for capture updates from main process
  if (window.electron.onCaptureUpdate) {
    window.electron.onCaptureUpdate((capture: Capture) => {
      console.log('📸 Received capture update:', capture);
      const rawText = capture.ocrResult?.rawText || '';
      console.log('📝 OCR rawText length:', rawText.length);
      console.log('📝 OCR rawText preview:', rawText.substring(0, 100) || 'NO TEXT');
      console.log('📝 Setting ocrText in store with length:', rawText.length);

      set((state: any) => ({
        capturedScreens: [...state.capturedScreens, capture],
        currentPreview: capture.screenshot,
        ocrText: rawText,
        processingStatus: 'idle',
      }));

      console.log('✅ Store updated, new ocrText length:', useCaptureSession.getState().ocrText.length);
    });
  }

  // Listen for recording state changes
  if (window.electron.onRecordingStateChanged) {
    window.electron.onRecordingStateChanged((stateChange: any) => {
      console.log('🔄 Recording state changed:', stateChange);
      set((state: any) => ({
        isRecording: stateChange.state === 'recording' || stateChange.state === 'paused',
        isPaused: stateChange.state === 'paused',
        // Update capture count if provided
        ...(stateChange.captureCount !== undefined && {
          capturedScreens: state.capturedScreens.slice(0, stateChange.captureCount),
        }),
      }));
    });
  }

  // Listen for page events
  if (window.electron.onPageEvent) {
    window.electron.onPageEvent((data: { event: string }) => {
      console.log('📄 Received page event:', data.event);

      if (data.event === 'new-page') {
        const store = useCaptureSession.getState();
        store.startNewPage();
      } else if (data.event === 'finalize-page') {
        const store = useCaptureSession.getState();
        store.finalizeCurrentPage();
      }
    });
  }

  // Listen for page screenshots
  if (window.electron.onPageScreenshot) {
    window.electron.onPageScreenshot((screenshot: ScreenshotWithDirection) => {
      console.log('📸 Received page screenshot:', screenshot.id, 'isScrollUp:', screenshot.isScrollUp);
      const store = useCaptureSession.getState();
      store.addScreenshotToPage(screenshot);
    });
  }
}

export const useCaptureSession = create<CaptureSessionStore>((set, get) => {
  // Setup IPC listeners once
  setupIPCListeners(set);

  return {
    // Initial state
    isRecording: false,
    isPaused: false,
    selectedWindow: null,
    availableWindows: [],
    capturedScreens: [],
    currentPreview: null,
    ocrText: '',
    processingStatus: 'idle',

    // Pages state
    pages: [],
    currentPageId: null,
    selectedPageId: null,

    // Actions
    loadWindows: async () => {
      try {
        const windows = await window.electron.getWindows();
        console.log('🪟 Detected windows:', windows);
        set({ availableWindows: windows });
      } catch (error) {
        console.error('Failed to load windows:', error);
      }
    },

    selectWindow: (window: WindowInfo) => {
      set({ selectedWindow: window });
    },

    startRecording: async () => {
      const { selectedWindow } = get();
      if (!selectedWindow) {
        console.error('No window selected');
        return;
      }

      try {
        console.log('▶️  Starting recording for window:', selectedWindow);
        await window.electron.startRecording(selectedWindow.id, selectedWindow.bounds, selectedWindow.isDisplay || false);
        set({ isRecording: true, isPaused: false, capturedScreens: [], processingStatus: 'capturing' });
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    },

    stopRecording: async () => {
      try {
        console.log('⏹️  Stopping recording');
        await window.electron.stopRecording();
        set({ isRecording: false, isPaused: false, processingStatus: 'idle', currentPreview: null });
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    },

    pauseRecording: async () => {
      try {
        console.log('⏸️  Pausing recording');
        await window.electron.pauseRecording();
        set({ isPaused: true, processingStatus: 'paused' });
      } catch (error) {
        console.error('Failed to pause recording:', error);
      }
    },

    resumeRecording: async () => {
      try {
        console.log('▶️  Resuming recording');
        await window.electron.resumeRecording();
        set({ isPaused: false, processingStatus: 'capturing' });
      } catch (error) {
        console.error('Failed to resume recording:', error);
      }
    },

    addCapture: (capture: Capture) => {
      set((state) => ({
        capturedScreens: [...state.capturedScreens, capture],
      }));
    },

    updatePreview: (image: string) => {
      console.log('🖼️ updatePreview called, image length:', image.length);
      set({ currentPreview: image });
      console.log('🖼️ currentPreview set in store');
    },

    updateOCRText: (text: string) => {
      set({ ocrText: text });
    },

    clearCaptures: () => {
      console.log('🗑️ Clearing all captures and pages');
      set({
        capturedScreens: [],
        ocrText: '',
        currentPreview: null,
        pages: [],
        currentPageId: null,
        selectedPageId: null,
      });
    },

    // Pages actions
    startNewPage: () => {
      const state = get();
      const newPage: Page = {
        id: generateId(),
        index: state.pages.length + 1,
        startTime: new Date().toISOString(),
        screenshots: [],
        combinedOCR: '',
        status: 'active',
      };
      console.log('📄 Starting new page:', newPage.index);
      set({
        pages: [...state.pages, newPage],
        currentPageId: newPage.id,
      });
    },

    addScreenshotToPage: (screenshot: ScreenshotWithDirection) => {
      const state = get();
      if (!state.currentPageId) {
        console.warn('No active page, creating new page first');
        get().startNewPage();
      }

      const currentPageId = get().currentPageId;
      if (!currentPageId) return;

      const updatedPages = state.pages.map((page) => {
        if (page.id === currentPageId) {
          const updatedScreenshots = [...page.screenshots, screenshot];

          // Combine OCR text
          const combinedOCR = screenshot.ocrText
            ? [...page.screenshots, screenshot]
                .filter((s) => s.ocrText)
                .map((s) => s.ocrText)
                .join('\n\n')
            : page.combinedOCR;

          return {
            ...page,
            screenshots: updatedScreenshots,
            combinedOCR,
          };
        }
        return page;
      });

      console.log('📸 Added screenshot to page, total screenshots:',
        updatedPages.find((p) => p.id === currentPageId)?.screenshots.length
      );

      set({ pages: updatedPages });
    },

    finalizeCurrentPage: () => {
      const state = get();
      if (!state.currentPageId) return;

      const updatedPages = state.pages.map((page) => {
        if (page.id === state.currentPageId) {
          return {
            ...page,
            status: 'complete' as const,
            endTime: new Date().toISOString(),
          };
        }
        return page;
      });

      console.log('✅ Finalized page:', state.currentPageId);
      set({
        pages: updatedPages,
        currentPageId: null,
      });
    },

    selectPage: (pageId: string) => {
      console.log('📖 Selecting page:', pageId);
      set({ selectedPageId: pageId });
    },

    getCurrentPage: () => {
      const state = get();
      if (!state.currentPageId) return null;
      return state.pages.find((p) => p.id === state.currentPageId) || null;
    },
  };
});
