export const timeAgo = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate
    ? timestamp.toDate()
    : timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
  const diff = Date.now() - date.getTime();
  if (diff < 0) return 'ahora';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};
