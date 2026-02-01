import React, { useState, useEffect } from 'react';
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
    updatePreview,
  } = useCaptureSession();

  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // Take a full screenshot for region selection
  const captureFullScreenshot = async () => {
    try {
      // Request screenshot from main process
      const screenshot = await window.electron.captureFullScreen?.();
      if (screenshot) {
        setFullScreenImage(screenshot);
        setShowRegionSelector(true);
      }
    } catch (error) {
      console.error('Failed to capture screen:', error);
    }
  };

  const handleStartRecording = async () => {
    if (!selectedWindow) return;
    await startRecording();
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-sm font-semibold mb-4">Controls</h2>

      {/* Recording buttons */}
      <div className="flex gap-2 mb-4">
        {!isRecording ? (
          <>
            <button
              onClick={handleStartRecording}
              disabled={!selectedWindow}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                selectedWindow
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Start Recording
            </button>
            <button
              onClick={captureFullScreenshot}
              disabled={!selectedWindow}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                selectedWindow
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Select Region
            </button>
          </>
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

      </div>

      {/* Window selector */}
      <div>
        <label className="block text-sm mb-2 text-gray-300">Window Source:</label>
        <select
          value={selectedWindow?.id || ''}
          onChange={(e) => {
            const window = availableWindows.find((w) => w.id === parseInt(e.target.value));
            if (window) {
              selectWindow(window);
            }
          }}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a window...</option>
          {availableWindows.map((win) => (
            <option key={win.id} value={win.id}>
              {win.appName} - {win.title}
            </option>
          ))}
        </select>
        {availableWindows.length === 0 && (
          <p className="text-xs text-gray-500 mt-2">
            No windows detected. Open iPhone mirroring first.
          </p>
        )}
      </div>

      {/* Region Selector Modal */}
      {showRegionSelector && fullScreenImage && (
        <RegionSelectorModal
          image={fullScreenImage}
          onSave={(region) => {
            if (selectedWindow) {
              selectWindow({
                ...selectedWindow,
                bounds: region,
                isDisplay: false,
              });
            }
            setShowRegionSelector(false);
            setFullScreenImage(null);
          }}
          onClose={() => {
            setShowRegionSelector(false);
            setFullScreenImage(null);
          }}
        />
      )}

      {/* Instructions */}
      <div className="mt-4 p-3 bg-gray-700/50 rounded text-xs text-gray-400">
        <p className="font-medium text-gray-300 mb-1">How to use:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Select "iPhone Mirroring (Full Screen)"</li>
          <li>Click "Select Region" to visually select the iPhone window</li>
          <li>Click and drag to draw a box around the iPhone window</li>
          <li>Click "Start Recording"</li>
        </ol>
      </div>
    </div>
  );
}

// Region Selector Modal Component
function RegionSelectorModal({
  image,
  onSave,
  onClose,
}: {
  image: string;
  onSave: (region: { x: number; y: number; width: number; height: number }) => void;
  onClose: () => void;
}) {
  const [selection, setSelection] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPos({ x, y });
    setIsDragging(true);
    setSelection({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !startPos) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelection({
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8">
      <div className="bg-gray-800 rounded-lg p-4 max-w-6xl max-h-full overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Select Capture Region</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4 text-sm text-gray-300">
          Click and drag to draw a box around the iPhone Mirroring window
        </div>

        <div
          className="relative inline-block cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={image}
            alt="Full screen for selection"
            className="max-w-full max-h-[70vh] rounded"
          />

          {/* Selection Box */}
          {selection && (
            <div
              className="absolute border-4 border-green-500 bg-green-500/10 pointer-events-none"
              style={{
                left: selection.x,
                top: selection.y,
                width: selection.width,
                height: selection.height,
              }}
            />
          )}

          {/* Selection Info */}
          {selection && selection.width > 10 && selection.height > 10 && (
            <div
              className="absolute bg-black/80 text-white text-xs px-2 py-1 rounded"
              style={{
                left: selection.x,
                top: selection.y - 30,
              }}
            >
              {Math.round(selection.width)} × {Math.round(selection.height)}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => selection && onSave(selection)}
            disabled={!selection || selection.width < 10 || selection.height < 10}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use This Region
          </button>
        </div>
      </div>
    </div>
  );
}
