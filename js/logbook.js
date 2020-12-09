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

let views = {
  records: 0,
  games: 1
};
let curView = views.records;
let curGame;

window.addEventListener('DOMContentLoaded', () => {
  document.querySelector('spa-plus-list').addEventListener('plus-action', plus);
  document.getElementById('log-sel').addEventListener('action', gameMenu);
  document.getElementById('tag-filter').addEventListener('change', filter);
  document.getElementById('game-list').addEventListener('game-chosen', e => gameClicked(e.detail.game));
  document.getElementById('game-list').addEventListener('delete-game', e => gameStore.delete(e.detail.gid));
  db.then(dbReady);
});

async function dbReady(adb) {
  if(adb.dataOldVersion === 0)
    await addExampleData(adb);
  let games = await gameStore.getAll();
  populateGameList(games);
  if(games.length > 0)
    loadRecords(games[0]);
  else
    gameMenu();
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

function populateGameList(games) {
  let glist = document.getElementById('game-list');
  games.forEach(game => {
    let elm = document.createElement('log-game');
    elm.record = game;
    glist.appendChild(elm);
  });
}

let gameNameView = {
  set name(name) { document.getElementById('gname').innerText = name; },
  set date(date) { document.getElementById('gdate').innerText = '(' + dateFormat(date) + ')'; }
};

async function loadRecords(game) {
  let list = document.getElementById('record-list');
  while(list.firstChild)
    list.removeChild(list.firstChild);
  curGame = game;
  game.addView(gameNameView);
  document.getElementById('load').hidden = false;
  list.setAttribute('data-gid', game.id);
  populateRecList(await recordStore.getAll(game.id));
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
  if(curView == views.records) {
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
  if(curView == views.records) {
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

function gameMenu() {
  document.getElementById('tag-filter').selectAll();
  document.querySelector('main').setAttribute('data-view', 'game-list');
  if(curGame)
    curGame.removeView(gameNameView);
  curView = views.games;
}

function gameClicked(game) {
  loadRecords(game);
  document.getElementById('tag-filter').selectAll();
  document.querySelector('main').setAttribute('data-view', 'rec-list');
  curView = views.records;
}
