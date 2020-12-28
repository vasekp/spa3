import './components/spa-view.js';

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
    ro.observe(view)
});

/* Element focus handling.
 *
 * The idea is to allow tab navigation while preventing drawing outlines on everything
 * when using mouse / touch. Nevertheless, we can't just globally preventDefault() the
 * mousedown because that would break other default actions than just focus, namely,
 * clicking and selecting within text fields.
 *
 * The situations we want to handle:
 * body > tabbable > target: YES preventDefault()
 * body > (tabbable) > input > target: NO
 * all other: DON'T CARE
 */
window.addEventListener('mousedown', e => {
  const target = e.composedPath()[0];
  const root = target.getRootNode();
  let e0 = target.closest('[data-focus-container]');
  if(!e0 || !e0.contains(root.activeElement))
    document.activeElement.blur();
  let e1 = target.closest('button, input:not([type="text"]), [tabindex]');
  if(!e1)
    return;
  let e2 = target.closest('input[type="text"], textarea');
  if(!e1.contains(e2))
    e.preventDefault();
});

window.addEventListener('click', e => {
  const target = e.composedPath()[0];
  let e1 = target.closest('label');
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
