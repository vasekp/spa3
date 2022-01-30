import './spa-scroll.js';
import debounce from '../util/debounce.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-keyboard.css"/>
<div id="main">
  <div id="side-left">
    <button data-mod="braille">&#x2800;</button>
    <button data-mod="morse">&#xF008;&#xF009;</button>
    <button data-mod="pigpen">&#xF121;</button>
    <button data-mod="polyb">&#xF163;</button>
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
  <button class="key" id="cancel" hidden>&#x21A9;</button>
  <button class="key" id="space">&#x2334;</button>
  <button class="key" id="bsp">&#x232B;</button>
  <button class="key" id="enter">&#x21B5;</button>
</div>`;

function modBraille(cont, defKey, cancelKey) {
  cont.innerHTML = `
  <div id="kbd-braille">
    <input type="checkbox" data-value="1"/>
    <input type="checkbox" data-value="2"/>
    <input type="checkbox" data-value="4"/>
    <input type="checkbox" data-value="8"/>
    <input type="checkbox" data-value="16"/>
    <input type="checkbox" data-value="32"/>
    <svg id="kbd-braille-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-48 -64 96 128">
      <g fill="none" stroke="currentcolor" stroke-width="1">
        <circle cx="-21" cy="-42" r="12"/>
        <circle cx="-21" cy="0" r="12"/>
        <circle cx="-21" cy="42" r="12"/>
        <circle cx="21" cy="-42" r="12"/>
        <circle cx="21" cy="0" r="12"/>
        <circle cx="21" cy="42" r="12"/>
      </g>
      <g font-size="12" text-anchor="middle" fill="currentcolor">
        <text x="-21" y="-38">1</text>
        <text x="-21" y="4">2</text>
        <text x="-21" y="46">3</text>
        <text x="21" y="-38">4</text>
        <text x="21" y="4">5</text>
        <text x="21" y="46">6</text>
      </g>
    </svg>
  </div>`;

  const state = Object.defineProperty({}, 'value', {
    set(v) {
      this._v = v;
      defKey.textContent = String.fromCodePoint(0x2800 + v);
      defKey.hidden = v === 0;
      cancelKey.hidden = v === 0;
    },
    get() {
      return this._v;
    }
  });

  const reset = () => {
    state.value = 0;
    for(const cb of cont.querySelectorAll('input'))
      cb.checked = false;
    defKey.hidden = true;
  };

  cont.firstElementChild.addEventListener('input', e => {
    state.value &= ~+e.target.dataset.value;
    if(e.target.checked)
      state.value |= +e.target.dataset.value;
  });

  return { reset };
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
      bubbles: true,
      detail: { key: String.fromCodePoint(0xF00A) }
    }));
  }, 500);

  let pointer = null;
  let time;
  key.addEventListener('pointerdown', e => {
    if(pointer !== null)
      return;
    pointer = e.pointerId;
    key.setPointerCapture(pointer);
    time = e.timeStamp;
    debAddSeparator(false);
  });
  key.addEventListener('pointerup', e => {
    if(e.pointerId !== pointer)
      return;
    key.releasePointerCapture(pointer);
    pointer = null;
    const delta = e.timeStamp - time;
    cont.dispatchEvent(new CustomEvent('kbd-input', {
      bubbles: true,
      detail: { key: String.fromCodePoint(delta < 250 ? 0xF008 : 0xF009) }
    }));
    debAddSeparator(true);
  });
  key.addEventListener('pointercancel', e => {
    key.releasePointerCapture(pointer);
    if(e.pointerID === pointer)
      pointer = null;
  })
}

function modPigpen(cont, defKey, cancelKey) {
  cont.innerHTML = `
  <div id="kbd-pigpen-cont" data-mode="rect">
    <div id="kbd-pigpen-rect">
      <svg class="kbd-pigpen-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100" data-mode="rect" data-diag="0">
        <g class="kbd-pigpen-rect" fill="currentcolor">
          <circle cx="30" cy="30" r="5"/>
          <circle cx="-30" cy="30" r="5"/>
          <circle cx="-30" cy="-30" r="5"/>
          <circle cx="30" cy="-30" r="5"/>
          <path fill="none" stroke="currentcolor" stroke-width="1" stroke-dasharray="5 5" stroke-dashoffset="2.5" d="M 30 30 H -30 V -30 H 30 z"/>
          <path class="kbd-pigpen-path" fill="none" stroke="currentcolor" stroke-width="10" stroke-linejoin="round" stroke-linecap="round" d=""/>
        </g>
      </svg>
      <svg class="kbd-pigpen-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100" data-mode="rect" data-diag="1">
        <g class="kbd-pigpen-rect" fill="currentcolor" transform="rotate(45)">
          <circle cx="30" cy="30" r="5"/>
          <circle cx="-30" cy="30" r="5"/>
          <circle cx="-30" cy="-30" r="5"/>
          <circle cx="30" cy="-30" r="5"/>
          <path fill="none" stroke="currentcolor" stroke-width="1" stroke-dasharray="5 5" stroke-dashoffset="2.5" d="M 30 30 H -30 V -30 H 30 z"/>
          <path class="kbd-pigpen-path" fill="none" stroke="currentcolor" stroke-width="10" stroke-linejoin="round" stroke-linecap="round" d=""/>
        </g>
      </svg>
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

  const outer = cont.querySelector('#kbd-pigpen-cont');
  const svgs = cont.querySelectorAll('.kbd-pigpen-svg');
  const sugg = cont.querySelector('#kbd-pigpen-sugg');
  const reset_funcs = [];

  const wRect = [6, 14, 12, 7, 15, 13, 3, 11, 9];
  const wDiag = [6, 3, 12, 9];

  function reset() {
    for(const func of reset_funcs)
      func();
    outer.dataset.mode = 'rect';
    cancelKey.hidden = true;
  }

  function showSugg(arr, diag) {
    let w = 0;
    for(let i = 1; i < arr.length; i++) {
      const flip = arr[i] ^ arr[i - 1];
      const other = arr[i] & (flip ^ 3);
      const bit = flip === 1
        ? other ? 2 : 0
        : other ? 1 : 3;
      w |= 1 << bit;
    }
    const i = (diag ? wDiag : wRect).indexOf(w);
    const keys = [];
    if(i >= 0) {
      if(!diag) {
        keys.push([], []);
        for(let j = 0; j < 3; j++) {
          keys[0].push(0xF100 + 3*i + j);
          keys[1].push(0xF140 + 3*i + j);
        }
        keys[2] = [0xF120 + 2*i, 0xF120 + 2*i + 1];
      } else {
        keys[2] = [0xF132 + 2*i, 0xF132 + 2*i + 1];
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
      outer.dataset.mode = 'sugg';
      cancelKey.hidden = false;
    } else
      reset();
  }

  svgs.forEach(svg => {
    const path = svg.querySelector('.kbd-pigpen-path');
    const diag = +svg.dataset.diag;
    let pointer = null;
    let cRect = null;
    let arr = [];

    function adjacent(a, b) {
      const d = a ^ b;
      return !(d & (d-1));
    }

    function xya(e) {
      let x = (e.clientX - cRect.left) / cRect.width * 100 - 50;
      let y = (e.clientY - cRect.top) / cRect.height * 100 - 50;
      if(diag)
        [x, y] = [0.7071*(y + x), 0.7071*(y - x)];
      let a = (y > 0 ? 2 : 0) + (x > 0 ? 1 : 0);
      return [x, y, a];
    }

    function buildPath(arr, cur) {
      if(cur)
        return `M ${cur[0]} ${cur[1]} L` + arr.map(a => ` ${a&1?30:-30} ${a&2?30:-30}`).join();
      else
        return `M ` + arr.map(a => ` ${a&1?30:-30} ${a&2?30:-30}`).join(' L ');
    }

    svg.addEventListener('pointerdown', e => {
      if(pointer !== null)
        return;
      pointer = e.pointerId;
      svg.setPointerCapture(pointer);
      cRect = svg.getBoundingClientRect();
      const [x, y, a] = xya(e);
      arr = [a];
    });

    svg.addEventListener('pointermove', e => {
      if(e.pointerId !== pointer)
        return;
      const [x, y, a] = xya(e);
      if(arr.length < 5 && adjacent(a, arr[0])) {
        const i = arr.indexOf(a);
        if(i == -1 || i == 3)
          arr.unshift(a);
      }
      if(arr.length == 5)
        path.setAttribute('d', buildPath(arr));
      else
        path.setAttribute('d', buildPath(arr, [x, y]));
    });

    svg.addEventListener('pointerup', e => {
      if(e.pointerId !== pointer)
        return;
      path.setAttribute('d', buildPath(arr));
      svg.releasePointerCapture(pointer);
      pointer = null;
      showSugg(arr, diag);
    });

    svg.addEventListener('pointercancel', e => {
      if(e.pointerId !== pointer)
        return;
      path.setAttribute('d', '');
      svg.releasePointerCapture(pointer);
      pointer = null;
      showSugg(arr, diag);
    });

    reset_funcs.push(() => {
      path.setAttribute('d', '');
      arr = [];
      pointer = null;
    });
  });

  sugg.addEventListener('kbd-input', reset);

  return { reset };
};

