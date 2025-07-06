# GitHub Issue Linker - Development Guide

## Project Overview

This is a Chrome extension project that automatically detects and links issue keys (e.g., `WMS-123`, `API-456`) on GitHub pages to their corresponding issue tracker pages. The extension has evolved from a Backlog-specific tool to a generic issue tracker linker supporting any HTTPS-based issue tracker system.

## Key Architecture

### **Core Features**
- **Generic Issue Tracker Integration**: Works with Jira, Linear, custom systems, etc.
- **Multi-Repository Support**: Different issue tracker configurations per GitHub repository
- **Real-time Processing**: Uses MutationObserver for dynamic content detection
- **Performance Optimization**: Adaptive strategies based on page complexity
- **Internationalization (i18n)**: Full English and Japanese localization with auto-detection
- **Theme Support**: Light, dark, and system theme modes with real-time switching
- **Modern Chrome Extension**: Manifest V3 with service workers

### **Technical Stack**
- **Chrome Extension Manifest V3**: Service worker architecture
- **TypeScript**: Full type safety throughout
- **React 18**: Modern component-based UI with hooks and context
- **Vite + @crxjs/vite-plugin**: Fast build system optimized for extensions
- **shadcn/ui**: Accessible component library built on Radix UI
- **Tailwind CSS**: Utility-first styling with theme support
- **react-i18next**: Internationalization framework for React
- **Radix UI**: Headless UI primitives for accessibility

## File Structure

```
src/
├── background/
│   └── index.ts              # Service worker, message handling, badge management
├── content-script/
│   ├── index.ts              # Main content script initialization
│   └── link-processor.ts     # Issue key detection and processing logic
├── popup/
│   ├── index.tsx             # Popup entry point with ThemeProvider
│   └── Popup.tsx             # Extension popup UI (shows detected keys)
├── options/
│   ├── index.tsx             # Options entry point with ThemeProvider
│   └── Options.tsx           # Settings page with repository mappings, theme, language
├── components/
│   ├── ui/                   # shadcn/ui components (Button, Card, RadioGroup, etc.)
│   └── MappingDialog.tsx     # Repository mapping configuration dialog
├── contexts/
│   └── ThemeContext.tsx      # React context for theme management
├── lib/
│   ├── storage.ts            # Storage management (sync/local/session)
│   ├── issue-tracker.ts      # Issue tracker patterns and URL generation
│   ├── i18n.ts              # Internationalization setup and utilities
│   └── utils.ts              # Utility functions
├── locales/
│   ├── en/
│   │   └── common.json       # English translations
│   └── ja/
│       └── common.json       # Japanese translations
├── types/
│   └── index.ts              # TypeScript type definitions
└── styles/
    └── globals.css           # Global styles, Tailwind imports, theme variables
```

## Key Components

### **Storage Architecture**
- **Sync Storage**: User preferences (enabled/disabled, theme, notifications, language)
- **Local Storage**: Repository mappings, performance metrics, error logs
- **Session Storage**: Processing cache for current session
- **Real-time Sync**: chrome.storage.onChanged listeners for cross-component updates

### **Content Script Processing**
1. **Initialization**: Checks repository, loads mappings, sets up observers
2. **Text Processing**: Scans DOM for text nodes containing issue keys
3. **Pattern Matching**: Uses configurable regex patterns for key detection
4. **Link Generation**: Creates secure, clickable links to issue trackers
5. **Performance Monitoring**: Tracks processing times and success rates

### **Background Script**
- **Message Routing**: Handles communication between popup, options, and content script
- **Badge Management**: Updates extension badge with detected key count
- **Storage Coordination**: Manages data persistence across storage areas
- **Lifecycle Management**: Handles extension install/update events

## Development Commands

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Code linting
npm run lint

