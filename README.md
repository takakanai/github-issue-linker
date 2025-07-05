# GitHub Issue Linker

Chrome拡張機能：GitHub上のBacklog課題キーを自動的にリンク化します。

## 機能

- GitHub上の課題キー（例：`WMS-111`, `TMS-222`）を自動検出
- クリック可能なリンクに変換、Backlog課題ページへ直接アクセス
- リポジトリごとの複数Backlogインスタンス対応
- セキュアなリンク生成（XSS保護、`noopener noreferrer`）
- パフォーマンス最適化（段階的処理、debounce）

## インストール方法

1. **ビルド**
   ```bash
   npm install
   npm run build
   ```

2. **Chrome拡張機能として読み込み**
   - Chrome → 拡張機能 → 開発者モード ON
   - 「パッケージ化されていない拡張機能を読み込む」
   - `dist` フォルダを選択

## 設定方法

1. **拡張機能アイコンをクリック** → 設定
2. **リポジトリマッピングを追加**：
   - リポジトリ名: `owner/repo`
   - Backlog URL: `https://your-project.backlog.com`
   - キー接頭辞: `WMS`

## 開発

```bash
# 開発サーバー
npm run dev

# ビルド
npm run build

# コード品質チェック
npm run lint
npm run typecheck
```

## アーキテクチャ

- **Manifest V3**: Service Worker対応
- **TypeScript + React**: 型安全な開発
- **Vite + @crxjs/vite-plugin**: 高速ビルド
- **shadcn/ui**: モダンなUI コンポーネント
- **階層化ストレージ**: sync/local/session の適切な使い分け

## セキュリティ

- 最小権限の原則（`activeTab`, `storage`のみ）
- XSS保護（`textContent`使用、サニタイゼーション）
- セキュアリンク生成（`noopener noreferrer`）
- CSP準拠

## パフォーマンス

- 段階的処理（ページサイズに応じた最適化）
- 効率的MutationObserver（debounce処理）
- Intersection Observer（大きなページ用）
- requestIdleCallback活用