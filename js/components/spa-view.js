import './spa-modal.js';
import './spa-slideout.js';
import * as main from '../main.js';
import _, * as i18n from '../i18n.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-view.css"/>
<link rel="stylesheet" type="text/css" href="css/modules.css"/>
<div id="titlebar">
  <span id="title"></span>
  <button id="settings"><img class="inline" src="images/settings.svg"/></button>
  <button id="update"><img class="inline" src="images/download.svg"/><img id="update-ticker" src="images/update-ticker.svg"/></button>
</div>
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
    root.getElementById('title').addEventListener('click', e => {
      this.dispatchEvent(new CustomEvent('request-module',
        { detail: { module: 'list', viewId: this.id }, bubbles: true }));
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
  }

  static get observedAttributes() {
    return ['data-module', 'data-pos'];
  }

  async loadModule(module) {
    const cont = this.shadowRoot.getElementById('content');
    while(cont.firstChild)
      cont.removeChild(cont.firstChild);
    if(module !== 'list') // switching to menu should look fluid
      cont.classList.add('spa-loading');
    try {
      this.dataset.module = module;
      const modNames = await i18n.moduleMap;
      this.shadowRoot.getElementById('title').textContent = modNames[module];
      const [responseText, script] = await Promise.all([
        i18n.loadTrans(`trans/${i18n.lang}/${module}.json`).then(
          () => i18n.loadTemplate(`html/${module}.html`)),
        import(`../${module}.js`),
        this.loadStyle(`css/${module}.css`)
      ]);
      const frag = document.createElement('template');
      frag.innerHTML = responseText;
      cont.classList.remove('spa-loading');
      cont.append(frag.content);
      this.funcs = script.default(this.shadowRoot);
      this.dispatchEvent(new CustomEvent('module-change',
        { detail: { viewPos: this.dataset.pos, module }, bubbles: true }));
    } catch(e) {
      console.error(e);
      throw e;
    }
  }

  swapWith(other) {
    if(other.id === this.id)
      return;
    const otherPos = other.dataset.pos;
    other.dataset.pos = this.dataset.pos;
    this.dataset.pos = otherPos;
    this.dispatchEvent(new CustomEvent('module-change',
      { detail: { viewPos: this.dataset.pos, module: this.dataset.module }, bubbles: true }));
    this.dispatchEvent(new CustomEvent('module-change',
      { detail: { viewPos: other.dataset.pos, module: other.dataset.module }, bubbles: true }));
  }

  async loadStyle(filename) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = filename;
    link.id = 'style';
    this.shadowRoot.getElementById('content').append(link);
    return new Promise((resolve, reject) => {
      link.addEventListener('load', resolve, {once: true});
      link.addEventListener('error', e => reject(`Could not load file ${filename}.`), {once: true});
    });
  }
}

window.customElements.define('spa-view', ViewElement);
