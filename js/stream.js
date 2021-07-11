import './components/spa-scroll.js';
import './components/spa-textbox.js';
import Enum from './util/enum.js';
import _, * as i18n from './i18n.js';

const lsKeys = Enum.fromObj({
  register: 'stm-vars'
});

const views = Enum.fromArray(['prompt', 'vars', 'browse']);

const saveVars = JSON.parse(localStorage[lsKeys.register] || '{}');
const sessVars = {};

const sendCommand = (() => {
  let id = 0;
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
    worker.addEventListener('message', e => {
      if(e.data.type === 'register')
        regEvent(e.data.key, e.data.value, e.data.register);
    });
    return msg => new Promise(resolve => {
      let thisID = id;
      worker.postMessage({...msg, id});
      const cb = e => {
        if(e.data.id === thisID) {
          resolve(e.data);
          worker.removeEventListener('message', cb);
        }
      }
      worker.addEventListener('message', cb);
      id++;
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
        div.classList.add('item');
        const dIn = document.createElement('div');
        dIn.classList.add('input');
        dIn.textContent = data.input;
        dIn.dataset.cmd = data.input;
        if(data.history)
          dIn.dataset.lead = `$${data.history}:`;
        const dOut = document.createElement('div');
        dOut.classList.add('output');
        dOut.textContent = data.output;
        div.append(dIn, dOut);
        root.getElementById('hist').prepend(div);
        root.getElementById('prev').disabled = false;
        div.scrollIntoView();
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
    if(!keys.length) {
      errbox.children[0].textContent = '';
      errbox.children[1].textContent = _('stm:no vars');
      errbox.hidden = false;
    }
    pDiv.append(...keys.map(([key, reg]) => {
        const div = document.createElement('div');
        const dIn = document.createElement('div');
        dIn.classList.add('input');
        dIn.textContent = key;
        dIn.dataset.lead = reg === 'save' ? _('stm:saved') : _('stm:session');
        const dOut = document.createElement('div');
        dOut.classList.add('output');
        dOut.textContent = (reg === 'save' ? saveVars : sessVars)[key];
        div.append(dIn, dOut);
        if(reg === 'save' && keys.some(([k, r]) => k === key && r === 'sess'))
          div.classList.add('shadowed');
        return div;
      }));
  }

  function histclear() {
    sendCommand('histclear', {vars: Object.entries(saveVars)})
    const pDiv = root.getElementById('hist');
    while(pDiv.firstChild)
      pDiv.removeChild(pDiv.firstChild);
  }

  function browse(e) {
    const div = e.target.closest('.item');
    if(!div)
      return;
    const pDiv = root.getElementById('browse');
    while(pDiv.firstChild)
      pDiv.removeChild(pDiv.firstChild);
    state.view = views.browse;
    pDiv.scrollTop = 0;
    sendCommand('browse', {input: div.firstElementChild.dataset.cmd}).then(async data => {
      const handle = data.handle;
      for(let cnt = 1; ; cnt++) {
        // Firefox compositor would not kick in here otherwise
        if(cnt % 20 === 0)
          await new Promise(resolve => setTimeout(resolve, 1));
        await pDiv.loadMore;
        const data = await sendCommand('next', {handle});
        if(!data.output) // XXX errors
          return;
        const div = document.createElement('div');
        const dIn = document.createElement('div');
        dIn.classList.add('input');
        dIn.textContent = data.ntype;
        dIn.dataset.cmd = data.input;
        dIn.dataset.lead = `[${cnt}]:`;
        const dOut = document.createElement('div');
        dOut.classList.add('output');
        dOut.textContent = data.output;
        div.append(dIn, dOut);
        div.classList.add('item');
        pDiv.append(div);
      }
    });
  }

  const viewRadios = {};
  const main = root.querySelector('main');
  for(const view in views) {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'view';
    input.value = view;
    viewRadios[view] = input;
    main.prepend(input);
  }

  const state = {
    get view() {
      return root.querySelector('input[name="view"]:checked').value;
    },
    set view(v) {
      viewRadios[v].checked = true;
      root.getElementById('run').disabled = !(v === views.prompt);
      root.getElementById('prev').disabled = !(v === views.prompt && !histEmpty);
      root.getElementById('clear').disabled = !(v === views.prompt);
      root.getElementById('view').dataset.content = v === views.prompt ? '=' : '\u21A9';
    }
  }
  state.view = views.prompt;

  sendCommand('init', {vars: Object.entries(saveVars)});
  textbox.addEventListener('input', () =>
    sendCommand('parse', {input: textbox.value}).then(result));
  textbox.addEventListener('keydown', e => {
    if(e.key === 'Enter') {
      run();
      e.preventDefault();
    } else if(e.key === 'ArrowUp' && e.currentTarget.value === '') {
      prev();
      e.preventDefault();
    }
  });
  root.getElementById('run').addEventListener('click', run);
  root.getElementById('prev').addEventListener('click', prev);
  root.getElementById('clear').addEventListener('click', histclear);
  root.getElementById('view').addEventListener('click', e => {
    textbox.mark();
    errbox.hidden = true;
    switch(state.view) {
      case views.prompt:
        populateVars();
        state.view = views.vars;
        break;
      default:
        state.view = views.prompt;
    }
    root.getElementById('in').classList.toggle('skipAnim', state.view !== views.prompt);
  });
  root.getElementById('in').addEventListener('focusin', () => state.view = views.prompt);
  root.getElementById('hist').addEventListener('click', e => browse(e));
  root.getElementById('browse').addEventListener('click', e => browse(e));
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
