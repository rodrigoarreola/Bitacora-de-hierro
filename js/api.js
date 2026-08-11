(function () {
  'use strict';

  async function request(method, path, body) {
    const res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

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
      throw new Error(json.error || 'Error desconocido.');
    }
    return json.data;
  }

  const Api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body ?? {}),
    put: (path, body) => request('PUT', path, body ?? {}),
    del: (path) => request('DELETE', path),
    // app.js asigna esto para reaccionar a una sesión expirada/cerrada.
    onUnauthorized: null,
  };

  window.Api = Api;
})();
