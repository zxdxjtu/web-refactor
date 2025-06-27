# Web Refactor - Intelligent Web Page Refactoring Extension

A Chrome extension that uses Large Language Models (LLMs) to intelligently refactor web pages, removing ads and clutter while preserving interactive functionality.

## Features

- **One-click intelligent refactoring** - Automatically identifies and removes ads, popups, and unnecessary elements
- **Multiple refactoring modes** - Reading mode, minimal mode, focus mode, and custom prompts
- **LLM Integration** - Supports OpenAI, Anthropic Claude, and custom API endpoints
- **Smart element protection** - Preserves important interactive elements and page functionality
- **Domain memory** - Save and reuse refactoring preferences for specific websites
- **Multi-language support** - Available in English and Chinese

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory

## Configuration

1. Click the extension icon and go to Settings
2. Configure your LLM provider:
   - Select provider (OpenAI/Anthropic/Custom)
   - Enter API URL and API Key
   - Choose model (GPT-4, Claude, etc.)
3. Save settings

## Usage

1. Navigate to any web page
2. Click the extension icon
3. Choose a preset mode or enter custom requirements
4. Click "Refactor Page"
5. Use "Reset" to restore the original page

## Development

### Prerequisites
- Node.js (for running tests)
- Chrome browser

### Setup
```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm test:coverage
```

### Project Structure
```
├── manifest.json          # Extension configuration
├── popup.html/css/js      # Extension popup UI
├── background.js          # Background service worker
├── content.js             # Content script for page manipulation
├── i18n.js               # Internationalization utilities
├── locales/              # Language files
└── tests/                # Unit tests
```

## API Configuration Examples

### OpenAI
- API URL: `https://api.openai.com/v1/chat/completions`
- Model: `gpt-4` or `gpt-3.5-turbo`

### Anthropic Claude
- API URL: `https://api.anthropic.com/v1/messages`
- Model: `claude-3-opus-20240229` or `claude-3-sonnet-20240229`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Privacy

This extension:
- Does not collect any personal data
- Only sends page content to the configured LLM API when explicitly triggered
- Stores settings and domain preferences locally in your browser
- Does not track usage or analytics

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/your-username/web-refactor/issues) page.