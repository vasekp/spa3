export const formatDate = new Intl.DateTimeFormat('cs', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric' }).format;

export const formatTime = new Intl.DateTimeFormat('cs', {
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
}).format;

export function formatTimeDiff(diff) {
  diff = Math.floor(diff / 1000);
  const sec = diff % 60;
  const sec02 = sec.toString().padStart(2, '0');
  diff = Math.floor(diff / 60);
  const min = diff % 60;
  if(diff < 60)
    return `+${min}:${sec02}`;
  const min02 = min.toString().padStart(2, '0');
  diff = Math.floor(diff / 60);
  const hrs = diff % 24;
  if(diff < 24)
    return `+${hrs}:${min02}:${sec02}`;
  const days = Math.floor(diff / 24);
  return `+${days}d ${hrs}:${min02}:${sec02}`;
}
