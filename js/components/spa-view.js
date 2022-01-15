import './spa-modal.js';
import './spa-slideout.js';
import * as main from '../main.js';
import _, * as i18n from '../i18n.js';

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-view.css"/>
<spa-slideout id="controls" class="corner">
  <button id="settings"><img class="inline" src="images/settings.svg"/></button>
  <button id="update"><img class="inline" src="images/download.svg"/><img id="update-ticker" src="images/update-ticker.svg"/></button>
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
    root.getElementById('home').addEventListener('click', e => {
      this.dispatchEvent(new CustomEvent('request-module',
        { detail: { module: 'list' }, bubbles: true }));
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
    root.getElementById('content').attachShadow({mode: 'open'});
    root.getElementById('update').addEventListener('click',
      () => window.dispatchEvent(new CustomEvent('update-click')));
    this.addEventListener('request-module', e => e.detail.view = this.id);
  }

  static get observedAttributes() {
    return ['data-module', 'data-pos'];
  }

  async loadModule(module) {
    const cont = this.shadowRoot.getElementById('content');
    cont.shadowRoot.replaceChildren();
    if(module !== 'list') // switching to menu should look fluid
      cont.classList.add('spa-loading');
    try {
      const [responseText, script] = await Promise.all([
        i18n.loadTrans(`trans/${i18n.lang}/${module}.json`).then(
          () => i18n.loadTemplate(`html/${module}.html`)),
        import(`../${module}.js`),
        this.loadStyle(`css/modules.css`, cont.shadowRoot),
        this.loadStyle(`css/${module}.css`, cont.shadowRoot)
      ]);
      const frag = document.createElement('template');
      frag.innerHTML = responseText;
      cont.classList.remove('spa-loading');
      cont.shadowRoot.append(frag.content);
      this.funcs = script.default(cont.shadowRoot);
      this.dataset.module = module;
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

  async loadStyle(filename, cont) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = filename;
    link.id = 'style';
    cont.append(link);
    return new Promise((resolve, reject) => {
      link.addEventListener('load', resolve, {once: true});
      link.addEventListener('error', e => reject(`Could not load file ${filename}.`), {once: true});
    });
  }

  notifySize(size) {
    this.shadowRoot.getElementById('content').dataset.size = size;
  }
}

window.customElements.define('spa-view', ViewElement);
