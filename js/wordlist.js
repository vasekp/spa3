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
  labelMask: 7,
  norm: 8,
});

const filterLabels = _('rgx:filter types').split('|');

const lsKeys = Enum.fromObj({
  wordlist: 'rgx-wordlist',
  lcase: 'rgx-lcase',
  lcount: 'rgx-lcount',
  filters: 'rgx-filters',
});

export default function(root) {
  const list = root.getElementById('list');
  let linesP = loadFile(localStorage[lsKeys.wordlist]);
  const reLowerCase = /^\p{Ll}/u;
  const io = new IntersectionObserver(entries => {
    if(entries.some(e => e.intersectionRatio > 0))
      loadMore();
  });
  let flines = null;

  {
    const min = root.getElementById('lcount-min');
    const max = root.getElementById('lcount-max');
    min.addEventListener('input', () => { if(max.value < min.value) max.value = min.value; });
    max.addEventListener('input', () => { if(min.value > max.value) min.value = max.value; });
  }
  root.getElementById('lcase').addEventListener('input', e => {
    root.getElementById('lcase-indicator').hidden = !e.currentTarget.checked;
  });
  root.getElementById('lcount-variant').addEventListener('input', e => {
    const variant = e.currentTarget.querySelector(':checked').value;
    root.getElementById('lcount-variants').dataset.sel = variant;
  });
  root.getElementById('add-filter').addEventListener('click', () => addFilter());
  root.getElementById('wordlists').addEventListener('click', e => {
    linesP = loadFile(e.target.dataset.filename);
    update();
  });
  loadSettings();

  const dbu = debounce(update, 300);
  root.getElementById('filters').addEventListener('input', dbu);
  root.getElementById('filters').addEventListener('filter-removed', dbu);
  root.getElementById('wordlist').addEventListener('input', dbu);
  update();

  async function loadFile(filename) {
    const lists = await (await fetch(`trans/${i18n.lang}/wordlists.json`)).json();
    const found = lists.find(entry => entry.filename === filename);
    const item = found || lists[0];
    localStorage[lsKeys.wordlist] = item.filename;

    root.getElementById('title').textContent = item.title;
    root.getElementById('lcase').hidden = !item.showLCase;
    root.getElementById('lcase-indicator').hidden = !item.showLCase || !root.getElementById('lcase').checked;
    const list = root.getElementById('wordlists');
    if(!list.children.length) {
      for(const info of lists) {
        const elm = document.createElement('input');
        elm.type = 'radio';
        elm.name = 'wordlist';
        elm.classList.add('patch');
        elm.classList.add('show-state');
        elm.dataset.label = info.title;
        elm.dataset.filename = info.filename;
        list.appendChild(elm);
      }
    }
    list.querySelector(`[data-filename="${item.filename}"]`).checked = true;

    console.time('load');
    const text = await (await fetch(`assets/any/wordlists/${item.filename}`)).text();
    console.timeLog('load');
    const lineIterator = function*(text) {
      let lastIndex = 0;
      let index;
      while((index = text.indexOf('\n', lastIndex)) >= 0) {
        yield text.substring(lastIndex, index);
        lastIndex = index + 1;
      }
    };
    const i1 = lineIterator(text);
    const i2 = lineIterator(normalize(text));
    const lines = [];
    for(const line of i1) {
      const {value: lineN} = i2.next();
      lines.push([line, lineN]);
    }
    console.timeEnd('load');
    return lines;
  }

  async function filter(f) {
    const lines = await linesP;
    console.time('filter');
    let c = 0;
    flines = (function*() {
      for(const line of lines)
        if(f.apply(null, line))
          yield line[0];
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

  function addFilter(type, value) {
    const div = root.getElementById('filter-template').content.firstElementChild.cloneNode(true);
    root.getElementById('filters').appendChild(div);
    div.addEventListener('input', e => {
      const id = e.target.dataset.id;
      let type = +div.dataset.type;
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
        case 'norm':
          type = e.target.checked ? type | filterBits.norm : type & ~filterBits.norm;
          break;
      }
      div.dataset.type = type;
      div.querySelector('[data-id="header"]').textContent = filterLabels[type & filterBits.labelMask] + (type & filterBits.norm ? ' (⁎)' : '');
    });
    div.addEventListener('click', e => {
      const id = e.target.dataset.id;
      switch(id) {
        case 'delete':
          div.dispatchEvent(new CustomEvent('filter-removed', { bubbles: true }));
          div.remove();
          break;
      }
    });
    if(type) {
      div.querySelector('[data-id="fix-start"]').checked = type & filterBits.start;
      div.querySelector('[data-id="fix-end"]').checked = type & filterBits.end;
      div.querySelector('[data-id="neg"]').checked = type & filterBits.neg;
      div.querySelector('[data-id="norm"]').checked = type & filterBits.norm;
      div.dataset.type = type;
      div.dispatchEvent(new CustomEvent('input'));
    }
    if(value)
      div.querySelector('[data-id="value"]').value = value;
  }

  function update() {
    function append(f, test) {
      return (text, norm) => f(text, norm) && test(text, norm);
    }

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
          const min = root.getElementById('lcount-min').value;
          const max = root.getElementById('lcount-max').value;
          f = text => text.length >= min && text.length <= max;
          break;
        }
    }
    if(root.getElementById('lcase').checked)
      f = append(f, text => reLowerCase.test(text));
    for(const filterDiv of root.querySelectorAll('.re-filter')) {
      const type = filterDiv.dataset.type;
      const value = filterDiv.querySelector('[data-id="value"]').value;
      let error = false;
      if(value) {
        try {
          const re = new RegExp(`${type & filterBits.start ? '^' : ''}${value}${type & filterBits.end ? '$' : ''}`);
          if(re) {
            if(type & filterBits.norm) {
              if(type & filterBits.neg)
                f = append(f, (text, norm) => !re.test(norm));
              else
                f = append(f, (text, norm) => re.test(norm));
            } else {
              if(type & filterBits.neg)
                f = append(f, text => !re.test(text));
              else
                f = append(f, text => re.test(text));
            }
          }
        } catch {
          error = true;
        }
      }
      filterDiv.querySelector('[data-id="value"]').classList.toggle('error', error);
    }
    filter(f);
    saveSettings();
  }

  function saveSettings() {
    switch(root.getElementById('lcount-variants').dataset.sel) {
      case 'any':
        localStorage[lsKeys.lcount] = '';
        break;
      case 'exact':
        localStorage[lsKeys.lcount] = root.getElementById('lcount-exact').value;
        break;
      case 'range':
        localStorage[lsKeys.lcount] = JSON.stringify([
          root.getElementById('lcount-min').value,
          root.getElementById('lcount-max').value]);
        break;
    }
    localStorage[lsKeys.lcase] = +root.getElementById('lcase').checked;
    const filters = [];
    for(const filterDiv of root.querySelectorAll('.re-filter'))
      filters.push({
        type: filterDiv.dataset.type,
        value: filterDiv.querySelector('[data-id="value"]').value
      });
    localStorage[lsKeys.filters] = JSON.stringify(filters);
  }

  function loadSettings() {
    let sel = 'any';
    root.getElementById('lcase').checked = localStorage[lsKeys.lcase];
    root.getElementById('lcase').dispatchEvent(new CustomEvent('input'));
    if(localStorage[lsKeys.lcount]) {
      const lcount = JSON.parse(localStorage[lsKeys.lcount]);
      if(typeof lcount === 'number') {
        root.getElementById('lcount-exact').value = lcount;
        sel = 'exact';
      } else {
        root.getElementById('lcount-min').value = lcount[0];
        root.getElementById('lcount-max').value = lcount[1];
        sel = 'range';
      }
    }
    root.querySelector(`#lcount-variant [value="${sel}"]`).checked = true;
    root.getElementById('lcount-variant').dispatchEvent(new CustomEvent('input'));
    if(localStorage[lsKeys.filters]) {
      const filters = JSON.parse(localStorage[lsKeys.filters]);
      for(const {type, value} of filters) {
        addFilter(type, value);
      }
    } else
      addFilter();
  }

  return {};
}
