import React from 'react';
import { useCaptureSession } from '../store/captureSession';

export default function Controls() {
  const {
    isRecording,
    isPaused,
    selectedWindow,
    availableWindows,
    selectWindow,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useCaptureSession();

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-sm font-semibold mb-4">Controls</h2>

      {/* Recording buttons */}
      <div className="flex gap-2 mb-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={!selectedWindow}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              selectedWindow
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            Start Recording
          </button>
        ) : (
          <>
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded font-medium transition-colors"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={stopRecording}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-medium transition-colors"
            >
              Stop Recording
            </button>
          </>
        )}

        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors"
          disabled
        >
          Export
        </button>
      </div>

      {/* Window selector */}
      <div>
        <label className="block text-sm mb-2 text-gray-300">Window Source:</label>
        <select
          value={selectedWindow?.id || ''}
          onChange={(e) => {
            const window = availableWindows.find((w) => w.id === parseInt(e.target.value));
            if (window) selectWindow(window);
          }}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a window...</option>
          {availableWindows.map((win) => (
            <option key={win.id} value={win.id}>
              {win.title} ({win.bounds.width}x{win.bounds.height})
            </option>
          ))}
        </select>
        {availableWindows.length === 0 && (
          <p className="text-xs text-gray-500 mt-2">
            No windows detected. Open iPhone mirroring first.
          </p>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-gray-700/50 rounded text-xs text-gray-400">
        <p className="font-medium text-gray-300 mb-1">Phase 1 Demo:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>UI components are now functional</li>
          <li>Window detection coming in Phase 2</li>
          <li>Recording controls will work in Phase 2</li>
        </ul>
      </div>
    </div>
  );
}
