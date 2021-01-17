import './components/spa-scroll.js';
import normalize from './util/text.js';
import debounce from './util/debounce.js';
import _, * as i18n from './i18n.js';

export default function(root) {
  const table = root.getElementById('list');

  async function loadFile(file) {
    console.time('load');
    const reader = (await fetch(file)).body.getReader();
    const decoder = new TextDecoder('utf-8');
    const opts = { stream: true };
    let textChunk = '';
    const chunkIterator = {
      [Symbol.asyncIterator]: () => ({
        next: async () => reader.read()
      })
    }
    const text = await (async() => {
      let text = '';
      for await(const chunk of chunkIterator)
        text += decoder.decode(chunk, opts);
      return text;
    })();
    const lineIterator = {
      [Symbol.iterator]: function*() {
        let lastIndex = 0;
        let index;
        while((index = text.indexOf('\n', lastIndex)) >= 0) {
          yield text.substring(lastIndex, index);
          lastIndex = index + 1;
        }
      }
    }
    const lines = [...lineIterator];
    console.timeEnd('load');
    return lines;
  }

  const linesP = loadFile('assets/any/wordlists/cs-subst.txt');

  async function filter(f) {
    const lines = await linesP;
    console.time('filter');
    let c = 0;
    for(const line of lines) {
      if(f(line)) {
        if(++c < 100)
          console.log(line)
      }
    }
    console.log(c);
    console.timeEnd('filter');
  }

  const re = /^\p{Lu}/u;
  root.getElementById('run').addEventListener('click', () =>
    filter(word => re.test(word) && word.includes('ř')));

  return {};
}
