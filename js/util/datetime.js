import _, * as i18n from '../i18n.js';

export const formatDate = new Intl.DateTimeFormat(i18n.lang, {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric' }).format;

export const formatTime = new Intl.DateTimeFormat(i18n.lang, {
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
  return `+${days}${_('day single letter')} ${hrs}:${min02}:${sec02}`;
}
