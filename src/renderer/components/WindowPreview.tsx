import React from 'react';
import { useCaptureSession } from '../store/captureSession';

export default function WindowPreview() {
  const { currentPreview, isRecording } = useCaptureSession();

  return (
    <div
      className={`border-4 rounded-lg overflow-hidden flex flex-col ${
        isRecording ? 'border-red-500' : 'border-gray-700'
      }`}
    >
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">iPhone Window Preview</h2>
        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-400">Recording</span>
          </div>
        )}
      </div>

      {/* Preview area */}
      <div className="flex-1 bg-black flex items-center justify-center aspect-[9/16]">
        {currentPreview ? (
          <img
            src={currentPreview}
            alt="Window preview"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-500 text-sm">No window selected</p>
            <p className="text-gray-600 text-xs mt-2">
              Select a window and click "Start Recording"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
