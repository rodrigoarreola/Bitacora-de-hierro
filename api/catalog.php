<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/exercise_helpers.php';

require_login();
require_catalog($pdo);

/**
 * Catálogo global de ejercicios (ADR 0021), solo lectura.
 *
 * GET ?q=&target=&equipment=&limit= → hasta `limit` (máx. 50, 30 por defecto)
 *   resultados que contengan TODAS las palabras de q en el nombre en español
 *   o en inglés. Sin q, lista por músculo/equipo.
 * GET ?id= → un ejercicio con sus pasos en/es y músculos secundarios.
 * GET ?vocab=1 → músculos y equipos disponibles (para los filtros).
 */

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond_error('Método no permitido.', 405);
}

function shape_catalog(array $r, bool $full = false): array
{
    $out = [
        'id'        => (int) $r['id'],
        'name_es'   => $r['name_es'],
        'name_en'   => $r['name_en'],
        'target'    => $r['target'],
        'equipment' => $r['equipment'],
        'body_part' => $r['body_part'],
        'media_ref' => $r['media_ref'],
    ];
    if ($full) {
        $out['secondary_muscles'] = json_decode((string) $r['secondary_muscles'], true) ?: [];
        $out['steps_es'] = json_decode((string) $r['instruction_steps_es'], true) ?: [];
        $out['steps_en'] = json_decode((string) $r['instruction_steps_en'], true) ?: [];
    }
    return $out;
}

if (!empty($_GET['vocab'])) {
    respond_ok([
        'targets'   => catalog_vocabulary($pdo, 'target'),
        'equipment' => catalog_vocabulary($pdo, 'equipment'),
    ]);
}

if (isset($_GET['id'])) {
    $stmt = $pdo->prepare('SELECT * FROM catalog_exercises WHERE id = :id');
    $stmt->execute(['id' => (int) $_GET['id']]);
    $row = $stmt->fetch();
    if (!$row) {
        respond_error('Ejercicio no encontrado en el catálogo.', 404);
    }
    respond_ok(shape_catalog($row, true));
}

$where = [];
$params = [];
$q = trim((string) ($_GET['q'] ?? ''));
$words = $q === '' ? [] : array_slice(preg_split('/\s+/u', $q), 0, 6);
foreach ($words as $i => $w) {
    // La collation ignora acentos y mayúsculas: "extension" encuentra "Extensión".
    $where[] = "(name_es LIKE :w{$i}a OR name_en LIKE :w{$i}b)";
    $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $w) . '%';
    $params["w{$i}a"] = $like;
    $params["w{$i}b"] = $like;
}
if (!empty($_GET['target'])) {
    $where[] = 'target = :target';
    $params['target'] = (string) $_GET['target'];
}
if (!empty($_GET['equipment'])) {
    $where[] = 'equipment = :equipment';
    $params['equipment'] = (string) $_GET['equipment'];
}
$limit = max(1, min(50, (int) ($_GET['limit'] ?? 30)));

// Primero los que empiezan con la búsqueda, luego los más cortos (más genéricos).
$order = 'CHAR_LENGTH(COALESCE(name_es, name_en))';
if ($q !== '') {
    $order = '(COALESCE(name_es, name_en) LIKE :starts) DESC, ' . $order;
    $params['starts'] = str_replace(['%', '_'], ['\%', '\_'], $q) . '%';
}
$sql = 'SELECT id, name_es, name_en, target, equipment, body_part, media_ref FROM catalog_exercises'
    . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
    . " ORDER BY $order LIMIT $limit";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
respond_ok(array_map('shape_catalog', $stmt->fetchAll()));
