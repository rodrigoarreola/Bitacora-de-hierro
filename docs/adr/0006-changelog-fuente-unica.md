# 0006. `CHANGELOG.md` como fuente única del changelog de la app

- **Estado:** Aceptada
- **Fecha:** 2026-09-21

## Contexto
El historial de versiones vivía dos veces: `CHANGELOG.md` (técnico, con nombres
de funciones y causas) y `APP_VERSIONS`, una lista de ~220 líneas dentro de
`js/app.js` con el resumen de cara al usuario (Perfil → Changelog). Los dos se
editaban a mano y podían divergir; además inflaban `app.js`. Los textos son
distintos a propósito (7 títulos ya diferían).

## Decisión
Cada versión de `CHANGELOG.md` lleva, bajo su encabezado, un bloque:

```markdown
### En la app: <título de cara al usuario>

- Qué cambió, en lenguaje llano.
```

`scripts/build-changelog.php` genera `js/changelog-data.js`
(`window.APP_VERSIONS`) a partir de esos bloques y lo corre el hook
`pre-commit`, antes de recalcular el hash del caché. Las versiones sin bloque
(el prototipo 0.1.0) no aparecen en la app. Si la versión más reciente no tiene
bloque, el commit se aborta.

## Alternativas descartadas
- **Mover `APP_VERSIONS` a otro archivo a mano**: quita líneas de `app.js`, pero
  deja dos fuentes que mantener.
- **Mostrar el texto técnico del changelog en la app**: demasiado denso para
  quien solo usa la app.

## Consecuencias
- Una sola edición por versión; `js/changelog-data.js` es un artefacto generado
  que se versiona (la app corre sin build) y **no se edita a mano**.
- `js/changelog-data.js` forma parte del shell: está en `SHELL_ASSETS` y en la
  lista de `scripts/bump-sw-cache.php`.
- Requiere PHP en el commit (el hook ya lo requería) y `core.hooksPath` activo.
- El traspaso de las 52 versiones existentes se verificó idéntico entrada por
  entrada contra la lista original.
