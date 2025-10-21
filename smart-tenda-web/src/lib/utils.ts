export function sanitizeFilename(input: string) {
  return input.replace(/[^a-zA-Z0-9-_\.]/g, '_')
}
