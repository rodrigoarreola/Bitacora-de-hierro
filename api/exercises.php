<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';

require_login();

const DAY_KEYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

function find_week_id_by_date(PDO $pdo, string $mondayDate): ?int
{
    $stmt = $pdo->prepare('SELECT id FROM weeks WHERE monday_date = :d');
    $stmt->execute(['d' => $mondayDate]);
    $id = $stmt->fetchColumn();
    return $id === false ? null : (int) $id;
}

function fetch_exercise(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT id, week_id, day_key, name, kg, reps, series, note, done FROM exercises WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $row['id'] = (int) $row['id'];
    $row['done'] = (bool) $row['done'];
    return $row;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $body = read_json_body();
    $mondayDate = trim((string) ($body['monday_date'] ?? ''));
    $dayKey = trim((string) ($body['day_key'] ?? ''));

    if (!in_array($dayKey, DAY_KEYS, true)) {
        respond_error('day_key inválido.', 422);
    }
    $weekId = find_week_id_by_date($pdo, $mondayDate);
    if ($weekId === null) {
        respond_error('Semana no encontrada.', 404);
    }

    $stmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 FROM exercises WHERE week_id = :w AND day_key = :d');
    $stmt->execute(['w' => $weekId, 'd' => $dayKey]);
    $sortOrder = (int) $stmt->fetchColumn();

    $insert = $pdo->prepare(
        'INSERT INTO exercises (week_id, day_key, name, kg, reps, series, note, done, sort_order)
         VALUES (:week_id, :day_key, :name, :kg, :reps, :series, :note, 0, :sort_order)'
    );
    $insert->execute([
        'week_id'    => $weekId,
        'day_key'    => $dayKey,
        'name'       => (string) ($body['name'] ?? ''),
        'kg'         => (string) ($body['kg'] ?? ''),
        'reps'       => (string) ($body['reps'] ?? ''),
        'series'     => (string) ($body['series'] ?? ''),
        'note'       => (string) ($body['note'] ?? ''),
        'sort_order' => $sortOrder,
    ]);

    respond_ok(fetch_exercise($pdo, (int) $pdo->lastInsertId()), 201);
}

$id = isset($_GET['id']) ? (int) $_GET['id'] : null;

if ($method === 'PUT') {
    if ($id === null || fetch_exercise($pdo, $id) === null) {
        respond_error('Ejercicio no encontrado.', 404);
    }

    $body = read_json_body();
    $editable = ['name', 'kg', 'reps', 'series', 'note', 'done'];
    $sets = [];
    $params = ['id' => $id];

    foreach ($editable as $field) {
        if (!array_key_exists($field, $body)) {
            continue;
        }
        $sets[] = "{$field} = :{$field}";
        $params[$field] = $field === 'done' ? (int) (bool) $body[$field] : (string) $body[$field];
    }

    if (empty($sets)) {
        respond_error('Nada que actualizar.', 422);
    }

    $sql = 'UPDATE exercises SET ' . implode(', ', $sets) . ' WHERE id = :id';
    $pdo->prepare($sql)->execute($params);

    respond_ok(fetch_exercise($pdo, $id));
}

if ($method === 'DELETE') {
    if ($id === null || fetch_exercise($pdo, $id) === null) {
        respond_error('Ejercicio no encontrado.', 404);
    }
    $pdo->prepare('DELETE FROM exercises WHERE id = :id')->execute(['id' => $id]);
    respond_ok(['deleted' => true]);
}

respond_error('Método no permitido.', 405);
