import React from 'react';
import { useCaptureSession } from '../store/captureSession';

export default function StatusBar() {
  const { isRecording, isPaused, capturedScreens, selectedWindow } = useCaptureSession();

  const getStatusText = () => {
    if (isRecording && !isPaused) return 'Recording';
    if (isRecording && isPaused) return 'Paused';
    if (selectedWindow) return 'Ready';
    return 'Idle';
  };

  const getStatusColor = () => {
    if (isRecording && !isPaused) return 'text-red-500';
    if (isRecording && isPaused) return 'text-yellow-500';
    if (selectedWindow) return 'text-green-500';
    return 'text-gray-500';
  };

  return (
    <div className="bg-gray-800 border-t border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Status:</span>
            <span className={getStatusColor()}>{getStatusText()}</span>
          </div>

          {/* Captured count */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Captured:</span>
            <span className="text-white">{capturedScreens.length}</span>
          </div>

          {/* Selected window */}
          {selectedWindow && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Window:</span>
              <span className="text-white truncate max-w-xs">
                {selectedWindow.title}
              </span>
            </div>
          )}
        </div>

        {/* App info */}
        <div className="text-gray-500 text-xs">
          iOS Capture Agent v1.0.0 | Phase 1 Demo
        </div>
      </div>
    </div>
  );
}
