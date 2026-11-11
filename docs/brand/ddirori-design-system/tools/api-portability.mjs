// TypeScript may qualify React types with a checkout-specific absolute path.
export function portableApiText(text, root) {
  return text
    .replace(/import\((\\?")([^"\n]*?)\1\)/g, (original, quote, location) =>
      /\/node_modules\/@types\/react\/index$/.test(location.replaceAll('\\\\', '/'))
        ? `import(${quote}react${quote})` : original)
    .replaceAll(root, '<repo>/');
}
