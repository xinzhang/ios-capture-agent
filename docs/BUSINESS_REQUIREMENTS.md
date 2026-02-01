# Business Requirements Document
## iOS Screen Capture & Question Extraction Agent

**Version:** 1.0
**Date:** 2025-02-01
**Status:** Draft

---

## 1. Executive Summary

The iOS Screen Capture & Question Extraction Agent is a desktop application designed to automate the collection and processing of educational content from iPhone screens. The application captures screens from iPhone mirroring sessions, extracts text using OCR, processes content with LLMs to identify questions and answers, and saves structured data for review and export.

### 1.1 Business Problem
Manually transcribing questions, answers, and explanations from educational apps or quiz platforms on iOS devices is time-consuming and error-prone. Users need an automated solution to capture multiple screens efficiently while maintaining data accuracy and structure.

### 1.2 Business Solution
An intelligent capture agent that:
- Automatically detects and captures new screens when users swipe through content
- Extracts text content using OCR technology
- Leverages LLMs to structure content into questions, answer choices, and explanations
- Provides real-time preview and editing capabilities
- Exports data in multiple formats for further use

---

## 2. Stakeholder Analysis

| Stakeholder | Role | Interests |
|-------------|------|-----------|
| End User | Primary user capturing iOS content | Easy-to-use interface, accurate capture, minimal manual intervention |
| Content Reviewer | Validates captured data | Editing tools, accuracy verification, export capabilities |
| Developer | Maintains and extends application | Clean architecture, documented APIs, testable components |

---

## 3. Functional Requirements

### 3.1 Screen Capture Module

**Requirement ID:** BR-SC-001
**Priority:** High
**Description:** The application shall capture the iPhone mirroring window content.

- **BR-SC-001.1:** System shall detect and select the iPhone mirroring window automatically
- **BR-SC-001.2:** System shall provide manual window selection if auto-detection fails
- **BR-SC-001.3:** System shall capture screenshots at user-defined intervals or on trigger
- **BR-SC-001.4:** System shall support multiple iPhone mirroring sources (QuickTime, AirPlay, third-party apps)

### 3.2 Screen Change Detection

**Requirement ID:** BR-SC-002
**Priority:** High
**Description:** The application shall automatically detect screen transitions.

- **BR-SC-002.1:** System shall monitor the captured window for visual changes
- **BR-SC-002.2:** System shall trigger a new capture when screen content changes significantly
- **BR-SC-002.3:** System shall ignore minor changes (animations, loading indicators) to avoid duplicate captures
- **BR-SC-002.4:** System shall provide configurable sensitivity for change detection

### 3.3 OCR Text Extraction

**Requirement ID:** BR-OCR-001
**Priority:** High
**Description:** The application shall extract text from captured screens.

- **BR-OCR-001.1:** System shall perform OCR on each captured screen
- **BR-OCR-001.2:** System shall display extracted text in real-time in a content window
- **BR-OCR-001.3:** System shall handle multiple languages (minimum: English)
- **BR-OCR-001.4:** System shall maintain text formatting and structure where possible

### 3.4 LLM Content Processing

**Requirement ID:** BR-LLM-001
**Priority:** High
**Description:** The application shall process extracted text using LLMs to structure content.

- **BR-LLM-001.1:** System shall identify and extract question text
- **BR-LLM-001.2:** System shall identify and extract answer choices (A, B, C, D, etc.)
- **BR-LLM-001.3:** System shall generate or identify correct answers
- **BR-LLM-001.4:** System shall generate answer explanations based on context
- **BR-LLM-001.5:** System shall allow user review and editing of processed content

### 3.5 User Interface

**Requirement ID:** BR-UI-001
**Priority:** High
**Description:** The application shall provide an intuitive user interface.

