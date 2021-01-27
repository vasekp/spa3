import './components/spa-scroll.js';
import './components/spa-dropdown.js';
import './components/spa-number-picker.js';
import normalize from './util/text.js';
import debounce from './util/debounce.js';
import Enum from './util/enum.js';
import _, * as i18n from './i18n.js';

const BASE = 200, MORE = 100;

const filterBits = Enum.fromObj({
  neg: 1,
  start: 2,
  end: 4,
});

const filterLabels = 'Obsahuje|Neobsahuje|Začíná|Nezačíná|Končí|Nekončí|Odpovídá|Neodpovídá'.split('|');

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
  root.getElementById('lcase').addEventListener('input', e => {
    root.getElementById('lcase-indicator').hidden = !e.currentTarget.checked;
  });
  root.getElementById('lcount-variant').addEventListener('input', e => {
    const variant = e.currentTarget.querySelector(':checked').value;
    root.getElementById('lcount-variants').dataset.sel = variant;
  });
  root.getElementById('add-filter').addEventListener('click', () => addFilter());
  addFilter();
  const dbu = debounce(update, 300);
  root.getElementById('filters').addEventListener('change', dbu);
  root.getElementById('filters').addEventListener('input', dbu);
  root.getElementById('filters').addEventListener('filter-removed', dbu);
  root.getElementById('wordlist').addEventListener('input', dbu);
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
    if(list.children.length == BASE)
      io.observe(list.children[BASE - MORE]);
    console.timeEnd('filter');
  }

  function clearFrom(ix) {
    const rng = document.createRange();
    rng.setStart(list, ix);
    rng.setEnd(list, list.childNodes.length);
    rng.deleteContents();
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
  }

  function append(f, test) {
    return text => f(text) && test(text);
  }

  function update() {
    let f;
    switch(root.getElementById('lcount-variants').dataset.sel) {
      case 'any':
        f = () => true;
        break;
      case 'exact':
        {
          const len = root.getElementById('lcount-exact').value;
          f = text => text.length == len;
          break;
        }
      case 'range':
        {
          const min = root.getElementById('lcount-from').value;
          const max = root.getElementById('lcount-to').value;
          f = text => text.length >= min && text.length <= max;
          break;
        }
    }
    if(root.getElementById('lcase').checked)
      f = append(f, text => reLowerCase.test(text));
    for(const filterDiv of root.querySelectorAll('.re-filter')) {
      const type = filterDiv.dataset.type;
      const value = filterDiv.querySelector('[data-id="value"]').value;
      const re = new RegExp(`${type & filterBits.start ? '^' : ''}${value}${type & filterBits.end ? '$' : ''}`);
      if(re) {
        if(type & filterBits.neg)
          f = append(f, text => !re.test(text));
        else
          f = append(f, text => re.test(text));
      }
    }
    filter(f);
  }

  function addFilter() {
    const div = root.getElementById('filter-template').content.firstElementChild.cloneNode(true);
    root.getElementById('filters').appendChild(div);
    div.addEventListener('input', e => {
      const id = e.target.dataset.id;
      let type = e.currentTarget.dataset.type;
      switch(id) {
        case 'fix-start':
          type = e.target.checked ? type | filterBits.start : type & ~filterBits.start;
          break;
        case 'fix-end':
          type = e.target.checked ? type | filterBits.end : type & ~filterBits.end;
          break;
        case 'neg':
          type = e.target.checked ? type | filterBits.neg : type & ~filterBits.neg;
          break;
      }
      if(type != e.currentTarget.dataset.type) {
        e.currentTarget.dataset.type = type;
        e.currentTarget.querySelector('[data-id="header"]').textContent = filterLabels[type];
      }
    });
    div.addEventListener('click', e => {
      const id = e.target.dataset.id;
      switch(id) {
        case 'delete':
          e.currentTarget.dispatchEvent(new CustomEvent('filter-removed', { bubbles: true }));
          e.currentTarget.remove();
          break;
      }
    });
  }

  return {};
}
