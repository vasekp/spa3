import './components/spa-scroll.js';
import './components/spa-textbox.js';
import Enum from './util/enum.js';
import _, * as i18n from './i18n.js';

const lsKeys = Enum.fromObj({
  register: 'stm-vars'
});

const saveVars = JSON.parse(localStorage[lsKeys.register] || '{}');
const sessVars = {};

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
      const cb = e => {
        if(e.data.type === 'register')
          regEvent(e.data.key, e.data.value, e.data.register);
        else {
          resolve(e.data);
          worker.removeEventListener('message', cb);
        }
      }
      worker.addEventListener('message', cb);
    });
  }).catch(() => {
    console.log('Sync');
    const impPromise = import('./stream-worker.js');
    impPromise.then(imp =>
      imp.et.addEventListener('register', e => regEvent(e.detail.key, e.detail.value, e.detail.register)));
    return msg => impPromise.then(imp => imp.exec(msg));
  });

  return async (command, data) => (await func)({cmd: command, ...data});
})();

export default function(root) {
  const textbox = root.getElementById('in');
  const errbox = root.getElementById('error');
  let histEmpty = true;

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
          dIn.dataset.lead = `$${data.history}:`;
        const dOut = document.createElement('div');
        dOut.classList.add('output');
        dOut.textContent = data.output;
        div.append(dIn, dOut);
        root.getElementById('hist').prepend(div);
        root.getElementById('prev').disabled = false;
        histEmpty = false;
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

  function populateVars() {
    const pDiv = root.getElementById('vars');
    while(pDiv.firstChild)
      pDiv.removeChild(pDiv.firstChild);
    const keys = [].concat(
        [...Object.keys(saveVars)].map(key => [key, 'save']),
        [...Object.keys(sessVars)].map(key => [key, 'sess'])
      ).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    pDiv.append(...keys.map(([key, reg]) => {
        const div = document.createElement('div');
        const dIn = document.createElement('div');
        dIn.classList.add('input');
        dIn.textContent = key;
        dIn.dataset.lead = reg === 'save' ? '(Saved)' : '(Sess)';
        const dOut = document.createElement('div');
        dOut.classList.add('output');
        dOut.textContent = (reg === 'save' ? saveVars : sessVars)[key];
        div.append(dIn, dOut);
        if(reg === 'save' && keys.some(([k, r]) => k === key && r === 'sess'))
          div.classList.add('shadowed');
        return div;
      }));
  }

  sendCommand('init', {vars: Object.entries(saveVars)});
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
  root.getElementById('vars-cb').addEventListener('input', e => {
    const ch = e.currentTarget.checked;
    if(ch)
      populateVars();
    root.getElementById('in').disabled = ch;
    root.getElementById('in').classList.toggle('skipAnim', ch);
    root.getElementById('run').disabled = ch;
    root.getElementById('prev').disabled = ch || histEmpty;
  });
  return {};
}

function regEvent(key, value, register) {
  const local = register === 'save' ? saveVars : sessVars;
  if(value)
    local[key] = value;
  else
    delete local[key];
  if(register === 'save')
    localStorage[lsKeys.register] = JSON.stringify(saveVars);
}
