import './components/spa-loading.js';
import './components/spa-colors.js';
import './components/log-record.js';
import './components/log-list.js';
import './components/log-game.js';
import {dateFormat} from './datetime.js';
import {prepareDatabase, getAllGames, getAllRecords} from './log-db.js';
import {Record} from './log-record.js';
import {Game} from './log-game.js';

var db;

let views = {
  records: 0,
  games: 1
};
let curView = views.records;

window.addEventListener('DOMContentLoaded', () => {
  prepareDatabase(dbReady);
  document.getElementById('plus').addEventListener('click', plus);
  document.getElementById('game-select').addEventListener('click', gameMenu);
  document.getElementById('tag-filter').addEventListener('change', filter);
  document.getElementById('game-list').addEventListener('game-clicked', e => gameClicked(e.detail.game));
  document.getElementById('game-list').addEventListener('delete-game', e => deleteGame(e.detail.gid));
});

function dbReady() {
  getAllGames(games => {
    populateGList(games);
    if(games.length > 0)
      loadRecords(games[0]);
    else
      gameMenu();
  });
}

function populateGList(games) {
  let glist = document.getElementById('game-list');
  games.forEach(game => {
    let elm = document.createElement('log-game');
    elm.record = Game.from(game);
    glist.appendChild(elm);
  });
}

function loadRecords(game) {
  let list = document.getElementById('log-list');
  while(list.firstChild)
    list.removeChild(list.firstChild);
  let load = document.createElement('spa-loading');
  list.appendChild(load);
  document.getElementById('gname').innerText = game.name;
  document.getElementById('gdate').innerText = '(' + dateFormat(game.date) + ')';
  getAllRecords(game.id, records => {
    while(list.firstChild)
      list.removeChild(list.firstChild);
    records.forEach(record => addRecord(record));
  });
  list.setAttribute('data-gid', game.id);
}

function addRecord(record) {
  let elm = document.createElement('log-record');
  elm.record = Record.from(record);
  document.getElementById('log-list').appendChild(elm);
  return elm;
}

function plus(e) {
  document.getElementById('tag-filter').selectAll();
  if(curView == views.records) {
    let elm = document.createElement('log-record');
    document.getElementById('log-list').appendChild(elm);
    elm.setAttribute('data-protected', '');
    elm.scrollIntoView();
  } else {
    let elm = document.createElement('log-game');
    document.getElementById('game-list').appendChild(elm);
    elm.scrollIntoView();
    elm.focus();
  }
}

function filter(e) {
  let sel = e.detail.selected;
  if(curView == views.records) {
    document.getElementById('log-list').querySelectorAll('log-record').forEach(elm =>
      elm.classList.toggle('hide', !sel[elm.record.tag]));
  } else {
    document.getElementById('game-list').querySelectorAll('log-game').forEach(elm => {
      let show = elm.record.color ? sel[elm.record.color] : sel.all;
      elm.classList.toggle('hide', !show);
    });
  }
}

function gameMenu() {
  document.getElementById('log-list').classList.add('zeroheight');
  document.getElementById('game-list').classList.remove('zeroheight');
  document.getElementById('log-sel').classList.add('zeroheight');
  document.getElementById('tag-filter').selectAll();
  curView = views.games;
}

function gameClicked(game) {
  loadRecords(game);
  document.getElementById('log-list').classList.remove('zeroheight');
  document.getElementById('game-list').classList.add('zeroheight');
  document.getElementById('log-sel').classList.remove('zeroheight');
  document.getElementById('tag-filter').selectAll();
  curView = views.records;
}
