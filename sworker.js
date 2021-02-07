self.addEventListener('install', e => {
  e.waitUntil(async function() {
    self.skipWaiting();
  }());
});

self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(url.origin === location.origin)
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  else
    e.respondWith(fetch(e.request));
});

self.addEventListener('message', m => {
  m.waitUntil(async function() {
    m.source.postMessage(await update(m.data.dryrun));
  }());
});

async function update(dryrun = false) {
  const m = await caches.match('cachedVersion');
  const oldV = m ? await m.text() : null;
  const newTree = await (await fetch(`https://api.github.com/repos/vasekp/spa3/git/trees/master?recursive=1`)).json();
  const newV = newTree.sha;
  if(newV !== oldV) {
    const oldTree = oldV
      ? await (await fetch(`https://api.github.com/repos/vasekp/spa3/git/trees/${oldV}?recursive=1`)).json()
      : { tree: [] };
    const cacheName = `snapshot-${newV}`;
    const cache = await caches.open(cacheName);
    const filesKeep = [];
    const filesUpdate = ['./'];
    const filesIgnore = [
      '.github/FUNDING.yml',
      'fonts/SPA3.sfd',
      'sworker.js'
    ];
    let dlSize = 0;
    for(const newEntry of newTree.tree) {
      if(newEntry.type !== 'blob')
        continue;
      if(filesIgnore.indexOf(newEntry.path) !== -1)
        continue;
      const oldEntry = oldTree.tree.find(other => other.path === newEntry.path);
      if(oldEntry && oldEntry.sha === newEntry.sha)
        filesKeep.push(newEntry.path);
      else {
        filesUpdate.push(newEntry.path);
        dlSize += newEntry.size;
      }
    }
    if(dryrun)
      return {
        update: 'available',
        oldV, newV,
        dlSize
      };
    const promises = [];
    for(const f of filesKeep)
      promises.push(async function() {
        cache.put(f, await caches.match(f) || await fetch(f));
      }());
    for(const f of filesUpdate)
      promises.push(async function() {
        cache.put(f, await fetch(f, { cache: 'no-cache' }));
      }());
    await Promise.all(promises);
    for(const key of await caches.keys())
      if(key !== cacheName)
        await caches.delete(key);
    await cache.put('cachedVersion', new Response(newV));
    return {
      update: 'updated',
      oldV, newV,
      filesKept: filesKeep.length,
      filesUpdated: filesUpdate.length
    };
  } else
    return {
      update: 'none',
      oldV
    };
}
