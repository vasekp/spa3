const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-keyboard.css"/>
<div id="main">
  <div id="side-left">
    <button data-mod="braille">&#x2800;</button>
    <button data-mod="morse">&#xF008;&#xF009;</button>
    <button data-mod="pigpen">&#xF129;</button>
    <button data-mod="polyb">&#xF146;</button>
    <button data-mod="segm">&#xF1FF;</button>
  </div>
  <div id="side-right">
    <button data-mod="smph">&#xF883;</button>
    <button data-mod="flags">&#xF801;</button>
    <button data-mod="mobile">&#xF00B;</button>
    <button data-mod="digits">123</button>
    <button data-mod="default">Aa</button>
  </div>
  <div id="module"></div>
  <button class="key" id="default" hidden></button>
  <button class="key" id="space">&#x2334;</button>
  <button class="key" id="bsp">&#x232B;</button>
  <button class="key" id="enter">&#x21B5;</button>
</div>`;

function modBraille(cont, defKey) {
  cont.innerHTML = `
  <div id="kbd-braille">
    <div id="kbd-braille-glyph">&#x2800;</div>
    <input type="checkbox" data-value="1"/>
    <input type="checkbox" data-value="2"/>
    <input type="checkbox" data-value="4"/>
    <input type="checkbox" data-value="8"/>
    <input type="checkbox" data-value="16"/>
    <input type="checkbox" data-value="32"/>
  </div>`;

  const state = Object.defineProperty({}, 'value', {
    set(v) {
      this._v = v;
      defKey.textContent
        = cont.querySelector('#kbd-braille-glyph').textContent
        = String.fromCodePoint(0x2800 + v);
      defKey.hidden = false;
    },
    get() {
      return this._v;
    }
  });

  cont.children[0].addEventListener('input', e => {
    state.value ^= +e.target.dataset.value;
  });

  defKey.afterClick = () => {
    state.value = 0;
    defKey.hidden = true;
  };
}

function modFlags(cont) {
  const flgColors = [9, 4, 13, 10, 12, 5, 10, 5, 18, 9, 10, 18, 9, 9, 6, 9, 2, 6, 9, 13, 5, 5, 13, 9, 6, 30];

  cont.innerHTML = `
  <div id="kbd-flags">
    <div id="kbd-flg-colors">
      <input type="checkbox" class="patch c-white" data-color="param" data-value="1"></input>
      <input type="checkbox" class="patch c-yellow" data-color="param" data-value="2"></input>
      <input type="checkbox" class="patch c-red" data-color="param" data-value="4"></input>
      <input type="checkbox" class="patch c-blue" data-color="param" data-value="8"></input>
      <input type="checkbox" class="patch c-black" data-color="param" data-value="16"></input>
    </div>
    <div id="kbd-flg-sugg"></div>
  </div>`;

  function filter() {
    let cond = 0;
    for(const elm of cont.querySelector('#kbd-flg-colors').children)
      if(elm.checked)
        cond += +elm.dataset.value;
    const sugg = cont.querySelector('#kbd-flg-sugg');
    const iter = sugg.children[Symbol.iterator]();
    let count = 0;
    for(let i = 0; i < 26; i++) {
      if((flgColors[i] & cond) === cond) {
        const elm = iter.next().value || (() => {
          const elm = document.createElement('button');
          elm.classList.add('key');
          sugg.appendChild(elm);
          return elm;
        })();
        elm.textContent = String.fromCodePoint(0xF801 + i);
        elm.hidden = false;
        if(++count == 21)
          break;
      }
    }
    let rest;
    while(rest = iter.next().value)
      rest.hidden = true;
  }

  cont.querySelector('#kbd-flg-colors').addEventListener('input', filter);
  filter();
}

function modDigits(cont) {
  cont.innerHTML = `
  <div id="kbd-digits">
    <button class="key">0</button>
    <button class="key">1</button>
    <button class="key">2</button>
    <button class="key">3</button>
    <button class="key">4</button>
    <button class="key">5</button>
    <button class="key">6</button>
    <button class="key">7</button>
    <button class="key">8</button>
    <button class="key">9</button>
    <button class="key">A</button>
    <button class="key">B</button>
    <button class="key">C</button>
    <button class="key">D</button>
    <button class="key">E</button>
    <button class="key">F</button>
  </div>`;
}

class KeyboardElement extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({mode: 'open'});
    root.appendChild(template.content.cloneNode(true));
    this.addEventListener('mousedown', e => e.preventDefault());
    root.addEventListener('click', e => {
      if(!this._target || e.target.tagName !== 'BUTTON')
        return;
      if(e.target.dataset.mod) {
        this.openModule(e.target.dataset.mod);
        return;
      }
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
        case 'default':
          insert(this._target, e.target.textContent);
          if(e.target.afterClick)
            e.target.afterClick();
          break;
        default:
          insert(this._target, e.target.textContent);
          break;
      }
      e.preventDefault();
    });
  }

  openFor(elm, mod) {
    this.openModule(mod);
    this.hidden = false;
    const cb = e => {
      if(!elm.contains(e.relatedTarget))
        this._exit();
    };
    this._exit = () => {
      elm.removeEventListener('focusout', cb);
      this._target = null;
      this.hidden = true;
      elm.removeAttribute('inputmode');
    };
    this._target = elm;
    elm.addEventListener('focusout', cb);
    elm.setAttribute('inputmode', 'none');
    elm.focus();
  }

  openModule(mod) {
    const cont = this.shadowRoot.getElementById('module');
    const defKey = this.shadowRoot.getElementById('default');
    switch(mod) {
      case 'default':
        if(this._exit)
          this._exit();
        break;
      case 'braille':
        modBraille(cont, defKey);
        break;
      case 'flags':
        modFlags(cont);
        break;
      case 'digits':
        modDigits(cont);
        break;
      default:
        cont.innerHTML = '';
        break;
    }
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
