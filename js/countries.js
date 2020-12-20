import './components/tri-state.js';
import './components/spa-scroll.js';

window.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('input', filter);
  loadData();
});

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
    const content = arr[3] === 'SA' || arr[4] === 'JA' ? `data-content="${arr[3][0]}"` : "";
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
  for(const elm of document.getElementById('flg-continent').querySelectorAll('input')) {
    if(!elm.checked) {
      if(elm.dataset.value === 'AM')
        f = addCondition(f, dataset => dataset.continent !== 'SA' && dataset.continent !== 'JA');
      else
        f = addCondition(f, dataset => dataset.continent !== elm.dataset.value);
    }
  }
  // Flag colors
  for(const elm of document.getElementById('flg-colors').children) {
    if(elm.state !== null)
      f = addCondition(f, dataset => !!(dataset.flagColor & elm.dataset.value) === elm.state);
  }
  // Color count
  let cc = document.querySelector('input[name="flg-ccount"]:checked').dataset.content;
  if(cc !== '#')
    f = addCondition(f, dataset => popCnt(dataset.flagColor) == cc);
  // Flag colors
  for(const div of document.getElementById('flg-shape').children) {
    const elm = div.firstElementChild;
    if(elm.state !== null)
      f = addCondition(f, dataset => !!(dataset.flagShape & elm.dataset.value) === elm.state);
  }
  // Emblems
  for(const div of document.getElementById('flg-emblems').children) {
    const elm = div.firstElementChild;
    if(elm.state !== null)
      f = addCondition(f, dataset => !!(dataset.emblems & elm.dataset.value) === elm.state);
  }
  // Emblem colors
  for(const elm of document.getElementById('flg-ecolor').children) {
    if(elm.state !== null)
      f = addCondition(f, dataset => !!(dataset.emblemColor & elm.dataset.value) === elm.state);
  }
  for(const tr of document.getElementById('flg-list').tBodies[0].children)
    tr.hidden = !f(tr.dataset);
}