# Clean build artifacts
rm -rf dist && npm run build
```

## Configuration System

### **Repository Mapping Structure**
```typescript
interface RepositoryMapping {
  id: string;
  repository: string;        // "owner/repo" format
  trackerUrl: string;        // HTTPS issue tracker URL
  keyPrefix: string;         // Issue key prefix (e.g., "WMS", "API")
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### **User Preferences**
```typescript
interface UserPreferences {
  enabled: boolean;                        // Global enable/disable
  theme: 'light' | 'dark' | 'system';    // Theme preference
  showNotifications: boolean;              // Notification settings
  performanceMode: 'auto' | 'fast' | 'comprehensive';
  language: 'en' | 'ja';                  // Language preference
}
```

## Key Implementation Details

### **Internationalization (i18n) System**
- **Framework**: react-i18next for React integration
- **Language Detection**: Automatic browser language detection with manual override
- **Supported Languages**: English (default) and Japanese with full translations
- **Translation Structure**: Hierarchical JSON files with namespaces (common, popup, options, etc.)
- **Real-time Switching**: Language changes apply immediately to all components
- **Storage Integration**: Language preference saved to chrome.storage.sync
- **Context-aware**: Proper pluralization and variable interpolation support

### **Theme System**
- **Theme Modes**: Light, dark, and system (follows OS preference)
- **Implementation**: React Context with ThemeProvider wrapper
- **CSS Variables**: Uses CSS custom properties for seamless theme switching
- **System Detection**: Automatic detection of OS dark mode preference
- **Real-time Updates**: Theme changes apply instantly across all extension windows
- **Storage Persistence**: Theme preference synced across browser sessions
- **Component Integration**: All shadcn/ui components automatically support themes

### **Issue Key Detection**
- **Pattern**: `/\b[A-Za-z][A-Za-z0-9_-]*-\d+\b/g`
- **Context Checking**: Avoids processing inside existing links, input fields, code blocks
- **Performance**: Uses Intersection Observer for large documents
- **Adaptive Processing**: Different strategies based on document size

### **Security Measures**
- **Minimal Permissions**: Only `activeTab` and `storage`
- **HTTPS Enforcement**: Only allows secure issue tracker URLs
- **XSS Prevention**: Uses `textContent` instead of `innerHTML`
- **Link Security**: All links use `noopener noreferrer`
- **URL Sanitization**: Validates and cleans issue tracker URLs

### **Performance Optimizations**
- **Debounced Mutations**: Prevents excessive processing during rapid DOM changes
- **RequestIdleCallback**: Uses browser idle time for non-critical work
- **Text Node Caching**: Avoids reprocessing unchanged content
- **Batch Processing**: Handles large numbers of text nodes efficiently

## UI Components

### **Popup Interface**
- **Header**: Extension enable/disable toggle with reload confirmation
- **Repository Info**: Shows current GitHub repository
- **Detected Keys**: Sorted list of found issue keys with direct links
- **Action Buttons**: Quick access to settings and page reload

### **Settings Page**
- **Repository Mappings**: CRUD interface for repository configurations with GitBranch icon
- **Language Selection**: Radio group for English/Japanese with Globe icon  
- **Theme Selection**: Radio group for Light/Dark/System with Palette icon
- **Import/Export**: Settings backup and restore with Download/Upload icons
- **Validation**: Real-time form validation with error messages
- **Card Layout**: Organized in logical sections with appropriate icons

## Extension Lifecycle

### **Installation Flow**
1. Service worker initializes
2. Default preferences are set
3. Welcome notification (optional)
4. Ready for configuration

### **Page Processing Flow**
1. Content script injects on GitHub pages
2. Repository detection from URL
3. Load relevant mappings from storage
4. Process page content for issue keys
5. Update badge with detected count
6. Set up observers for dynamic content

### **Toggle Behavior**
- **Enable**: Shows confirmation dialog, requires page reload to detect keys
- **Disable**: Immediate toggle, clears badge and detected keys, no reload needed

## Recent Changes & Evolution

### **Generalization from Backlog-specific**
- Removed all Backlog-specific references and branding
- Changed `backlogUrl` to `trackerUrl` in data structures
- Updated UI text to be platform-agnostic
- Made issue tracker patterns configurable

### **Enhanced Features**
- **Case-insensitive Key Prefixes**: Support for both `api-123` and `API-123`
- **Sorted Key Display**: Keys displayed in ascending order (prefix first, then number)
- **Improved Toggle UX**: Smart reload behavior based on enable/disable action
- **Better Error Handling**: Graceful degradation when tracker URLs are invalid
- **Full Internationalization**: Complete English and Japanese localization with auto-detection
- **Theme System**: Light, dark, and system theme modes with real-time switching
- **Enhanced UI**: Modern card-based settings layout with contextual icons

## Debugging & Troubleshooting

### **Common Issues**
1. **Content Script Not Loading**: Check manifest.json file references match build output
2. **Keys Not Detected**: Verify repository mapping and key prefix configuration
3. **Performance Issues**: Check browser console for processing time logs
4. **Storage Issues**: Use Chrome DevTools > Application > Storage to inspect data

### **Debug Information**
- Content script logs processing times and detected keys
- Background script logs badge updates and message handling
- Storage operations are logged with success/failure status
- Performance metrics are collected and stored locally

## Testing Strategy

### **Manual Testing Checklist**
- [ ] Extension loads without errors
- [ ] Popup shows current repository correctly
- [ ] Settings page allows CRUD operations on mappings
- [ ] Issue keys are detected and linked correctly
- [ ] Badge shows accurate count
- [ ] Enable/disable toggle works with appropriate reload behavior
- [ ] Import/export functionality works
- [ ] Performance is acceptable on large GitHub pages

### **Browser Compatibility**
- Primary: Chrome 88+ (Manifest V3 support)
- Edge 88+ should work (Chromium-based)
- Firefox: Not compatible (different extension API)

## Future Enhancements

### **Potential Features**
- [ ] Keyboard shortcuts for quick access
- [ ] Context menu integration
- [ ] Support for additional issue tracker URL patterns
- [ ] Performance metrics dashboard
- [ ] Error log viewer in settings
- [ ] Automated testing framework
- [ ] Firefox port with WebExtensions API

### **Architecture Improvements**
- [ ] Service worker optimization for better battery life
- [ ] Memory usage optimization for large pages
- [ ] Improved caching strategies
- [ ] Background processing for better performance

---

## Important Notes for Development

1. **Build System**: Always run `npm run build` after changes before testing
2. **File Naming**: Vite generates hashed filenames - the manifest.json is automatically updated
3. **Storage Migration**: Be careful when changing data structures - implement migration if needed
4. **Performance**: Test on large GitHub pages (1000+ lines) to ensure good performance
5. **Security**: Never use `innerHTML` or similar - always use safe DOM methods
6. **i18n Development**: Use `t()` function for all user-facing strings, organize by namespace
7. **Theme Development**: Use CSS variables and Tailwind classes, test in all theme modes
8. **Context Dependencies**: Ensure ThemeProvider wraps all React components in entry points
9. **Storage Sync**: Test theme and language changes sync correctly between popup and settings
10. **Translation Keys**: Follow hierarchical structure (e.g., `options.theme.title`) for maintainability

## Build Commands & Extensions
```bash
# Install dependencies (includes new i18n packages)
npm install

# Development with hot reload (includes theme/i18n)
npm run dev

# Production build (generates localized and themed assets)
npm run build

# Type checking (includes new context types)
npm run typecheck

# Linting (covers new components and contexts)
npm run lint
```

This extension is production-ready and provides a comprehensive, internationalized, and themeable foundation for generic issue tracker integration with GitHub.