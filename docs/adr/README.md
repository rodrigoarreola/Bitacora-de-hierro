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
| [0008](0008-dialogo-de-confirmacion.md) | Diálogos propios en vez de `confirm()` y `prompt()` | Aceptada |
| [0009](0009-estados-de-carga.md) | Esqueletos en la primera carga y Reintentar ante fallos | Aceptada |
| [0010](0010-version-semver-en-el-nombre-del-cache.md) | Versión semver en el nombre del caché del shell | Aceptada |
| [0011](0011-hitos-horarios-a-progreso.md) | Hitos y Horarios se mudan de Perfil a Progreso, con pestañas | Aceptada |
| [0012](0012-hoy-pestanas-registro-resumen.md) | Hoy se parte en pestañas Registro / Resumen; racha a una card | Aceptada |
| [0013](0013-perfil-al-header.md) | Perfil se mueve al header (logo), barra inferior de 4 destinos | Aceptada |
| [0014](0014-registro-solo-dia-activo.md) | Registro solo con el día activo; riel de semanas y de días a Resumen | Aceptada |
| [0015](0015-semana-resumen-hoy.md) | La vista Hoy pasa a llamarse Semana; Resumen abre por default | Aceptada |
| [0016](0016-resumen-primero-medalla-unica.md) | Resumen como primera pestaña visual; una sola medalla más grande | Aceptada |
| [0017](0017-cookie-recordarme.md) | Cookie "recordarme" independiente del archivo de sesión de PHP | Aceptada |
| [0018](0018-splits-y-guia-del-dia.md) | Splits elegibles y Guía del día | Aceptada |
| [0019](0019-nombres-estandar-de-ejercicios.md) | Nombres estándar de ejercicios, con el original guardado | Aceptada |
| [0020](0020-ajustes-en-pestanas.md) | Ajustes en 3 pestañas con enlace propio | Aceptada |
| [0021](0021-catalogo-de-ejercicios-fase-1.md) | Catálogo de ejercicios y ejercicios del usuario (Fase 1) | Aceptada |
| [0022](0022-resumen-racha-primero.md) | Resumen rediseñado: la racha manda, luego qué sigue | Aceptada |
| [0023](0023-series-por-musculo.md) | Series por músculo en Resumen | Aceptada |

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
