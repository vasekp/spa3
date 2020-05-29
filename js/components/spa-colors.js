const cselTemplate = document.createElement('template');
cselTemplate.innerHTML = `
<link rel="stylesheet" href="css/components/spa-color-sel.css"/>
<div id="container"></div>`;

const patchTemplate = document.createElement('template');
patchTemplate.innerHTML = `
<link rel="stylesheet" href="css/components/spa-color-patch.css"/>
<div></div>`;

export class ColorPatchElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(patchTemplate.content.cloneNode(true));
    this._div = this.shadowRoot.querySelector('div');
  }

  static get observedAttributes() {
    return ['color'];
  }

  attributeChangedCallback(name, oldValue, value) {
    this._div.style.setProperty('--color', value);
    this._div.setAttribute('data-colors', value === 'all' ? 'rainbow' : value === 'none' ? 'cross' : 'param');
  }
}

export class ColorSelElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(cselTemplate.content.cloneNode(true));
    for(let color = 1; color <= 9; color++)
      this._addPatch(color);
    this._addPatch('none');
    this.shadowRoot.querySelector('spa-color-patch[color="none"]').hidden = true;
  }

  static get observedAttributes() {
    return ['zero'];
  }

  attributeChangedCallback(name, oldValue, value) {
    this.shadowRoot.querySelector('spa-color-patch[color="none"]').hidden = !this.hasAttribute('zero');
  }

  _addPatch(color) {
    let div = document.createElement('spa-color-patch');
    div.setAttribute('color', color);
    div.setAttribute('tabindex', 0);
    div.addEventListener('click', () => this._click(color));
    this.shadowRoot.getElementById('container').appendChild(div);
  }

  _click(color) {
    this.dispatchEvent(new CustomEvent('color-click', {
      detail: { color },
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

  _click(color) {
    if(color === 'all') {
      // "All" clicked
      for(let i in this._sel)
        this._sel[i] = true;
    } else if(this._sel.all) {
      // One color clicked when "all" was on
      for(let i in this._sel)
        this._sel[i] = i == color;
    } else {
      this._sel[color] = !this._sel[color];
      // Only active color clicked: invert
      let empty = this._sel.every(x => !x);
      if(empty) {
        for(let i in this._sel)
          this._sel[i] = i != color;
      }
      // All colors selected: also mark 'all'
      this._sel.all = this._sel.every(x => x);
    }
    this.shadowRoot.querySelectorAll('spa-color-patch').forEach(elm => {
      elm.classList.toggle('selected', this._sel[elm.getAttribute('color')]);
    });
    this._notify();
  }

  selectAll(noEvent) {
    this.shadowRoot.querySelectorAll('spa-color-patch').forEach(elm => {
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
