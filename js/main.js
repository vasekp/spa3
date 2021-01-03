import './components/spa-view.js';
import {Enum} from './util/enum.js';

const lsKeys = Enum.fromObj({
  views: 'spa-views',
  theme: 'spa-theme',
});

/* As of now there seems to be no other way than JS to condition layout on container size. */
const ro = new ResizeObserver(entries => {
  for(const entry of entries) {
    const view = entry.target;
    const width = view.clientWidth;
    view.dataset.size = width <= 400 ? 'small' : width <= 600 ? 'mid' : 'full';
  }
});

window.addEventListener('DOMContentLoaded', () => {
  for(const view of document.querySelectorAll('spa-view'))
    ro.observe(view);
  setTheme(localStorage[lsKeys.theme] || 'light');
  if(localStorage[lsKeys.views]) {
    const views = JSON.parse(localStorage[lsKeys.views]);
    for(const pos in views)
      document.querySelector(`spa-view[data-pos="${pos}"]`).dataset.module = views[pos];
  } else {
    document.getElementById('v1').dataset.module = 'logbook';
    document.getElementById('v2').dataset.module = 'menu';
    document.getElementById('v3').dataset.module = 'menu';
  }
  document.addEventListener('view-change', () => {
    const views = {};
    for(const view of document.querySelectorAll('spa-view'))
      views[view.dataset.pos] = view.dataset.module;
    localStorage[lsKeys.views] = JSON.stringify(views);
  });
});

window.addEventListener('keydown', e => {
  const target = e.composedPath()[0];
  if(+target.dataset.active)
    if(e.key === 'Enter' || e.key === ' ')
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});

export function populateSettings(elm) {
  elm.append(document.getElementById('shared-settings').content.cloneNode(true));
  elm.querySelector('#m-set-dark').checked = getTheme() === 'dark';
  elm.querySelector('#m-set-theme').addEventListener('change', e =>
    setTheme(e.currentTarget.querySelector(':checked').value));
}

export function setTheme(theme) {
  localStorage[lsKeys.theme] = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function getTheme() {
  return localStorage[lsKeys.theme];
}
