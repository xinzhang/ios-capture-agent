import React from 'react';
import { useCaptureSession } from '../store/captureSession';

export default function CapturedScreensList() {
  const { capturedScreens } = useCaptureSession();

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Captured Screens</h2>
        <span className="text-xs text-gray-400">{capturedScreens.length} captures</span>
      </div>

      {/* Captures grid */}
      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
        {capturedScreens.length === 0 ? (
          <div className="col-span-4 py-8 text-center">
            <svg
              className="mx-auto h-10 w-10 text-gray-600 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-500 text-sm">No captures yet</p>
            <p className="text-gray-600 text-xs mt-1">
              Captured screens will appear here
            </p>
          </div>
        ) : (
          capturedScreens.map((capture, index) => (
            <div
              key={capture.id}
              className="aspect-square bg-gray-900 rounded border border-gray-700 overflow-hidden cursor-pointer hover:border-gray-500 transition-colors"
            >
              <img
                src={capture.screenshot}
                alt={`Capture ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                <span className="text-xs text-gray-300">#{index + 1}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
