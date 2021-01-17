import './components/spa-scroll.js';
import * as i18n from './i18n.js';

export default function(root) {
  function filter() {
    let odd = true;
    const cont = root.getElementById('list');
    for(const item of cont.children) {
      const modName = item.dataset.moduleName;
      const view = document.querySelector(`spa-view[data-module="${modName}"]:not([data-size=""])`);
      const used = !!view;
      item.hidden = used;
      if(!used) {
        item.classList.toggle('alt-row', odd);
        odd = !odd;
      }
    }
  }

  (async () => {
    const items = await(await fetch(`trans/${i18n.lang}/modules.json`)).json();
    const cont = root.getElementById('list');
    const cmp = new Intl.Collator(i18n.lang).compare;
    items.sort((a, b) => cmp(a.displayName, b.displayName));
    for(const item of items) {
      const div = document.createElement('div');
      div.textContent = item.displayName;
      div.dataset.moduleName = item.moduleName;
      div.tabindex = 0;
      div.dataset.active = 1;
      cont.appendChild(div);
    }
    filter();
    document.addEventListener('view-change', filter);
    cont.addEventListener('click', e => {
      document.removeEventListener('view-change', filter);
      root.host.dataset.module = e.target.dataset.moduleName;
    });
  })();

  return {};
}
