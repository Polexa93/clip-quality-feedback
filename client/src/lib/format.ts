/** Capitalizes the first letter of a string, e.g. "tutorial" -> "Tutorial". */
export function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}
