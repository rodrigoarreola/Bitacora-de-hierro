(function () {
  'use strict';

  function isQueueable(method, path){
    if(method === 'PUT' && path.startsWith('api/exercises.php')) return true;
    if(method === 'DELETE' && path.startsWith('api/exercises.php')) return true;
    if(method === 'PUT' && path.startsWith('api/weeks.php')) return true;
    return false;
  }

  async function request(method, path, body, opts) {
    opts = opts || {};
    let res;
    try {
      res = await fetch(path, {
        method,
        credentials: 'same-origin',
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      // opts.isReplay: esta llamada YA es una reproducción desde la cola
      // offline — si vuelve a fallar por red, no hay que reencolarla de
      // nuevo (OfflineQueue.flush ya la deja en la cola si esto tira).
      if (!opts.isReplay && window.OfflineQueue && isQueueable(method, path)) {
        await window.OfflineQueue.add(method, path, body);
        if (typeof Api.onQueueChange === 'function') Api.onQueueChange();
        return { __queued: true };
      }
      throw new Error('Sin conexión — no se pudo completar la acción.');
    }

    let json;
    try {
      json = await res.json();
    } catch (err) {
      throw new Error('Respuesta inválida del servidor.');
    }

    // Un 401 en login.php significa "credenciales incorrectas" (mensaje real
    // en json.error, se preserva abajo); en cualquier otro endpoint significa
    // "sesión expirada", así que además avisamos para mostrar el login.
    if (res.status === 401 && typeof Api.onUnauthorized === 'function') {
      Api.onUnauthorized();
    }

    if (!json.ok) {
      const err = new Error(json.error || 'Error desconocido.');
      err.status = res.status;
      throw err;
    }
    return json.data;
  }

  const Api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body ?? {}),
    put: (path, body, opts) => request('PUT', path, body ?? {}, opts),
    del: (path, opts) => request('DELETE', path, undefined, opts),
    // app.js asigna esto para reaccionar a una sesión expirada/cerrada.
    onUnauthorized: null,
    // app.js asigna esto para refrescar el banner de pendientes offline.
    onQueueChange: null,
  };

  // Reproduce una mutación encolada contra el endpoint real. Para PUT a
  // exercises.php se agrega client_time (momento en que se hizo el cambio
  // originalmente offline, no el momento del replay) — es lo que el
  // backend usa para decidir si el cambio sigue siendo el más nuevo
  // (last-write-wins, ver api/exercises.php).
  Api.replayMutation = async function(mutation){
    const opts = { isReplay: true };
    if (mutation.method === 'PUT') {
      const body = mutation.path.startsWith('api/exercises.php')
        ? { ...mutation.body, client_time: new Date(mutation.queuedAt).toISOString() }
        : mutation.body;
      return request('PUT', mutation.path, body, opts);
    }
    if (mutation.method === 'DELETE') {
      return request('DELETE', mutation.path, undefined, opts);
    }
    throw new Error(`Método no reproducible: ${mutation.method}`);
  };

  window.Api = Api;
})();
