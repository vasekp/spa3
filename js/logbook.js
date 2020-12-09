import './components/spa-colors.js';
import './components/spa-plus-list.js';
import './components/log-record.js';
import './components/log-record-list.js';
import './components/log-game.js';
import './components/spa-scroll.js';
import {dateFormat} from './datetime.js';
import {db} from './log-db.js';
import {gameStore} from './log-game-store.js';
import {recordStore} from './log-record-store.js';

let state = {
  set view(view) {
    document.querySelector('main').setAttribute('data-view', view);
  },
  get view() {
    return document.querySelector('main').getAttribute('data-view');
  }
};

state.views = Object.freeze({
  records: 'rec-list',
  games: 'game-list'
});

let gameNameView = {
  set name(name) { document.getElementById('gname').innerText = name; },
  set date(date) { document.getElementById('gdate').innerText = '(' + dateFormat(date) + ')'; }
};

window.addEventListener('DOMContentLoaded', () => {
  document.querySelector('spa-plus-list').addEventListener('plus-action', plus);
  document.getElementById('log-sel').addEventListener('action', gameList);
  document.getElementById('tag-filter').addEventListener('change', filter);
  document.getElementById('game-list').addEventListener('game-chosen', e => recordList(e.detail.game));
  db.then(dbReady);
});

function gameList() {
  let curGame = document.getElementById('record-list').game;
  if(curGame)
    curGame.removeView(gameNameView);
  state.view = state.views.games;
  document.getElementById('tag-filter').selectAll();
}

function recordList(game) {
  loadRecords(game);
  state.view = state.views.records;
  document.getElementById('tag-filter').selectAll();
}

async function dbReady(adb) {
  if(adb.dataOldVersion === 0)
    await addExampleData(adb);
  let games = await gameStore.getAll();
  populateGameList(games);
  if(games.length > 0)
    recordList(games[0]);
  else
    gameList();
}

async function addExampleData(adb) {
  let tx = adb.transaction(['log-gid', 'log-rec'], 'readwrite');
  let gid = (await gameStore.create('Příklad', tx)).id;
  recordStore.create({ gid, tag: 1, text: 'Příklad' }, tx);
  recordStore.create({ gid, tag: 2, text: 'Upřesnítko' }, tx);
  recordStore.create({ gid, tag: 3, text: 'Mezitajenka' }, tx);
  recordStore.create({ gid, tag: 4, text: 'Nápověda' }, tx);
  recordStore.create({ gid, tag: 5, text: 'Adresa' }, tx);
  return new Promise(resolve => tx.oncomplete = resolve);
}

async function loadRecords(game) {
  let list = document.getElementById('record-list');
  while(list.firstChild)
    list.removeChild(list.firstChild);
  list.game = game;
  game.addView(gameNameView);
  document.getElementById('load').hidden = false;
  populateRecList(await recordStore.getAll(game.id));
}

function populateGameList(games) {
  let glist = document.getElementById('game-list');
  games.forEach(game => {
    let elm = document.createElement('log-game');
    elm.record = game;
    glist.appendChild(elm);
  });
}

function populateRecList(records) {
  let list = document.getElementById('record-list');
  let frag = document.createDocumentFragment();
  records.forEach(record => {
    let elm = document.createElement('log-record');
    elm.record = record;
    frag.appendChild(elm);
  });
  document.getElementById('load').hidden = true;
  list.appendChild(frag);
  list.offsetHeight;
}

function plus(e) {
  document.getElementById('tag-filter').selectAll();
  if(state.view === state.views.records) {
    let elm = document.createElement('log-record');
    document.getElementById('record-list').appendChild(elm);
    elm.state = 'empty';
    elm.setAttribute('data-protected', '');
    elm.scrollIntoView();
  } else {
    let elm = document.createElement('log-game');
    document.getElementById('game-list').appendChild(elm);
    elm.scrollIntoView();
    elm.state = 'firstEdit';
  }
  e.preventDefault();
}

function filter(e) {
  let sel = e.detail.selected;
  if(state.view === state.views.records) {
    document.getElementById('record-list').querySelectorAll('log-record').forEach(elm => {
      let show = elm.record ? sel[elm.record.tag] : true;
      elm.hidden = !show;
    });
  } else {
    document.getElementById('game-list').querySelectorAll('log-game').forEach(elm => {
      let show = elm.record.tag ? sel[elm.record.tag] : sel.all;
      elm.hidden = !show;
    });
  }
}
