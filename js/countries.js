import './components/spa-scroll.js';
import './components/spa-modal.js';
import {normalize} from './util/text.js';
import {debounce} from './util/debounce.js';

let root;

export function init(_root) {
  root = _root;
  const dbf = debounce(filter, 300);
  root.getElementById('flg-name').addEventListener('input', dbf);
  root.getElementById('flg-capital').addEventListener('input', dbf);
  root.getElementById('flg-continent').addEventListener('change', atLeastOne);
  root.getElementById('flg-ccount').addEventListener('change', firstOrMulti);
  root.getElementById('flg-colors').addEventListener('change', filter);
  root.getElementById('flg-shape').addEventListener('change', filter);
  root.getElementById('flg-emblems').addEventListener('change', filter);
  root.getElementById('flg-ecolor').addEventListener('change', firstOrMulti);
  root.getElementById('flg-currency').addEventListener('input', dbf);
  root.getElementById('flg-curr-code').addEventListener('input', dbf);
  root.getElementById('flg-list').addEventListener('click', flagClicked);
  root.getElementById('flg-details-modal').addEventListener('click', e => e.currentTarget.hidden = true);
  root.addEventListener('keydown', blurOnEnter);
  loadData();
}

function blurOnEnter(e) {
  if(e.target.tagName === 'INPUT' && e.target.type === 'text' && e.key === 'Enter')
    e.target.blur();
}

function firstOrMulti(e) {
  const siblings = [...e.target.parentNode.children];
  const first = siblings.shift();
  if(e.target === first) {
    first.checked = true;
    for(const elm of siblings)
      elm.checked = false;
  } else {
    let total = 0;
    for(const elm of siblings)
      total += elm.checked;
    first.checked = total === 0;
  }
  filter();
}

function atLeastOne(e) {
  const siblings = e.target.closest('div').querySelectorAll('input');
  let totalAfter = 0;
  for(const elm of siblings)
    totalAfter += elm.checked;
  let totalBefore = totalAfter + (e.target.checked ? -1 : +1);
  if(totalBefore === siblings.length) {
    for(const elm of siblings)
      elm.checked = elm === e.target;
  } else if(totalAfter === 0) {
    for(const elm of siblings)
      elm.checked = elm !== e.target;
  }
  filter();
}

async function loadData() {
  const response = await fetch('assets/countries.csv');
  const text = await response.text();
  const tbody = root.getElementById('flg-list').tBodies[0];
  const colors = {
    'E': 'blue',
    'AS': 'yellow',
    'AF': 'black',
    'AO': 'green',
    'SA': 'red',
    'JA': 'red'
  };
  for(const line of text.split('\n')) {
    if(!line) break;
    const arr = line.split(':');
    const tr = document.createElement('tr');
    const color = colors[arr[3]];
    const content = arr[3] === 'SA' || arr[3] === 'JA' ? `data-content="${arr[3][0]}"` : "";
    tr.innerHTML = `
      <td><img src="assets/flags/${arr[5]}.svg"/></td>
      <td>${arr[0]}</td>
      <td>${arr[2]}</td>
      <td><span class="patch c-${color}" ${content} data-color="param"></span></td>
    `;
    tr.dataset.name = arr[0];
    tr.dataset.nameN = normalize(arr[0]);
    tr.dataset.capital = arr[2]
    tr.dataset.capitalN = normalize(arr[2]);
    tr.dataset.continent = arr[3];
    tr.dataset.currency = arr[4];
    tr.dataset.currencyN = normalize(arr[4]);
    tr.dataset.abbr3 = arr[5];
    tr.dataset.abbr2 = arr[6];
    tr.dataset.abbrCurr = arr[7];
    tr.dataset.flagColor = arr[8];
    tr.dataset.flagShape = arr[9];
    tr.dataset.emblems = arr[10];
    tr.dataset.emblemColor = arr[11];
    tr.dataset.active = 1;
    tr.tabIndex = 0;
    tr.classList.add('inner-outline');
    tbody.appendChild(tr);
  }
  root.querySelector('.spa-loading').hidden = true;
  filter();
}

