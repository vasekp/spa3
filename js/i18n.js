import Enum from './util/enum.js';

const data = {};
const loaded = new Set();

const lsKeys = Enum.fromObj({
  lang: 'spa-lang',
});

export const lang = localStorage[lsKeys.lang]
  || (navigator.language.substr(0,2) === 'cs' ? 'cs' : 'en');

export function resetLangReload(lang) {
  localStorage[lsKeys.lang] = lang;
  location.reload();
}

export async function loadTrans(url) {
  if(loaded.has(url))
    return;
  const json = await (await fetch(url)).json();
  loaded.add(url);
  const prefix = json['_prefix'] ? json['_prefix'] + ':' : '';
  for(const key in json) {
    if(key === '_prefix')
      continue;
    const pKey = prefix + key;
    if(data.hasOwnProperty(pKey))
      console.error(`In loading ${url}: key ${pKey} already defined.`);
    else
      data[pKey] = json[key];
  }
}

export async function loadTemplate(url) {
  const text = await(await fetch(url)).text();
  return useTemplate(text);
}

export function useTemplate(text) {
  return text.replace(/_\(([^)]*)\)/g, (m, p) => _(p));
}

export default function _(key) {
  return data[key] || key;
}

export const compare = new Intl.Collator(lang).compare;
