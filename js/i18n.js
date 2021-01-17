const data = {};
const loaded = new Set();

export async function loadTrans(url) {
  if(loaded.has(url))
    return;
  try {
    const response = await fetch(url);
    if(!response.ok)
      throw `Error loading ${url}`;
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
  } catch(e) {
    console.error(e);
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