function modPolybius(cont, defKey, cancelKey) {
  cont.innerHTML = `
  <div id="kbd-polybius">
    <input type="checkbox" id="kbd-plb-size" class="patch show-state" data-label="6×6">
    <div id="kbd-plb-vert" class="trans">
      <input type="radio" name="kbd-plb-vert" class="patch radio" data-coord="0" data-content="1">
      <input type="radio" name="kbd-plb-vert" class="patch radio" data-coord="0" data-content="2">
      <input type="radio" name="kbd-plb-vert" class="patch radio" data-coord="0" data-content="3">
      <input type="radio" name="kbd-plb-vert" class="patch radio" data-coord="0" data-content="4">
      <input type="radio" name="kbd-plb-vert" class="patch radio" data-coord="0" data-content="5">
      <input type="radio" name="kbd-plb-vert" class="patch radio" data-coord="0" data-content="6">
    </div>
    <div id="kbd-plb-horz" class="trans">
      <input type="radio" name="kbd-plb-horz" class="patch radio" data-coord="1" data-content="1">
      <input type="radio" name="kbd-plb-horz" class="patch radio" data-coord="1" data-content="2">
      <input type="radio" name="kbd-plb-horz" class="patch radio" data-coord="1" data-content="3">
      <input type="radio" name="kbd-plb-horz" class="patch radio" data-coord="1" data-content="4">
      <input type="radio" name="kbd-plb-horz" class="patch radio" data-coord="1" data-content="5">
      <input type="radio" name="kbd-plb-horz" class="patch radio" data-coord="1" data-content="6">
    </div>
  </div>`;

  const lsKey = 'kbd-plb-six';

  const deselect = () => {
    for(const elm of cont.querySelectorAll('[type=radio]:checked'))
      elm.checked = false;
  };

  const dbConfirm = debounce(() => {
    cont.dispatchEvent(new CustomEvent('kbd-input', {
      bubbles: true,
      detail: { key: defKey.textContent }
    }));
    defKey.hidden = true;
    cancelKey.hidden = true;
    deselect();
  }, 500);

  const reset = () => {
    defKey.hidden = true;
    cancelKey.hidden = true;
    deselect();
  };

  cont.firstElementChild.addEventListener('input', () => {
    const q = cont.querySelectorAll('[type=radio]:checked');
    cancelKey.hidden = q.length !== 1;
    if(q.length === 2) {
      const coord = [];
      for(const elm of q)
        coord[+elm.dataset.coord] = +elm.dataset.content - 1;
      defKey.textContent = String.fromCodePoint(0xF15C + 6 * coord[0] + coord[1]);
      defKey.hidden = false;
      dbConfirm();
    }
  });

  cont.querySelector('#kbd-plb-size').addEventListener('change', e =>
    localStorage[lsKey] = +e.currentTarget.checked);

  cont.querySelector('#kbd-plb-size').checked = +localStorage[lsKey];

  return { reset };
}

