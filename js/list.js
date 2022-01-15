import './components/spa-scroll.js';
import * as i18n from './i18n.js';

export default function(root) {
  (async () => {
    const items = await(await fetch(`trans/${i18n.lang}/modules.json`)).json();
    const cont = root.getElementById('list');
    items.sort((a, b) => i18n.compare(a.displayName, b.displayName));
    for(const item of items) {
      const div = document.createElement('div');
      div.textContent = item.displayName;
      div.dataset.moduleName = item.moduleName;
      div.setAttribute('tabindex', 0);
      div.classList.add('inner-outline');
      div.dataset.active = 1;
      cont.appendChild(div);
    }
    cont.addEventListener('click', e => {
      root.dispatchEvent(new CustomEvent('request-module',
        { detail: { module: e.target.dataset.moduleName, viewId: root.host.id },
          bubbles: true, composed: true }));
    });
  })();

  return {};
}
