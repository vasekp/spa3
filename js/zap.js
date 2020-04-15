var db;
var gid;

function error(e) {
  return function() { alert(e); }
}

window.addEventListener('DOMContentLoaded', function() {
  //indexedDB.deleteDatabase('spa');
  let rq = indexedDB.open('spa', 1);
  rq.onupgradeneeded = function(e) {
    db = e.target.result;
    if(e.oldVersion === 0) {
      let sGames = db.createObjectStore('zap-hry', { keyPath: 'id', autoIncrement: true });
      let sNotes = db.createObjectStore('zap-zaz', { autoIncrement: true });
      sNotes.createIndex('gid', 'gid', { unique: false });
    }
  };
  rq.onsuccess = function(e) {
    db = e.target.result;
    let tx = db.transaction('zap-hry', 'readonly');
    let os = tx.objectStore('zap-hry');
    let rq = os.getAllKeys();
    rq.onerror = error('Error getAllKeys');
    rq.onsuccess = function(e) {
      let keys = e.target.result;
      if(keys.length > 0) {
        gid = keys[0];
        console.log('Using gid ' + gid);
        refreshItems();
      } else
        addTestData();
    }
  };
  rq.onerror = error('Error creating IndexedDB');
});

function addTestData() {
  console.log('Adding test data');
  let tx = db.transaction('zap-hry', 'readwrite');
  let os = tx.objectStore('zap-hry');
  let item = {
    name: 'ABC',
    date: new Date()
  };

  let rq = os.add(item);
  rq.onerror = error('Error adding test data (hry)');
  rq.onsuccess = function(e) {
    gid = e.target.result;
    let tx = db.transaction('zap-zaz', 'readwrite');
    let os = tx.objectStore('zap-zaz');
    let items = [
      { tag: 1, text: 'Příchod' },
      { tag: 2, text: 'Upřesnítko' },
      { tag: 3, text: 'Mezitajenka' },
      { tag: 4, text: 'Nápověda' },
      { tag: 5, text: 'Adresa' }
    ];
    items.forEach(function(item) {
      item.gid = gid;
      os.add(item);
    });
    tx.onerror = error('Error adding test data (zaz)');
    tx.oncomplete = refreshItems;
  }
}

function refreshItems() {
  let tx = db.transaction('zap-zaz', 'readonly');
  let os = tx.objectStore('zap-zaz');
  let ix = os.index('gid');
  let rq = ix.getAll(gid);
  rq.onsuccess = function(e) {
    let results = e.target.result;
    let cont = document.getElementById('list');
    while(cont.firstChild) {
      cont.removeChild(cont.firstChild);
    }
    results.forEach(function(item) {
      let div = document.createElement('div');
      div.classList.add('color', 'c' + item.tag, 'log-item');
      div.innerText = item.text;
      cont.appendChild(div);
    });
  };
  rq.onerror = error('Error refreshing items');
}
