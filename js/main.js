window.addEventListener('mousedown', e => e.preventDefault()); // click does not grant focus

window.addEventListener('click', e => {
  if(!e.defaultPrevented && document.activeElement)
    document.activeElement.blur();
  e.preventDefault();
});
