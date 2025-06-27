# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome browser extension (Manifest V3) that uses Large Language Models to intelligently refactor web page content. The extension helps users reorganize layouts, remove ads/clutter while preserving interactive functionality.

## Commands

### Development
- Load extension: Chrome -> Extensions -> Developer mode ON -> Load unpacked -> Select this directory
- Reload extension: Click reload button in chrome://extensions after code changes
- Debug content script: F12 on target webpage -> Console
- Debug popup: Right-click extension icon -> Inspect popup
- Debug background service worker: chrome://extensions -> Details -> Inspect views: service worker

### Testing
No automated tests currently. Manual testing process:
1. Load extension in Chrome
2. Navigate to a test webpage
3. Click extension icon and test refactoring features
4. Check console for debug logs

## Architecture

### Extension Structure
- **manifest.json**: Extension configuration, permissions, and entry points
- **popup.js/html/css**: Extension popup UI and control logic
- **background.js**: Service worker handling LLM API calls and message routing
- **content.js**: Injected into web pages, handles DOM analysis and manipulation

### Key Components

**WebRefactorContent** (content.js):
- Main content script class that coordinates page analysis and command execution
- Handles message passing with popup and background scripts
- Manages page state for reset functionality

**InteractiveElementDetector** (content.js):
- Identifies interactive elements (buttons, links, forms) to protect during refactoring
- Uses CSS selectors and heuristics to classify elements as useful vs removable

**DOMAnalyzer** (content.js):
- Analyzes page structure, content, and advertisements
- Captures original page state for restoration
- Provides structured data about page elements

**CommandExecutor** (content.js):
- Executes refactoring commands (hide, remove, style, move, wrap)
- Implements non-destructive operations with data attributes for tracking
- Batches commands for performance

**LLMService** (background.js):
- Handles API communication with OpenAI, Anthropic, or custom endpoints
- Manages API keys and model configurations
- Implements retry logic and error handling

### Message Flow
1. User clicks refactor -> popup.js sends message to background.js
2. Background.js gets page analysis from content.js
3. Background.js calls LLM API with analysis and user prompt
4. LLM returns structured commands
5. Background.js sends commands to content.js for execution
6. Content.js executes commands and updates DOM

## Important Implementation Details

### DOM Manipulation Safety
- Always use `data-refactor-*` attributes to track changes
- Prefer CSS hiding over element removal
- Batch DOM updates to prevent layout thrashing
- Protect interactive elements identified by InteractiveElementDetector

### LLM Prompt Engineering
- System prompt in background.js defines command schema and constraints
- Structured JSON output with specific command types
- Context includes page analysis and interactive element list

### Debugging Features
- Double-click popup title exports debug logs
- Console logs show before/after HTML and executed commands
- LocalStorage saves refactoring history for analysis

### Internationalization
- Supports Chinese (zh) and English (en)
- Language files in locales/ directory
- Uses chrome.i18n API for message lookup