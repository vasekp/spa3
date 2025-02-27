import _ from '../i18n.js';

const map = {};

{
  const patt = _('normalize pattern');
  const repl = _('normalize repl');

  for(let i = 0; i < patt.length; i++)
    map[patt[i]] = repl[i];
}

export default function normalize(str, keepCase) {
  return (keepCase ? str : str.toLowerCase())
    .trim()
    .normalize()
    .replace(/[^ -~]/g, c => map[c] || c);
}
