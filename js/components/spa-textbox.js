import './spa-slideout.js';

const template = document.createElement('template');
template.innerHTML = `<spa-slideout class="corner">
  <button data-mod="braille">&#x2800;</button>
  <button data-mod="morse">&#xF008;&#xF009;</button>
  <button data-mod="pigpen">&#xF121;</button>
  <button data-mod="polyb">&#xF163;</button>
  <button data-mod="segm">&#xF1FF;</button>
  <button data-mod="smph">&#xF883;</button>
  <button data-mod="flags">&#xF801;</button>
  <button data-mod="digits">12</button>
  <button data-mod="mobile">&#xF00B;</button>
</spa-slideout>`;

const reMorseFix = /([\uF008-\uF00A]*)([.\/-]+)$/;
const morseRepls = { '.': '\uF008', '-': '\uF009', '/': '\uF00A' };

class TextboxElement extends HTMLElement {
  connectedCallback() {
    if(this._constructed)
      return;
    this._span = document.createElement('span');
    this._area = document.createElement('textarea');
    this._area.setAttribute('spellcheck', false);
    this._area.classList.add('no-outline');
    this._area.addEventListener('keydown', e => {
      if(this._submit && e.key === 'Enter') {
        this.dispatchEvent(new CustomEvent('tb-submit',
          {detail: {text: this._area.value}}));
        e.preventDefault();
      }
    });
    this._area.addEventListener('input', () => this._update());
    this._area.addEventListener('scroll', () =>
      this._span.style.top = `-${this._area.scrollTop}px`,
      {passive: true});
    /* if value was set before connecting, it shadows the property */
    for(const prop of ['value', 'disabled']) {
      let value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
    this.appendChild(this._span);
    this.appendChild(this._area);
    this.constructed = true;
  }

  set value(v) {
    this._area.value = v;
    this._span.textContent = v + '\u200B';
  }

  get value() {
    return this._area.value;
  }

  set disabled(v) {
    if(v)
      this.setAttribute('disabled', '');
    else
      this.removeAttribute('disabled');
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  static get observedAttributes() {
    return ['disabled', 'ime', 'submit'];
  }

  attributeChangedCallback(name, oldValue, value) {
    if(name === 'disabled') {
      const isDisabled = value !== null;
      this._area.disabled = isDisabled;
      if(isDisabled)
        this._area.blur();
    } else if(name === 'ime' && !this._slideout) {
      this._slideout = template.content.firstElementChild.cloneNode(true);
      this._slideout.addEventListener('click', e => {
        const mod = e.target.dataset.mod;
        if(mod)
          document.querySelector('spa-keyboard').openFor(this._area, mod);
      });
      this.appendChild(this._slideout);
    } else if(name === 'submit')
      this._submit = value !== null;
  }

  focus() {
    this._area.focus();
  }

  get area() {
    return this._area;
  }

  _update() {
    // Detect and interpret Morse input
    (area => {
      const pos = area.selectionStart;
      if(pos === 0 || area.selectionEnd !== pos)
        return;
      const str = area.value.substring(0, pos);
      const last = str[pos - 1];
      if(last !== '.' && last !== '-' && last !== '/')
        return;
      const m = reMorseFix.exec(str);
      if(!m)
        return;
      if(m[1].length > 0 || m[2].length > 3 || (m[2].length === 3 && m[2].slice(-3) !== '...')) {
        const sPre = str.substring(0, pos - m[2].length);
        const sMid = m[2].replace(/[.\/-]/g, c => morseRepls[c]);
        const sPost = area.value.substring(pos);
        area.value = sPre + sMid + sPost;
        area.selectionStart = area.selectionEnd = pos;
      }
    })(this._area);

    // Useful for trailing newlines
    this._span.textContent = this._area.value + '\u200B';
  }

  mark(start, len) {
    if(len) {
      const mark = document.createElement('mark');
      mark.textContent = this._area.value.substring(start, start + len);
      this._span.textContent = '';
      this._span.append(this._area.value.substring(0, start),
        mark,
        this._area.value.substring(start + len) + '\u200B');
    } else
      this._span.textContent = this._area.value + '\u200B';
  }
}

window.customElements.define('spa-textbox', TextboxElement);
