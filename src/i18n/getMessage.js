/**
 * Resolve a nested key like "header.searchPlaceholder" from a dictionary object.
 * Optional {{var}} replacement in strings.
 */
export function getMessage(dict, path, vars) {
  if (!dict || !path) return path;
  const keys = path.split('.');
  let cur = dict;
  for (const k of keys) {
    if (cur && typeof cur === 'object' && Object.prototype.hasOwnProperty.call(cur, k)) {
      cur = cur[k];
    } else {
      return path;
    }
  }
  if (typeof cur !== 'string') return path;
  if (!vars) return cur;
  return cur.replace(/\{\{(\w+)\}\}/g, (_, name) => (vars[name] !== undefined && vars[name] !== null ? String(vars[name]) : ''));
}
