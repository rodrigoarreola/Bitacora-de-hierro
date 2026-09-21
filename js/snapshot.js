// Copia local de los datos de la app (semanas, librería y reglas) para poder
// abrir la PWA sin conexión. Se guarda tras cada carga exitosa desde la API y
// se borra al cerrar sesión o al perderla: son datos del usuario y no deben
// quedar en el dispositivo sin sesión. Todo va en try/catch — si IndexedDB
// falla, la app se comporta como si no existiera la copia.
(function(){
  const DB_NAME = 'bitacora-snapshot';
  const DB_VERSION = 1;
  const STORE = 'snapshot';
  const KEY = 'app-data';

  function openDb(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = ()=>{
        const db = req.result;
        if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error);
    });
  }

  async function run(mode, fn){
    const db = await openDb();
    try{
      return await new Promise((resolve, reject)=>{
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = ()=> resolve(req ? req.result : undefined);
        tx.onerror = ()=> reject(tx.error);
        tx.onabort = ()=> reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  // data: { bulk, library, settings }
  async function save(data){
    try{ await run('readwrite', s => s.put({ ...data, savedAt: Date.now() }, KEY)); }
    catch(err){ /* sin copia local: no bloquea nada */ }
  }

  // Devuelve la copia o null si no hay / no se puede leer / está incompleta.
  async function load(){
    try{
      const data = await run('readonly', s => s.get(KEY));
      if(!data || !data.bulk || !Array.isArray(data.bulk.order) || !data.bulk.weeks || !Array.isArray(data.library)) return null;
      return data;
    }catch(err){ return null; }
  }

  async function clear(){
    try{ await run('readwrite', s => s.delete(KEY)); }
    catch(err){ /* nada que borrar o sin soporte */ }
  }

  window.Snapshot = { save, load, clear };
})();
