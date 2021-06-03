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
  root.getElementById('month').addEventListener('input', dbf);
  root.getElementById('day').addEventListener('input', dbf);

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
            ord: 12*(+month) + (+day),
            special
          });
        }
      }
    }
    return data;
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
      count++;
    }
    while(liveRows.length > count)
      table.deleteRow(count);
  }

  return {};
}
