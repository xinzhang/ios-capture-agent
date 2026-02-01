# Feature: Scrolling & Pages Grouping

## Overview
Add intelligent content capture that distinguishes between vertical scrolling (same page, more content) and horizontal navigation (new page), automatically grouping screenshots into "pages".

---

## 1. Feature Requirements

### 1.1 Vertical Scrolling Behavior
**Goal**: Capture long content that spans multiple screens by scrolling down.

**Behavior:**
- **Scroll Down**: Capture screenshot + OCR, append to current page group
- **Scroll Up**: Capture screenshot only (no OCR), don't add to current group
- **Detect Significant Change**: Only trigger on actual content change, not minor pixel differences

**Use Cases:**
- Long articles that require scrolling
- Multi-page lists (e.g., settings, email threads)
- Chat conversations with long message history

### 1.2 Horizontal Navigation / Screen Change
**Goal**: Detect when user navigates to a completely different screen.

**Triggers:**
- Horizontal swipe (left/right)
- Back button pressed
- Significant layout change (not just vertical scroll)

**Behavior:**
1. Finalize current page (save all screenshots + OCRs)
2. Start a new empty page group
3. Begin capturing for the new screen

**Use Cases:**
- Navigating between different app screens
- Going back to previous screen
- Moving to next/previous item in a list

### 1.3 Pages Panel UI
**Location**: Right panel, above the OCR content area.

**Features:**
- List of all captured pages
- Each page shows:
  - Page number or timestamp
  - Thumbnail (first screenshot of that page)
  - OCR preview (first 100 characters)
  - Number of screenshots in group
- Click to view page details
- Auto-scroll to latest page
- Visual indicator for current/active page

### 1.4 Page Detail View
When clicking on a page:
- Show all screenshots in that page (grid view)
- Show combined OCR text from all screenshots
- Show metadata (timestamp, screenshot count)

---

## 2. Technical Implementation

### 2.1 Change Detection Algorithm

**Current**: Pixel-based comparison (5% threshold)

**Enhanced**: Direction-aware change detection

```typescript
interface ChangeDirection {
  direction: 'vertical' | 'horizontal' | 'none' | 'major';
  confidence: number;
}

function detectChangeDirection(
  prevBuffer: Buffer,
  currBuffer: Buffer,
  prevOCR?: string,
  currOCR?: string
): ChangeDirection
```

**Algorithm:**

1. **Split Image Analysis**:
   ```
   Divide screen into 3 horizontal bands:
   - Top band (0-33%): Check for horizontal swipe
   - Middle band (33-66%): Check for content shift
   - Bottom band (66-100%): Check for nav bar/status changes
   ```

2. **Vertical Scroll Detection**:
   - Compare top 10% and bottom 10% between frames
   - If content moved down: new content appeared at bottom, old content moved up
   - High overlap in middle region (70%+ similar)
   - OCR text should be continuous/new content appended

3. **Horizontal Swipe/New Screen Detection**:
   - Low overall similarity (< 40%)
   - Completely different layout structure
   - OCR text is completely different (no common words)
   - Different navigation elements (back button, title bar)

4. **Minor Change Filtering**:
   - < 5% pixel change: Ignore (animations, loading spinners)
   - 5-30% change with high vertical overlap: Vertical scroll
   - > 40% change with low overlap: New screen

### 2.2 Data Structures

```typescript
interface Page {
  id: string;                    // Unique ID
  index: number;                 // Page number (1, 2, 3...)
  startTime: string;             // ISO timestamp
  endTime?: string;              // ISO timestamp when finalized
  screenshots: Screenshot[];     // All screenshots in this page
  combinedOCR: string;           // Combined OCR text
  status: 'active' | 'complete'; // Active = still capturing
}

interface Screenshot {
  id: string;
  timestamp: string;
  imageData: string;             // base64
  ocrText?: string;              // Only if scrolled down
  isScrollUp?: boolean;          // true if scroll up (no OCR)
}

interface CaptureSession {
  pages: Page[];
  currentPageId: string;         // Currently active page
  totalScreenshots: number;
}
```

### 2.3 State Management (Zustand)

```typescript
interface PagesStore {
  // State
  pages: Page[];
  currentPageId: string | null;
  selectedPageId: string | null;

  // Actions
  startNewPage: () => void;
  addScreenshot: (screenshot: Screenshot, direction: 'up' | 'down') => void;
  finalizeCurrentPage: () => void;
  selectPage: (pageId: string) => void;
  getActivePage: () => Page | null;
  getCombinedOCR: (pageId: string) => string;
  exportPage: (pageId: string) => ExportData;
  exportAllPages: () => ExportData[];
}
```

### 2.4 Screen Capture Service Updates

