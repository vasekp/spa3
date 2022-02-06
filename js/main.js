import './components/spa-view.js';
import './components/spa-keyboard.js';
import Enum from './util/enum.js';
import _, * as i18n from './i18n.js';

const lsKeys = Enum.fromObj({
  views: 'spa-views',
  size: 'spa-size',
  theme: 'spa-theme',
});

/* As of now there seems to be no other way than JS to condition layout on container size. */
const ro = new ResizeObserver(entries => {
  let change = false;
  for(const entry of entries) {
    const view = entry.target;
    const width = view.clientWidth;
    const size = width === 0 ? ''
      : width <= 400 ? 'small'
      : width <= 600 ? 'mid'
      : 'full';
    view.dataset.size = size;
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  setTheme(getTheme(), false);
  setSize(getSize(), false);
  await i18n.loadTrans(`trans/${i18n.lang}/main.json`);
  document.title = _('title');
  for(const view of document.querySelectorAll('spa-view'))
    ro.observe(view);
  const views = localStorage[lsKeys.views]
    ? JSON.parse(localStorage[lsKeys.views])
    : { main: 'list', aux1: 'list', aux2: 'list' };
  for(const id in views)
    loadModule(id, views[id]);
  document.getElementById('shared-settings').innerHTML = await i18n.loadTemplate('html/shared-settings.html');
  /* Generate manifest */
  const manifest = JSON.parse(await i18n.loadTemplate('manifest.json'));
  if(getTheme() === 'dark')
    manifest.background_color = manifest.theme_color = '#000000';
  const urlPrefix = document.URL.substring(0, document.URL.lastIndexOf('/') + 1);
  manifest.start_url = urlPrefix + manifest.start_url;
  for(const entry of manifest.icons)
    entry.src = urlPrefix + entry.src;
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = URL.createObjectURL(blob);
  document.head.appendChild(link);
  /* Check for updates */
  if(navigator.serviceWorker && navigator.serviceWorker.controller)
    navigator.serviceWorker.controller.postMessage({ dryrun: true });
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

export function loadModule(target, module, req = false) {
  const view = document.getElementById(target);
  if(view.dataset.module === module)
    return;
  if(module !== 'list')
    for(const other of document.querySelectorAll('spa-view')) {
      if(other.id !== target && other.dataset.module === module) {
        view.id = other.id;
        other.id = target;
        saveViews();
        return;
      }
    }
  view.loadModule(module).catch(_ => view.loadModule('list')).then(saveViews);
}

function saveViews() {
  const views = {};
  for(const view of document.querySelectorAll('spa-view'))
    views[view.id] = view.dataset.module;
  localStorage[lsKeys.views] = JSON.stringify(views);
}

export function populateSettings(elm) {
  elm.append(document.getElementById('shared-settings').content.cloneNode(true));
  elm.querySelector('#m-set-dark').checked = getTheme() === 'dark';
  elm.querySelector('#m-set-theme').addEventListener('change', e =>
    setTheme(e.currentTarget.querySelector(':checked').value));
  elm.querySelector(`#m-set-size [value="${getSize()}"]`).checked = true;
  elm.querySelector('#m-set-size').addEventListener('change', e =>
    setSize(e.currentTarget.querySelector(':checked').value));
  elm.querySelector(`#m-set-lang [value="${i18n.lang}"]`).checked = true;
  elm.querySelector('#m-set-lang').addEventListener('change', e =>
    i18n.resetLangReload(e.currentTarget.querySelector(':checked').value));
  elm.querySelector('#m-set-update-label').innerText = document.body.dataset.oldVersion ? _('updates') : _('first download');
  elm.querySelector('#m-set-update-now').dataset.updateSize = document.body.dataset.updateSize;
  elm.querySelector('#m-set-update-now').addEventListener('click',
    () => window.dispatchEvent(new CustomEvent('update-click')));
  const thisModal = elm.closest('spa-modal');
  const shareModal = elm.querySelector('#m-share-modal');
  thisModal.after(shareModal);
  elm.querySelector('#m-set-share').addEventListener('click', e => {
    thisModal.hide();
    shareModal.show();
  });
  shareModal.addEventListener('click', () => shareModal.hide());
}

function setTheme(theme, save = true) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  if(save)
    localStorage[lsKeys.theme] = theme;
}

function getTheme() {
  return localStorage[lsKeys.theme] || 'light';
}

function setSize(size, save = true) {
  document.documentElement.dataset.size = size;
  if(save)
    localStorage[lsKeys.size] = size;
}

function getSize() {
  return localStorage[lsKeys.size] || 'S';
}

const url = new URL(document.URL);
if(url.protocol === 'https:' && url.host !== 'localhost' && navigator.serviceWorker) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sworker.js'));

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    navigator.serviceWorker.controller.postMessage({ dryrun: true });
  });

  navigator.serviceWorker.addEventListener('message', m => {
    switch(m.data.update) {
      case 'available': {
        const sizeText = (size => {
          if(size < 1024)
            return '< 1 kB';
          size /= 1024;
          if(size < 1000)
            return `${Math.round(size)} kB`;
          size /= 1024;
          return `${Math.round(size * 10) / 10} MB`;
        })(m.data.dlSize);
        document.body.dataset.updateSize = sizeText;
        if(m.data.oldV)
          document.body.dataset.oldVersion = m.data.oldV;
        break;
      }
      case 'updated':
        location.reload();
        break;
    }
  });

  window.addEventListener('update-click', () => {
    navigator.serviceWorker.controller.postMessage({ dryrun: false });
  });
}
