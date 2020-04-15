'use strict';

var db;
var gid;

window.addEventListener('DOMContentLoaded', () => {
  prepareDatabase();
  document.getElementById('plus').addEventListener('click', plus);
});

function prepareDatabase() {
  //indexedDB.deleteDatabase('spa');
  let rq = indexedDB.open('spa', 1);
  rq.onupgradeneeded = e => {
    db = e.target.result;
    if(e.oldVersion === 0) {
      let sGames = db.createObjectStore('zap-hry', { keyPath: 'id', autoIncrement: true });
      let sNotes = db.createObjectStore('zap-zaz', { keyPath: 'id', autoIncrement: true });
      sNotes.createIndex('gid', 'gid', { unique: false });
    }
  };
  rq.onsuccess = e => {
    db = e.target.result;
    let tx = db.transaction('zap-hry', 'readonly');
    let os = tx.objectStore('zap-hry');
    let rq = os.getAllKeys();
    rq.onerror = console.log;
    rq.onsuccess = e => {
      let keys = e.target.result;
      if(keys.length > 0) {
        gid = keys[0];
        console.log('Using gid ' + gid);
        loadItems();
      } else
        addTestData();
    }
  };
  rq.onerror = console.log;
}

function addTestData() {
  console.log('Adding test data');
  let tx = db.transaction('zap-hry', 'readwrite');
  let os = tx.objectStore('zap-hry');
  let item = {
    name: 'ABC',
    date: new Date()
  };

  let rq = os.add(item);
  rq.onerror = console.log;
  rq.onsuccess = e => {
    gid = e.target.result;
    let tx = db.transaction('zap-zaz', 'readwrite');
    let os = tx.objectStore('zap-zaz');
    let items = [
      { tag: 1, gid, text: 'Příchod' },
      { tag: 2, gid, text: 'Upřesnítko' },
      { tag: 3, gid, text: 'Mezitajenka' },
      { tag: 4, gid, text: 'Nápověda' },
      { tag: 5, gid, text: 'Adresa' }
    ];
    items.forEach(i => os.add(i));
    tx.onerror = console.log;
    tx.oncomplete = loadItems;
  }
}

function loadItems() {
  let tx = db.transaction('zap-zaz', 'readonly');
  let os = tx.objectStore('zap-zaz');
  let ix = os.index('gid');
  let rq = ix.getAll(gid);
  rq.onsuccess = e => {
    let results = e.target.result;
    let cont = document.getElementById('list');
    while(cont.firstChild) {
      cont.removeChild(cont.firstChild);
    }
    results.forEach(item => {
      let div = document.createElement('div');
      div.setAttribute('data-id', item.id);
      div.setAttribute('data-tag', item.tag);
      div.classList.add('color', 'c' + item.tag, 'log-item');
      let span = document.createElement('span');
      span.classList.add('zaz-text');
      span.innerText = item.text;
      div.appendChild(span);
      div.addEventListener('click', () => editItem(div));
      cont.appendChild(div);
    });
  };
  rq.onerror = console.log;
}

function closeOpenItems() {
  let count = 0;
  [...document.querySelectorAll('[data-open]')].forEach(div => {
    if(div.classList.contains('processing'))
      return;
    else if(!div.hasAttribute('data-id')) {
      document.getElementById('list').removeChild(div);
      count++;
    } else {
      finishEditing(div);
      count++;
    }
  });
  return count;
}

function findParent(elm, cls) {
  while(!elm.classList.contains(cls))
    elm = elm.parentElement;
  return elm;
}

function plus(e) {
  closeOpenItems();
  let cont = document.getElementById('list');
  let div = document.getElementById('zaz-new').content.firstElementChild.cloneNode(true);
  div.setAttribute('data-open', '');
  [...div.querySelectorAll('.col-sel')].forEach(elm =>
    elm.addEventListener('click', newColor));
  cont.appendChild(div);
}

function newColor(e) {
  let elm = e.currentTarget;
  let tag = elm.getAttribute('data-tag');
  let div = findParent(elm, 'log-item');
  div.classList.remove('colorTemp');
  div.classList.add('color', 'c' + tag);
  div.setAttribute('data-tag', tag);
  div.removeChild(div.querySelector('.log-colorsel'));
  div.classList.add('processing');

  let tx = db.transaction('zap-zaz', 'readwrite');
  let os = tx.objectStore('zap-zaz');
  let item = { tag, gid, text: '' };
  let rq = os.add(item);
  rq.onerror = console.log;
  rq.onsuccess = e => {
    let id = e.target.result;
    div.classList.remove('processing');
    div.setAttribute('data-id', id);
    div.removeAttribute('data-open');
    div.addEventListener('click', () => editItem(div));
    editItem(div);
  }
}

function editItem(div) {
  if(div.hasAttribute('data-open'))
    return;
  if(closeOpenItems() > 0)
    return;
  div.setAttribute('data-open', '');
  let span = div.querySelector('.zaz-text');
  let ta = document.createElement('textarea');
  if(span) {
    ta.value = span.innerText;
    div.removeChild(span);
  }
  ta.addEventListener('input', () => {
    div.setAttribute('data-changed', '');
    setTimeout(autosave, 300, div);
  });
  div.appendChild(ta);
  ta.focus();
}

function finishEditing(div) {
  autosave(div);
  let ta = div.querySelector('textarea');
  let span = document.createElement('span');
  span.classList.add('zaz-text');
  span.innerText = ta.value;
  div.removeChild(ta);
  div.appendChild(span);
  div.removeAttribute('data-open');
}

function autosave(div) {
  if(!div.hasAttribute('data-changed'))
    return;
  div.classList.add('processing');
  let id = +div.getAttribute('data-id');
  let tag = div.getAttribute('data-tag');
  let tx = db.transaction('zap-zaz', 'readwrite');
  let os = tx.objectStore('zap-zaz');
  let ta = div.querySelector('textarea');
  let item = { id, tag, gid, text: ta.value };
  let rq = os.put(item);
  rq.onerror = console.log;
  rq.onsuccess = () => {
    div.classList.remove('processing');
    div.removeAttribute('data-changed');
  };
}
