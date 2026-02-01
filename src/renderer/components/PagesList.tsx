import React from 'react';
import { useCaptureSession } from '../store/captureSession';
import type { Page } from '@shared/types';

export default function PagesList() {
  const { pages, currentPageId, selectedPageId, selectPage, clearCaptures } = useCaptureSession();

  const handleClearAll = () => {
    if (pages.length === 0) return;

    if (confirm(`Clear all ${pages.length} pages? This cannot be undone.`)) {
      clearCaptures();
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Pages ({pages.length})</h3>
        <div className="flex items-center gap-2">
          {pages.length > 0 && (
            <>
              <div className="text-xs text-gray-400">
                {pages.filter((p) => p.status === 'active').length} active
              </div>
              <button
                onClick={handleClearAll}
                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
              >
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          No pages yet. Start recording to capture pages.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
          {pages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              isActive={page.id === currentPageId}
              isSelected={page.id === selectedPageId}
              onClick={() => selectPage(page.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PageCardProps {
  page: Page;
  isActive: boolean;
  isSelected: boolean;
  onClick: () => void;
}

function PageCard({ page, isActive, isSelected, onClick }: PageCardProps) {
  const thumbnail = page.screenshots[0]?.imageData;
  const ocrPreview = page.combinedOCR?.substring(0, 60);

  return (
    <div
      onClick={onClick}
      className={`relative rounded-lg overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 bg-gray-700'
          : 'bg-gray-750 hover:bg-gray-700'
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-900 flex items-center justify-center">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`Page ${page.index}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-gray-600 text-xs">No screenshot</div>
        )}
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-1 right-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
      )}

      {/* Info overlay */}
      <div className="p-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-200">
            Page {page.index}
          </span>
          <span className="text-xs text-gray-400">
            {page.screenshots.length} {page.screenshots.length === 1 ? 'shot' : 'shots'}
          </span>
        </div>

        {ocrPreview && (
          <div className="mt-1 text-xs text-gray-400 line-clamp-2">
            {ocrPreview}...
          </div>
        )}
      </div>
    </div>
  );
}
