import './components/spa-scroll.js';
import './components/spa-dropdown.js';
import './components/spa-number-picker.js';
import normalize from './util/text.js';
import debounce from './util/debounce.js';
import _, * as i18n from './i18n.js';

export default function(root) {
  const list = root.getElementById('list');
  const linesP = loadFile('assets/any/wordlists/cs-subst.txt');
  const reLowerCase = /^\p{Ll}/u;

  {
    const from = root.getElementById('lcount-from');
    const to = root.getElementById('lcount-to');
    from.addEventListener('change', () => { if(to.value < from.value) to.value = from.value; });
    to.addEventListener('change', () => { if(from.value > to.value) from.value = to.value; });
  }
  const dbu = debounce(update, 300);
  root.getElementById('filters').addEventListener('change', dbu);
  root.getElementById('filters').addEventListener('input', dbu);
  update();

  async function loadFile(file) {
    console.time('load');
    const text = await (await fetch(file)).text();
    const lineIterator = {
      [Symbol.iterator]: function*() {
        let lastIndex = 0;
        let index;
        while((index = text.indexOf('\n', lastIndex)) >= 0) {
          yield text.substring(lastIndex, index);
          lastIndex = index + 1;
        }
      }
    };
    const lines = [...lineIterator];
    console.timeEnd('load');
    return lines;
  }

  async function filter(f) {
    console.log(f);
    const lines = await linesP;
    console.time('filter');
    let c = 0;
    const flines = (function*() {
      for(const line of lines)
        if(f(line))
          yield line;
    })();
    for(const li of list.children) {
      const {value, done} = flines.next();
      if(done)
        li.textContent = '';
      else
        li.textContent = value;
    }
    console.timeEnd('filter');
  }

  function append(f, test) {
    return text => f(text) && test(text);
  }

  function update() {
    const min = root.getElementById('lcount-from').value;
    const max = root.getElementById('lcount-to').value;
    let f = text => text.length >= min && text.length <= max && reLowerCase.test(text);
    const re = new RegExp(root.getElementById('test-re').value);
    if(re)
      f = append(f, text => re.test(text));
    filter(f);
  }

  return {};
}
