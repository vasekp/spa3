const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" href="css/colors.css"/>
<link rel="stylesheet" href="components/css/colorsel.css"/>
<div id="container"></div>`;

export class ColorSel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    for(let color = 1; color <= 9; color++)
      this._addPatch(color);
  }

  _addPatch(color) {
    let div = document.createElement('div');
    div.classList.add('patch', 'colors-var');
    div.style.setProperty('--color', color);
    div.addEventListener('click', () => this._click(color));
    div.setAttribute('data-color', color);
    this.shadowRoot.getElementById('container').appendChild(div);
    return div;
  }

  _click(color) {
    this.dispatchEvent(new CustomEvent('color-click', {
      detail: { color },
      bubbles: true
    }));
  }
}

export class ColorFilter extends ColorSel {
  constructor() {
    super();
    this._addPatch('all');
    this._sel = [];
    [...this.shadowRoot.querySelectorAll('.patch')].forEach(elm => {
      elm.classList.add('filter', 'selected');
      this._sel[+elm.getAttribute('data-color')] = true;
    });
  }

  _addPatch(color) {
    let div = super._addPatch(color === 'all' ? 0 : color);
    if(color === 'all') {
      div.style.removeProperty('--color');
      div.classList.remove('colors-var');
      div.classList.add('colors-all');
    }
  }

  _click(color) {
    if(color == 0) {
      for(let i in this._sel)
        this._sel[i] = true;
    } else if(this._sel[0]) {
      for(let i in this._sel)
        this._sel[i] = i == color;
    } else {
      this._sel[color] = !this._sel[color];
      let empty = this._sel.every(x => !x);
      if(empty) {
        for(let i in this._sel)
          this._sel[i] = true;
      }
    }
    [...this.shadowRoot.querySelectorAll('.patch')].forEach(elm => {
      elm.classList.toggle('selected', this._sel[elm.getAttribute('data-color')]);
    });
    this.dispatchEvent(new CustomEvent('change', {
      detail: { selected: this._sel },
      bubbles: true
    }));
  }
}

export default function() {
  window.customElements.define('spa-color-sel', ColorSel);
  window.customElements.define('spa-color-filter', ColorFilter);
};
