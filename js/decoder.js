import './components/spa-scroll.js';
import './components/spa-textbox.js';
import {decode, DecodeError} from './codec.js';
import Enum from './util/enum.js';
import * as i18n from './i18n.js';

const lsKeys = Enum.fromObj({
  pigpen1: 'dec-pp1',
  pigpen2: 'dec-pp2',
  pigpen3: 'dec-pp3',
  polybius: 'dec-polybius',
});

const defaults = Enum.fromObj({
  pigpen1: 'cz',
  pigpen2: '9-dot',
  pigpen3: '9-dot-4',
  polybius: 'q'
});

const keys = Object.keys(defaults);

export default function(root) {
  const inp = root.getElementById('in');
  const out = root.getElementById('out');

  const conf = [];
  for(const key of keys)
    conf[key] = localStorage[lsKeys[key]] || defaults[key];

  function update() {
    if(out.replaceChildren)
      out.replaceChildren(...markErrors(decode(inp.value, conf)))
    else {
      while(out.lastChild)
        out.removeChild(out.lastChild);
      out.append(...markErrors(decode(inp.value, conf)));
    }
  }

  inp.addEventListener('input', update);

  function populateSettings(cont) {
    cont.append(root.getElementById('module-settings').content.cloneNode(true));
    for(const key of keys)
      cont.querySelector(`input[name="${key}"][data-value="${conf[key]}"]`).checked = true;
    cont.querySelector(`#dcd-set-defaults`).addEventListener('input', e => {
      localStorage[lsKeys[e.target.name]] = e.target.dataset.value;
      conf[e.target.name] = e.target.dataset.value;
      update();
    });
  }

  return { populateSettings };
}

function* markErrors(iter) {
  for(const item of iter) {
    if(item instanceof DecodeError) {
      const span = document.createElement('span');
      span.className = 'err';
      span.textContent = item;
      yield span;
    } else
      yield item;
  }
}
