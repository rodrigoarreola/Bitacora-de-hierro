<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';

require_login();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $rows = $pdo->query('SELECT id, name FROM exercise_library ORDER BY name')->fetchAll();
    respond_ok(array_map(fn($r) => ['id' => (int) $r['id'], 'name' => $r['name']], $rows));
}

if ($method === 'POST') {
    $body = read_json_body();
    $name = trim((string) ($body['name'] ?? ''));
    if ($name === '') {
        respond_error('name es requerido.', 422);
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
    $stmt = $pdo->prepare('DELETE FROM exercise_library WHERE id = :id');
    $stmt->execute(['id' => $id]);
    if ($stmt->rowCount() === 0) {
        respond_error('No encontrado en la librería.', 404);
    }
    respond_ok(['deleted' => true]);
}

respond_error('Método no permitido.', 405);
