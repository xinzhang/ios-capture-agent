import React from 'react';
import { useCaptureSession } from '../store/captureSession';

export default function OCRContent() {
  const { ocrText, processingStatus } = useCaptureSession();

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">OCR Content</h2>
        {processingStatus === 'processing' && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs text-blue-400">Processing...</span>
          </div>
        )}
      </div>

      {/* Text area */}
      <div className="flex-1 overflow-hidden">
        {ocrText ? (
          <textarea
            value={ocrText}
            readOnly
            className="w-full h-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <div className="h-full bg-gray-900 border border-gray-700 rounded flex items-center justify-center">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-600 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-500 text-sm">OCR text will appear here</p>
              <p className="text-gray-600 text-xs mt-2">
                Start recording to capture and extract text
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
