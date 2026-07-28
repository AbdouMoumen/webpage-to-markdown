# Page to Markdown UI prototype

This is a standalone, static interaction prototype. It does not use the extension
manifest, runtime code, or build output.

## Run locally

From the repository root, run:

```sh
npx --yes serve prototype --listen 4173
```

Open [http://localhost:4173](http://localhost:4173). The server watches the static
files, so refresh the page after editing `index.html`, `styles.css`, or `app.js`.

## Prototype interactions

- Enter a CSS selector and apply it, or start the mocked visual picker.
- Switch between editable Markdown and locally rendered preview tabs.
- Use the expand icon to open the large editor dialog, including its own tabs.
- Start a `.md` download. The prototype downloads the file and then replaces the
  popup with the state that represents an extension popup closing immediately.
