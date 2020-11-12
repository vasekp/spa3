window.addEventListener('keydown', e => {
  console.log(e.target);
  if(e.key === 'Enter') {
    e.preventDefault();
    e.target.dispatchEvent(new MouseEvent('click'), {});
  }
});

