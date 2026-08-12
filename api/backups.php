<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';

require_login();

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    respond_error('Método no permitido.', 405);
}

$backupDir = __DIR__ . '/db/backups';
$action = $_GET['action'] ?? 'list';

if ($action === 'download') {
    $file = (string) ($_GET['file'] ?? '');
    // El único dato de usuario en este endpoint es el nombre de archivo —
    // se valida contra el mismo formato exacto que genera backup_export.php
    // para descartar path traversal (../, rutas absolutas, etc.) antes de
    // tocar el filesystem.
    if (!preg_match('/^backup-\d{4}-\d{2}-\d{2}-\d{6}\.json$/', $file)) {
        respond_error('Nombre de archivo inválido.', 422);
    }

    $fullPath = $backupDir . '/' . $file;
    if (!is_file($fullPath)) {
        respond_error('Backup no encontrado.', 404);
    }

    // Descarga el archivo crudo, no el sobre {ok,data} — el frontend
    // navega acá con un <a href> normal, no con Api.get().
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $file . '"');
    header('Content-Length: ' . filesize($fullPath));
    readfile($fullPath);
    exit;
}

$files = glob($backupDir . '/backup-*.json') ?: [];
rsort($files); // el nombre ya es cronológico, orden lexicográfico = más reciente primero

$list = array_map(function ($path) {
    $name = basename($path);
    preg_match('/^backup-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})\.json$/', $name, $m);
    $date = $m ? "$m[1]-$m[2]-$m[3] $m[4]:$m[5]:$m[6]" : null;
    return [
        'filename' => $name,
        'date' => $date,
        'sizeBytes' => filesize($path),
    ];
}, $files);

respond_ok($list);
