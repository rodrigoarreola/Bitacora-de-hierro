(function(){
  const DB_NAME = 'bitacora-offline';
  const DB_VERSION = 1;
  const STORE = 'pending_mutations';

  function openDb(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = ()=>{
        const db = req.result;
        if(!db.objectStoreNames.contains(STORE)){
          db.createObjectStore(STORE, { keyPath: 'localId' });
        }
      };
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error);
    });
  }

  function genId(){
    return (crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function add(method, path, body){
    const db = await openDb();
    const mutation = { localId: genId(), method, path, body: body || {}, queuedAt: Date.now() };
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add(mutation);
      tx.oncomplete = ()=> resolve(mutation);
      tx.onerror = ()=> reject(tx.error);
    });
  }

  async function getAll(){
    const db = await openDb();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error);
    });
  }

  async function remove(localId){
    const db = await openDb();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(localId);
      tx.oncomplete = ()=> resolve();
      tx.onerror = ()=> reject(tx.error);
    });
  }

  async function count(){
    return (await getAll()).length;
  }

  // replayFn: función inyectada por api.js que sabe cómo reproducir una
  // mutación (evita import circular entre este archivo y api.js).
  async function flush(replayFn){
    const pending = (await getAll()).sort((a,b)=> a.queuedAt - b.queuedAt);
    let synced = 0, dropped = 0, stale = 0;
    for(const m of pending){
      try{
        const result = await replayFn(m);
        if(result && result.stale) stale++;
        await remove(m.localId);
        synced++;
      }catch(err){
        if(err.status === 404){ await remove(m.localId); dropped++; continue; }
        break; // sigue sin conexión u otro error - se reintenta en el próximo flush, sin tocar el resto de la cola
      }
    }
    return { synced, dropped, stale, pending: (await getAll()).length };
  }

  window.OfflineQueue = { add, getAll, remove, count, flush };
})();
