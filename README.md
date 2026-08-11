# Bitácora de Hierro

PWA de registro de gimnasio. Reemplaza una hoja de cálculo semanal (una pestaña por semana, 5 tablas por día — Lunes a Viernes — con ejercicio, peso, reps, series y checkbox de cumplido).

Un solo usuario. Sin frameworks de frontend. Pensada para desplegarse como archivos sueltos en hosting compartido.

## Stack

- **Frontend**: HTML/CSS/JS vanilla, sin dependencias externas (iconos SVG inline, fuentes de Google Fonts).
- **Backend**: PHP + MySQL (PDO, sin framework).
- **Auth**: login usuario/contraseña con sesión PHP — sin API keys expuestas ni OAuth.
- **Hosting**: Hostgator, subdominio dedicado (ej. `bitacora.tu-dominio.com`).

## Estado actual

El frontend (`index.html` + `css/styles.css` + `js/app.js` + `js/api.js`) está **conectado a la API real**: requiere sesión (pantalla de login) y todo lo que se ve — semanas, ejercicios, librería — se lee y se escribe contra MySQL a través de `api/`. Ya no hay datos de ejemplo en memoria.

### Estructura del proyecto

```
/
├── index.html                     Markup: pantalla de login + #app-shell con el resto
├── css/
│   └── styles.css                 Todos los estilos, incluyendo login/logout
├── js/
│   ├── api.js                     Cliente fetch (apiGet/Post/Put/Delete), maneja 401
│   └── app.js                     UI, estado local (caché de lo cargado de la API) y bootstrap de sesión
├── .htaccess                      Fuerza HTTPS, bloquea config.local.php y *.sql
├── api/
│   ├── config.php                 Conexión PDO + arranque de sesión
│   ├── config.local.php.example   Plantilla de credenciales — copiar a config.local.php en el servidor
│   ├── auth.php                   Helpers: require_login(), respond_ok()/respond_error(), read_json_body()
│   ├── login.php                  POST { username, password } → inicia sesión
│   ├── logout.php                 POST → destruye sesión
│   ├── session.php                GET → { authenticated }
│   ├── weeks.php                  GET/POST/DELETE semanas (incluye copiar semana anterior)
│   ├── exercises.php              POST/PUT/DELETE ejercicios de un día
│   ├── library.php                GET/POST/DELETE librería de ejercicios
│   └── db/
│       ├── schema.sql             DDL completo + seed de day_templates
│       └── create_user.php        Script CLI para crear el usuario único (nunca vía HTTP)
```

### Esquema de base de datos

Cinco tablas (`api/db/schema.sql`): `users` (una fila, credenciales del único usuario), `weeks` (una fila por semana, identificada por el lunes en formato ISO), `day_templates` (grupo muscular y notas fijos por día de la semana — Lun–Vie —, sembrados desde la rutina base), `exercises` (filas editables por semana+día; `kg`/`reps`/`series` son texto libre porque la rutina real incluye valores como `"40(8)"`) y `exercise_library` (nombres para autocompletar).

### Puesta en marcha del backend (una sola vez por entorno)

1. Crear la base de datos en cPanel (MySQL Databases) y un usuario con permisos sobre ella.
2. Importar `api/db/schema.sql` (phpMyAdmin, o `mysql -u user -p nombre_bd < api/db/schema.sql`). **En Windows/PowerShell no uses `Get-Content -Raw | mysql`** — PowerShell 5.1 lee el archivo con la codepage del sistema en vez de UTF-8 y corrompe los acentos (`Tríceps` → `Tr??ceps`); si necesitas hacerlo desde PowerShell, usa `Get-Content -Raw -Encoding UTF8 | mysql ...` o mejor `cmd /c "mysql -u user -p nombre_bd < api/db/schema.sql"`.
3. Copiar `api/config.local.php.example` a `api/config.local.php` y completar host/nombre/usuario/contraseña de la BD. Este archivo está en `.gitignore`, nunca se sube a git.
4. Crear el usuario de la app por SSH: `php api/db/create_user.php <usuario> <contraseña>`.

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

1. Manifest + service worker para instalación como PWA real.
2. Implementar las vistas de Historial y Progreso (hoy son placeholders).

## Desarrollo local

No requiere build, pero sí un servidor con PHP (la app ya llama a `api/`, no sirve con un servidor puramente estático):

```bash
php -S localhost:8000
```

Necesita `api/config.local.php` ya configurado apuntando a una base de datos con el esquema importado — ver "Puesta en marcha del backend" arriba.

## Despliegue

Subir los archivos sueltos al hosting (sin empaquetar en zip), directamente a la ruta correspondiente en Hostgator.
