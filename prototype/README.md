# Page to Markdown UI prototype

This is a standalone, static interaction prototype. It does not use the extension
manifest, runtime code, or build output.

## Run locally

From the repository root, run:

```sh
npx --yes vite prototype --host 127.0.0.1 --port 4173
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). Vite provides hot reload for
changes to `index.html`, `styles.css`, and `app.js` without adding a project dependency.

## Prototype interactions

- Enter a CSS selector and apply it, or start the mocked visual picker.
- Switch between editable Markdown and locally rendered preview tabs.
- Use the expand icon to open the large editor dialog, including its own tabs.
- Start a `.md` download. The prototype downloads the file and then replaces the
  popup with the state that represents an extension popup closing immediately.
