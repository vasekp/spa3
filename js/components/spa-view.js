import './spa-modal.js';
import './spa-slideout.js';
import * as main from '../main.js';
import _, * as i18n from '../i18n.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-view.css"/>
<link rel="stylesheet" type="text/css" href="css/modules.css"/>
<style>:not(:defined) { display: none; }</style>
<spa-slideout id="controls" class="corner">
  <button id="move" part="move-icon" draggable="true"><img class="inline" src="images/move.svg"/></button>
  <button id="settings"><img class="inline" src="images/settings.svg"/></button>
  <button id="update"><img class="inline" src="images/download.svg"/><img id="update-ticker" src="images/update-ticker.svg"/></button>
  <button id="home"><img class="inline" src="images/home.svg"/></button>
</spa-slideout>
<div id="content"><div class="spa-loading"></div></div>
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
    root.getElementById('home').addEventListener('click', e => {
      this.dataset.module = 'list';
      e.currentTarget.blur();
    });
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
    root.getElementById('update').addEventListener('click',
      () => window.dispatchEvent(new CustomEvent('update-click')));
    root.getElementById('move').addEventListener('click',
      () => alert(_('try dragging')));
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
      this.loadModule(newValue).catch(() => this.dataset.module = 'list');
    document.dispatchEvent(new CustomEvent('view-change', { detail: {
      id: this.id,
      module: newValue
    }}));
  }

  async loadModule(module) {
    const cont = this.shadowRoot.getElementById('content');
    const prevStyle = this.shadowRoot.getElementById('style');
    if(module !== 'list') // switching to menu should look fluid
      cont.innerHTML = '<div class="spa-loading"></div>';
    try {
      const [responseText, script] = await Promise.all([
        i18n.loadTrans(`trans/${i18n.lang}/${module}.json`).then(
          () => i18n.loadTemplate(`html/${module}.html`)),
        import(`../${module}.js`),
        this.addStyleSheet(`css/${module}.css`)
      ]);
      if(prevStyle)
        prevStyle.id = '';
      cont.innerHTML = responseText;
      if(prevStyle)
        prevStyle.remove();
      this.funcs = script.default(this.shadowRoot);
    } catch(e) {
      console.error(e);
      throw e;
    }
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
    return new Promise((resolve, reject) => {
      link.addEventListener('load', resolve);
      link.addEventListener('error', e => reject(`Could not load file ${filename}.`));
    });
  }
}

window.customElements.define('spa-view', ViewElement);