**File**: `src/main/services/screenCapture.ts`

**Changes**:

1. **Direction Detection**:
```typescript
async function detectChangeDirection(
  prevImage: Buffer,
  currImage: Buffer
): Promise<'vertical' | 'horizontal' | 'none'> {
  // Use sharp to compare regions
  // Return direction based on analysis
}
```

2. **Capture Loop Enhancement**:
```typescript
async function captureAndProcess() {
  const currentImage = await captureScreen();

  if (previousImage) {
    const direction = await detectChangeDirection(previousImage, currentImage);

    if (direction === 'horizontal') {
      // New page
      await finalizeCurrentPage();
      await startNewPage(currentImage);
    } else if (direction === 'vertical') {
      // Determine if scroll up or down
      const scrollDirection = await detectScrollDirection(previousImage, currentImage);

      if (scrollDirection === 'down') {
        // Capture + OCR
        await addScreenshotWithOCR(currentImage);
      } else {
        // Capture only, no OCR
        await addScreenshotOnly(currentImage);
      }
    }
    // If 'none', skip
  } else {
    // First capture
    await startNewPage(currentImage);
  }

  previousImage = currentImage;
}
```

### 2.5 OCR Service Updates

**File**: `src/main/services/ocrProcessor.ts`

**Enhancement**: Smart text combination

```typescript
function combineOCRText(existingText: string, newText: string): string {
  // Remove duplicates
  // Smart line merging
  // Detect continuations (e.g., broken sentences)
  // Remove repeated headers/footers
  return combinedText;
}
```

### 2.6 UI Components

#### 2.6.1 PagesList Panel

**File**: `src/renderer/components/PagesList.tsx`

```tsx
interface PagesListProps {
  pages: Page[];
  currentPageId: string;
  selectedPageId: string;
  onSelectPage: (pageId: string) => void;
}

export function PagesList({ pages, currentPageId, selectedPageId, onSelectPage }: PagesListProps) {
  return (
    <div className="pages-list">
      <div className="pages-header">
        <h3>Pages ({pages.length})</h3>
      </div>
      <div className="pages-grid">
        {pages.map((page) => (
          <PageCard
            key={page.id}
            page={page}
            isActive={page.id === currentPageId}
            isSelected={page.id === selectedPageId}
            onClick={() => onSelectPage(page.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

#### 2.6.2 PageCard Component

```tsx
interface PageCardProps {
  page: Page;
  isActive: boolean;
  isSelected: boolean;
  onClick: () => void;
}