- **BR-UI-001.1:** System shall display a preview of the iPhone mirroring window
- **BR-UI-001.2:** System shall provide Start/Stop recording buttons
- **BR-UI-001.3:** System shall display captured OCR text in a scrollable content window
- **BR-UI-001.4:** System shall show a list of captured screens with thumbnails
- **BR-UI-001.5:** System shall provide editing interface for question, choices, and explanations
- **BR-UL-001.6:** System shall display capture status and progress indicators

### 3.6 Recording Controls

**Requirement ID:** BR-RC-001
**Priority:** Medium
**Description:** The application shall provide recording management features.

- **BR-RC-001.1:** System shall provide a "Start Recording" button to begin capture session
- **BR-RC-001.2:** System shall provide a "Stop Recording" button to end session
- **BR-RC-001.3:** System shall allow pausing and resuming recording sessions
- **BR-RC-001.4:** System shall indicate current recording state with visual feedback

### 3.7 Data Management

**Requirement ID:** BR-DM-001
**Priority:** High
**Description:** The application shall manage captured and processed data.

- **BR-DM-001.1:** System shall automatically save each captured screen as a separate record
- **BR-DM-001.2:** System shall maintain a sequential record of all captures in a session
- **BR-DM-001.3:** System shall allow users to edit any captured record
- **BR-DM-001.4:** System shall allow users to delete unwanted captures
- **BR-DM-001.5:** System shall persist data between application sessions

### 3.8 Export Functionality

**Requirement ID:** BR-EXP-001
**Priority:** High
**Description:** The application shall export captured and processed data.

- **BR-EXP-001.1:** System shall export data to plain text format (.txt)
- **BR-EXP-001.2:** System shall export data to structured formats (JSON, CSV)
- **BR-EXP-001.3:** System shall allow batch export of all records
- **BR-EXP-001.4:** System shall allow selective export of selected records

---

## 4. Non-Functional Requirements

### 4.1 Performance

**Requirement ID:** BR-NFR-PERF-001
**Priority:** Medium

- **BR-NFR-PERF-001.1:** Screen capture shall occur with minimum delay (< 100ms from change detection)
- **BR-NFR-PERF-001.2:** OCR processing shall complete within 2 seconds per screen
- **BR-NFR-PERF-001.3:** LLM processing shall complete within 5 seconds per screen
- **BR-NFR-PERF-001.4:** Application shall remain responsive during background processing

### 4.2 Usability

**Requirement ID:** BR-NFR-USA-001
**Priority:** High

- **BR-NFR-USA-001.1:** Interface shall be intuitive with minimal learning curve
- **BR-NFR-USA-001.2:** System shall provide clear visual feedback for all actions
- **BR-NFR-USA-001.3:** System shall include tooltips or help text for all controls
- **BR-NFR-USA-001.4:** Error messages shall be clear and actionable

### 4.3 Reliability

**Requirement ID:** BR-NFR-REL-001
**Priority:** High

- **BR-NFR-REL-001.1:** Application shall not crash during normal operation
- **BR-NFR-REL-001.2:** System shall recover gracefully from window disconnection
- **BR-NFR-REL-001.3:** System shall validate OCR accuracy and flag low-confidence extractions
- **BR-NFR-REL-001.4:** System shall auto-save data to prevent data loss

### 4.4 Security & Privacy

**Requirement ID:** BR-NFR-SEC-001
**Priority:** Medium

- **BR-NFR-SEC-001.1:** All data shall be stored locally on user's machine
- **BR-NFR-SEC-001.2:** LLM API keys shall be stored securely (keychain)
- **BR-NFR-SEC-001.3:** No captured data shall be transmitted without user consent
- **BR-NFR-SEC-001.4:** Application shall respect macOS privacy permissions

### 4.5 Compatibility

**Requirement ID:** BR-NFR-COMP-001
**Priority:** High

- **BR-NFR-COMP-001.1:** Application shall run on macOS 12.0 (Monterey) or later
- **BR-NFR-COMP-001.2:** System shall support iOS devices with iOS 12+ for mirroring
- **BR-NFR-COMP-001.3:** System shall work with various screen resolutions and orientations

---

