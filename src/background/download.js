export function markdownFilename(markdown) {
  const title = markdown.match(/^#\s+(.+)$/m)?.[1] ?? "page";
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

  return `${safeTitle || "page"}.md`;
}

export function markdownDownloadUrl(markdown) {
  return `data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`;
}
