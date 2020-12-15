export class ColorPatchElement extends HTMLElement {
  constructor() {
    super();
  }

  static get observedAttributes() {
    return ['data-color'];
  }

  set color(color) {
    this.dataset.color = color;
  }

  get color() {
    return this.dataset.color;
  }

  attributeChangedCallback(name, oldValue, value) {
    this.style.setProperty('--color', value);
    this.dataset.colors =
      value === 'all'
        ? 'rainbow'
      : value === 'none'
        ? 'cross'
        : 'param';
  }
}

export class ColorSelElement extends HTMLElement {
  constructor() {
    super();
    for(let color = 1; color <= 9; color++)
      this._addPatch(color);
    this._addPatch('none', true);
  }

  static get observedAttributes() {
    return ['data-zero'];
  }

  attributeChangedCallback(name, oldValue, value) {
    this.querySelector('spa-color-patch[data-color="none"]').hidden = !this.dataset.zero;
  }

  _addPatch(color, hidden = false) {
    let div = document.createElement('spa-color-patch');
    div.dataset.color = color;
    div.setAttribute('tabindex', 0);
    div.dataset.active = 1;
    div.addEventListener('click', e => this._click(e));
    if(hidden)
      div.hidden = true;
    this.appendChild(div);
    this.style.setProperty('--count', this.children.length);
  }

  _click(e) {
    let stop = !this.dispatchEvent(new CustomEvent('color-click', {
      detail: { color: e.target.color },
      cancelable: true,
      bubbles: true
    }));
    if(stop)
      e.preventDefault();
  }
}

export class ColorFilterElement extends ColorSelElement {
  constructor() {
    super();
    this._addPatch('all');
    this._sel = [];
    this.selectAll(true);
  }

  _click(e) {
    let elm = e.currentTarget.parentElement;
    let color = e.currentTarget.color;
    let sel = elm._sel;
    if(color === 'all') {
      // "All" clicked
      for(let i in sel)
        sel[i] = true;
    } else if(sel.all) {
      // One color clicked when "all" was on
      for(let i in sel)
        sel[i] = i == color;
    } else {
      sel[color] = !sel[color];
      // Only active color clicked: invert
      let empty = sel.every(x => !x);
      if(empty) {
        for(let i in sel)
          sel[i] = i != color;
      }
      // All colors selected: also mark 'all'
      sel.all = sel.every(x => x);
    }
    for(let elm2 of elm.querySelectorAll('spa-color-patch'))
      elm2.classList.toggle('selected', sel[elm2.color]);
    elm._notify();
  }

  selectAll(noEvent) {
    for(let elm of this.querySelectorAll('spa-color-patch')) {
      elm.classList.add('filter', 'selected');
      this._sel[elm.color] = true;
    }
    if(!noEvent)
      this._notify();
  }

  _notify() {
    this.dispatchEvent(new CustomEvent('change', {
      detail: { selected: this._sel },
      bubbles: true
    }));
  }
}

window.customElements.define('spa-color-patch', ColorPatchElement);
window.customElements.define('spa-color-sel', ColorSelElement);
window.customElements.define('spa-color-filter', ColorFilterElement);