## 5. User Workflows

### 5.1 Primary Workflow: Capture and Extract Questions

```
1. User launches iPhone mirroring (QuickTime/AirPlay/third-party app)
2. User launches iOS Capture Agent application
3. Application auto-detects iPhone mirroring window (or user selects manually)
4. User opens quiz/educational app on iPhone
5. User clicks "Start Recording" in Capture Agent
6. User navigates to first question on iPhone
7. Application detects screen, captures screenshot, performs OCR
8. Application displays extracted text in content window
9. User swipes to next question on iPhone
10. Application detects change, captures new screen
11. Steps 7-10 repeat for each screen
12. User clicks "Stop Recording" when complete
13. LLM processes all captures to structure Q&A content
14. User reviews and edits extracted content
15. User exports data to desired format
```

### 5.2 Secondary Workflow: Manual Capture

```
1. User starts recording session
2. User uses manual capture button to trigger screen capture
3. System processes current screen
4. User repeats for each screen
5. User stops recording and reviews/exports
```

---

## 6. Business Rules

### 6.1 Screen Change Detection
- Screens with < 10% pixel difference from previous capture shall be considered duplicates
- Minimum interval between captures: 1 second (configurable)
- Transition animations shall be ignored

### 6.2 Content Processing
- LLM shall only process screens containing question-related content
- Screens without identifiable questions shall be flagged for manual review
- Confidence scores shall be generated for all extracted data

### 6.3 Data Export
- Export format shall include: Question, Choices (A, B, C, D...), Correct Answer, Explanation
- Files shall be named with timestamp and session identifier
- Exported data shall include metadata (capture time, source, confidence scores)

---

## 7. Success Criteria

The project shall be considered successful when:

1. **Accuracy:** OCR achieves > 90% accuracy on standard iOS quiz app interfaces
2. **Efficiency:** Reduces manual transcription time by > 80%
3. **Reliability:** Successfully captures 95% of screen transitions without duplicates
4. **Usability:** New users can complete a capture session with < 5 minutes of learning
5. **Performance:** End-to-end processing (capture → OCR → LLM) completes within 10 seconds per screen

---

## 8. Constraints & Assumptions

### 8.1 Constraints
- Application limited to macOS platform
- Requires iPhone mirroring to be active
- LLM processing requires internet connection (unless using local model)
- macOS screen recording permissions required

### 8.2 Assumptions
- Users have stable iPhone mirroring setup
- Quiz apps use standard, readable fonts
- Content is primarily text-based (not complex diagrams)
- Users have basic familiarity with macOS applications
- LLM API access is available (e.g., OpenAI, Anthropic, or local model)

---

## 9. Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Poor OCR accuracy on complex layouts | High | Medium | Use Apple Vision Framework; provide manual editing |
| LLM misidentifies content structure | Medium | Medium | User review step; confidence scoring |
| iPhone mirroring window not detected | High | Low | Manual window selection fallback |
| Performance degradation with many captures | Medium | Low | Asynchronous processing; progress indicators |
| macOS privacy permissions blocking access | High | Medium | Clear permission request instructions |

---

## 10. Future Enhancements (Out of Scope for v1.0)

- Support for video capture (not just screenshots)
- Batch processing of existing screenshots
- Custom LLM prompt templates
- Integration with popular quiz platforms
- Cloud sync and backup
- Multi-language OCR support
- Image/diagram extraction and analysis
- Anki or other flashcard app export

---

## 11. Glossary

| Term | Definition |
|------|------------|
| OCR | Optical Character Recognition - converting images to text |
| LLM | Large Language Model - AI for natural language processing |
| iPhone Mirroring | Technology to display iPhone screen on Mac |
| Screen Change Detection | Algorithm to identify when displayed content changes |
| Capture Session | A single recording session from start to stop |
| Confidence Score | Metric indicating OCR/LLM accuracy probability |

---

**Document Status:** Draft for Review
**Next Review Date:** After user feedback
**Approved By:** Pending
