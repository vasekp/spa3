import './components/spa-dropdown.js';
import './components/spa-scroll.js';
import normalize from './util/text.js';
import debounce from './util/debounce.js';
import Enum from './util/enum.js';
import _, * as i18n from './i18n.js';

const lsKeys = Enum.fromObj({
  calendar: 'nam-calendar',
});

export default function(root) {
  let dataP = loadFile(localStorage[lsKeys.calendar]);
  const dbf = debounce(filter, 100);

  root.getElementById('name').addEventListener('input', dbf);
  root.getElementById('month').addEventListener('input', () => {
    root.getElementById('months').dataset.choice = 0;
    dbf();
  });
  root.getElementById('day').addEventListener('input', dbf);
  root.getElementById('months').addEventListener('click', oneOrAll);
  root.getElementById('sugg-table').addEventListener('click', record);
  root.getElementById('clear').addEventListener('click', clear);
  root.getElementById('prev-header').addEventListener('change', orderPrev);

  {
    /* Facilitate quicker entering of successive dates */
    const elms = root.getElementById('date-span').querySelectorAll('input');
    for(const elm of elms)
      elm.addEventListener('click', e => e.target.select());
    elms[0].addEventListener('input', () => {
      if(elms[0].value.length === 2) {
        elms[1].focus();
        elms[1].select();
      }
    });
  }

  const prev = {
    _list: [],
    _compare: null,

    _update: function() {
      const table = root.getElementById('prev-table').tBodies[0];
      const liveRows = table.rows;
      let count = 0;
      for(const item of this._list) {
        const row = count < liveRows.length ? liveRows[count] : table.insertRow();
        while(row.cells.length)
          row.deleteCell(0);
        row.insertCell().textContent = item.counter;
        const cellName = row.insertCell();
        cellName.textContent = item.name;
        cellName.dataset.special = item.special;
        row.insertCell().textContent = format(item.day, item.month);
        row.dataset.id = item.counter;
        count++;
      }
      while(liveRows.length > count)
        table.deleteRow(count);
      root.getElementById('prev').hidden = false;
      root.getElementById('prev-header').hidden = false;
    },

    _sort: function() {
      if(this._compare)
        this._list.sort(this._compare);
      this._update();
    },

    add: function(item) {
      this._list.push({counter: this._list.length + 1, ...item});
      this._sort();
      this._update();
      root.getElementById('prev-table').querySelector(`[data-id="${this._list.length}"]`).scrollIntoView();
    },

    reorder: function(key, ord) {
      const cfFun = key === 'name' ? i18n.compare : (a, b) => a - b;
      this._compare = ord === 'asc'
        ? (a, b) => cfFun(a[key], b[key])
        : (a, b) => cfFun(b[key], a[key]);
      this._sort();
    },

    clear: function() {
      this._list = [];
    }
  };

  const format = (() => {
    const sep = [_('nam:sep0'), _('nam:sep1'), _('nam:sep2')];
    if(_('nam:id1') === 'day')
      return (day, month) => `${sep[0]}${day}${sep[1]}${month}${sep[2]}`;
    else
      return (day, month) => `${sep[0]}${month}${sep[1]}${day}${sep[2]}`;
  })();

  async function loadFile(filename) {
    const lists = await (await fetch(`trans/${i18n.lang}/calendars.json`)).json();
    const found = lists.find(entry => entry.filename === filename);
    const item = found || lists[0];
    localStorage[lsKeys.calendar] = item.filename;

    root.getElementById('cal-title').textContent = item.title;
    const list = root.getElementById('calendars');
    if(!list.children.length) {
      for(const info of lists) {
        const elm = document.createElement('input');
        elm.type = 'radio';
        elm.name = 'calendar';
        elm.classList.add('patch');
        elm.classList.add('show-state');
        elm.dataset.label = info.title;
        elm.dataset.filename = info.filename;
        list.appendChild(elm);
      }
    }
    list.querySelector(`[data-filename="${item.filename}"]`).checked = true;

    const contents = await (await fetch(`assets/any/calendars/${item.filename}`)).json();
    const data = [];
    for(const month in contents) {
      for(const day in contents[month]) {
        const split = contents[month][day].split(',');
        for(const name0 of split) {
          const special = name0[0] === '*';
          const name = special ? name0.substring(1) : name0
          data.push({name,
            nameN: normalize(name),
            day: +day+1,
            month: +month+1,
            ord: 32*(+month) + (+day),
            id: data.length,
            special
          });
        }
      }
    }
    return data;
  }

  function oneOrAll(e) {
    const div = e.target.closest('div');
    if(e.target.value === div.dataset.choice)
      div.dataset.choice = 0;
    else
      div.dataset.choice = e.target.value;
    const choice = div.dataset.choice;
    root.getElementById('month').value = +choice ? choice : '';
    filter();
  }

  function addCondition(f, cond) {
    return dataset => cond(dataset) && f(dataset);
  }

  async function filter() {
    const fTrue = () => true;
    let f = fTrue;

    {
      const cname = normalize(root.getElementById('name').value);
      if(cname)
        f = addCondition(f, item => item.nameN.includes(cname));
      const month = root.getElementById('month').value;
      if(month !== '')
        f = addCondition(f, item => item.month === +month);
      const day = root.getElementById('day').value;
      if(day !== '')
        f = addCondition(f, item => item.day === +day);
    }
    {
      const month = +root.getElementById('months').dataset.choice;
      if(month)
        f = addCondition(f, item => item.month === month);
    }

    /* no filter = no results */
    if(f === fTrue)
      f = () => false;

    const data = await dataP;
    const table = root.getElementById('sugg-table').tBodies[0];
    const liveRows = table.rows;
    let count = 0;
    for(const item of data) {
      if(!f(item))
        continue;
      const row = count < liveRows.length ? liveRows[count] : table.insertRow();
      while(row.cells.length)
        row.deleteCell(0);
      const cellName = row.insertCell();
      cellName.textContent = item.name;
      cellName.dataset.special = item.special;
      row.insertCell().textContent = format(item.day, item.month);
      row.dataset.id = item.id;
      count++;
    }
    while(liveRows.length > count)
      table.deleteRow(count);
  }

  function reset() {
    root.getElementById('name').value = '';
    root.getElementById('month').value = '';
    root.getElementById('day').value = '';
    root.getElementById('months').dataset.choice = 0;
    filter();
  }

  async function record(e) {
    const data = await dataP;
    prev.add(data[e.target.closest('tr').dataset.id]);
    reset();
  }

  function clear() {
    prev.clear();
    root.getElementById('prev').hidden = true;
    root.getElementById('prev-header').hidden = true;
  }

  function orderPrev(e) {
    prev.reorder(e.target.dataset.key, e.target.dataset.ord);
  }

  return {};
}
