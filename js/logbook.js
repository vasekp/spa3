import './components/spa-colors.js';
import './components/spa-plus-list.js';
import './components/log-record.js';
import './components/log-record-list.js';
import './components/log-game.js';
import './components/spa-scroll.js';
import {db} from './log-db.js';
import {Enum} from './util/enum.js';
import {dateFormat} from './util/datetime.js';
import {debounce} from './util/debounce.js';
import {gameStore} from './log-game-store.js';
import {recordStore} from './log-record-store.js';

let root;

const state = {
  set view(view) {
    root.querySelector('main').dataset.view = view;
  },
  get view() {
    return root.querySelector('main').dataset.view;
  }
};

state.views = Enum.fromObj({
  records: 'rec-list',
  games: 'game-list'
});

const lsKeys = Enum.fromObj({
  gid: 'log-gid'
});

const gameNameView = {
  set name(name) { root.getElementById('gname').innerText = name; },
  set date(date) { root.getElementById('gdate').innerText = `(${dateFormat(date)})`; }
};

export function init(_root) {
  root = _root;
  root.querySelector('spa-plus-list').button.addEventListener('click', plus);
  root.getElementById('log-sel').addEventListener('click', gameList);
  root.getElementById('tag-filter').addEventListener('filter-change', filter);
  root.getElementById('game-list').addEventListener('game-chosen', e => recordList(e.detail.gameAwaitable));
  root.getElementById('no-games').addEventListener('click', plus);
  db.then(dbReady);
}

function gameList() {
  let curGame = root.getElementById('record-list').game;
  if(curGame)
    curGame.removeView(gameNameView);
  state.view = state.views.games;
  delete localStorage[lsKeys.gid];
  root.getElementById('tag-filter').selectAll();
}

function recordList(gameAwaitable) {
  loadRecords(gameAwaitable);
  state.view = state.views.records;
  root.getElementById('tag-filter').selectAll();
}

async function dbReady(adb) {
  if(adb.dataOldVersion === 0)
    await addExampleData(adb);
  let games = await gameStore.getAll();
  populateGameList(games);
  gameStore.get(+localStorage[lsKeys.gid])
    .then(game => recordList(game))
    .catch(err => gameList());
}

async function addExampleData(adb) {
  let tx = adb.transaction(['log-gid', 'log-rec'], 'readwrite');
  let gid = (await gameStore.create('Příklad', tx)).id;
  recordStore.create({ gid, tag: 1, text: 'Příklad' }, tx);
  recordStore.create({ gid, tag: 2, text: 'Upřesnítko' }, tx);
  recordStore.create({ gid, tag: 3, text: 'Mezitajenka' }, tx);
  recordStore.create({ gid, tag: 4, text: 'Nápověda' }, tx);
  recordStore.create({ gid, tag: 5, text: 'Adresa' }, tx);
  localStorage[lsKeys.gid] = gid;
  return new Promise(resolve => tx.oncomplete = resolve);
}

async function loadRecords(gameAwaitable) {
  let list = root.getElementById('record-list');
  while(list.firstChild)
    list.removeChild(list.firstChild);
  root.getElementById('load').hidden = false;
  let game = await gameAwaitable;
  localStorage[lsKeys.gid] = game.id;
  list.game = game;
  game.addView(gameNameView);
  populateRecList(await recordStore.getAll(game.id));
}

function populateGameList(games) {
  let glist = root.getElementById('game-list');
  for(let game of games) {
    let elm = document.createElement('log-game');
    elm.record = game;
    glist.appendChild(elm);
  }
  root.getElementById('load').hidden = true;
}

function populateRecList(records) {
  let list = root.getElementById('record-list');
  let frag = document.createDocumentFragment();
  for(let record of records) {
    let elm = document.createElement('log-record');
    elm.record = record;
    frag.appendChild(elm);
  }
  root.getElementById('load').hidden = true;
  list.appendChild(frag);
  list.offsetHeight;
}

function plus(e) {
  root.getElementById('tag-filter').selectAll();
  if(state.view === state.views.records) {
    let elm = document.createElement('log-record');
    root.getElementById('record-list').appendChild(elm);
    elm.scrollIntoView();
    elm.focus();
  } else {
    let elm = document.createElement('log-game');
    root.getElementById('game-list').appendChild(elm);
    elm.scrollIntoView();
  }
}

function filter(e) {
  let sel = e.detail.selected;
  if(state.view === state.views.records) {
    for(let elm of root.getElementById('record-list').querySelectorAll('log-record')) {
      let show = elm.record ? sel[elm.record.tag] : true;
      elm.hidden = !show;
    }
  } else {
    let odd = true;
    for(let elm of root.getElementById('game-list').querySelectorAll('log-game')) {
      let show = elm.record && elm.record.tag ? sel[elm.record.tag] : sel.all;
      elm.hidden = !show;
      if(show) {
        elm.classList.toggle('alt-row', odd);
        odd = !odd;
      }
    }
  }
}

export function populateSettings(elm) {
  elm.append(root.getElementById('module-settings').content.cloneNode(true));
  {
    let ccount = 9;
    const div = elm.querySelector('#log-set-ccount');
    const [minus, count, plus] = div.children;
    const showHide = debounce(() => {
      for(const elm2 of elm.querySelector('#log-set-clabels').children) {
        const span = elm2.firstChild;
        elm2.hidden = span.dataset.color > ccount;
      }
    }, 500);
    const update = () => {
      ccount = Math.max(Math.min(ccount, 9), 5);
      count.textContent = ccount;
      minus.disabled = ccount == 5;
      plus.disabled = ccount == 9;
      showHide();
    }
    minus.addEventListener('click', () => { --ccount; update(); });
    plus.addEventListener('click', () => { ++ccount; update(); });
    update();
  }
  elm.querySelector('#log-set-clabels').addEventListener('input', e => {
    const tgt = e.target;
    const trim = tgt.value.trim();
    tgt.previousElementSibling.dataset.content = trim ? trim[0].toUpperCase() : '';
  });
}
