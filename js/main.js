/* Element focus handling.
 *
 * The idea is to allow tab navigation while preventing drawing outlines on everything
 * when using mouse / touch. Nevertheless, we can't just globally preventDefault() the
 * mousedown because that would break other default actions than just focus, namely,
 * clicking and selecting within text fields.
 *
 * The situations we want to handle:
 * body > tabbale > target: YES preventDefault()
 * body > (tabbable) > input > target: NO
 * all other: DON'T CARE
 */
window.addEventListener('mousedown', e => {
  let e0 = e.target.closest('[data-focus-container]');
  if(!e0 || !e0.contains(document.activeElement))
    document.activeElement.blur();
  let e1 = e.target.closest('button, [tabindex]');
  if(!e1)
    return;
  let e2 = e.target.closest('input, textarea');
  if(!e1.contains(e2))
    e.preventDefault();
});

window.addEventListener('keydown', e => {
  if(e.target.dataset.active)
    if(e.key === 'Enter' || e.key === ' ')
      e.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
