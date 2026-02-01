import React from 'react';
import WindowPreview from './WindowPreview';
import Controls from './Controls';
import PagesList from './PagesList';
import OCRContent from './OCRContent';
import CapturedScreensList from './CapturedScreensList';
import StatusBar from './StatusBar';

export default function MainWindow() {
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Main content area */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full grid grid-cols-2 gap-4">
          {/* Left panel: Window preview */}
          <WindowPreview />

          {/* Right panel: Controls, Pages, OCR content, captured screens */}
          <div className="flex flex-col gap-4 overflow-hidden">
            <Controls />
            <PagesList />
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              <OCRContent />
              <CapturedScreensList />
            </div>
          </div>
        </div>
      </div>

      {/* Status bar at the bottom */}
      <StatusBar />
    </div>
  );
}
