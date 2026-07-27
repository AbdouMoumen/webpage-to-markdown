import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { createPageMarkdown } from "../src/converter/markdown.js";

test("converts readable content while removing page chrome", () => {
  const document = new JSDOM(
    `<!doctype html>
      <html>
        <head><title>Example article</title><script>throw new Error("ignored")</script></head>
        <body>
          <nav>Site navigation</nav>
          <article>
            <h1>Useful article</h1>
            <p>Read <strong>this important</strong> paragraph and <a href="https://example.com/link">a link</a>.</p>
            <ul><li>First point</li><li>Second point</li></ul>
            <img src="https://example.com/image.png" alt="Article image">
          </article>
          <footer>Copyright</footer>
        </body>
      </html>`,
    { url: "https://example.com/articles/hello" }
  ).window.document;

  const markdown = createPageMarkdown(document);

  assert.match(markdown, /^# Example article/m);
  assert.match(markdown, /Source: \[https:\/\/example\.com\/articles\/hello\]/);
  assert.match(markdown, /Useful article/);
  assert.match(markdown, /\*\*this important\*\*/);
  assert.match(markdown, /\[a link\]\(https:\/\/example\.com\/link\)/);
  assert.match(markdown, /-\s+First point/);
  assert.match(markdown, /!\[Article image\]\(https:\/\/example\.com\/image\.png\)/);
  assert.doesNotMatch(markdown, /Site navigation|Copyright|ignored/);
});

test("returns useful Markdown when Readability cannot identify an article", () => {
  const document = new JSDOM(
    "<!doctype html><title>Small page</title><main><p>Short but useful content.</p></main>",
    { url: "https://example.com/small" }
  ).window.document;

  const markdown = createPageMarkdown(document);

  assert.match(markdown, /^# Small page/m);
  assert.match(markdown, /Short but useful content\./);
});
