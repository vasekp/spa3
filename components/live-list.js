const template = document.createElement('template');
template.innerHTML = `<slot></slot>`;

export class LiveList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this._slot = document.createElement('slot');
    this._slot.addEventListener('slotchange', () => this._updateElements());
    this.shadowRoot.appendChild(this._slot);
    this._tracking = {};
    this._cb = {  // Need callback references for harmless reassigning
      down: this._pDown.bind(this),
      up: this._pUp.bind(this),
      move: this._pMove.bind(this),
      cancel: this._pCancel.bind(this)
    };
  }

  _updateElements() {
    [...this._slot.assignedElements()].forEach(elm => {
      elm.addEventListener('pointerdown', this._cb.down);
      elm.addEventListener('pointerup', this._cb.up);
      elm.addEventListener('pointermove', this._cb.move);
      elm.addEventListener('pointercancel', this._cb.cancel);
    });
    if(this._tracking.elm && !this._slot.assignedElements().includes(this._tracking.elm))
      this._tracking = {};
  }

  _pDown(e) {
    let elm = e.currentTarget;
    if(this._tracking.elm)
      return;
    if(elm.hasAttribute('data-protected'))
      return;
    elm.setPointerCapture(e.pointerId);
    this._tracking = {
      elm,
      pid: e.pointerId,
      zero: true,
      x: e.x,
      t: e.timeStamp,
      w: elm.clientWidth
    };
  }

  _active(e) {
    return e.currentTarget === this._tracking.elm && e.pointerId === this._tracking.pid;
  }

  _pMove(e) {
    if(!this._active(e))
      return;
    let elm = e.currentTarget;
    let dx = e.x - this._tracking.x;
    if(this._tracking.zero) {
      if(Math.abs(dx) < 0.05 * this._tracking.w)
        return;
      else {
        this._tracking.zero = false;
        elm.dispatchEvent(new CustomEvent('move-start', {
          bubbles: true
        }));
      }
    }
    elm.style.transform = dx ? `translateX(${dx}px)` : '';
  }

  _pUp(e) {
    if(!this._active(e))
      return;
    let elm = e.currentTarget;
    elm.releasePointerCapture(e.pointerId);
    let dx = (e.x - this._tracking.x) / this._tracking.w;
    let vx = dx / (e.timeStamp - this._tracking.t) * 1000;
    if(Math.abs(dx) > .5 || (Math.abs(vx) > 1 && dx*vx > 0))
      this._finishMove(elm, dx);
    else
      this._revertMove(elm);
    this._tracking = {};
  }

  _pCancel(e) {
    if(!this._active(e))
      return;
    let elm = e.currentTarget;
    elm.releasePointerCapture(e.pointerId);
    this._revertMove(elm);
    this._tracking = {};
  }

  _revertMove(elm) {
    if(!elm.style.transform)
      return;
    elm.style.transition = 'transform .5s';
    elm.style.transform = '';
    let cb = () => {
      elm.style.transition = '';
      elm.dispatchEvent(new CustomEvent('move-cancel', {
        bubbles: true
      }));
    };
    elm.addEventListener('transitionend', cb, { once: true });
  }

  _finishMove(elm, dir) {
    elm.style.transition = 'transform .5s';
    elm.style.transform = `translateX(${dir > 0 ? '120%' : '-120%'})`;
    let cb = () => {
      elm.style.transition = '';
      elm.dispatchEvent(new CustomEvent('move-away', {
        bubbles: true
      }));
    };
    elm.addEventListener('transitionend', cb, { once: true });
  }
}

export default function() {
  window.customElements.define('spa-live-list', LiveList);
};
