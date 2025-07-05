# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension project for automatically linking Backlog issue keys (e.g., `WMS-111`, `TMS-222`) on GitHub pages. The extension creates clickable links that navigate to the corresponding Backlog issue pages.

## Key Architecture

- **Chrome Extension**: Built for Manifest V3 with Service Worker architecture
- **Multi-repository Support**: Handles multiple Backlog instances and key prefixes per repository
- **Configuration Structure**: Repository ↔ Backlog URL ↔ Key Prefix mapping
- **UI Framework**: shadcn/ui for responsive design with dark/light mode support
- **Performance Strategy**: Staged processing with Intersection Observer for large PRs
- **Security Focus**: XSS protection, CSP compliance, secure link generation

## Development Setup

Since this is a new project with only design documentation, the codebase structure is not yet established. The following setup is recommended based on the requirements:

- Use `@crxjs/vite-plugin` for Chrome extension development
- TypeScript for type safety
- ESLint + Prettier for code quality
- Vitest for unit testing (80% coverage target)
- Playwright for E2E testing
- shadcn/ui for UI components

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
npm run test:e2e

# Lint and format
npm run lint
npm run format

# Type checking
npm run typecheck
```

## Core Features to Implement

1. **Auto-linking**: Detect and link Backlog issue keys in GitHub DOM
2. **Dynamic Content**: Use MutationObserver for SPA/Ajax content
3. **Configuration UI**: DataTable for repository/URL/key prefix management
4. **Repository Detection**: Extract `<org>/<repo>` from GitHub URLs
5. **Toggle Control**: Enable/disable per page or domain

## Performance Requirements

- **Staged Processing**: Small PRs (<100 lines) 100ms, Medium PRs (100-1000 lines) 500ms, Large PRs (>1000 lines) use Intersection Observer
- Use `requestIdleCallback` for performance optimization
- Implement debouncing for MutationObserver callbacks
- **Storage Optimization**: 
  - chrome.storage.sync: User preferences (10 items)
  - chrome.storage.local: Repository mappings (1000 items)
  - chrome.storage.session: Temporary cache

## Security Constraints

- Manifest V3 compliance with Service Worker architecture
- Minimal permissions: `"activeTab"`, `"storage"` only
- **XSS Protection**: Use `textContent` instead of `innerHTML`
- **Secure Link Generation**: Apply `noopener noreferrer` attributes
- **CSP Compliance**: Content script approach for GitHub's CSP
- DOM safety: Exclude input fields and existing links
- Initial scope: `https://github.com/*` with dynamic Enterprise support

## Testing Requirements

- Unit tests with Vitest (80% coverage minimum)
- E2E tests with Playwright for GitHub integration
- Performance testing with Performance API
- Test on both GitHub.com and GitHub Enterprise
- Verify proxy environment compatibility
- Security testing for XSS protection

## Implementation Patterns

### Efficient DOM Manipulation

```typescript
// Use debounced MutationObserver
const observer = new MutationObserver(debounce((mutations) => {
  const relevantMutations = mutations.filter(
    mutation => mutation.type === 'childList' && 
    mutation.addedNodes.length > 0
  );
  processNewNodes(relevantMutations);
}, 100));
```

### Secure Link Generation

```typescript
function createSecureLink(issueKey: string, backlogUrl: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.textContent = issueKey; // Avoid innerHTML
  link.href = `${sanitizeUrl(backlogUrl)}/view/${encodeURIComponent(issueKey)}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}
```

### Error Handling Strategy

```typescript
class LinkProcessor {
  async processWithFallback(element: Element): Promise<void> {
    try {
      await this.processElement(element);
      this.recordSuccess();
    } catch (error) {
      this.recordError(error);
      this.showUserFeedback('リンク化処理中にエラーが発生しました');
    }
  }
}
```

## GitHub SPA Considerations

- GitHub uses SPA architecture with History API navigation
- Content is dynamically loaded without full page refreshes
- Use efficient MutationObserver with minimal scope
- Implement viewport detection for large PRs
- Content scripts bypass GitHub's CSP restrictions

## Architecture Extensibility

- Plugin architecture for future issue trackers (Jira, Linear)
- Standardized issue tracker interface
- Team settings sharing via JSON schema
- Metrics collection for success rates and performance