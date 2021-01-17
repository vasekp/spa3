const data = {};
const loaded = new Set();

export async function loadTrans(url) {
  if(loaded.has(url))
    return;
  const json = await (await fetch(url)).json();
  loaded.add(url);
  for(const key in json) {
    if(data.hasOwnProperty(key))
      console.error(`In loading ${url}: key ${key} already defined.`);
    else
      data[key] = json[key];
  }
}

export async function loadTemplate(url) {
  const text = await(await fetch(url)).text();
  return text.replace(/_\(([^)]*)\)/g, (m, p) => _(p));
}

export default function _(key) {
  return data[key] || key;
}
