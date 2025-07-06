# GitHub Issue Linker

A Chrome extension that automatically detects and links issue keys (e.g., `WMS-123`, `API-456`) on GitHub pages to their corresponding issue tracker pages.

## Features

- **🔗 Automatic Issue Key Detection**: Detects issue keys matching patterns like `WMS-123`, `TMS-456`, `API-789` on GitHub pages
- **🎯 Multi-Repository Support**: Configure different issue trackers for different GitHub repositories
- **🔧 Generic Issue Tracker Integration**: Works with any HTTPS-based issue tracker (Jira, Linear, custom systems, etc.)
- **⚡ Real-time Processing**: Uses MutationObserver to detect keys in dynamically loaded content
- **📊 Performance Optimized**: Adaptive processing strategies based on page complexity
- **🎨 Modern UI**: Clean, accessible interface built with shadcn/ui components
- **🌍 Multi-language Support**: Full internationalization with English and Japanese support
- **🌓 Theme Support**: Light, dark, and system theme modes with real-time switching
- **📱 Browser Integration**: Shows detected key count in extension badge
- **⚙️ Flexible Configuration**: Import/export settings, enable/disable per preference
- **🔒 Security First**: Minimal permissions, secure link generation, HTTPS enforcement

## Installation

### From Chrome Web Store
*Coming soon*

### Manual Installation (Development)
1. Clone this repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode"
6. Click "Load unpacked" and select the `dist` folder

## Usage

### Initial Setup
1. Click the extension icon in your browser toolbar
2. Click the settings (gear) icon to open configuration
3. Add a new repository mapping:
   - **Repository**: `owner/repo` (e.g., `microsoft/vscode`)
   - **Issue Tracker URL**: `https://your-tracker.example.com`
   - **Key Prefix**: Issue key prefix (e.g., `WMS`, `API`, `FEATURE`)

### Viewing Detected Keys
1. Navigate to any GitHub repository page
2. Click the extension icon to see detected issue keys
3. Click on any detected key to open it in your issue tracker
4. The extension badge shows the count of detected keys

### Example Configuration
- **Repository**: `myorg/frontend`
- **Issue Tracker URL**: `https://myorg.atlassian.net`
- **Key Prefix**: `WEB`

This will detect keys like `WEB-123`, `WEB-456` on `github.com/myorg/frontend` pages and link them to `https://myorg.atlassian.net/WEB-123`.

### Language and Theme Configuration
The extension supports multiple languages and theme modes:

#### Language Support
- **English**: Default language
- **Japanese**: Full localization with proper translations
- **Auto-detection**: Uses browser language preference by default
- **Manual Override**: Change language in Settings page

#### Theme Modes
- **Light**: Traditional light theme
- **Dark**: Dark theme for reduced eye strain
- **System**: Automatically follows your operating system's theme preference
- **Real-time Sync**: Theme changes instantly apply to all extension windows

## Supported Issue Trackers

The extension works with any HTTPS-based issue tracker that follows a URL pattern like:
- `https://tracker.example.com/{key}`
- Jira: `https://company.atlassian.net/browse/{key}`
- Linear: `https://linear.app/company/issue/{key}`
- Custom systems: `https://issues.company.com/ticket/{key}`

## Key Features

### Smart Key Detection
- Detects patterns like `PREFIX-123` where PREFIX can be letters, numbers, underscores, or hyphens
- Case-insensitive prefix support (`api-123`, `API-123`)
- Avoids false positives by checking context and existing links

### Performance Optimization
- **Adaptive Processing**: Different strategies for small vs. large pages
- **Intersection Observer**: Lazy processing for optimal performance
- **Debounced Mutations**: Prevents excessive processing during rapid DOM changes
- **Idle Processing**: Uses browser idle time for non-critical operations

### Repository-Specific Configuration
- Each GitHub repository can have its own issue tracker configuration
- Multiple key prefixes per repository supported
- Enable/disable mappings individually

## Development

### Prerequisites
- Node.js 18+ and npm
- Chrome browser for testing

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd github-issue-linker

# Install dependencies
npm install

# Start development build with watch mode
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### Project Structure
```
src/
├── background/         # Service Worker (background script)
├── content-script/     # Content script for GitHub page processing
├── popup/             # Extension popup UI
├── options/           # Settings/configuration page
├── components/        # Reusable UI components
│   └── ui/           # shadcn/ui components
├── contexts/          # React contexts (Theme, etc.)
├── lib/              # Utility libraries and business logic
├── locales/          # Internationalization files
│   ├── en/           # English translations
│   └── ja/           # Japanese translations
├── types/            # TypeScript type definitions
└── styles/           # Global styles
```

### Technology Stack
- **Chrome Extension Manifest V3**: Modern service worker architecture
- **TypeScript**: Full type safety
- **React 18**: Component-based UI with hooks
- **Vite**: Fast build system with `@crxjs/vite-plugin`
- **shadcn/ui**: Modern, accessible component library
- **Tailwind CSS**: Utility-first CSS framework
- **react-i18next**: Internationalization framework for React
- **Radix UI**: Headless UI primitives for accessibility

## Privacy & Security

- **Minimal Permissions**: Only requests `activeTab` and `storage` permissions
- **No Data Collection**: Extension processes data locally only
- **Secure Links**: All generated links use `noopener noreferrer`
- **HTTPS Only**: Only allows secure HTTPS issue tracker URLs
- **XSS Protection**: Secure DOM manipulation prevents injection attacks

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues, feature requests, or questions:
- Open an issue on GitHub
- Check existing issues for similar problems

---

**Note**: This extension enhances your GitHub browsing experience by automatically linking issue references to your team's issue tracker, making navigation between GitHub and your project management tools seamless.