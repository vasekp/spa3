import {dateFormat} from '../js/datetime.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" href="components/css/logbook-game.css"/>
<div id="content" hidden>
  <spa-color-sel hidden></spa-color-sel>
  <spa-color-patch color="all"></spa-color-patch>
  <span id="name"></span>
  <input type="text" id="name-edit" hidden/>&nbsp;
  <span id="date"></span>
  <div id="float" class="color-border">
    <div id="stash">
      <img id="delete" src="images/delete.svg" alt="delete" tabindex="0"/>
      <spa-color-patch id="colorsel" color="all" tabindex="0"></spa-color-patch>
    </div>
    <div id="edit-bg"></div>
    <img id="edit" alt="edit" src="images/edit.svg" tabindex="0"/>
  </div>
</div>`;

export class GameRecord extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.shadowRoot.querySelector('link').onload = () =>
      this.shadowRoot.getElementById('content').hidden = false;
    this.shadowRoot.getElementById('edit').addEventListener('click',
      () => this._edit());
    this.shadowRoot.getElementById('colorsel').addEventListener('click',
      () => this._colorsel());
  }

  static get observedAttributes() {
    return ['name', 'date'];
  }

  attributeChangedCallback(name, oldValue, value) {
    if(name === 'name')
      this.shadowRoot.getElementById('name').innerText = value;
    if(name === 'date')
      this.shadowRoot.getElementById('date').innerText = '(' + dateFormat(value) + ')';
  }

  _edit() {
    let ta = this.shadowRoot.getElementById('name-edit');
    this.shadowRoot.getElementById('name').hidden = true;
    this.shadowRoot.getElementById('date').hidden = true;
    ta.value = this.getAttribute('name');
    ta.hidden = false;
    ta.focus();
  }

  _colorsel() {
    this.shadowRoot.querySelector('spa-color-sel').hidden = false;
    this.shadowRoot.querySelector('spa-color-patch').hidden = true;
    this.shadowRoot.getElementById('name').hidden = true;
    this.shadowRoot.getElementById('date').hidden = true;
    this.shadowRoot.getElementById('name-edit').hidden = true;
  }
}

window.customElements.define('log-game', GameRecord);
