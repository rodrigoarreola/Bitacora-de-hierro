<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/exercise_helpers.php';

$userId = require_login();

/**
 * Librería de nombres para autocompletar. Desde ADR 0021 es un alias de
 * compatibilidad sobre user_exercises (la app nueva usa
 * api/user_exercises.php): la mantienen viva la copia local de clientes
 * viejos y cualquier llamada encolada sin conexión. Antes de la migración
 * del catálogo sigue usando exercise_library, como siempre.
 */

$method = $_SERVER['REQUEST_METHOD'];
$ready = catalog_ready($pdo);

if ($method === 'GET') {
    if ($ready) {
        $rows = array_map(fn($e) => ['id' => $e['id'], 'name' => $e['name']], fetch_user_exercises($pdo, $userId));
        respond_ok($rows);
    }
    $rows = $pdo->query('SELECT id, name FROM exercise_library ORDER BY name')->fetchAll();
    respond_ok(array_map(fn($r) => ['id' => (int) $r['id'], 'name' => $r['name']], $rows));
}

if ($method === 'POST') {
    $body = read_json_body();
    $name = trim((string) ($body['name'] ?? ''));
    if ($name === '') {
        respond_error('name es requerido.', 422);
    }
    if ($ready) {
        [$id, $canonical] = resolve_user_exercise($pdo, $userId, $name);
        respond_ok(['id' => $id, 'name' => $canonical]);
    }

    $stmt = $pdo->prepare('SELECT id, name FROM exercise_library WHERE LOWER(name) = LOWER(:name)');
    $stmt->execute(['name' => $name]);
    $existing = $stmt->fetch();
    if ($existing) {
        respond_ok(['id' => (int) $existing['id'], 'name' => $existing['name']]);
    }

    $insert = $pdo->prepare('INSERT INTO exercise_library (name) VALUES (:name)');
    $insert->execute(['name' => $name]);

    respond_ok(['id' => (int) $pdo->lastInsertId(), 'name' => $name], 201);
}

if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
    if ($id === null) {
        respond_error('Falta el parámetro id.', 422);
    }
    if ($ready) {
        if (!find_user_exercise($pdo, $userId, $id)) {
            respond_error('No encontrado en la librería.', 404);
        }
        // Con registros no se borra: se archiva (sale del autocompletado).
        $uses = (int) $pdo->query('SELECT COUNT(*) FROM exercises WHERE user_exercise_id = ' . $id)->fetchColumn();
        if ($uses > 0) {
            $pdo->prepare('UPDATE user_exercises SET archived_at = COALESCE(archived_at, NOW()) WHERE id = :id')->execute(['id' => $id]);
        } else {
            $pdo->prepare('DELETE FROM user_exercises WHERE id = :id')->execute(['id' => $id]);
        }
        respond_ok(['deleted' => true]);
    }
    $stmt = $pdo->prepare('DELETE FROM exercise_library WHERE id = :id');
    $stmt->execute(['id' => $id]);
    if ($stmt->rowCount() === 0) {
        respond_error('No encontrado en la librería.', 404);
    }
    respond_ok(['deleted' => true]);
}

respond_error('Método no permitido.', 405);
