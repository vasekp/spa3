import debounce from '../util/debounce.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-keyboard.css"/>
<div id="main">
  <div id="side-left">
    <button data-mod="braille">&#x2800;</button>
    <button data-mod="morse">&#xF008;&#xF009;</button>
    <button data-mod="pigpen">&#xF121;</button>
    <button data-mod="polyb">&#xF166;</button>
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
    <input type="checkbox" data-value="1"/>
    <input type="checkbox" data-value="2"/>
    <input type="checkbox" data-value="4"/>
    <input type="checkbox" data-value="8"/>
    <input type="checkbox" data-value="16"/>
    <input type="checkbox" data-value="32"/>
    <svg id="kbd-braille-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-48 -64 96 128">
      <g fill="none" stroke="var(--color-text-light)" stroke-width="1">
        <circle cx="-21" cy="-42" r="12"/>
        <circle cx="-21" cy="0" r="12"/>
        <circle cx="-21" cy="42" r="12"/>
        <circle cx="21" cy="-42" r="12"/>
        <circle cx="21" cy="0" r="12"/>
        <circle cx="21" cy="42" r="12"/>
      </g>
    </svg>
  </div>`;

  const state = Object.defineProperty({}, 'value', {
    set(v) {
      this._v = v;
      defKey.textContent = String.fromCodePoint(0x2800 + v);
      defKey.hidden = v === 0;
    },
    get() {
      return this._v;
    }
  });

  cont.firstElementChild.addEventListener('input', e => {
    state.value &= ~+e.target.dataset.value;
    if(e.target.checked)
      state.value |= +e.target.dataset.value;
  });

  defKey.afterClick = () => {
    state.value = 0;
    for(const cb of cont.querySelectorAll('input'))
      cb.checked = false;
    defKey.hidden = true;
  };
}

function modMorse(cont) {
  cont.innerHTML = `
  <div id="kbd-morse">
    <button class="key">&#xF008;</button>
    <button class="key">&#xF009;</button>
    <button class="key">&#xF00A;</button>
    <button class="key managed" id="kbd-morse-telegraph">&#x25C9</button>
  </div>`;

  const key = cont.querySelector('#kbd-morse-telegraph');

  const debAddSeparator = debounce(x => {
    if(x)
    cont.dispatchEvent(new CustomEvent('kbd-input', {
      detail: { key: String.fromCodePoint(0xF00A) }
    }));
  }, 500);

  let pointer = null;
  let time;
  key.addEventListener('pointerdown', e => {
    if(pointer !== null)
      return;
    pointer = e.pointerId;
    time = e.timeStamp;
    key.setPointerCapture(pointer);
    debAddSeparator(false);
  });
  key.addEventListener('pointerup', e => {
    if(e.pointerId !== pointer)
      return;
    key.releasePointerCapture(pointer);
    const delta = e.timeStamp - time;
    pointer = null;
    cont.dispatchEvent(new CustomEvent('kbd-input', {
      detail: { key: String.fromCodePoint(delta < 250 ? 0xF008 : 0xF009) }
    }));
    debAddSeparator(true);
  });
  key.addEventListener('pointercancel', e => {
    if(e.pointerID === pointer)
      pointer = null;
  })
}

function modPigpen(cont) {
  cont.innerHTML = `
  <div id="kbd-pigpen-cont">
    <div id="kbd-pigpen-border">
      <svg id="kbd-pigpen-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-80 -80 160 160" data-mode="rect">
        <g id="kbd-pigpen-rect" fill="var(--color-text-light)">
          <circle cx="40" cy="40" r="7"/>
          <circle cx="-40" cy="40" r="7"/>
          <circle cx="-40" cy="-40" r="7"/>
          <circle cx="40" cy="-40" r="7"/>
          <path fill="none" stroke="var(--color-text-light)" stroke-width="1" stroke-dasharray="5 5" stroke-dashoffset="2.5" d="M 40 40 H -40 V -40 H 40 z"/>
          <path id="kbd-pigpen-path" fill="none" stroke="var(--color-text-light)" stroke-width="14" stroke-linejoin="round" stroke-linecap="round" d=""/>
        </g>
      </svg>
      <input id="kbd-pigpen-dir" xmlns="http://www.w3.org/1999/xhtml"
        type="checkbox" class="glyph-cb" data-glyph-off="&#xF00D" data-glyph-on="&#xF00C"/>
    </div>
    <div id="kbd-pigpen-sugg">
      <div id="kbd-pigpen-row" hidden>
        <button class="key"></button>
        <button class="key"></button>
        <button class="key"></button>
      </div>
      <div id="kbd-pigpen-row" hidden>
        <button class="key"></button>
        <button class="key"></button>
        <button class="key"></button>
      </div>
      <div id="kbd-pigpen-row" hidden>
        <button class="key"></button>
        <button class="key"></button>
      </div>
    </div>
  </div>
  `;

  const diag = cont.querySelector('#kbd-pigpen-dir');
  const svg = cont.querySelector('#kbd-pigpen-svg');
  const path = cont.querySelector('#kbd-pigpen-path');
  const sugg = cont.querySelector('#kbd-pigpen-sugg');
  let pointer = null;
  let cRect = null;
  let arr = [];

  diag.addEventListener('input', () => {
    svg.dataset.mode = diag.checked ? 'diag' : 'rect';
    path.setAttribute('d', '');
  });

  function adjacent(a, b) {
    const d = a ^ b;
    return !(d & (d-1));
  }

  function xya(e) {
    let x = (e.clientX - cRect.left) / cRect.width * 160 - 80;
    let y = (e.clientY - cRect.top) / cRect.height * 160 - 80;
    if(diag.checked)
      [x, y] = [0.7071*(y + x), 0.7071*(y - x)];
    let a = (y > 0 ? 2 : 0) + (x > 0 ? 1 : 0);
    return [x, y, a];
  }

  function buildPath(arr, cur) {
    if(cur)
      return `M ${cur[0]} ${cur[1]} L` + arr.map(a => ` ${a&1?40:-40} ${a&2?40:-40}`).join();
    else
      return `M ` + arr.map(a => ` ${a&1?40:-40} ${a&2?40:-40}`).join(' L ');
  }

  const wRect = [6, 14, 12, 7, 15, 13, 3, 11, 9];
  const wDiag = [6, 3, 12, 9];

  function updateSugg() {
    let w = 0;
    for(let i = 1; i < arr.length; i++) {
      const flip = arr[i] ^ arr[i - 1];
      const other = arr[i] & (flip ^ 3);
      const bit = flip === 1
        ? other ? 2 : 0
        : other ? 1 : 3;
      w |= 1 << bit;
    }
    const i = (diag.checked ? wDiag : wRect).indexOf(w);
    const keys = [];
    if(i >= 0) {
      if(!diag.checked) {
        keys.push([], []);
        for(let j = 0; j < 3; j++) {
          keys[0].push(0xF100 + 3*i + j);
          keys[1].push(0xF140 + 3*i + j);
        }
        keys[2] = [0xF120 + 2*i, 0xF120 + 2*i + 1];
      } else {
        keys[2] = [0xF132 + 2*i, 0xF132 + 2*i + 1];
      }
    }
    for(let j = 0; j < 3; j++) {
      const row = sugg.children[j];
      if(keys[j]) {
        for(let k = 0; k < keys[j].length; k++)
          row.children[k].textContent = String.fromCodePoint(keys[j][k]);
        row.hidden = false;
      } else
        row.hidden = true;
    }
  }

  svg.addEventListener('pointerdown', e => {
    if(pointer !== null)
      return;
    pointer = e.pointerId;
    cRect = svg.getBoundingClientRect();
    const [x, y, a] = xya(e);
    arr = [a];
  });

  svg.addEventListener('pointermove', e => {
    if(e.pointerId !== pointer)
      return;
    const [x, y, a] = xya(e);
    if(adjacent(a, arr[0])) {
      const i = arr.indexOf(a);
      if(i == -1 || i == 3)
        arr.unshift(a);
    }
    if(arr.length == 5) {
      path.setAttribute('d', buildPath(arr));
      pointer = null;
      updateSugg();
    } else
      path.setAttribute('d', buildPath(arr, [x, y]));
  });

  svg.addEventListener('pointerup', e => {
    if(e.pointerId !== pointer)
      return;
    path.setAttribute('d', buildPath(arr));
    pointer = null;
    updateSugg();
  });

  svg.addEventListener('pointercancel', e => {
    if(e.pointerId !== pointer)
      return;
    path.setAttribute('d', '');
    pointer = null;
    updateSugg();
  });

  sugg.addEventListener('click', () => {
    path.setAttribute('d', '');
    arr = [];
    pointer = null;
    updateSugg();
  });
};

function modPolybius(cont, defKey) {
  cont.innerHTML = `
  <div id="kbd-polybius">
    <div id="kbd-plb-vert">
      <input type="radio" name="kbd-plb-vert" class="patch radio" data-coord="0" data-content="1">
      <input type="radio" name="kbd-plb-vert" class="patch radio" data-coord="0" data-content="2">
      <input type="radio" name="kbd-plb-vert" class="patch radio" data-coord="0" data-content="3">
      <input type="radio" name="kbd-plb-vert" class="patch radio" data-coord="0" data-content="4">
      <input type="radio" name="kbd-plb-vert" class="patch radio" data-coord="0" data-content="5">
    </div>
    <div id="kbd-plb-horz">
      <input type="radio" name="kbd-plb-horz" class="patch radio" data-coord="1" data-content="1">
      <input type="radio" name="kbd-plb-horz" class="patch radio" data-coord="1" data-content="2">
      <input type="radio" name="kbd-plb-horz" class="patch radio" data-coord="1" data-content="3">
      <input type="radio" name="kbd-plb-horz" class="patch radio" data-coord="1" data-content="4">
      <input type="radio" name="kbd-plb-horz" class="patch radio" data-coord="1" data-content="5">
    </div>
  </div>`;

  const deselect = () => {
    for(const elm of cont.querySelectorAll(':checked'))
      elm.checked = false;
  };

  const dbConfirm = debounce(() => {
    cont.dispatchEvent(new CustomEvent('kbd-input', {
      detail: { key: defKey.textContent }
    }));
    defKey.hidden = true;
    deselect();
  }, 500);

  defKey.afterClick = () => {
    defKey.hidden = true;
    deselect();
  };

  cont.firstElementChild.addEventListener('input', () => {
    const q = cont.querySelectorAll(':checked');
    if(q.length === 2) {
      const coord = [];
      for(const elm of q)
        coord[+elm.dataset.coord] = +elm.dataset.content - 1;
      defKey.textContent = String.fromCodePoint(0xF160 + 5 * coord[0] + coord[1]);
      defKey.hidden = false;
      dbConfirm();
    }
  });
}

function modSegment(cont, defKey) {
  cont.innerHTML = `
  <div id="kbd-sgm">
    <div class="kbd-sgm-glyph" id="kbd-sgm-back">&#xF1FF;</div>
    <div class="kbd-sgm-glyph" id="kbd-sgm-fore">&#xF180;</div>
  </div>`;

  const state = Object.defineProperty({}, 'value', {
    set(v) {
      this._v = v;
      defKey.textContent
        = cont.querySelector('#kbd-sgm-fore').textContent
        = String.fromCodePoint(0xF180 + v);
      defKey.hidden = v === 0;
    },
    get() {
      return this._v;
    }
  });

  cont.firstElementChild.addEventListener('pointerdown', e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.right) / 2) / rect.height * 3; // not a typo
    const y = -(e.clientY - (rect.top + rect.bottom) / 2) / rect.height * 3;
    const sgm = (() => {
      if(Math.abs(x) + Math.abs(y) < 1/2)
        return 6;
      else if(Math.abs(x) > Math.abs(Math.abs(y) - 1/2))
        return x > 0
          ? (y > 0 ? 1 : 2)
          : (y > 0 ? 5 : 4);
      else
        return (y > 0 ? 0 : 3);
    })();
    state.value ^= 1 << sgm;
  });

  defKey.afterClick = () => {
    state.value = 0;
    defKey.hidden = true;
  };
}

function modSemaphore(cont, defKey) {
  cont.innerHTML = `
  <svg id="kbd-smp" xmlns="http://www.w3.org/2000/svg" viewBox="-80 -80 160 160">
    <defs>
      <g id="flag">
        <path d="M -15 15 L 15 15 -15 -15 z" fill="#FF0"/>
        <path d="M 15 -15 L 15 15 -15 -15 z" fill="#F00"/>
        <path d="M -15 -15 L -15 15 15 15 m 0 0 L -15 -15 15 -15 z" fill="none"
          stroke="currentcolor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </defs>
    <use href="#flag" data-pos="0" x="0" y="60"/>
    <use href="#flag" data-pos="1" x="-42" y="42"/>
    <use href="#flag" data-pos="2" x="-60" y="0"/>
    <use href="#flag" data-pos="3" x="-42" y="-42"/>
    <use href="#flag" data-pos="4" x="0" y="-60"/>
    <use href="#flag" data-pos="5" x="42" y="-42"/>
    <use href="#flag" data-pos="6" x="60" y="0"/>
    <use href="#flag" data-pos="7" x="42" y="42"/>
  </svg>`;

  const sel = [];

  const deselect = () => {
    for(const elm of cont.querySelectorAll('use'))
      elm.classList.remove('selected');
    sel.splice(0);
  };

  const dbConfirm = debounce(() => {
    if(sel.length !== 2)
      return;
    cont.dispatchEvent(new CustomEvent('kbd-input', {
      detail: { key: defKey.textContent }
    }));
    defKey.hidden = true;
    deselect();
  }, 500);

  defKey.afterClick = () => {
    defKey.hidden = true;
    deselect();
  };

  cont.firstElementChild.addEventListener('click', e => {
    if(e.target.tagName != 'use')
      return;
    const pos = e.target.dataset.pos;
    if(sel.includes(pos))
      sel.splice(sel.indexOf(pos), 1);
    else {
      sel.push(pos);
      while(sel.length > 2)
        sel.shift();
    }
    for(const elm of cont.querySelectorAll('use'))
      elm.classList.toggle('selected', sel.includes(elm.dataset.pos));
    if(sel.length == 2) {
      const code = 0xF880 + 8 * Math.min(sel[0], sel[1]) + Math.max(sel[0], sel[1]);
      defKey.textContent = String.fromCodePoint(code);
      defKey.hidden = false;
      dbConfirm();
    } else
      defKey.hidden = true;
  });
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

function modMobile(cont) {
  cont.innerHTML = `
  <div id="kbd-mobile">
    <button class="key managed" data-digit="1" data-letters=" "><ruby>1<rt>&#x2334;</rt></ruby></button>
    <button class="key managed" data-digit="2" data-letters="ABC"><ruby>2<rt>ABC</rt></ruby></button>
    <button class="key managed" data-digit="3" data-letters="DEF"><ruby>3<rt>DEF</rt></ruby></button>
    <button class="key managed" data-digit="4" data-letters="GHI"><ruby>4<rt>GHI</rt></ruby></button>
    <button class="key managed" data-digit="5" data-letters="JKL"><ruby>5<rt>JKL</rt></ruby></button>
    <button class="key managed" data-digit="6" data-letters="MNO"><ruby>6<rt>MNO</rt></ruby></button>
    <button class="key managed" data-digit="7" data-letters="PQRS"><ruby>7<rt>PQRS</rt></ruby></button>
    <button class="key managed" data-digit="8" data-letters="TUV"><ruby>8<rt>TUV</rt></ruby></button>
    <button class="key managed" data-digit="9" data-letters="WXYZ"><ruby>9<rt>WXYZ</rt></ruby></button>
  </div>`;

  const repl = [];
  for(const elm of cont.firstElementChild.children) {
    const dig = elm.dataset.digit;
    const chain = elm.dataset.letters + dig + elm.dataset.letters[0];
    repl[+dig] = (c) => {
      if(c.length === 1 && chain.includes(c))
        return chain[chain.indexOf(c) + 1];
      else
        return chain[0];
    };
  }

  let lastDigit = 0;

  cont.firstElementChild.addEventListener('click', e => {
    const tgt = e.target.closest('button');
    if(!tgt)
      return;
    const digit = +tgt.dataset.digit;
    const append = (lastDigit !== 0 && digit !== lastDigit);
    lastDigit = digit;
    cont.dispatchEvent(new CustomEvent('kbd-input', {
      detail: { func: repl[digit], append, select: true }
    }));
  });
}

function modDigits(cont) {
  cont.innerHTML = `
  <div id="kbd-digits">
    <div>
      <button class="key">0</button>
      <button class="key">1</button>
      <button class="key">2</button>
      <button class="key">3</button>
      <button class="key">4</button>
    </div>
    <div>
      <button class="key">5</button>
      <button class="key">6</button>
      <button class="key">7</button>
      <button class="key">8</button>
      <button class="key">9</button>
    </div>
    <div>
      <button class="key">A</button>
      <button class="key">B</button>
      <button class="key">C</button>
      <button class="key">D</button>
      <button class="key">E</button>
      <button class="key">F</button>
    </div>
  </div>`;
}

const modules = {
  braille: modBraille,
  morse: modMorse,
  pigpen: modPigpen,
  polyb: modPolybius,
  segm: modSegment,
  smph: modSemaphore,
  flags: modFlags,
  mobile: modMobile,
  digits: modDigits,
};

class KeyboardElement extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({mode: 'open'});
    root.appendChild(template.content.cloneNode(true));
    this.addEventListener('mousedown', e => e.preventDefault());
    root.addEventListener('click', e => {
      if(e.target.dataset.mod) {
        this.openModule(e.target.dataset.mod);
        return;
      }
      if(!this._target || e.target.tagName !== 'BUTTON'
          || !e.target.classList.contains('key') || e.target.classList.contains('managed'))
        return;
      switch(e.target.id) {
        case 'space':
          insert(this._target, ' ');
          break;
        case 'enter':
          insert(this._target, '\n');
          break;
        case 'bsp':
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
    let bspTimer = null;
    root.getElementById('bsp').addEventListener('pointerdown', () => {
      bspace(this._target);
      bspTimer = setTimeout(() => {
        bspTimer = setInterval(() => bspace(this._target), 100);
      }, 500);
    });
    for(const n of ['pointerup', 'pointercancel'])
      root.getElementById('bsp').addEventListener(n, () => clearTimeout(bspTimer));
    root.getElementById('module').addEventListener('kbd-input', e => {
      const tgt = this._target;
      if(!tgt)
        return;
      const newText = e.detail.func
        ? e.detail.func(tgt.value.substring(tgt.selectionStart, tgt.selectionEnd))
        : e.detail.key;
      insert(tgt, newText, { append: e.detail.append, select: e.detail.select });
      if(e.detail.select)
        dbConfirm(tgt);
    });
  }

  openFor(elm, mod) {
    this.openModule(mod);
    this.hidden = false;
    const cb = e => {
      if(e.relatedTarget === this) {
        this._target.focus();
        return;
      }
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
    if(mod === 'default') {
      if(this._exit)
        this._exit();
    } else
      modules[mod](cont, defKey);
  }
}

const dbConfirm = debounce(elm => elm.selectionStart = elm.selectionEnd, 500);

function insert(tgt, key, opts = {}) {
  if(opts.append)
    tgt.selectionStart = tgt.selectionEnd;
  tgt.setRangeText(key, tgt.selectionStart, tgt.selectionEnd, opts.select ? 'select' : 'end');
  tgt.dispatchEvent(new CustomEvent('input'));
}

function bspace(tgt) {
  if(tgt.selectionStart == tgt.selectionEnd && tgt.selectionStart > 0)
    tgt.selectionStart--;
  tgt.setRangeText('');
  tgt.dispatchEvent(new CustomEvent('input'));
}

window.customElements.define('spa-keyboard', KeyboardElement);
