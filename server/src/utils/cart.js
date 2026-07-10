export function getSessionId(req) {
  const headerSession = req.header('x-session-id');
  if (!headerSession || !headerSession.trim()) {
    return null;
  }
  return headerSession.trim();
}
