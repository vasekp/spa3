const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" type="text/css" href="css/components/spa-scroll.css"/>
<div id="top"></div><div id="content"><slot></slot></div><div id="bottom"></div>`;

class ScrollElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    if(this._io)
      return;
    const cont = this.shadowRoot.getElementById('content');
    const io = this._io = new IntersectionObserver(entries => {
      for(const entry of entries)
        cont.classList.toggle(entry.target.id, !entry.isIntersecting);
    });
    io.observe(this.shadowRoot.getElementById('top'));
    io.observe(this.shadowRoot.getElementById('bottom'));

    this.addEventListener('pause-scroll', e => this.dataset.pauseScroll = +e.detail.pause);
  }
}

window.customElements.define('spa-scroll', ScrollElement);
