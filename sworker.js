self.addEventListener('install', e => e.waitUntil(self.skipWaiting()));

self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  url.search = '';
  if(url.origin === location.origin)
    e.respondWith(caches.match(url.href).then(r => r || fetch(url.href)).catch(() => null));
  else
    e.respondWith(fetch(url.href));
});

self.addEventListener('message', m => {
  m.waitUntil(async function() {
    m.source.postMessage(await update(m.data.dryrun));
  }());
});

async function update(dryrun = false) {
  const repo = self.location.href.includes('spa3-test') ? 'spa3-test' : 'spa3';
  const m = await caches.match('cachedVersion');
  const oldV = m ? await m.text() : null;
  const newV = (await (await fetch(`https://api.github.com/repos/vasekp/${repo}/deployments`)).json())[0].sha;
  if(newV !== oldV) {
    const newTree = await (await fetch(`https://api.github.com/repos/vasekp/${repo}/git/trees/${newV}?recursive=1`)).json();
    const newStreamV = newTree.tree.find(item => item.path === 'js/stream').sha;
    const newStreamTree = await (await fetch(`https://api.github.com/repos/vasekp/stream/git/trees/${newStreamV}?recursive=1`)).json();
    const oldTree = oldV
      ? await (await fetch(`https://api.github.com/repos/vasekp/${repo}/git/trees/${oldV}?recursive=1`)).json()
      : { tree: [] };
    const oldStreamV = oldTree.tree.find(item => item.path === 'js/stream')?.sha;
    const oldStreamTree = oldStreamV
      ? await (await fetch(`https://api.github.com/repos/vasekp/stream/git/trees/${oldStreamV}?recursive=1`)).json()
      : { tree: [] };
    const cacheName = `snapshot-${newV}`;
    const filesKeep = [];
    const filesUpdate = ['./'];
    const filesIgnore = (await (await fetch('no-sync.txt')).text()).split('\n').filter(w => w.length > 0);
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
    for(const newEntry of newStreamTree.tree) {
      if(newEntry.type !== 'blob')
        continue;
      const oldEntry = oldStreamTree.tree.find(other => other.path === newEntry.path);
      if(oldEntry && oldEntry.sha === newEntry.sha)
        filesKeep.push('js/stream/' + newEntry.path);
      else {
        filesUpdate.push('js/stream/' + newEntry.path);
        dlSize += newEntry.size;
      }
    }
    if(dryrun)
      return {
        update: 'available',
        oldV, newV,
        dlSize
      };
    const cache = await caches.open(cacheName);
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
