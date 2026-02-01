import { create } from 'zustand';
import type { CaptureSessionStore, WindowInfo, Capture } from '@shared/types';

// Setup IPC listeners
function setupIPCListeners(set: any) {
  // Listen for capture updates from main process
  if (window.electron.onCaptureUpdate) {
    window.electron.onCaptureUpdate((capture: Capture) => {
      console.log('📸 Received capture update:', capture);
      set((state: any) => ({
        capturedScreens: [...state.capturedScreens, capture],
        currentPreview: capture.screenshot,
        ocrText: capture.ocrResult?.rawText || '',
        processingStatus: 'idle',
      }));
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
        await window.electron.startRecording(selectedWindow.id, selectedWindow.bounds);
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
      set({ currentPreview: image });
    },

    updateOCRText: (text: string) => {
      set({ ocrText: text });
    },

    clearCaptures: () => {
      set({ capturedScreens: [], ocrText: '', currentPreview: null });
    },
  };
});
