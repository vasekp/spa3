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

export const lsKeys = Enum.fromObj({
  gid: 'log-gid',
  ccount: 'log-ccount',
  labelsDefault: 'log-labels-records',
  labelsGames: 'log-labels-games',
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
  if(localStorage[lsKeys.ccount])
    root.getElementById('tag-filter').dataset.count = localStorage[lsKeys.ccount];
  db.then(dbReady);
}

function gameList() {
  const curGame = root.getElementById('record-list').game;
  if(curGame)
    curGame.removeView(gameNameView);
  state.view = state.views.games;
  delete localStorage[lsKeys.gid];
  root.getElementById('tag-filter').selectAll();
  root.getElementById('tag-filter').labels = getLabelsGames()[1];
}

function recordList(gameAwaitable) {
  loadRecords(gameAwaitable);
  state.view = state.views.records;
  root.getElementById('tag-filter').selectAll();
}

async function dbReady(adb) {
  if(adb.dataOldVersion === 0)
    await addExampleData(adb);
  const games = await gameStore.getAll();
  populateGameList(games);
  gameStore.get(+localStorage[lsKeys.gid])
    .then(game => recordList(game))
    .catch(err => gameList());
}

async function addExampleData(adb) {
  const tx = adb.transaction(['log-gid', 'log-rec'], 'readwrite');
  const gid = (await gameStore.create('Příklad', tx)).id;
  recordStore.create({ gid, tag: 1, text: 'Příklad' }, tx);
  recordStore.create({ gid, tag: 2, text: 'Upřesnítko' }, tx);
  recordStore.create({ gid, tag: 3, text: 'Mezitajenka' }, tx);
  recordStore.create({ gid, tag: 4, text: 'Nápověda' }, tx);
  recordStore.create({ gid, tag: 5, text: 'Adresa' }, tx);
  localStorage[lsKeys.gid] = gid;
  return new Promise(resolve => tx.oncomplete = resolve);
}

async function loadRecords(gameAwaitable) {
  const list = root.getElementById('record-list');
  while(list.firstChild)
    list.removeChild(list.firstChild);
  root.getElementById('load').hidden = false;
  const game = await gameAwaitable;
  localStorage[lsKeys.gid] = game.id;
  list.game = game;
  game.addView(gameNameView);
  root.getElementById('tag-filter').labels = getGameLabels(game)[1];
  populateRecList(await recordStore.getAll(game.id));
}

function populateGameList(games) {
  const glist = root.getElementById('game-list');
  for(const game of games) {
    const elm = document.createElement('log-game');
    elm.record = game;
    glist.appendChild(elm);
  }
  root.getElementById('load').hidden = true;
}

function populateRecList(records) {
  const list = root.getElementById('record-list');
  const frag = document.createDocumentFragment();
  for(const record of records) {
    const elm = document.createElement('log-record');
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
    const elm = document.createElement('log-record');
    root.getElementById('record-list').appendChild(elm);
    elm.scrollIntoView();
    elm.focus();
  } else {
    const elm = document.createElement('log-game');
    root.getElementById('game-list').appendChild(elm);
    elm.scrollIntoView();
  }
}

function filter(e) {
  const sel = e.detail.selected;
  if(state.view === state.views.records) {
    for(const elm of root.getElementById('record-list').querySelectorAll('log-record')) {
      const show = elm.record ? sel[elm.record.tag] : true;
      elm.hidden = !show;
    }
  } else {
    let odd = true;
    for(const elm of root.getElementById('game-list').querySelectorAll('log-game')) {
      const show = elm.record && elm.record.tag ? sel[elm.record.tag] : sel.all;
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
    let min = 5, max = 9;
    let ccount = localStorage[lsKeys.ccount] || max;
    const div = elm.querySelector('#log-set-ccount div');
    const [minus, count, plus] = div.children;
    const showHide = () => {
      for(const elm2 of elm.querySelector('#log-set-clabels').children) {
        const span = elm2.firstChild;
        elm2.hidden = span.dataset.color > ccount;
      }
      localStorage[lsKeys.ccount] = ccount;
      root.getElementById('tag-filter').dataset.count = ccount;
    }
    showHide();
    const showHideD = debounce(showHide, 500);
    const update = () => {
      ccount = Math.max(Math.min(ccount, max), min);
      count.textContent = ccount;
      minus.classList.toggle('inactive', ccount == min);
      plus.classList.toggle('inactive', ccount == max);
      showHideD();
    }
    (async () => {
      min = Math.max(await recordStore.maxTag(), await gameStore.maxTag(), 5);
      if(min === max)
        elm.querySelector('#log-set-ccount').hidden = true;
      update();
    })();
    minus.addEventListener('click', () => { --ccount; update(); });
    plus.addEventListener('click', () => { ++ccount; update(); });
    update();
  }
  {
    const game = root.getElementById('record-list').game;
    const labels = state.view === state.views.games
      ? getLabelsGames()
      : getGameLabels(game);
    const load = () => {
      for(const elm2 of elm.querySelector('#log-set-clabels').children) {
        const children = elm2.children;
        const color = children[0].dataset.color;
        children[1].value = labels[0][color] || '';
        children[0].dataset.content = labels[1][color] || '';
      }
    };
    load();
    elm.querySelector('#log-set-clabels').addEventListener('input', e => {
      const tgt = e.target;
      const trim = tgt.value.trim();
      const first = trim ? trim[0].toUpperCase() : '';
      tgt.previousElementSibling.dataset.content = first;
      labels[0][tgt.previousElementSibling.dataset.color] = trim;
      labels[1][tgt.previousElementSibling.dataset.color] = first;
      root.getElementById('tag-filter').labels = labels[1];
      if(state.view === state.views.games)
        localStorage[lsKeys.labelsGames] = JSON.stringify(labels);
      else
        game.labels = labels;
    });
    const div = elm.querySelector('#log-set-labels-default');
    if(state.view === state.views.games)
      div.hidden = true;
    else {
      const game = root.getElementById('record-list').game;
      div.children[0].addEventListener('click', () => {
        localStorage[lsKeys.labelsDefault] = JSON.stringify(game.labels);
      });
      div.children[1].addEventListener('click', () => {
        game.labels = null;
        labels = getGameLabels(game);
        root.getElementById('tag-filter').labels = labels[1];
        load();
      });
    }
  }
}

export function getGameLabels(game) {
  return game.labels
    ? game.labels
    : localStorage[lsKeys.labelsDefault]
      ? JSON.parse(localStorage[lsKeys.labelsDefault])
      : [[], []];
}

export function getLabelsGames() {
  return localStorage[lsKeys.labelsGames]
          ? JSON.parse(localStorage[lsKeys.labelsGames])
          : [[], []]
}
