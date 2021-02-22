const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-keyboard.css"/>
<div id="main">
  <button class="key" id="space">&#x2334;</button>
  <button class="key" id="bsp">&#x232B;</button>
  <button class="key" id="enter">&#x21B5;</button>
</div>`;

class KeyboardElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.addEventListener('mousedown', e => e.preventDefault());
    this.shadowRoot.addEventListener('click', e => {
      if(!this._target || e.target.tagName !== 'BUTTON')
        return;
      switch(e.target.id) {
        case 'space':
          insert(this._target, ' ');
          break;
        case 'enter':
          insert(this._target, '\n');
          break;
        case 'bsp':
          bspace(this._target);
          break;
        default:
          insert(this._target, e.target.textContent);
          break;
      }
      e.preventDefault();
    });
  }

  openFor(elm) {
    this.hidden = false;
    const cb = e => {
      if(!elm.contains(e.relatedTarget)) {
        this.hidden = true;
        elm.removeEventListener('focusout', cb);
        this._target = null;
        elm.removeAttribute('inputmode');
      }
    };
    this._target = elm;
    elm.addEventListener('focusout', cb);
    elm.setAttribute('inputmode', 'none');
    elm.focus();
  }
}

function insert(tgt, key) {
  tgt.setRangeText(key, tgt.selectionStart, tgt.selectionEnd, "end");
  tgt.dispatchEvent(new CustomEvent('input'));
}

function bspace(tgt) {
  if(tgt.selectionStart == tgt.selectionEnd && tgt.selectionStart > 0)
    tgt.selectionStart--;
  tgt.setRangeText('');
  tgt.dispatchEvent(new CustomEvent('input'));
}

window.customElements.define('spa-keyboard', KeyboardElement);
