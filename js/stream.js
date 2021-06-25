import './components/spa-scroll.js';
import './components/spa-textbox.js';
import _, * as i18n from './i18n.js';

const sendCommand = (() => {
  const func = new Promise((resolve, reject) => {
    try {
      const worker = new Worker('./js/stream-worker.js', {type: 'module'});
      worker.addEventListener('error', () => reject(), {once: true});
      worker.addEventListener('message', () => resolve(worker), {once: true});
      worker.postMessage({cmd: 'ping'});
    } catch(e) {
      reject();
    }
  }).then(worker => {
    console.log('Worker');
    return msg => new Promise(resolve => {
      worker.postMessage(msg);
      worker.addEventListener('message', e => resolve(e.data), {once: true});
    });
  }).catch(() => {
    console.log('Sync');
    const impPromise = import('./stream-worker.js');
    return msg => impPromise.then(imp => imp.exec(msg));
  });

  return async (command, data) => (await func)({cmd: command, ...data});
})();

export default function(root) {
  const textbox = root.getElementById('in');
  const errbox = root.getElementById('error');

  function result(data) {
    if(data.type === 'ok') {
      textbox.mark();
      errbox.hidden = true;
      if(data.cmd === 'exec') {
        const div = document.createElement('div');
        const dIn = document.createElement('div');
        dIn.classList.add('input');
        dIn.textContent = data.input;
        if(data.history)
          dIn.dataset.lead = `$${data.history}`;
        const dOut = document.createElement('div');
        dOut.classList.add('output');
        dOut.textContent = data.output;
        div.append(dIn, dOut);
        root.getElementById('hist').prepend(div);
        root.getElementById('prev').disabled = false;
        textbox.value = '';
      }
    } else {
      textbox.mark(data.pos, data.len);
      if(data.cmd === 'exec') {
        errbox.children[0].textContent = data.input;
        errbox.children[1].textContent = data.msg;
        errbox.hidden = false;
      } else
        errbox.hidden = true;
    };
  }

  function run() {
    const str = textbox.value
      .replace(/^[ \t\n\r]+/, '')
      .replace(/ [\t\n\r]+$/, '');
    if(!str)
      return;
    textbox.disabled = true;
    sendCommand('exec', {input: str}).then(r => {
      textbox.disabled = false;
      result(r);
      textbox.focus();
    })
  }

  function prev() {
    const last = root.getElementById('hist').firstElementChild;
    if(!last)
      return;
    textbox.value = last.firstElementChild.textContent;
    textbox.focus();
  }

  sendCommand('init');
  textbox.addEventListener('input', () =>
    sendCommand('parse', {input: textbox.value}).then(result));
  textbox.addEventListener('keydown', e => {
    if(e.key === 'Enter') {
      run();
      e.preventDefault();
    } else if(e.key === 'ArrowUp') {
      prev();
      e.preventDefault();
    }
  });
  root.getElementById('run').addEventListener('click', run);
  root.getElementById('prev').addEventListener('click', prev);
  return {};
}
