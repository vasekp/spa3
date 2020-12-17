export const dateFormat = new Intl.DateTimeFormat('cs', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric' }).format;

export const timeFormat = new Intl.DateTimeFormat('cs', {
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
}).format;
