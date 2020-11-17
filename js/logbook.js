import './components/spa-loading.js';
import './components/spa-colors.js';
import './components/spa-plus-list.js';
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
  document.querySelector('spa-plus-list').addEventListener('plus-action', plus);
  document.getElementById('log-sel').addEventListener('action', gameMenu);
  document.getElementById('tag-filter').addEventListener('change', filter);
  document.getElementById('game-list').addEventListener('game-chosen', e => gameClicked(e.detail.game));
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
  document.getElementById('load').hidden = false;
  document.getElementById('gname').innerText = game.name;
  document.getElementById('gdate').innerText = '(' + dateFormat(game.date) + ')';
  getAllRecords(game.id, addRecords);
  list.setAttribute('data-gid', game.id);
}

function addRecords(records) {
  let list = document.getElementById('log-list');
  let frag = document.createDocumentFragment();
  console.time('addRecords');
  records.forEach(record => {
    for(let i = 0; i < 1; i++) {
      let elm = document.createElement('log-record');
      elm.record = Record.from(record);
      frag.appendChild(elm);
    }
  });
  document.getElementById('load').hidden = true;
  list.appendChild(frag);
  list.offsetHeight;
  console.timeEnd('addRecords');
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
    elm.state = 'edit';
  }
}

function filter(e) {
  let sel = e.detail.selected;
  if(curView == views.records) {
    document.getElementById('log-list').querySelectorAll('log-record').forEach(elm => {
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
  document.querySelector('spa-plus-list').scrollToTop();
  document.querySelector('main').setAttribute('data-view', 'game-list');
  document.getElementById('game-list').hidden = false;
  document.getElementById('log-list').addEventListener('transitionend', e => { e.currentTarget.hidden = true; }, { once: true });
  document.getElementById('log-sel').addEventListener('transitionend', e => { e.currentTarget.hidden = true; }, { once: true });
  curView = views.games;
}

function gameClicked(game) {
  loadRecords(game);
  document.getElementById('tag-filter').selectAll();
  document.querySelector('spa-plus-list').scrollToTop();
  document.querySelector('main').setAttribute('data-view', 'rec-list');
  document.getElementById('log-list').hidden = false;
  document.getElementById('log-sel').hidden = false;
  document.getElementById('game-list').addEventListener('transitionend', e => { e.currentTarget.hidden = true; }, { once: true });
  curView = views.records;
}