function modSegment(cont, defKey, cancelKey) {
  cont.innerHTML = `
  <div id="kbd-sgm">
    <div id="kbd-sgm-back">&#xF012;</div>
    <div id="kbd-sgm-fore">&#xF180;</div>
  </div>`;

  const state = Object.defineProperty({}, 'value', {
    set(v) {
      this._v = v;
      defKey.textContent
        = cont.querySelector('#kbd-sgm-fore').textContent
        = String.fromCodePoint(0xF180 + v);
      defKey.hidden = v === 0;
      cancelKey.hidden = v === 0;
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

  const reset = () => {
    state.value = 0;
    defKey.hidden = true;
  };

  return { reset };
}

function modSemaphore(cont, defKey, cancelKey) {
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
      bubbles: true,
      detail: { key: defKey.textContent }
    }));
    defKey.hidden = true;
    deselect();
  }, 500);

  const reset = () => {
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
    cancelKey.hidden = sel.length !== 1;
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

  return { reset };
}

function modFlags(cont, defKey, cancelKey) {
  const flgColors = [
    9, 4, 13, 10, 12, 5, 10, 5, 18, 9, 10, 18, 9, 9, 6, 9, 2, 6, 9, 13, 5, 5, 13, 9, 6, 30,
    6, 5, 9, 13, 5, 10, 17, 6, 5, 23,
    9, 6, 6, 12, 5, 10, 9, 5, 10, 9
  ];

  cont.innerHTML = `
  <div id="kbd-flags">
    <div id="kbd-flg-colors">
      <input type="checkbox" class="patch c-white" data-color="param" data-value="1"></input>
      <input type="checkbox" class="patch c-yellow" data-color="param" data-value="2"></input>
      <input type="checkbox" class="patch c-red" data-color="param" data-value="4"></input>
      <input type="checkbox" class="patch c-blue" data-color="param" data-value="8"></input>
      <input type="checkbox" class="patch c-black" data-color="param" data-value="16"></input>
    </div>
    <spa-scroll id="kbd-flg-sugg-cont">
      <div id="kbd-flg-sugg"></div>
    </spa-scroll>
  </div>`;

  const sugg = cont.querySelector('#kbd-flg-sugg');
  for(const [off, len] of [[1, 26], [32, 10], [48, 10]])
    for(let i = 0; i < len; i++) {
      const elm = document.createElement('button');
      elm.className = 'key';
      if(off === 32) /* ICS numbers */
        elm.classList.add('ics');
      elm.textContent = String.fromCodePoint(0xF800 + off + i);
      sugg.appendChild(elm);
    }
  const children = sugg.children;

  function filter() {
    let cond = 0;
    for(const elm of cont.querySelector('#kbd-flg-colors').children)
      if(elm.checked)
        cond += +elm.dataset.value;
    for(let i = 0; i < 46; i++)
      children[i].hidden = !((flgColors[i] & cond) === cond);
    cancelKey.hidden = cond === 0;
  }

  function reset() {
    for(const ckbox of cont.querySelector('#kbd-flg-colors').children)
      ckbox.checked = false;
    filter();
  }

  cont.querySelector('#kbd-flg-colors').addEventListener('input', filter);
  cont.querySelector('#kbd-flg-sugg').addEventListener('kbd-input', reset);

  return { reset };
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
      bubbles: true,
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

function insert(tgt, key, opts = {}) {
  if(opts.append)
    tgt.selectionStart = tgt.selectionEnd;
  tgt.setRangeText(key, tgt.selectionStart, tgt.selectionEnd, opts.select ? 'select' : 'end');
  tgt.dispatchEvent(new CustomEvent('input', { bubbles: true }));
}

function bspace(tgt) {
  if(tgt.selectionStart == tgt.selectionEnd && tgt.selectionStart > 0)
    tgt.selectionStart--;
  tgt.setRangeText('');
  tgt.dispatchEvent(new CustomEvent('input', { bubbles: true }));
}

const dbConfirm = debounce(elm => elm.selectionStart = elm.selectionEnd, 500);

class KeyboardElement extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({mode: 'open'});
    root.appendChild(template.content.cloneNode(true));

    /* Prevent keyboard from taking focus */
    this.addEventListener('mousedown', e => e.preventDefault());

    /* Main button listener */
    const sendInsert = (tgt, key) =>
      tgt.dispatchEvent(new CustomEvent('kbd-input', { bubbles: true, detail: { key } }));
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
          sendInsert(e.target, ' ');
          break;
        case 'enter':
          sendInsert(e.target, '\n');
          break;
        case 'bsp':
          break;
        case 'default':
          sendInsert(e.target, e.target.textContent);
          break;
        case 'cancel':
          break;
        default:
          sendInsert(e.target, e.target.textContent);
          break;
      }
      if(this._module && this._module.reset)
        this._module.reset();
      e.preventDefault();
    });

    /* Backspace repeater */
    let bspTimer = null;
    root.getElementById('bsp').addEventListener('pointerdown', () => {
      bspace(this._target);
      bspTimer = setTimeout(() => {
        bspTimer = setInterval(() => bspace(this._target), 100);
      }, 500);
    });
    for(const n of ['pointerup', 'pointercancel'])
      root.getElementById('bsp').addEventListener(n, () => clearTimeout(bspTimer));

    /* All input handled via this event */
    root.addEventListener('kbd-input', e => {
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
    const cancelKey = this.shadowRoot.getElementById('cancel');
    defKey.hidden = true;
    cancelKey.hidden = true;
    if(mod === 'default') {
      if(this._exit)
        this._exit();
    } else
      this._module = modules[mod](cont, defKey, cancelKey);
  }
}

window.customElements.define('spa-keyboard', KeyboardElement);
