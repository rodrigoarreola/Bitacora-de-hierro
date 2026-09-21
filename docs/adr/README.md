# Decisiones de arquitectura (ADR)

Registro corto de decisiones que no se ven en el código: por qué se eligió algo
y qué se descartó. Un archivo por decisión, numerado y con el formato de abajo.
Si una decisión se revierte, no se borra: se cambia su estado a
`Reemplazada por NNNN` y se agrega la nueva.

| # | Decisión | Estado |
|---|---|---|
| [0001](0001-routing-por-hash.md) | Routing por hash, sin router ni servidor | Aceptada |
| [0002](0002-copia-local-de-datos.md) | Copia local de datos en IndexedDB para abrir sin conexión | Aceptada |
| [0003](0003-cache-versionado-del-shell.md) | Todo el shell desde un caché versionado, con aviso de versión nueva | Aceptada |
| [0004](0004-tokens-y-componentes-base.md) | Design tokens y componentes base (`.card`, `.btn`) | Aceptada |
| [0005](0005-ajustes-en-el-header.md) | Barra de 5 destinos y Ajustes como ícono del header | Aceptada |
| [0006](0006-changelog-fuente-unica.md) | `CHANGELOG.md` como fuente única del changelog de la app | Aceptada |
| [0007](0007-cache-de-librerias-cdn.md) | Librerías de CDN en un caché propio del service worker | Aceptada |
| [0008](0008-dialogo-de-confirmacion.md) | Diálogo de confirmación propio en vez de `confirm()` | Aceptada |
| [0009](0009-estados-de-carga.md) | Esqueletos en la primera carga y Reintentar ante fallos | Aceptada |

## Formato

```markdown
# NNNN. Título

- **Estado:** Aceptada | Reemplazada por NNNN
- **Fecha:** AAAA-MM-DD

## Contexto
Qué problema había y qué restricciones importan.

## Decisión
Qué se hizo, en una o dos frases.

## Alternativas descartadas
Qué otras opciones había y por qué no.

## Consecuencias
Qué mejora, qué se complica y qué queda pendiente.
```
