<?php
declare(strict_types=1);

// Recalcula CACHE_NAME de sw.js a partir de un hash del contenido del app
// shell (index.html/css/js). Se llama solo desde .githooks/pre-commit — no
// hace falta correrlo a mano. Sin esto, CACHE_NAME se bumpeaba a mano en
// cada commit (bitacora-shell-v2..v15) y varias veces se olvidó, dejando
// navegadores sirviendo el shell viejo desde caché (ver README → PWA).

$repoRoot = dirname(__DIR__);
$shellFiles = [
    'index.html',
    'css/tokens.css',
    'css/components.css',
    'css/styles.css',
    'js/app.js',
    'js/api.js',
    'js/offline-queue.js',
    'js/snapshot.js',
];

$hashInput = '';
foreach ($shellFiles as $relPath) {
    $fullPath = $repoRoot . '/' . $relPath;
    if (!is_file($fullPath)) {
        fwrite(STDERR, "bump-sw-cache: no se encontró $relPath\n");
        exit(1);
    }
    $hashInput .= file_get_contents($fullPath);
}

$hash = substr(sha1($hashInput), 0, 10);
$newCacheName = "bitacora-shell-$hash";

$swPath = $repoRoot . '/sw.js';
$swContent = file_get_contents($swPath);

$pattern = "/const CACHE_NAME = '[^']*';/";
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
