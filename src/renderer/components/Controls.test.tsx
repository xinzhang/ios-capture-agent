import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Controls from './Controls';
import { useCaptureSession } from '../store/captureSession';

// Mock the store
vi.mock('../store/captureSession', () => ({
  useCaptureSession: vi.fn(),
}));

describe('Controls Component', () => {
  const mockSelectWindow = vi.fn();
  const mockStartRecording = vi.fn();
  const mockStopRecording = vi.fn();
  const mockPauseRecording = vi.fn();
  const mockResumeRecording = vi.fn();
  const mockUpdatePreview = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock state
    (useCaptureSession as any).mockReturnValue({
      isRecording: false,
      isPaused: false,
      selectedWindow: null,
      availableWindows: [],
      selectWindow: mockSelectWindow,
      startRecording: mockStartRecording,
      stopRecording: mockStopRecording,
      pauseRecording: mockPauseRecording,
      resumeRecording: mockResumeRecording,
      updatePreview: mockUpdatePreview,
    });
  });

  describe('Window Selection', () => {
    it('should show window dropdown', () => {
      render(<Controls />);

      expect(screen.getByText(/Window Source/i)).toBeInTheDocument();
    });

    it('should populate available windows', () => {
      const mockWindows = [
        { id: 1, appName: 'App1', title: 'Window 1', bounds: { x: 0, y: 0, width: 100, height: 100 }, isDisplay: false },
        { id: 2, appName: 'App2', title: 'Window 2', bounds: { x: 0, y: 0, width: 100, height: 100 }, isDisplay: false },
      ];

      (useCaptureSession as any).mockReturnValue({
        isRecording: false,
        isPaused: false,
        selectedWindow: null,
        availableWindows: mockWindows,
        selectWindow: mockSelectWindow,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        pauseRecording: mockPauseRecording,
        resumeRecording: mockResumeRecording,
        updatePreview: mockUpdatePreview,
      });

      render(<Controls />);

      expect(screen.getByText('App1 - Window 1')).toBeInTheDocument();
      expect(screen.getByText('App2 - Window 2')).toBeInTheDocument();
    });

    it('should call selectWindow when window is selected', () => {
      const mockWindow = { id: 1, appName: 'App1', title: 'Window 1', bounds: { x: 0, y: 0, width: 100, height: 100 }, isDisplay: false };

      (useCaptureSession as any).mockReturnValue({
        isRecording: false,
        isPaused: false,
        selectedWindow: null,
        availableWindows: [mockWindow],
        selectWindow: mockSelectWindow,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        pauseRecording: mockPauseRecording,
        resumeRecording: mockResumeRecording,
        updatePreview: mockUpdatePreview,
      });

      render(<Controls />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '1' } });

      expect(mockSelectWindow).toHaveBeenCalledWith(mockWindow);
    });
  });

  describe('Recording Controls', () => {
    it('should show Start Recording button when not recording', () => {
      render(<Controls />);

      expect(screen.getByText('Start Recording')).toBeInTheDocument();
    });

    it('should disable Start Recording when no window selected', () => {
      render(<Controls />);

      const startButton = screen.getByText('Start Recording');
      expect(startButton).toBeDisabled();
    });

    it('should enable Start Recording when window is selected', () => {
      const mockWindow = { id: 1, appName: 'App1', title: 'Window 1', bounds: { x: 0, y: 0, width: 100, height: 100 }, isDisplay: false };

      (useCaptureSession as any).mockReturnValue({
        isRecording: false,
        isPaused: false,
        selectedWindow: mockWindow,
        availableWindows: [mockWindow],
        selectWindow: mockSelectWindow,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        pauseRecording: mockPauseRecording,
        resumeRecording: mockResumeRecording,
        updatePreview: mockUpdatePreview,
      });

      render(<Controls />);

      const startButton = screen.getByText('Start Recording');
      expect(startButton).not.toBeDisabled();
    });

    it('should call startRecording when Start Recording is clicked', async () => {
      const mockWindow = { id: 1, appName: 'App1', title: 'Window 1', bounds: { x: 0, y: 0, width: 100, height: 100 }, isDisplay: false };

      (useCaptureSession as any).mockReturnValue({
        isRecording: false,
        isPaused: false,
        selectedWindow: mockWindow,
        availableWindows: [mockWindow],
        selectWindow: mockSelectWindow,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        pauseRecording: mockPauseRecording,
        resumeRecording: mockResumeRecording,
        updatePreview: mockUpdatePreview,
      });

      render(<Controls />);

      const startButton = screen.getByText('Start Recording');
      fireEvent.click(startButton);

      expect(mockStartRecording).toHaveBeenCalled();
    });

    it('should show Pause and Stop buttons when recording', () => {
      (useCaptureSession as any).mockReturnValue({
        isRecording: true,
        isPaused: false,
        selectedWindow: { id: 1, appName: 'App1', title: 'Window 1', bounds: { x: 0, y: 0, width: 100, height: 100 }, isDisplay: false },
        availableWindows: [],
        selectWindow: mockSelectWindow,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        pauseRecording: mockPauseRecording,
        resumeRecording: mockResumeRecording,
        updatePreview: mockUpdatePreview,
      });

      render(<Controls />);

      expect(screen.getByText('Pause')).toBeInTheDocument();
      expect(screen.getByText('Stop Recording')).toBeInTheDocument();
    });

    it('should show Resume button when paused', () => {
      (useCaptureSession as any).mockReturnValue({
        isRecording: true,
        isPaused: true,
        selectedWindow: { id: 1, appName: 'App1', title: 'Window 1', bounds: { x: 0, y: 0, width: 100, height: 100 }, isDisplay: false },
        availableWindows: [],
        selectWindow: mockSelectWindow,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        pauseRecording: mockPauseRecording,
        resumeRecording: mockResumeRecording,
        updatePreview: mockUpdatePreview,
      });

      render(<Controls />);

      expect(screen.getByText('Resume')).toBeInTheDocument();
    });
  });

  describe('Change Region Button', () => {
    it('should show Change Region button when not recording', () => {
      const mockWindow = { id: 1, appName: 'App1', title: 'Window 1', bounds: { x: 0, y: 0, width: 100, height: 100 }, isDisplay: false };

      (useCaptureSession as any).mockReturnValue({
        isRecording: false,
        isPaused: false,
        selectedWindow: mockWindow,
        availableWindows: [mockWindow],
        selectWindow: mockSelectWindow,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        pauseRecording: mockPauseRecording,
        resumeRecording: mockResumeRecording,
        updatePreview: mockUpdatePreview,
      });

      render(<Controls />);

      expect(screen.getByText('Change Region')).toBeInTheDocument();
    });

    it('should not show Change Region button when recording', () => {
      (useCaptureSession as any).mockReturnValue({
        isRecording: true,
        isPaused: false,
        selectedWindow: { id: 1, appName: 'App1', title: 'Window 1', bounds: { x: 0, y: 0, width: 100, height: 100 }, isDisplay: false },
        availableWindows: [],
        selectWindow: mockSelectWindow,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        pauseRecording: mockPauseRecording,
        resumeRecording: mockResumeRecording,
        updatePreview: mockUpdatePreview,
      });

      render(<Controls />);

      expect(screen.queryByText('Change Region')).not.toBeInTheDocument();
    });
  });
});
