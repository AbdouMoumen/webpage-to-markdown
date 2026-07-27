# Page to Markdown

A Manifest V3 Chrome/Chromium extension that converts the active page into clean, editable Markdown. It extracts the primary article with Mozilla Readability, converts it locally with Turndown (including GitHub-flavored Markdown tables and task lists), and never sends page contents to a server.

## Install locally

1. Install dependencies and create the unpacked extension:

   ```sh
   npm install
   npm run build
   ```

2. Open `chrome://extensions` (or the equivalent Chromium extensions page).
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the generated `dist` directory.
5. Open a web page and select the **Page to Markdown** toolbar icon.

The popup converts the current tab immediately. Review or edit the Markdown in the text area, then use **Copy Markdown** or **Download .md**.

## Development

```sh
npm test
npm run build
```

Reload the extension on the browser extensions page after rebuilding. The extension uses only `activeTab` and `scripting`, so it can access a page only after you open its popup. Browser-internal pages (such as `chrome://` pages) cannot be converted by Chrome.
