# Bitácora de Hierro

PWA de registro de gimnasio. Reemplaza una hoja de cálculo semanal (una pestaña por semana, 5 tablas por día — Lunes a Viernes — con ejercicio, peso, reps, series y checkbox de cumplido).

Un solo usuario. Sin frameworks de frontend. Pensada para desplegarse como archivos sueltos en hosting compartido.

## Stack

- **Frontend**: HTML/CSS/JS vanilla, sin framework — dependencias externas solo vía CDN (Google Fonts, Font Awesome).
- **Backend**: PHP + MySQL (PDO, sin framework).
- **Auth**: login usuario/contraseña con sesión PHP — sin API keys expuestas ni OAuth.
- **Hosting**: Hostgator, subcarpeta del dominio principal — `tu-dominio.com/bitacora`.

## Estado actual

**En producción**: `https://tu-dominio.com/bitacora/`.

El frontend (`index.html` + `css/styles.css` + `js/app.js` + `js/api.js`) está **conectado a la API real**: requiere sesión (pantalla de login, persistente 30 días) y todo lo que se ve — semanas, ejercicios, librería — se lee y se escribe contra MySQL a través de `api/`. Ya no hay datos de ejemplo en memoria.

### Estructura del proyecto

```
/
├── index.html                     Markup: pantalla de login + #app-shell con el resto
├── manifest.json                  Manifest de la PWA (rutas relativas, funciona en cualquier subcarpeta)
├── sw.js                          Service worker: cachea el app shell, nunca api/
├── icons/
│   ├── icon-192.png                Ícono de la PWA (mancuerna --accent sobre --bg)
│   └── icon-512.png
├── css/
│   └── styles.css                 Todos los estilos, incluyendo login/logout
├── js/
│   ├── api.js                     Cliente fetch (apiGet/Post/Put/Delete), maneja 401
│   └── app.js                     UI, estado local (caché de lo cargado de la API), bootstrap de sesión y registro del service worker
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
4. Crear el usuario de la app por SSH/Terminal/Cron: `php api/db/create_user.php <usuario> <contraseña>`. **Sin acceso a shell** (caso típico en Hostgator sin plan con SSH): genera el hash localmente con `php -r "echo password_hash('tu-contraseña', PASSWORD_DEFAULT), PHP_EOL;"` y pégalo directo por phpMyAdmin → SQL: `INSERT INTO users (username, password_hash) VALUES ('usuario', 'el-hash-generado');`. El hash es portable entre máquinas/PHP, no hay problema de compatibilidad.

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
- **Calendario**: vista de mes (lunes a domingo), navegable con flechas, por defecto en el mes actual. Cada día lun–vie que pertenece a una semana ya creada pinta una línea de color según ejercicios marcados ese día: rojo (0), amarillo (1–5), verde (6+). Fines de semana y días futuros quedan sin línea (no hay concepto de sábado/domingo en el esquema, y un día que no ha pasado no cuenta como "fallado").
- **Perfil**: por ahora solo el botón de cerrar sesión (antes vivía en Ajustes).
- **Sesión persistente**: cookie de 30 días — no hay que iniciar sesión cada vez que se abre la app.
- Vistas de **Historial** y **Progreso**: placeholders sin implementar.

### Identidad visual

- Paleta: acero oscuro (`#14171B`, `#1B1F26`) con acento óxido/rojo (`#D9481F`).
- Tipografía: Big Shoulders Display (títulos), Inter (cuerpo), JetBrains Mono (valores numéricos).
- Iconos: Font Awesome 6 Free vía CDN.
- Layout mobile-first, `max-width: 520px`.

### PWA

`manifest.json` + `sw.js` ya están activos: la app es instalable (Android/desktop vía Chrome/Edge, iOS vía "Agregar a inicio" en Safari). El service worker solo cachea el *app shell* estático (HTML/CSS/JS/íconos) para que cargue rápido e instale — **no cachea nada bajo `api/`**, así que no hay edición de datos offline; sin conexión, la app carga pero no puede leer ni guardar ejercicios. `start_url`/`scope` del manifest y el registro del service worker usan rutas relativas a propósito, para que funcionen igual en `localhost:8000`, en un subdominio o en una subcarpeta como `/bitacora`, sin tocar código.

**Importante en cada deploy que toque `index.html`/`css/`/`js/`**: sube también `sw.js` con `CACHE_NAME` incrementado (`bitacora-shell-v2`, `v3`, ...). Si no, los navegadores que ya instalaron la PWA van a seguir sirviendo el shell viejo desde caché indefinidamente — pasó durante el desarrollo local de esta misma sesión.

## Pendiente

1. Implementar las vistas de Historial y Progreso (hoy son placeholders).

## Desarrollo local

No requiere build, pero sí un servidor con PHP (la app ya llama a `api/`, no sirve con un servidor puramente estático):

```bash
php -S localhost:8000
```

Necesita `api/config.local.php` ya configurado apuntando a una base de datos con el esquema importado — ver "Puesta en marcha del backend" arriba.

## Despliegue

Destino: `tu-dominio.com/bitacora`, vía FTP/SFTP. Como todas las rutas del proyecto son relativas, no hace falta tocar ni una línea de código por vivir en una subcarpeta en vez de un subdominio.

1. **Base de datos**: en cPanel → MySQL Databases, crear la base y un usuario con permisos sobre ella (igual que en local, con `bitacora_app` como referencia de nombre).
2. **Subir archivos**: todo el árbol del repo tal como está en git a la carpeta `/bitacora` del hosting, **excepto** lo que ya está en `.gitignore` (`api/config.local.php`, `.claude/`) y sobre todo **la carpeta `.git/`** — nunca se sube, ni por accidente al arrastrar la carpeta completa del proyecto (expone todo el historial del repo). Si FileZilla se desconecta a medias subiendo/borrando algo, siempre reconectar y confirmar el listado remoto antes de seguir.
3. **Importar el esquema**: `api/db/schema.sql` vía phpMyAdmin (Importar → seleccionar el archivo). Evita hacerlo desde PowerShell con `Get-Content -Raw | mysql` — ver la nota de encoding más abajo.
4. **Config local de producción**: crear `api/config.local.php` directo en el servidor (editor de archivos de cPanel, o edítalo local y súbelo por FTP aparte — nunca por git) a partir de `api/config.local.php.example`, con las credenciales reales de la base. Si alguna vez se rota la contraseña de la BD, hay que actualizar este archivo en el servidor también — el sitio da 500 ("no se pudo conectar a la base de datos") hasta que coincidan.
5. **Usuario de la app**: ver el paso 4 de "Puesta en marcha del backend" arriba (SSH/Terminal/Cron, o el `INSERT` vía phpMyAdmin si no hay acceso a shell).
6. **Verificar**: entrar a `https://tu-dominio.com/bitacora/`, confirmar que carga por HTTPS, que el login funciona, y que el manifest/service worker se registran (DevTools → Application → Manifest / Service Workers, o una auditoría Lighthouse → PWA).

`.htaccess` no necesita ajustes para la subcarpeta: la regla de HTTPS usa `%{HTTP_HOST}%{REQUEST_URI}` (no una ruta fija) y el bloqueo de `config.local.php`/`*.sql` es por nombre de archivo.
