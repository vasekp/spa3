import './components/spa-checkbox.js';
import './components/spa-scroll.js';

window.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('input', filter);
  document.getElementById('flg-ccount').addEventListener('change', firstOrMulti);
  document.getElementById('flg-ecolor').addEventListener('change', firstOrMulti);
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
    tr.dataset.czname = arr[0];
    tr.dataset.enname = arr[1];
    tr.dataset.capital = arr[2];
    tr.dataset.continent = arr[3];
    tr.dataset.currency = arr[4];
    tr.dataset.abbr3 = arr[5];
    tr.dataset.abbr2 = arr[6];
    tr.dataset.currAbbr = arr[7];
    tr.dataset.flagColor = arr[8];
    tr.dataset.flagShape = arr[9];
    tr.dataset.emblems = arr[10];
    tr.dataset.emblemColor = arr[11];
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
  // Country name
  {
    const cname = document.getElementById('flg-name').value.toLowerCase();
    if(cname)
      f = addCondition(f, dataset => dataset.czname.toLowerCase().includes(cname));
  }
  // Capital
  {
    const cname = document.getElementById('flg-capital').value.toLowerCase();
    if(cname)
      f = addCondition(f, dataset => dataset.capital.toLowerCase().includes(cname));
  }
  // Continent
  for(const elm of document.getElementById('flg-continent').children) {
    if(!elm.stateBool) {
      if(elm.dataset.value === 'AM')
        f = addCondition(f, dataset => dataset.continent !== 'SA' && dataset.continent !== 'JA');
      else
        f = addCondition(f, dataset => dataset.continent !== elm.dataset.value);
    }
  }
  // Flag colors
  for(const elm of document.getElementById('flg-colors').children) {
    if(elm.stateBool !== null)
      f = addCondition(f, dataset => !!(dataset.flagColor & elm.dataset.value) === elm.stateBool);
  }
  // Color count
  {
    const ccount = [...document.getElementById('flg-ccount').children];
    if(!ccount[0].checked)
      f = addCondition(f, dataset => ccount[popCnt(dataset.flagColor)].checked);
  }
  // Flag colors
  for(const elm of document.getElementById('flg-shape').children) {
    if(elm.stateBool !== null)
      f = addCondition(f, dataset => !!(dataset.flagShape & elm.dataset.value) === elm.stateBool);
  }
  // Emblems
  for(const elm of document.getElementById('flg-emblems').children) {
    if(elm.stateBool)
      f = addCondition(f, dataset => dataset.emblems & elm.dataset.value);
  }
  // Emblem colors
  {
    const ecolors = [...document.getElementById('flg-ecolor').children];
    if(!ecolors.shift().checked)
      for(const elm of ecolors)
        f = addCondition(f, dataset => !!(dataset.emblemColor & elm.dataset.value) === elm.checked);
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
}
