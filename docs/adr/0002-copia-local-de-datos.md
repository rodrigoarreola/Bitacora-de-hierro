# 0002. Copia local de datos en IndexedDB para abrir sin conexión

- **Estado:** Aceptada
- **Fecha:** 2026-09-21

## Contexto
Abrir la PWA sin red desde cero mandaba al Login: `session.php` fallaba y
`bootstrap()` asumía "no hay sesión". La sesión es una cookie PHP de 30 días
(no hay una "sesión local"), y todos los datos se cargan a memoria desde la
API, sin ninguna copia. Solo evitar el Login habría abierto una app vacía.

## Decisión
`js/snapshot.js` guarda `{ bulk, library, settings }` en IndexedDB
(`bitacora-snapshot`) tras cada carga correcta. Sin red y con copia, la app abre
con esos datos y el banner "mostrando tus últimos datos guardados"; sin copia,
pantalla "Sin conexión" con Reintentar. Solo se va al Login si el servidor
confirma `authenticated:false`. La copia se borra al cerrar sesión y ante un 401.

## Alternativas descartadas
- **Solo pantalla de reintento**: más simple, pero la PWA seguiría sin servir
  offline en frío.
- **Guardar credenciales o un token local**: innecesario (la cookie ya vive
  30 días) y peor para la seguridad.

## Consecuencias
- Datos del usuario quedan en el dispositivo mientras haya sesión; por eso el
  borrado en logout/401 es parte de la decisión, no un extra.
- Las ediciones en cola (`offline-queue.js`) no se reflejan en la copia: al
  reabrir sin red se ven los datos anteriores hasta sincronizar.
- Al volver la red se recarga todo desde el servidor (`syncOfflineQueue`).
- Sin CDN cacheados (íconos, gráficas, tipografías) la app abre, pero incompleta.
