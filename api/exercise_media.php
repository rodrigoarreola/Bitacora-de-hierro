<?php
declare(strict_types=1);

/**
 * Proxy con caché en disco para los GIFs/imágenes del dataset
 * hasaneyldrm/exercises-dataset. No vendorizamos las ~128MB de medios del
 * dataset completo — la primera vez que se pide el GIF de un ejercicio se
 * trae de GitHub y se guarda en api/media_cache/ (gitignored); de ahí en
 * más se sirve local.
 *
 * GET ?id=0025&type=gif|image
 */

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';

require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond_error('Método no permitido.', 405);
}

$id = (string) ($_GET['id'] ?? '');
$type = (string) ($_GET['type'] ?? 'gif');

if ($type !== 'gif' && $type !== 'image') {
    respond_error('type debe ser "gif" o "image".', 422);
}

// El id se valida contra el dataset local (whitelist) — nunca se arma un
// path/URL a partir de lo que mande el cliente, para evitar SSRF.
$datasetPath = __DIR__ . '/../data/exercises-dataset.json';
$dataset = json_decode((string) file_get_contents($datasetPath), true);
if (!is_array($dataset)) {
    respond_error('No se pudo leer el catálogo de ejercicios.', 500);
}

$entry = null;
foreach ($dataset as $e) {
    if ($e['id'] === $id) {
        $entry = $e;
        break;
    }
}
if ($entry === null) {
    respond_error('Ejercicio no encontrado en el catálogo.', 404);
}

$relPath = $type === 'gif' ? $entry['gif_url'] : $entry['image'];
$ext = pathinfo($relPath, PATHINFO_EXTENSION) ?: ($type === 'gif' ? 'gif' : 'jpg');
$contentType = $ext === 'gif' ? 'image/gif' : 'image/jpeg';

$cacheDir = __DIR__ . '/media_cache/' . ($type === 'gif' ? 'gifs' : 'images');
$cachePath = $cacheDir . '/' . $id . '.' . $ext;

if (!is_file($cachePath)) {
    @mkdir($cacheDir, 0777, true);
    $sourceUrl = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/' . $relPath;
    $bytes = fetch_remote_media($sourceUrl);
    if ($bytes === null) {
        respond_error('No se pudo obtener el archivo desde el origen.', 502);
    }
    file_put_contents($cachePath, $bytes);
}

header('Content-Type: ' . $contentType);
header('Cache-Control: public, max-age=2592000, immutable');
header('Content-Length: ' . (string) filesize($cachePath));
readfile($cachePath);
exit;

/**
 * Usa la extensión curl si está compilada; si no, cae a file_get_contents
 * (requiere el wrapper https, que no todos los PHP tienen habilitado).
 * Devuelve null si ninguna de las dos está disponible o si falla el fetch.
 */
function fetch_remote_media(string $url): ?string
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_USERAGENT => 'bitacora-hierro',
        ]);
        $body = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        // curl_close() no hace nada desde PHP 8.0 (el handle se libera solo) — se omite para no generar el deprecation notice de 8.5+.
        if ($body === false || $status !== 200) {
            return null;
        }
        return $body;
    }

    if (in_array('https', stream_get_wrappers(), true)) {
        $ctx = stream_context_create([
            'http' => ['method' => 'GET', 'header' => "User-Agent: bitacora-hierro\r\n", 'timeout' => 20],
        ]);
        $body = @file_get_contents($url, false, $ctx);
        return $body === false ? null : $body;
    }

    return null;
}
