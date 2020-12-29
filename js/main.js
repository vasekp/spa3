import './components/spa-view.js';
import {Enum} from './util/enum.js';

const lsKeys = Enum.fromObj({
  panels: 'spa-panels'
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
  if(localStorage[lsKeys.panels]) {
    const panels = JSON.parse(localStorage[lsKeys.panels]);
    for(const id in panels) {
      document.getElementById(id).dataset.pos = panels[id].pos;
      document.getElementById(id).dataset.module = panels[id].module;
    }
  } else {
    document.getElementById('v1').dataset.module = 'logbook';
    document.getElementById('v2').dataset.module = 'menu';
    document.getElementById('v3').dataset.module = 'menu';
  }
  document.addEventListener('view-change', () => {
    const panels = {};
    for(const panel of document.querySelectorAll('spa-view'))
      panels[panel.id] = { pos: panel.dataset.pos, module: panel.dataset.module };
    localStorage[lsKeys.panels] = JSON.stringify(panels);
  });
});

/* Element focus handling.
 *
 * The idea is to allow tab navigation while preventing drawing outlines on everything
 * when using mouse / touch. Nevertheless, we can't just globally preventDefault() the
 * mousedown because that would break other default actions than just focus, namely,
 * clicking and selecting within text fields.
 *
 * This is presumably what :focus-visible does but until it is supported in Firefox
 * we'll have to do it manually.
 *
 * The situations we want to handle:
 * body > tabbable > target: YES preventDefault()
 * body > (tabbable) > input > target: NO
 * all other: DON'T CARE
 */
window.addEventListener('mousedown', e => {
  const path = e.composedPath().filter(n => n.nodeType === Node.ELEMENT_NODE);
  const target = path[0];
  const root = target.getRootNode();
  const e0 = target.closest('[data-focus-container]');
  if(!e0 || !e0.contains(root.activeElement))
    e.target.focus(); // This is the <spa-view> due to event retargetting!
  for(const elm of path) {
    if(elm.matches('input[type="text"], textarea, [draggable]'))
      break;
    if(elm.tabIndex === 0)
      e.preventDefault();
  }
});

window.addEventListener('click', e => {
  const target = e.composedPath()[0];
  const e1 = target.closest('label');
  if(!e1 || !e1.control)
    return;
  e1.control.click();
  e.preventDefault();
});

window.addEventListener('keydown', e => {
  const target = e.composedPath()[0];
  if(target.dataset.active)
    if(e.key === 'Enter' || e.key === ' ')
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});

window.addEventListener('auxclick', e => {
  document.documentElement.classList.toggle('dark');
  e.preventDefault();
});
