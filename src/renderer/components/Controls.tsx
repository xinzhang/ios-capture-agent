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

  // Auto-screenshot when iPhone Mirroring is selected
  useEffect(() => {
    if (selectedWindow && selectedWindow.appName === 'iPhone Mirroring (Full Screen)' && !isRecording) {
      // Only auto-show if we haven't set custom bounds yet
      // Check if bounds are the default full screen
      const isDefaultBounds = selectedWindow.bounds.x === 0 &&
                              selectedWindow.bounds.y === 0 &&
                              selectedWindow.bounds.width >= 1900;

      if (isDefaultBounds) {
        // Delay slightly to let the UI update first
        setTimeout(() => {
          captureFullScreenshot();
        }, 300);
      }
    }
  }, [selectedWindow, isRecording]);

  // Take a full screenshot for region selection
  const captureFullScreenshot = async () => {
    try {
      console.log('📸 captureFullScreen called');
      const screenshot = await window.electron.captureFullScreen?.();
      console.log('📸 captureFullScreen result:', screenshot ? 'Got screenshot' : 'No screenshot');
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
              Change Region
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
          onSave={async (region) => {
            console.log('🎯 onSave called with region:', region);

            // Round to integers for sharp
            const roundedRegion = {
              x: Math.round(region.x),
              y: Math.round(region.y),
              width: Math.round(region.width),
              height: Math.round(region.height),
            };
            console.log('🎯 Rounded region:', roundedRegion);

            if (selectedWindow) {
              selectWindow({
                ...selectedWindow,
                bounds: roundedRegion,
                isDisplay: false,
              });
            }
            setShowRegionSelector(false);
            setFullScreenImage(null);

            // Take a preview screenshot of the selected region
            try {
              console.log('📸 Calling captureRegion with:', roundedRegion);
              const screenshot = await window.electron.captureRegion?.(roundedRegion);
              console.log('📸 captureRegion result:', screenshot ? `Got screenshot (${screenshot.length} chars)` : 'No screenshot');
              if (screenshot && updatePreview) {
                console.log('🖼️ Updating preview...');
                updatePreview(screenshot);
                console.log('🖼️ Preview updated');
              } else {
                console.log('❌ No screenshot or updatePreview:', { hasScreenshot: !!screenshot, hasUpdatePreview: !!updatePreview });
              }
            } catch (error) {
              console.error('Failed to capture preview:', error);
            }
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
          <li>Draw a box around the iPhone window (opens automatically)</li>
          <li>Click "Start Recording"</li>
          <li>Use "Change Region" button anytime to reselect</li>
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
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imageReady, setImageReady] = useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Load image in memory to get dimensions
  React.useEffect(() => {
    setImageReady(false);
    setImageScale(1);
    setSelection(null);

    // Create a new image to load and get dimensions
    const tempImg = new Image();
    tempImg.onload = () => {
      console.log('🖼️ Image loaded in memory, dimensions:', tempImg.width, 'x', tempImg.height);

      // Now wait for the DOM image to render and get its displayed size
      setTimeout(() => {
        const domImg = imgRef.current;
        if (domImg && domImg.clientWidth > 0 && domImg.clientHeight > 0) {
          const displayedWidth = domImg.clientWidth;
          const displayedHeight = domImg.clientHeight;
          const naturalWidth = tempImg.width;
          const naturalHeight = tempImg.height;

          const scaleX = naturalWidth / displayedWidth;
          const scaleY = naturalHeight / displayedHeight;
          const scale = Math.max(scaleX, scaleY);
          setImageScale(scale);
          setImageReady(true);
          console.log('📐 Image scale calculated:', {
            displayed: `${displayedWidth}x${displayedHeight}`,
            natural: `${naturalWidth}x${naturalHeight}`,
            scaleX, scaleY, finalScale: scale
          });
        } else {
          // Retry if DOM isn't ready
          setTimeout(() => {
            const domImg = imgRef.current;
            if (domImg) {
              const displayedWidth = domImg.clientWidth || 722;
              const displayedHeight = domImg.clientHeight || 469;
              const naturalWidth = tempImg.width;
              const naturalHeight = tempImg.height;

              const scaleX = naturalWidth / displayedWidth;
              const scaleY = naturalHeight / displayedHeight;
              const scale = Math.max(scaleX, scaleY);
              setImageScale(scale);
              setImageReady(true);
              console.log('📐 Image scale calculated (retry):', {
                displayed: `${displayedWidth}x${displayedHeight}`,
                natural: `${naturalWidth}x${naturalHeight}`,
                scaleX, scaleY, finalScale: scale
              });
            }
          }, 100);
        }
      }, 100);
    };

    tempImg.onerror = () => {
      console.error('❌ Failed to load image in memory');
    };

    tempImg.src = image;
  }, [image]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPos({ x, y });
    setCurrentPos({ x, y });
    setIsDragging(true);
    setSelection({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !startPos) return;
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPos({ x, y });

    setSelection({
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setCurrentPos(null);
  };

  // Global mouse up to handle dragging outside the element
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setCurrentPos(null);
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging && startPos && imgRef.current) {
        const rect = imgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setCurrentPos({ x, y });

        setSelection({
          x: Math.min(startPos.x, x),
          y: Math.min(startPos.y, y),
          width: Math.abs(x - startPos.x),
          height: Math.abs(y - startPos.y),
        });
      }
    };

    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('mousemove', handleGlobalMouseMove);

      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [isDragging, startPos]);

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
          ref={imgRef}
          className="relative inline-block cursor-crosshair select-none"
          onMouseDown={handleMouseDown}
          style={{ userSelect: 'none' }}
        >
          <img
            ref={imgRef}
            src={image}
            alt="Full screen for selection"
            className="max-w-full max-h-[70vh] rounded pointer-events-none"
            draggable={false}
            style={{ WebkitUserDrag: 'none' }}
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
            onClick={() => {
              if (selection) {
                // Scale the coordinates to match the actual screen
                const scaledRegion = {
                  x: Math.round(selection.x * imageScale),
                  y: Math.round(selection.y * imageScale),
                  width: Math.round(selection.width * imageScale),
                  height: Math.round(selection.height * imageScale),
                };
                console.log('📐 Applying scale factor:', imageScale, 'scaled region:', scaledRegion);
                onSave(scaledRegion);
              }
            }}
            disabled={!imageReady || !selection || selection.width < 10 || selection.height < 10}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {imageReady ? 'Use This Region' : 'Loading image...'}
          </button>
        </div>
      </div>
    </div>
  );
}