function PageCard({ page, isActive, isSelected, onClick }: PageCardProps) {
  return (
    <div
      className={`page-card ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <img src={page.screenshots[0]?.imageData} alt="Thumbnail" />
      <div className="page-info">
        <span className="page-number">Page {page.index}</span>
        <span className="screenshot-count">{page.screenshots.length} shots</span>
      </div>
      <div className="ocr-preview">
        {page.combinedOCR?.substring(0, 100)}...
      </div>
    </div>
  );
}
```

#### 2.6.3 PageDetail View

**File**: `src/renderer/components/PageDetail.tsx`

```tsx
interface PageDetailProps {
  page: Page;
}

function PageDetail({ page }: PageDetailProps) {
  return (
    <div className="page-detail">
      <div className="page-header">
        <h3>Page {page.index}</h3>
        <span className="timestamp">{formatTime(page.startTime)}</span>
      </div>

      <div className="screenshots-grid">
        {page.screenshots.map((shot, idx) => (
          <div key={shot.id} className="screenshot-item">
            <img src={shot.imageData} alt={`Screenshot ${idx + 1}`} />
            {shot.ocrText && (
              <div className="screenshot-ocr">
                {shot.ocrText}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="combined-ocr">
        <h4>Combined OCR Text</h4>
        <textarea
          value={page.combinedOCR}
          readOnly
          className="ocr-textarea"
        />
      </div>
    </div>
  );
}
```

### 2.7 Layout Changes

**File**: `src/renderer/App.tsx`

```
Current Layout:
┌─────────────┬──────────────────┐
│  Preview    │   OCR Content    │
│   Panel     │                  │
│             │                  │
└─────────────┴──────────────────┘

New Layout:
┌─────────────┬──────────────────┐
│  Preview    │   Pages List     │
│   Panel     │   (New)          │
│             ├──────────────────┤
│             │  OCR Content     │
│             │                  │
└─────────────┴──────────────────┘
```

**Right Panel Structure**:
```tsx
<div className="right-panel">
  {/* New: Pages List */}
  <PagesList
    pages={pages}
    currentPageId={currentPageId}
    selectedPageId={selectedPageId}
    onSelectPage={handleSelectPage}
  />

  {/* Divider */}
  <div className="divider" />

  {/* Page Detail or Combined OCR */}
  {selectedPageId ? (
    <PageDetail page={getSelectedPage()} />
  ) : (
    <CurrentOCRContent />
  )}
</div>
```

---

## 3. Implementation Tasks

### Phase 1: Core Detection Logic
- [ ] Task 1.1: Implement `detectChangeDirection()` function
  - Use sharp to split image into regions
  - Compare top/middle/bottom bands
  - Calculate similarity scores
  - Return direction with confidence

- [ ] Task 1.2: Implement `detectScrollDirection()` function
  - Detect vertical scroll up vs down
  - Compare content flow between frames
  - Use OCR text position tracking if available

- [ ] Task 1.3: Add unit tests for detection algorithms
  - Test with synthetic scroll patterns
  - Test with horizontal swipe patterns
  - Test with edge cases (partial overlap, animations)

### Phase 2: Data Layer
- [ ] Task 2.1: Update TypeScript interfaces
  - Add `Page`, `Screenshot` with direction flag
  - Update shared types in `@shared/types.ts`

- [ ] Task 2.2: Implement PagesStore (Zustand)
  - State management for pages
  - Actions: startNewPage, addScreenshot, finalizePage
  - Selectors: getActivePage, getCombinedOCR

- [ ] Task 2.3: Update screenCapture service
  - Integrate direction detection
  - Call appropriate store actions based on direction
  - Handle page finalization

- [ ] Task 2.4: Update OCR processor
  - Smart text combination logic
  - Remove duplicate headers/footers
  - Detect sentence continuations

### Phase 3: UI Components
- [ ] Task 3.1: Create PagesList component
  - Display all pages as cards
  - Show thumbnails and metadata
  - Auto-scroll to latest

- [ ] Task 3.2: Create PageCard component
  - Thumbnail preview
  - Screenshot count
  - OCR preview text

- [ ] Task 3.3: Create PageDetail component
  - Grid of screenshots
  - Combined OCR text view
  - Metadata display

- [ ] Task 3.4: Update App layout
  - Add PagesList panel
  - Add divider
  - Responsive sizing

### Phase 4: Integration & Polish
- [ ] Task 4.1: Wire up IPC handlers
  - Page management events
  - Direction change notifications

- [ ] Task 4.2: Add keyboard shortcuts
  - Ctrl+P: New page manually
  - Ctrl+S: Save/export current page
  - Arrow keys: Navigate between pages

- [ ] Task 4.3: Add export functionality
  - Export single page (JSON/Markdown)
  - Export all pages
  - Include screenshots and OCR

- [ ] Task 4.4: Add settings/preferences
  - Scroll detection sensitivity
  - OCR combination strategy
  - Auto-finalize timeout

### Phase 5: Testing & Documentation
- [ ] Task 5.1: Manual testing scenarios
  - Long article scrolling
  - Settings menu navigation
  - Back/forward navigation

- [ ] Task 5.2: Performance optimization
  - Image comparison performance
  - Large page handling (100+ screenshots)
  - Memory management

- [ ] Task 5.3: Edge case handling
  - Rapid scrolling
  - Screen rotation
  - App backgrounding

- [ ] Task 5.4: Update user documentation
  - How scrolling capture works
  - How pages are created
  - Export and sharing

---

## 4. Configuration Options

**File**: `src/config/capture.config.ts`

```typescript
export interface CaptureConfig {
  // Change detection
  minChangePercent: number;           // Default: 5%
  verticalScrollThreshold: number;    // Default: 70% overlap
  horizontalSwipeThreshold: number;   // Default: 40% similarity

  // OCR behavior
  ocrOnScrollDown: boolean;           // Default: true
  ocrOnScrollUp: boolean;             // Default: false
  combineOCRStrategy: 'append' | 'smart' | 'replace';

  // Page management
  autoFinalizeTimeout: number;        // ms, 0 = disabled
  maxScreenshotsPerPage: number;      // Default: 100
}
```

---

## 5. Success Criteria

✅ **Vertical scrolling** appends to current page
✅ **Horizontal swipe** creates new page
✅ **Pages list** shows all captured pages
✅ **Click page** to view its screenshots and OCR
✅ **Combined OCR** intelligently merges text
✅ **No duplicate OCR** when scrolling up
✅ **Performance** remains smooth with 100+ screenshots
✅ **Export** works for single/all pages

---

## 6. Future Enhancements

- **AI-based categorization**: Auto-categorize pages by content type
- **Smart grouping**: Detect related pages and group them
- **Search**: Full-text search across all OCR text
- **Cloud sync**: Sync pages across devices
- **Collaboration**: Share pages with team members
- **Annotations**: Add notes to specific screenshots
- **Tags**: Tag pages for easy organization
