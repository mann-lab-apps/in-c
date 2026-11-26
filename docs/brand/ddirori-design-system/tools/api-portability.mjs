// TypeScript may qualify React types with a checkout-specific absolute path.
export function portableApiText(text, root) {
  return text
    .replace(/import\("[^"\n]*\/node_modules\/@types\/react\/index"\)/g, 'import("react")')
    .replaceAll(root, '<repo>/');
}

export function portableApiJson(snapshot, root) {
  return JSON.stringify(snapshot, (_key, value) =>
    typeof value === 'string' ? portableApiText(value, root) : value, 2) + '\n';
}
