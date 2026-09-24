<?php
declare(strict_types=1);

// Solo desde la terminal: si este archivo terminara en el servidor, una
// visita por web no debe poder ejecutarlo (en la 1.67.1 una copia vieja de
// scripts/bump-sw-cache.php reescribió sw.js en producción así). Ver
// .htaccess, que además bloquea scripts/ entero.
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}
// Genera js/changelog-data.js (el "Changelog" que se ve en la app: Perfil →
// Changelog) a partir de CHANGELOG.md, que es la única fuente. Cada versión
// que deba verse en la app lleva un bloque con este formato, justo debajo de
// su encabezado `## [x.y.z] - fecha — título`:
//
//   ### En la app: <título de cara al usuario>
//
//   - Qué cambió, en lenguaje llano.
//   - Otro cambio.
//
// Las versiones sin ese bloque (ej. 0.1.0, el prototipo) no aparecen en la
// app. Se llama desde .githooks/pre-commit (antes de bump-sw-cache.php, porque
// el archivo generado es parte del app shell); también se puede correr a mano:
// php scripts/build-changelog.php

$repoRoot = dirname(__DIR__);
$changelogPath = $repoRoot . '/CHANGELOG.md';
$outPath = $repoRoot . '/js/changelog-data.js';

$changelog = file_get_contents($changelogPath);
if ($changelog === false) {
    fwrite(STDERR, "build-changelog: no se pudo leer CHANGELOG.md\n");
    exit(1);
}

$versions = [];
$current = null;
$inAppBlock = false;
$firstVersion = null;

$flush = function () use (&$current, &$versions): void {
    if ($current !== null && $current['title'] !== null && count($current['items']) > 0) {
        $versions[] = $current;
    }
};

foreach (preg_split('/\R/', $changelog) as $line) {
    if (preg_match('/^## /', $line)) {
        $flush();
        $current = null;
        $inAppBlock = false;
        if (preg_match('/^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})/', $line, $m)) {
            $current = ['version' => $m[1], 'date' => $m[2], 'title' => null, 'items' => []];
            if ($firstVersion === null) $firstVersion = $m[1];
        }
        continue;
    }
    if ($current === null) continue;
    if (preg_match('/^### En la app: (.+)$/', $line, $m)) {
        $current['title'] = trim($m[1]);
        $inAppBlock = true;
        continue;
    }
    if (preg_match('/^#{3,} /', $line)) { // otra sección (Added, Changed, Fixed…)
        $inAppBlock = false;
        continue;
    }
    if ($inAppBlock && preg_match('/^- (.+)$/', $line, $m)) {
        $current['items'][] = trim($m[1]);
    }
}
$flush();

// La versión más reciente siempre debe verse en la app: si alguien agrega una
// versión nueva a CHANGELOG.md y olvida el bloque "En la app", el commit se aborta.
if ($firstVersion === null || count($versions) === 0 || $versions[0]['version'] !== $firstVersion) {
    fwrite(STDERR, "build-changelog: la versión más reciente de CHANGELOG.md ($firstVersion) no tiene bloque \"### En la app: <título>\" con al menos un \"- ítem\".\n");
    exit(1);
}

$json = json_encode($versions, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
$output = "// GENERADO por scripts/build-changelog.php a partir de CHANGELOG.md (bloques\n"
    . "// \"### En la app: …\"). No editar a mano: se regenera en cada commit.\n"
    . "window.APP_VERSIONS = " . $json . ";\n";

if (is_file($outPath) && file_get_contents($outPath) === $output) {
    exit(0); // sin cambios, no se toca el archivo
}
file_put_contents($outPath, $output);
echo "build-changelog: js/changelog-data.js regenerado (" . count($versions) . " versiones)\n";
