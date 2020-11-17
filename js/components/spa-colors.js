export class ColorPatchElement extends HTMLElement {
  constructor() {
    super();
  }

  static get observedAttributes() {
    return ['color'];
  }

  set color(color) {
    this.setAttribute('color', color);
  }

  get color() {
    return this.getAttribute('color');
  }

  attributeChangedCallback(name, oldValue, value) {
    this.style.setProperty('--color', value);
    this.setAttribute('data-colors', value === 'all' ? 'rainbow' : value === 'none' ? 'cross' : 'param');
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
    return ['zero'];
  }

  attributeChangedCallback(name, oldValue, value) {
    this.querySelector('spa-color-patch[color="none"]').hidden = !this.hasAttribute('zero');
  }

  _addPatch(color, hidden = false) {
    let div = document.createElement('spa-color-patch');
    div.setAttribute('color', color);
    div.setAttribute('tabindex', 0);
    div.addEventListener('action', this._action);
    if(hidden)
      div.hidden = true;
    this.appendChild(div);
    this.style.setProperty('--count', this.children.length);
  }

  _action(e) {
    this.dispatchEvent(new CustomEvent('color-action', {
      detail: { color: e.currentTarget.color },
      bubbles: true
    }));
  }
}

export class ColorFilterElement extends ColorSelElement {
  constructor() {
    super();
    this._addPatch('all');
    this._sel = [];
    this.selectAll(true);
  }

  _action(e) {
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
    elm.querySelectorAll('spa-color-patch').forEach(elm => {
      elm.classList.toggle('selected', sel[elm.getAttribute('color')]);
    });
    elm._notify();
  }

  selectAll(noEvent) {
    this.querySelectorAll('spa-color-patch').forEach(elm => {
      elm.classList.add('filter', 'selected');
      this._sel[elm.getAttribute('color')] = true;
    });
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
