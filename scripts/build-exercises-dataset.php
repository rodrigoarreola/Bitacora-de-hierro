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

/**
 * Descarga (una vez, cacheado en scripts/.cache/) el dataset completo de
 * hasaneyldrm/exercises-dataset y lo recorta a data/exercises-dataset.json
 * con solo los campos que usa la app + traducción best-effort del nombre.
 * Correr manualmente cuando haga falta regenerar:
 *   php scripts/build-exercises-dataset.php
 *
 * Usa el binario `curl` (no la extensión PHP) para no depender de que el
 * PHP CLI local tenga curl/openssl compilados — en producción el proxy de
 * api/exercise_media.php sí puede usar la extensión si está disponible.
 */

$root = dirname(__DIR__);
$rawPath = $root . '/scripts/.cache/exercises-raw.json';
$outPath = $root . '/data/exercises-dataset.json';

if (!is_file($rawPath)) {
    @mkdir(dirname($rawPath), 0777, true);
    fwrite(STDERR, "Descargando dataset desde GitHub...\n");
    $url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json';
    $cmd = 'curl -sL --max-time 60 ' . escapeshellarg($url) . ' -o ' . escapeshellarg($rawPath);
    exec($cmd, $out, $code);
    if ($code !== 0 || !is_file($rawPath)) {
        fwrite(STDERR, "No se pudo descargar el dataset (curl exit $code).\n");
        exit(1);
    }
}

$raw = json_decode((string) file_get_contents($rawPath), true);
if (!is_array($raw)) {
    fwrite(STDERR, "JSON crudo inválido en $rawPath.\n");
    exit(1);
}

require __DIR__ . '/lib/translate-exercise-name.php';

$out = [];
$altaCount = 0;
foreach ($raw as $e) {
    [$nameEs, $confidence] = translate_exercise_name($e['name']);
    if ($confidence === 'alta') {
        $altaCount++;
    }
    $out[] = [
        'id' => $e['id'],
        'name' => $e['name'],
        'name_es' => $confidence === 'alta' ? $nameEs : null,
        'category' => $e['category'],
        'body_part' => $e['body_part'],
        'equipment' => $e['equipment'],
        'target' => $e['target'],
        'muscle_group' => $e['muscle_group'],
        'secondary_muscles' => $e['secondary_muscles'],
        'image' => $e['image'],
        'gif_url' => $e['gif_url'],
        'attribution' => $e['attribution'],
        'instructions_es' => $e['instructions']['es'] ?? null,
        'instruction_steps_es' => $e['instruction_steps']['es'] ?? null,
    ];
}

@mkdir(dirname($outPath), 0777, true);
file_put_contents(
    $outPath,
    json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
);

$total = count($out);
$kb = round(filesize($outPath) / 1024);
fwrite(STDERR, "Escrito {$total} ejercicios en {$outPath} ({$kb} KB). Traducción limpia (alta): {$altaCount} ("
    . round($altaCount / $total * 100) . "%), resto queda en inglés.\n");
