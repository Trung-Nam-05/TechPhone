export function getOwnMessageStatus(message, messages, viewerRole) {
  if (!message || message.senderRole !== viewerRole) return null;

  const ownMessages = messages.filter((item) => item.senderRole === viewerRole);
  const confirmedOwn = ownMessages.filter((item) => !String(item._id || '').startsWith('temp-'));
  const lastOwn = confirmedOwn[confirmedOwn.length - 1];
  const lastOverall = ownMessages[ownMessages.length - 1];

  const isLastOwn = lastOwn && String(lastOwn._id) === String(message._id);
  const isPendingLast =
    message.pending &&
    lastOverall &&
    String(lastOverall._id) === String(message._id);

  if (!isLastOwn && !isPendingLast) return null;

  if (message.pending) return 'Đang gửi';
  if (message.readAt) return 'Đã xem';
  if (message.delivered) return 'Đã nhận';
  return 'Đã gửi';
}
