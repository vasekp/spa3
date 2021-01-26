import './components/spa-scroll.js';
import './components/spa-dropdown.js';
import './components/spa-number-picker.js';
import normalize from './util/text.js';
import debounce from './util/debounce.js';
import _, * as i18n from './i18n.js';

const BASE = 200, MORE = 100;

export default function(root) {
  const list = root.getElementById('list');
  const linesP = loadFile('assets/any/wordlists/cs-subst.txt');
  const reLowerCase = /^\p{Ll}/u;
  const io = new IntersectionObserver(entries => {
    if(entries.some(e => e.intersectionRatio > 0))
      loadMore();
  });
  let flines = null;

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
    const lines = await linesP;
    console.time('filter');
    let c = 0;
    flines = (function*() {
      for(const line of lines)
        if(f(line))
          yield line;
    })();
    io.disconnect();
    list.scrollIntoView();
    if(list.children.length > BASE)
      clearFrom(BASE);
    let cnt = 0;
    for(const li of list.children) {
      const {value, done} = flines.next();
      if(done) {
        clearFrom(cnt);
        flines = null;
        break;
      } else {
        li.textContent = value;
        ++cnt;
      }
    }
    loadMore(BASE - list.children.length, false);
    console.timeEnd('filter');
  }

  function clearFrom(ix) {
    const rng = document.createRange();
    rng.setStart(list, ix);
    rng.setEnd(list, list.childNodes.length);
    rng.deleteContents();
    console.log(list.children.length);
  }

  function loadMore(upTo = MORE, scrolling = true) {
    if(!flines)
      return;
    io.disconnect();
    if(scrolling && list.lastChild)
      io.observe(list.lastChild);
    for(let i = 0; i < upTo; i++) {
      const {value, done} = flines.next();
      if(done) {
        io.disconnect();
        flines = null;
        break;
      } else {
        const li = document.createElement('li');
        li.textContent = value;
        list.appendChild(li);
      }
    }
    if(list.lastChild)
      io.observe(list.lastChild);
    console.log(list.children.length);
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
