const sendAction = e => {
  e.target.dispatchEvent(new CustomEvent('action', { bubbles: true, cancelable: true }));
  e.preventDefault();
}

window.addEventListener('mousedown', sendAction);
window.addEventListener('keydown', e => { if(e.key === 'Enter') sendAction(e) });
// mousedown seems to always be fired along with touchstart (I'm yet to see a browser that doesn't do that)
// so we ignore the latter to prevent double action
// window.addEventListener('touchstart', sendAction);

window.addEventListener('action', e => {
  if(e.defaultPrevented)
    return;
  // A click outside the active element blurs it. Granting focus is needless for click and for touch,
  // and keyboard navigation should not be affected. This behaviour can be disabled by e.preventDefault(),
  // primarily when moving focus to a different element in result of an action.
  if(!document.activeElement.contains(e.target))
    document.activeElement.blur();
});
