<?php
declare(strict_types=1);

// Recalcula CACHE_NAME de sw.js a partir de un hash del contenido del app
// shell (index.html, css, js, manifest e íconos), con la versión semver actual
// (la misma que se ve en Perfil → Changelog) al frente para que sea legible en
// DevTools → Application → Cache Storage — el hash sigue siendo lo que de
// verdad decide si el caché cambia, no la versión por sí sola (ver más abajo).
// Se llama solo desde .githooks/pre-commit — no hace falta correrlo a mano.
// Sin el hash, CACHE_NAME se bumpeaba a mano en cada commit (bitacora-shell-v2
// ..v15) y varias veces se olvidó, dejando navegadores sirviendo el shell
// viejo desde caché (ver README → PWA).

$repoRoot = dirname(__DIR__);
$shellFiles = [
    'index.html',
    'css/tokens.css',
    'css/components.css',
    'css/base.css',
    'css/views/hoy.css',
    'css/views/ajustes.css',
    'css/views/login.css',
    'css/views/perfil.css',
    'css/views/calendario.css',
    'css/views/historial.css',
    'css/views/progreso.css',
    'js/changelog-data.js',
    'js/app.js',
    'js/api.js',
    'js/offline-queue.js',
    'js/snapshot.js',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png',
];

$swPath = $repoRoot . '/sw.js';
$swContent = file_get_contents($swPath);

// Guarda: todo CSS/JS local que index.html carga debe estar en $shellFiles (para
// el hash) y en SHELL_ASSETS de sw.js (para el precache). Un archivo olvidado en
// cualquiera de las dos listas no rompe nada al desarrollar, pero deja la PWA
// sin ese archivo offline o sin invalidar el caché cuando cambia.
preg_match_all('/(?:href|src)="((?:css|js)\/[^"]+)"/', (string) file_get_contents($repoRoot . '/index.html'), $refs);
preg_match("/const SHELL_ASSETS = \[(.*?)\];/s", $swContent, $assetsBlock);
preg_match_all("/'([^']+)'/", $assetsBlock[1] ?? '', $precached);
$problems = [];
foreach ($refs[1] as $ref) {
    if (!in_array($ref, $shellFiles, true)) $problems[] = "$ref: falta en \$shellFiles de scripts/bump-sw-cache.php";
    if (!in_array($ref, $precached[1], true)) $problems[] = "$ref: falta en SHELL_ASSETS de sw.js";
}
if ($problems) {
    fwrite(STDERR, "bump-sw-cache: index.html carga archivos que no están registrados en el app shell:\n  - " . implode("\n  - ", $problems) . "\n");
    exit(1);
}

$hashInput = '';
foreach ($shellFiles as $relPath) {
    $fullPath = $repoRoot . '/' . $relPath;
    if (!is_file($fullPath)) {
        fwrite(STDERR, "bump-sw-cache: no se encontró $relPath\n");
        exit(1);
    }
    $content = file_get_contents($fullPath);
    // Los saltos de línea no cuentan: con core.autocrlf=true (Windows) el directorio
    // de trabajo puede tener CRLF y un clon en Linux o un `git archive` tiene LF, y el
    // hash tiene que salir igual. Los binarios (íconos) se hashean tal cual.
    if (!preg_match('/\.(png|jpe?g|gif|ico|woff2?)$/i', $relPath)) {
        $content = str_replace("\r\n", "\n", $content);
    }
    $hashInput .= $content;
}

$hash = substr(sha1($hashInput), 0, 10);

// Versión semver actual: la cabecera más reciente de CHANGELOG.md. Se corre
// después de build-changelog.php (ver .githooks/pre-commit), que ya exige que
// esa versión tenga un bloque "### En la app: …" — así que siempre coincide
// con CURRENT_VERSION (js/changelog-data.js, lo que muestra Perfil →
// Changelog). Solo entra al NOMBRE del caché, no al hash: un cambio de
// versión sin tocar el shell no dispararía una actualización por sí solo,
// pero CHANGELOG.md nunca cambia sin regenerar js/changelog-data.js (que sí
// es parte del shell), así que en la práctica el hash también cambia.
$changelogPath = $repoRoot . '/CHANGELOG.md';
if (!preg_match('/^## \[([^\]]+)\] - \d{4}-\d{2}-\d{2}/m', (string) file_get_contents($changelogPath), $vm)) {
    fwrite(STDERR, "bump-sw-cache: no se encontró la versión más reciente en CHANGELOG.md\n");
    exit(1);
}
$version = $vm[1];
$newCacheName = "bitacora-shell-v$version-$hash";

$pattern ="/const CACHE_NAME = '[^']*';/";
if (!preg_match($pattern, $swContent, $m)) {
    fwrite(STDERR, "bump-sw-cache: no se encontró la línea CACHE_NAME en sw.js\n");
    exit(1);
}

$currentLine = $m[0];
$newLine = "const CACHE_NAME = '$newCacheName';";

if ($currentLine === $newLine) {
    // Sin cambios de contenido en el shell — no toca sw.js.
    exit(0);
}

$swContent = preg_replace($pattern, $newLine, $swContent, 1);
file_put_contents($swPath, $swContent);

echo "bump-sw-cache: CACHE_NAME -> $newCacheName\n";
exit(0);
