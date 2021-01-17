import './spa-modal.js';
import './spa-slideout.js';
import * as main from '../main.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-view.css"/>
<link rel="stylesheet" type="text/css" href="css/modules.css"/>
<style>:not(:defined) { display: none; }</style>
<spa-slideout id="controls" class="corner">
  <button id="move" part="move-icon" draggable="true"><img class="inline" src="images/move.svg"/></button>
  <button id="settings"><img class="inline" src="images/settings.svg"/></button>
  <button id="home"><img class="inline" src="images/home.svg"/></button>
</spa-slideout>
<div id="content"></div>
<spa-modal id="settings-modal" hidden>
  <div class="settings" tabindex="-1">
    <div class="trans" id="module-settings-container"></div>
    <div class="trans" id="shared-settings-container"></div>
  </div>
</spa-modal>`;

class ViewElement extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({mode: 'open'});
    root.appendChild(template.content.cloneNode(true));
    root.getElementById('home').addEventListener('click',
      () => this.dataset.module = 'list');
    const settings = root.getElementById('settings-modal');
    root.getElementById('settings').addEventListener('click', () => {
      const s1 = root.getElementById('shared-settings-container');
      s1.innerHTML = '';
      main.populateSettings(s1);
      const s2 = root.getElementById('module-settings-container');
      s2.innerHTML = '';
      if(this.funcs.populateSettings)
        this.funcs.populateSettings(s2);
      settings.show();
    });
    root.getElementById('move').addEventListener('click',
      () => alert('Ikonku zkuste táhnout a pustit do jiného panelu.'));
    root.getElementById('move').addEventListener('dragstart', e => {
      this.classList.add('dragged');
      e.dataTransfer.setData('application/spa3', this.id);
      e.currentTarget.blur();
    });
    root.getElementById('move').addEventListener('dragend',
      () => this.classList.remove('dragged'));
    this.addEventListener('dragenter', e => {
      if(e.dataTransfer.types.includes('application/spa3'))
        this.classList.add('dragover');
    });
    this.addEventListener('dragleave', () => this.classList.remove('dragover'));
    this.addEventListener('dragover', e => {
      if(e.dataTransfer.types.includes('application/spa3'))
        e.preventDefault();
    });
    this.addEventListener('drop', e => {
      if(e.dataTransfer.types.includes('application/spa3'))
        this.swap(e.dataTransfer.getData('application/spa3'));
      this.classList.remove('dragover');
    });
  }

  static get observedAttributes() {
    return ['data-module', 'data-pos'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if(newValue === oldValue)
      return;
    if(name === 'data-module')
      this.loadModule(newValue);
    document.dispatchEvent(new CustomEvent('view-change', { detail: {
      id: this.id,
      module: newValue
    }}));
  }

  async loadModule(module) {
    const cont = this.shadowRoot.getElementById('content');
    const prevStyle = this.shadowRoot.getElementById('style');
    if(prevStyle)
      prevStyle.id = '';
    if(module !== 'list') // switching to menu should look fluid
      cont.innerHTML = '<div class="spa-loading"></div>';
    const [responseText, script] = await Promise.all([
      fetch(`${module}.mod.html`).then(async r => await r.text()),
      import(`../${module}.js`),
      this.addStyleSheet(`css/${module}.css`)
    ]);
    cont.innerHTML = responseText;
    if(prevStyle)
      prevStyle.remove();
    this.funcs = script.default(this.shadowRoot);
  }

  swap(otherId) {
    if(otherId === this.id)
      return;
    const other = document.getElementById(otherId);
    const otherPos = other.dataset.pos;
    other.dataset.pos = this.dataset.pos;
    this.dataset.pos = otherPos;
  }

  async addStyleSheet(filename) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = filename;
    link.id = 'style';
    this.shadowRoot.insertBefore(link, this.shadowRoot.getElementById('content'));
    return new Promise(resolve => link.addEventListener('load', resolve));
  }
}

window.customElements.define('spa-view', ViewElement);
