import './components/spa-scroll.js';
import normalize from './util/text.js';
import debounce from './util/debounce.js';
import _, * as i18n from './i18n.js';

export default function(root) {
  const table = root.getElementById('list');

  async function filter(f) {
    const decoder = new TextDecoder('utf-8');
    const opts = { stream: true };
    const r = (await fetch('assets/any/wordlists/cs-subst.txt')).body.getReader();
    let textChunk = '';
    const chunkIterator = {
      [Symbol.asyncIterator]: () => ({
        next: async () => r.read()
      })
    }
    const textIterator = {
      [Symbol.asyncIterator]: async function*() {
        for await(const chunk of chunkIterator)
          yield decoder.decode(chunk, opts);
      }
    }
    const lineIterator = {
      [Symbol.asyncIterator]: async function*() {
        let remText = '';
        for await(let text of textIterator) {
          text = remText + text;
          let lastIndex = 0;
          let index;
          while((index = text.indexOf('\n', lastIndex)) >= 0) {
            yield text.substring(lastIndex, index);
            lastIndex = index + 1;
          }
          remText = text.substring(lastIndex);
        }
      }
    }
    console.time('filter');
    let c = 0;
    for await(const line of lineIterator) {
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
