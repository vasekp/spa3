import './components/spa-view.js';
import Enum from './util/enum.js';
import _, * as i18n from './i18n.js';

const lsKeys = Enum.fromObj({
  views: 'spa-views',
  theme: 'spa-theme',
});

/* As of now there seems to be no other way than JS to condition layout on container size. */
const ro = new ResizeObserver(entries => {
  let change = false;
  for(const entry of entries) {
    const view = entry.target;
    const width = view.clientWidth;
    const newSize = width === 0 ? ''
      : width <= 400 ? 'small'
      : width <= 600 ? 'mid'
      : 'full';
    if(newSize !== view.dataset.size)
      change = true;
    view.dataset.size = newSize;
  }
  if(change)
    document.dispatchEvent(new CustomEvent('view-change'));
});

window.addEventListener('DOMContentLoaded', async () => {
  const theme = localStorage[lsKeys.theme] || 'light';
  setTheme(theme);
  await i18n.loadTrans(`trans/${i18n.lang}/main.json`);
  document.title = _('title');
  for(const view of document.querySelectorAll('spa-view'))
    ro.observe(view);
  if(localStorage[lsKeys.views]) {
    const views = JSON.parse(localStorage[lsKeys.views]);
    for(const pos in views)
      document.querySelector(`spa-view[data-pos="${pos}"]`).dataset.module = views[pos];
  } else {
    document.getElementById('v1').dataset.module = 'logbook';
    document.getElementById('v2').dataset.module = 'list';
    document.getElementById('v3').dataset.module = 'list';
  }
  document.addEventListener('view-change', e => {
    const views = {};
    for(const view of document.querySelectorAll('spa-view')) {
      if(e.detail && view.id !== e.detail.id && view.dataset.module === e.detail.module && view.dataset.module !== 'list') {
        view.dataset.module = 'list';
        return;
      }
      views[view.dataset.pos] = view.dataset.module;
    }
    localStorage[lsKeys.views] = JSON.stringify(views);
  });
  document.getElementById('shared-settings').innerHTML = await i18n.loadTemplate('html/shared-settings.html');
  /* Update manifest */
  const manifest = await (await fetch('manifest.json')).json();
  manifest.name = _('title');
  if(theme === 'dark')
    manifest.background_color = manifest.theme_color = '#000000';
  const urlPrefix = document.URL.substring(0, document.URL.lastIndexOf('/') + 1);
  manifest.start_url = urlPrefix + manifest.start_url;
  for(const entry of manifest.icons)
    entry.src = urlPrefix + entry.src;
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  document.head.querySelector('link[rel="manifest"]').href = URL.createObjectURL(blob);
  if(navigator.serviceWorker.controller)
    navigator.serviceWorker.controller.postMessage('on load');
});

window.addEventListener('keydown', e => {
  const target = e.composedPath()[0];
  if(+target.dataset.active)
    if(e.key === 'Enter' || e.key === ' ')
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  if(target.tagName === 'INPUT' && target.type === 'text' && e.key === 'Enter') {
    const cont = target.closest('spa-focus-container, spa-modal');
    if(cont)
      cont.focus();
    else
      target.blur();
  }
});

export function populateSettings(elm) {
  elm.append(document.getElementById('shared-settings').content.cloneNode(true));
  elm.querySelector('#m-set-dark').checked = getTheme() === 'dark';
  elm.querySelector('#m-set-theme').addEventListener('change', e =>
    setTheme(e.currentTarget.querySelector(':checked').value));
  elm.querySelector(`#m-set-lang [value=${i18n.lang}]`).checked = true;
  elm.querySelector('#m-set-lang').addEventListener('change', e =>
    i18n.resetLangReload(e.currentTarget.querySelector(':checked').value));
}

export function setTheme(theme) {
  localStorage[lsKeys.theme] = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function getTheme() {
  return localStorage[lsKeys.theme];
}

window.addEventListener('load', () => navigator.serviceWorker.register('sworker.js'));

navigator.serviceWorker.addEventListener('controllerchange', () => {
  navigator.serviceWorker.controller.postMessage('c change');
});

navigator.serviceWorker.addEventListener('message', m => {
  console.log(`w⇒c: ${m.data}`);
});