function addCondition(f, cond) {
  return dataset => cond(dataset) && f(dataset);
}

function popCnt(x) {
  let r = 0;
  for(let m = 1; m < 128; m <<= 1)
    if(x & m) r++;
  return r;
}

function filter() {
  let f = () => true;
  let edited = { country: false, flag: false, currency: false };
  // Country name
  {
    const cname = normalize(root.getElementById('flg-name').value);
    if(cname) {
      f = addCondition(f, dataset => dataset.nameN.includes(cname));
      edited.country = true;
    }
  }
  // Capital
  {
    const cname = normalize(root.getElementById('flg-capital').value);
    if(cname) {
      f = addCondition(f, dataset => dataset.capitalN.includes(cname));
      edited.country = true;
    }
  }
  // Continent
  for(const elm of root.querySelectorAll('#flg-continent input')) {
    if(!elm.checked) {
      if(elm.dataset.value === 'AM')
        f = addCondition(f, dataset => dataset.continent !== 'SA' && dataset.continent !== 'JA');
      else
        f = addCondition(f, dataset => dataset.continent !== elm.dataset.value);
      edited.country = true;
    }
  }
  // Flag colors
  for(const elm of root.getElementById('flg-colors').children) {
    if(elm.checked) {
      f = addCondition(f, dataset => dataset.flagColor & elm.dataset.value);
      edited.flag = true;
    }
  }
  // Color count
  {
    const ccount = [...root.getElementById('flg-ccount').children];
    if(!ccount[0].checked) {
      f = addCondition(f, dataset => ccount[popCnt(dataset.flagColor)].checked);
      edited.flag = true;
    }
  }
  // Flag shape
  for(const elm of root.querySelectorAll('#flg-shape input')) {
    if(elm.checked) {
      f = addCondition(f, dataset => dataset.flagShape & elm.dataset.value);
      edited.flag = true;
    }
  }
  // Emblems
  for(const elm of root.querySelectorAll('#flg-emblems input')) {
    if(elm.checked) {
      f = addCondition(f, dataset => dataset.emblems & elm.dataset.value);
      edited.flag = true;
    }
  }
  // Emblem colors
  {
    const ecolors = [...root.getElementById('flg-ecolor').children];
    if(!ecolors.shift().checked) {
      for(const elm of ecolors)
        f = addCondition(f, dataset => !!(dataset.emblemColor & elm.dataset.value) === elm.checked);
      edited.flag = true;
    }
  }
  // Currency
  {
    const cname = normalize(root.getElementById('flg-currency').value);
    if(cname) {
      f = addCondition(f, dataset => dataset.currencyN.includes(cname));
      edited.currency = true;
    }
    const ccode = root.getElementById('flg-curr-code').value.toUpperCase();
    if(ccode) {
      f = addCondition(f, dataset => dataset.abbrCurr.includes(ccode));
      edited.currency = true;
    }
  }
  let odd = true;
  for(const tr of root.getElementById('flg-list').tBodies[0].children) {
    let show = f(tr.dataset);
    tr.hidden = !show;
    if(show) {
      tr.classList.toggle('alt-row', odd);
      odd = !odd;
    }
  }
  for(const sec in edited)
    root.getElementById(`flg-filter-${sec}`).labels[0].classList.toggle('edited', edited[sec]);
}

function flagClicked(e) {
  let tr = e.target.closest('tr');
  if(!tr)
    return;
  root.getElementById('flg-d-flag').src = tr.querySelector('img').src;
  root.getElementById('flg-d-name').textContent = tr.dataset.name;
  root.getElementById('flg-d-capital').textContent = tr.dataset.capital;
  root.getElementById('flg-d-currency').textContent = `${tr.dataset.currency} (${tr.dataset.abbrCurr})`;
  root.getElementById('flg-details-modal').hidden = false;
  root.getElementById('flg-details-modal').focus();
}
