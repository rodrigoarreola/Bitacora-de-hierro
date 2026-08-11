# Bitácora de Hierro

PWA de registro de gimnasio. Reemplaza una hoja de cálculo semanal (una pestaña por semana, 5 tablas por día — Lunes a Viernes — con ejercicio, peso, reps, series y checkbox de cumplido).

Un solo usuario. Sin frameworks de frontend. Pensada para desplegarse como archivos sueltos en hosting compartido.

## Stack

- **Frontend**: HTML/CSS/JS vanilla, sin dependencias externas (iconos SVG inline, fuentes de Google Fonts).
- **Backend** (pendiente): PHP + MySQL.
- **Auth** (pendiente): login usuario/contraseña con sesión PHP — sin API keys expuestas ni OAuth.
- **Hosting**: Hostgator (`tu-dominio.com`).

## Estado actual

Solo existe [`index.html`](index.html): el frontend completo con look and feel terminado, pero **todos los datos viven en memoria** (objeto `state` en el `<script>` del archivo). No hay backend ni persistencia todavía — al recargar la página se pierden los cambios y se regeneran los datos de ejemplo.

### Funcionalidad implementada

- **Header**: racha actual y mejor racha (días consecutivos con 3+ ejercicios marcados como cumplidos, cruzando semanas, lunes a viernes).
- **Riel de semanas**: semanas ordenadas de más reciente a más antigua, con botón "Nueva semana" (date picker restringido a lunes — ajusta automáticamente si se elige otro día).
- **5 tabs de día** (Lun–Vie): se pintan en verde cuando el día está "cumplido" (3+ ejercicios marcados).
- **Panel del día**:
  - Ejercicios editables inline: nombre (con autocompletado contra la librería), kg, reps, series.
  - Nota libre por ejercicio (ej. "incluye barra", "×2 la mancuerna").
  - Chevron expandible que compara kg/reps/series contra la semana anterior (flechas subir/bajar/igual).
  - Agregar y eliminar ejercicios (con confirmación al borrar).
  - "Copiar semana pasada" cuando el día está vacío.
  - Anillo de progreso (ejercicios marcados / total) y tira de resumen (series de hoy, ejercicios, racha actual, mejor racha).
- **Librería de ejercicios** (tab Ajustes): lista reutilizable para autocompletar nombres al agregar ejercicios; se alimenta sola con lo que se escribe en cualquier día, y se puede buscar/eliminar manualmente.
- **Swipe horizontal** entre días dentro del panel.
- **Confirmaciones** (`confirm()`) antes de borrar ejercicios o semanas.
- Vistas de **Historial** y **Progreso**: placeholders sin implementar.

### Identidad visual

- Paleta: acero oscuro (`#14171B`, `#1B1F26`) con acento óxido/rojo (`#D9481F`).
- Tipografía: Big Shoulders Display (títulos), Inter (cuerpo), JetBrains Mono (valores numéricos).
- Iconos SVG inline vía `<symbol>`/`<use>`, sin librería de iconos externa.
- Layout mobile-first, `max-width: 520px`, pensado para instalarse como PWA (aunque todavía falta el manifest y el service worker).

## Pendiente

1. Diseñar el esquema de MySQL a partir del modelo de datos actual (`state.weeks[fecha].days[día].exercises[]`).
2. Backend PHP: login por sesión, endpoints para semanas/días/ejercicios/librería.
3. Conectar el frontend (hoy 100% en memoria) a los endpoints reales, reemplazando el estado de ejemplo.
4. Manifest + service worker para instalación como PWA real.
5. Implementar las vistas de Historial y Progreso (hoy son placeholders).

## Desarrollo local

No requiere build. Basta con abrir `index.html` en un navegador o servirlo con cualquier servidor estático:

```bash
python -m http.server 8000
```

## Despliegue

Subir los archivos sueltos al hosting (sin empaquetar en zip), directamente a la ruta correspondiente en Hostgator.
