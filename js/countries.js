import './components/spa-scroll.js';
import './components/spa-modal.js';
import normalize from './util/text.js';
import debounce from './util/debounce.js';
import _, * as i18n from './i18n.js';

export default function(root) {
  const dbf = debounce(filter, 300);
  root.getElementById('name').addEventListener('input', dbf);
  root.getElementById('capital').addEventListener('input', dbf);
  root.getElementById('continent').addEventListener('change', atLeastOne);
  root.getElementById('ccount').addEventListener('change', firstOrMulti);
  root.getElementById('colors').addEventListener('change', filter);
  root.getElementById('shape').addEventListener('change', filter);
  root.getElementById('emblems').addEventListener('change', filter);
  root.getElementById('ecolor').addEventListener('change', firstOrMulti);
  root.getElementById('currency').addEventListener('input', dbf);
  root.getElementById('curr-code').addEventListener('input', dbf);
  root.getElementById('list').addEventListener('click', flagClicked);
  root.getElementById('details-modal').addEventListener('click', e => e.currentTarget.hidden = true);
  loadData();

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
    const response = await fetch(`assets/${i18n.lang}/countries.csv`);
    const text = await response.text();
    const tbody = root.getElementById('list').tBodies[0];
    const colors = {
      'E': 'blue',
      'AS': 'yellow',
      'AF': 'black',
      'AO': 'green',
      'SA': 'red',
      'JA': 'red'
    };
    const lines = [];
    for(const line of text.split('\n')) {
      if(!line) break;
      lines.push(line.split(':'));
    }
    lines.sort((a, b) => i18n.compare(a[0], b[0]));
    for(const arr of lines) {
      const tr = document.createElement('tr');
      const color = colors[arr[2]];
      const content = arr[2] === 'SA' || arr[2] === 'JA'
        ? `data-content="${_(`flg:label ${arr[2] === 'SA' ? 'north' : 'south'}`)}"`
        : '';
      tr.innerHTML = `
        <td><img src="assets/any/flags/${arr[4]}.svg"/></td>
        <td>${arr[0]}</td>
        <td>${arr[1]}</td>
        <td><span class="patch c-${color}" ${content} data-color="param"></span></td>
      `;
      tr.dataset.name = arr[0];
      tr.dataset.nameN = normalize(arr[0]);
      tr.dataset.capital = arr[1]
      tr.dataset.capitalN = normalize(arr[1]);
      tr.dataset.continent = arr[2];
      tr.dataset.currency = arr[3];
      tr.dataset.currencyN = normalize(arr[3]);
      tr.dataset.abbr3 = arr[4];
      tr.dataset.abbr2 = arr[5];
      tr.dataset.abbrCurr = arr[6];
      tr.dataset.flagColor = arr[7];
      tr.dataset.flagShape = arr[8];
      tr.dataset.emblems = arr[9];
      tr.dataset.emblemColor = arr[10];
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
    while(x) {
      console.log(x);
      r += x & 1;
      x >>= 1;
    }
    return r;
  }

  function filter() {
    let f = () => true;
    const edited = { country: false, flag: false, currency: false };
    // Country name
    {
      const cname = normalize(root.getElementById('name').value);
      if(cname) {
        f = addCondition(f, dataset => dataset.nameN.includes(cname));
        edited.country = true;
      }
    }
    // Capital
    {
      const cname = normalize(root.getElementById('capital').value);
      if(cname) {
        f = addCondition(f, dataset => dataset.capitalN.includes(cname));
        edited.country = true;
      }
    }
    // Continent
    for(const elm of root.querySelectorAll('#continent input')) {
      if(!elm.checked) {
        if(elm.dataset.value === 'AM')
          f = addCondition(f, dataset => dataset.continent !== 'SA' && dataset.continent !== 'JA');
        else
          f = addCondition(f, dataset => dataset.continent !== elm.dataset.value);
        edited.country = true;
      }
    }
    // Flag colors
    for(const elm of root.getElementById('colors').children) {
      if(elm.checked) {
        f = addCondition(f, dataset => dataset.flagColor & elm.dataset.value);
        edited.flag = true;
      }
    }
    // Color count
    {
      const ccount = [...root.getElementById('ccount').children];
      if(!ccount[0].checked) {
        f = addCondition(f, dataset => ccount[popCnt(dataset.flagColor)].checked);
        edited.flag = true;
      }
    }
    // Flag shape
    for(const elm of root.querySelectorAll('#shape input')) {
      if(elm.checked) {
        f = addCondition(f, dataset => dataset.flagShape & elm.dataset.value);
        edited.flag = true;
      }
    }
    // Emblems
    for(const elm of root.querySelectorAll('#emblems input')) {
      if(elm.checked) {
        f = addCondition(f, dataset => dataset.emblems & elm.dataset.value);
        edited.flag = true;
      }
    }
    // Emblem colors
    {
      const ecolors = [...root.getElementById('ecolor').children];
      if(!ecolors.shift().checked) {
        for(const elm of ecolors)
          f = addCondition(f, dataset => !!(dataset.emblemColor & elm.dataset.value) === elm.checked);
        edited.flag = true;
      }
    }
    // Currency
    {
      const cname = normalize(root.getElementById('currency').value);
      if(cname) {
        f = addCondition(f, dataset => dataset.currencyN.includes(cname));
        edited.currency = true;
      }
      const ccode = root.getElementById('curr-code').value.toUpperCase();
      if(ccode) {
        f = addCondition(f, dataset => dataset.abbrCurr.includes(ccode));
        edited.currency = true;
      }
    }
    let odd = true;
    for(const tr of root.getElementById('list').tBodies[0].children) {
      const show = f(tr.dataset);
      tr.hidden = !show;
      if(show) {
        tr.classList.toggle('alt-row', odd);
        odd = !odd;
      }
    }
    for(const sec in edited)
      root.getElementById(`filter-${sec}`).nextElementSibling.classList.toggle('edited', edited[sec]);
  }

  function flagClicked(e) {
    const tr = e.target.closest('tr');
    if(!tr)
      return;
    root.getElementById('d-flag').src = tr.querySelector('img').src;
    root.getElementById('d-name').textContent = tr.dataset.name;
    root.getElementById('d-capital').textContent = tr.dataset.capital;
    root.getElementById('d-currency').textContent = `${tr.dataset.currency} (${tr.dataset.abbrCurr})`;
    root.getElementById('details-modal').show();
  }

  return {};
}
