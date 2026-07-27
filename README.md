# Page to Markdown

A Manifest V3 Chrome/Chromium extension that converts the active page into clean, editable Markdown. It extracts the primary article with Mozilla Readability, converts it locally with Turndown (including GitHub-flavored Markdown tables and task lists), and never sends page contents to a server.

## Build and package

Install dependencies, build the unpacked extension, and create a store-ready ZIP:

```sh
npm install
npm run package
```

`npm run package` runs the build first and writes a versioned archive to
`artifacts/release/page-to-markdown-<version>.zip`. The ZIP contains the extension
files at its root, as required by browser stores.

## Load locally

1. Build the unpacked extension:

   ```sh
   npm run build
   ```

2. Open `chrome://extensions` (or the equivalent Chromium extensions page).
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the generated `dist` directory.
5. Open a web page and select the **Page to Markdown** toolbar icon.

The popup converts the current tab immediately. Review or edit the Markdown in the text area, then use **Copy Markdown** or **Download .md**.

For Microsoft Edge, use `edge://extensions`, enable **Developer mode**, select
**Load unpacked**, and choose `dist`.

## Submit to Microsoft Edge Add-ons

1. Run `npm run package`.
2. Sign in to the [Microsoft Edge Add-ons Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview).
3. Create a new extension submission and upload the generated ZIP from
   `artifacts/release`.
4. Complete the store listing, privacy details, and certification questions, then submit it for review.

The archive is suitable for Chrome Web Store submission as well. Upload the same
versioned ZIP from the Chrome Developer Dashboard.

## GitHub releases

The CI workflow runs checks, builds the ZIP, and uploads it as a workflow artifact
for pushes to `main` and pull requests. Pushing a version tag matching the package
version (for example, `v1.0.0`) runs the release workflow, which creates or updates
the matching GitHub Release and attaches the store-ready ZIP.

```sh
git tag v1.0.0
git push origin v1.0.0
```

## Development

```sh
npm test
npm run build
```

Reload the extension on the browser extensions page after rebuilding. The extension uses only `activeTab` and `scripting`, so it can access a page only after you open its popup. Browser-internal pages (such as `chrome://` pages) cannot be converted by Chrome.
