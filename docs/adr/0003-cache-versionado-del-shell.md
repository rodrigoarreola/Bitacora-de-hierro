# 0003. Todo el shell desde un caché versionado, con aviso de versión nueva

- **Estado:** Aceptada
- **Fecha:** 2026-09-21

## Contexto
La navegación iba a la red primero y `css/js` al caché primero. Tras un deploy
se podía mostrar un `index.html` nuevo con un `app.js` viejo (se vio en vivo).
Además el service worker se activaba solo (`skipWaiting`) y la página abierta
seguía con el código anterior, sin avisar.

## Decisión
`index.html`, `css`, `js` e íconos salen del mismo caché
`bitacora-shell-v<versión>-<hash>` (ej. `bitacora-shell-v1.55.3-f517deaf55`),
cuyo nombre recalcula el hook `pre-commit` según el contenido del shell — el
hash es lo que decide si cambia; la versión semver (de la cabecera más
reciente de `CHANGELOG.md`) solo se agrega para que el nombre se lea en
DevTools y coincida con "Versión actual" en Perfil → Changelog (ver
[ADR 0010](0010-version-semver-en-el-nombre-del-cache.md)). Una versión nueva
se instala en segundo plano y **espera**;
la app muestra "Hay una versión nueva — Actualizar" y, al aceptar, activa el SW
(`SKIP_WAITING`) y se recarga. También se busca actualización al volver a primer
plano. El precache usa `cache:'reload'` para no guardar archivos viejos de la
caché HTTP. `api/` nunca se intercepta.

## Alternativas descartadas
- **Red primero para todo el shell**: siempre lo último, pero cada carga espera
  a la red y sigue sin haber aviso de versión.
- **`skipWaiting` automático**: cambia el código bajo los pies de quien está
  usando la app.

## Consecuencias
- Nunca se mezclan versiones; el usuario decide cuándo actualizar.
- En desarrollo, un cambio en el shell no se ve hasta que cambie `CACHE_NAME`
  (al commitear) y se acepte la actualización: usar *Update on reload* /
  *Bypass for network* en DevTools o `php scripts/bump-sw-cache.php`.
- Todo archivo nuevo del shell debe agregarse a `SHELL_ASSETS` (`sw.js`) y a
  la lista de `scripts/bump-sw-cache.php`.
- El hook solo actúa si cada clon activó `git config core.hooksPath .githooks`.
