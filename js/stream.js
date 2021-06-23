import './components/spa-scroll.js';
import './components/spa-textbox.js';
import _, * as i18n from './i18n.js';

const iface = (() => {
  const func = new Promise((resolve, reject) => {
    try {
      const worker = new Worker('./js/stream-worker.js', {type: 'module'});
      worker.addEventListener('error', e => reject(), {once: true});
      worker.addEventListener('message', e => resolve(worker), {once: true});
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

  return async msg => (await func)(msg);
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
        const dOut = document.createElement('div');
        dOut.classList.add('output');
        dOut.textContent = data.output;
        div.append(dIn, dOut);
        root.getElementById('hist').prepend(div);
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

  textbox.addEventListener('input', e =>
    iface({cmd: 'parse', input: textbox.value}).then(result));
  textbox.addEventListener('tb-submit', e => {
    textbox.disabled = true;
    iface({cmd: 'exec', input: textbox.value}).then(r => {
      textbox.disabled = false;
      result(r);
    })
  });
  return {};
}
