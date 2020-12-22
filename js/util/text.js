const map = {};

{
  const patt = 'áàäâãčćçďéěëęíîĺľłňńóöőôřšśťúůüűýžź‚‘’ʻ„“”';
  const repl = 'aaaaacccdeeeeiilllnnoooorsstuuuuyzz\'\'\'\'"""';

  for(let i = 0; i < patt.length; i++)
    map[patt[i]] = repl[i];
}

export function normalize(str) {
  return str
    .trim()
    .toLowerCase()
    .normalize()
    .replace(/[^ -~]/g, c => map[c] || c);
}
