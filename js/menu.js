import './components/spa-scroll.js';

export default function(root) {
  function filter() {
    let odd = true;
    const cont = root.getElementById('menu-container');
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
    const items = await(await fetch('modules.json')).json();
    const cont = root.getElementById('menu-container');
    const cmp = new Intl.Collator().compare;
    items.sort((a, b) => cmp(a.displayName, b.displayName));
    for(const item of items) {
      const div = document.createElement('div');
      div.classList.add('menu-item');
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
