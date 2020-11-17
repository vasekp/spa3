let sendAction = e => e.target.dispatchEvent(new CustomEvent('action', { bubbles: true, cancelable: true }));
window.addEventListener('mousedown', sendAction);
window.addEventListener('keydown', e => { if(e.key === 'Enter') sendAction(e) });
window.addEventListener('touchstart', sendAction);
