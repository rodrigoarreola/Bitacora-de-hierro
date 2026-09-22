# 0010. Versión semver en el nombre del caché del shell

- **Estado:** Aceptada
- **Fecha:** 2026-09-22

## Contexto
`CACHE_NAME` (ADR 0003) era `bitacora-shell-<hash>`: un hash de contenido, sin
relación visible con la versión semver que se ve en Perfil → Changelog
(`js/changelog-data.js`, generado por ADR 0006). Alguien mirando DevTools →
Application → Cache Storage no podía saber qué versión de la app tenía
cacheada sin cruzar el hash contra el historial de commits.

Al implementar esto se encontró un bug real, sin relación con el caché:
`CHANGELOG.md` tenía la entrada de la 1.55.2 ordenada **después** de la 1.55.1
(un `Edit` insertó el bloque en el lugar equivocado), así que "Versión actual"
mostraba 1.55.1 aunque la 1.55.2 ya estaba publicada (tag y `HEAD` incluidos).
Se corrigió el orden como parte de este cambio.

## Decisión
`scripts/bump-sw-cache.php` arma `CACHE_NAME` como
`bitacora-shell-v<versión>-<hash>` (ej. `bitacora-shell-v1.55.3-f517deaf55`).
La versión sale de la cabecera más reciente de `CHANGELOG.md`
(`## [x.y.z] - fecha`), leída **después** de que `build-changelog.php` corrió
en el hook (ver ADR 0006) — ese script ya exige que esa cabecera tenga un
bloque `### En la app: …`, así que la versión siempre coincide con
`CURRENT_VERSION` (`js/changelog-data.js[0].version`).

**El hash sigue siendo lo que decide si el caché cambia**, no la versión: la
versión solo se agrega al nombre por legibilidad. En la práctica no hay caso
donde difieran — `CHANGELOG.md` no cambia de versión sin que
`build-changelog.php` regenere `js/changelog-data.js`, que ya es parte del
shell hasheado, así que un cambio de versión sin cambios de código real es un
caso que no ocurre.

Si `CHANGELOG.md` no tiene ninguna cabecera de versión válida, el script
aborta (mismo criterio que las demás guardas de `bump-sw-cache.php`).

## Alternativas descartadas
- **Solo la versión, sin hash** (`bitacora-shell-v1.55.3`): pierde la garantía
  real de que el caché se invalida ante cualquier cambio de contenido — dos
  commits con la misma versión (ej. un `hotfix` sin bump de versión) no
  invalidarían nada.
- **Un archivo `VERSION` aparte**, leído por `bump-sw-cache.php` y por
  `build-changelog.php`: una fuente más que mantener sincronizada, cuando
  `CHANGELOG.md` ya es la fuente única (ADR 0006).

## Consecuencias
- El nombre del caché en DevTools coincide con "Versión actual" en Perfil.
- `scripts/bump-sw-cache.php` ahora depende de `CHANGELOG.md`, además de los
  archivos del shell — un archivo más a tener presente si se mueve o renombra.
- Verificado en el navegador: instalación limpia, aviso de actualización con
  el nombre nuevo, y limpieza de cachés `bitacora-shell-*` viejos, todo sin
  cambios frente al comportamiento de ADR 0003 (el filtro por prefijo sigue
  sirviendo con el nombre más largo).
