import './components/spa-checkbox.js';
import './components/spa-scroll.js';
import './components/spa-modal.js';
import {normalize} from './util/text.js';
import {debounce} from './util/debounce.js';

window.addEventListener('DOMContentLoaded', () => {
  const dbf = debounce(filter, 300);
  document.getElementById('flg-name').addEventListener('input', dbf);
  document.getElementById('flg-capital').addEventListener('input', dbf);
  document.getElementById('flg-continent').addEventListener('change', atLeastOne);
  document.getElementById('flg-ccount').addEventListener('change', firstOrMulti);
  document.getElementById('flg-colors').addEventListener('change', filter);
  document.getElementById('flg-shape').addEventListener('change', filter);
  document.getElementById('flg-emblems').addEventListener('change', filter);
  document.getElementById('flg-ecolor').addEventListener('change', firstOrMulti);
  document.getElementById('flg-currency').addEventListener('input', dbf);
  document.getElementById('flg-curr-code').addEventListener('input', dbf);
  document.getElementById('flg-list').addEventListener('click', flagClicked);
  document.getElementById('flg-details-modal').addEventListener('click', e => e.currentTarget.hidden = true);
  loadData();
});

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
  const siblings = e.target.parentNode.children;
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
  const tbody = document.getElementById('flg-list').tBodies[0];
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
    tr.dataset.active = true;
    tr.tabindex = 0;
    tbody.appendChild(tr);
  }
  document.querySelector('.spa-loading').hidden = true;
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
    const cname = normalize(document.getElementById('flg-name').value);
    if(cname) {
      f = addCondition(f, dataset => dataset.nameN.includes(cname));
      edited.country = true;
    }
  }
  // Capital
  {
    const cname = normalize(document.getElementById('flg-capital').value);
    if(cname) {
      f = addCondition(f, dataset => dataset.capitalN.includes(cname));
      edited.country = true;
    }
  }
  // Continent
  for(const elm of document.getElementById('flg-continent').children) {
    if(!elm.checked) {
      if(elm.dataset.value === 'AM')
        f = addCondition(f, dataset => dataset.continent !== 'SA' && dataset.continent !== 'JA');
      else
        f = addCondition(f, dataset => dataset.continent !== elm.dataset.value);
      edited.country = true;
    }
  }
  // Flag colors
  for(const elm of document.getElementById('flg-colors').children) {
    if(elm.checked) {
      f = addCondition(f, dataset => dataset.flagColor & elm.dataset.value);
      edited.flag = true;
    }
  }
  // Color count
  {
    const ccount = [...document.getElementById('flg-ccount').children];
    if(!ccount[0].checked) {
      f = addCondition(f, dataset => ccount[popCnt(dataset.flagColor)].checked);
      edited.flag = true;
    }
  }
  // Flag shape
  for(const elm of document.getElementById('flg-shape').children) {
    if(elm.checked) {
      f = addCondition(f, dataset => dataset.flagShape & elm.dataset.value);
      edited.flag = true;
    }
  }
  // Emblems
  for(const elm of document.getElementById('flg-emblems').children) {
    if(elm.checked) {
      f = addCondition(f, dataset => dataset.emblems & elm.dataset.value);
      edited.flag = true;
    }
  }
  // Emblem colors
  {
    const ecolors = [...document.getElementById('flg-ecolor').children];
    if(!ecolors.shift().checked) {
      for(const elm of ecolors)
        f = addCondition(f, dataset => !!(dataset.emblemColor & elm.dataset.value) === elm.checked);
      edited.flag = true;
    }
  }
  // Currency
  {
    const cname = normalize(document.getElementById('flg-currency').value);
    if(cname) {
      f = addCondition(f, dataset => dataset.currencyN.includes(cname));
      edited.currency = true;
    }
    const ccode = document.getElementById('flg-curr-code').value.toUpperCase();
    if(ccode) {
      f = addCondition(f, dataset => dataset.abbrCurr.includes(ccode));
      edited.currency = true;
    }
  }
  let odd = true;
  for(const tr of document.getElementById('flg-list').tBodies[0].children) {
    let show = f(tr.dataset);
    tr.hidden = !show;
    if(show) {
      tr.classList.toggle('alt-row', odd);
      odd = !odd;
    }
  }
  for(const sec in edited)
    document.getElementById(`flg-filter-${sec}`).labels[0].classList.toggle('edited', edited[sec]);
}

function flagClicked(e) {
  let tr = e.target.closest('tr');
  if(!tr)
    return;
  document.getElementById('flg-d-flag').src = tr.querySelector('img').src;
  document.getElementById('flg-d-name').textContent = tr.dataset.name;
  document.getElementById('flg-d-capital').textContent = tr.dataset.capital;
  document.getElementById('flg-d-currency').textContent = `${tr.dataset.currency} (${tr.dataset.abbrCurr})`;
  document.getElementById('flg-details-modal').hidden = false;
}
