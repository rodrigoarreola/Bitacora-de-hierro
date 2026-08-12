<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/week_helpers.php';

require_login();

$method = $_SERVER['REQUEST_METHOD'];
$date = isset($_GET['date']) ? trim((string) $_GET['date']) : null;

if ($method === 'GET') {
    if ($date === null) {
        $rows = $pdo->query('SELECT monday_date FROM weeks ORDER BY monday_date DESC')->fetchAll();
        respond_ok(array_map(fn($r) => $r['monday_date'], $rows));
    }

    $weekId = find_week_id($pdo, $date);
    if ($weekId === null) {
        respond_error('Semana no encontrada.', 404);
    }
    respond_ok(fetch_week_detail($pdo, $weekId, $date));
}

if ($method === 'POST') {
    $action = $_GET['action'] ?? null;

    if ($action === 'copy-previous') {
        $weekId = $date === null ? null : find_week_id($pdo, $date);
        if ($weekId === null) {
            respond_error('Semana no encontrada.', 404);
        }

        $stmt = $pdo->prepare('SELECT id FROM weeks WHERE monday_date < :d ORDER BY monday_date DESC LIMIT 1');
        $stmt->execute(['d' => $date]);
        $prevWeekId = $stmt->fetchColumn();
        if ($prevWeekId === false) {
            respond_error('No hay una semana anterior para copiar.', 422);
        }

        $pdo->beginTransaction();
        $pdo->prepare('DELETE FROM exercises WHERE week_id = :w')->execute(['w' => $weekId]);

        $stmt = $pdo->prepare(
            'SELECT day_key, name, kg, reps, series, note, sort_order FROM exercises WHERE week_id = :w ORDER BY day_key, sort_order, id'
        );
        $stmt->execute(['w' => $prevWeekId]);

        $insert = $pdo->prepare(
            'INSERT INTO exercises (week_id, day_key, name, kg, reps, series, note, done, sort_order)
             VALUES (:week_id, :day_key, :name, :kg, :reps, :series, :note, 0, :sort_order)'
        );
        foreach ($stmt->fetchAll() as $row) {
            $insert->execute([
                'week_id'    => $weekId,
                'day_key'    => $row['day_key'],
                'name'       => $row['name'],
                'kg'         => $row['kg'],
                'reps'       => $row['reps'],
                'series'     => $row['series'],
                'note'       => $row['note'],
                'sort_order' => $row['sort_order'],
            ]);
        }
        $pdo->commit();

        respond_ok(fetch_week_detail($pdo, (int) $weekId, $date));
    }

    $body = read_json_body();
    $mondayDate = trim((string) ($body['monday_date'] ?? ''));
    if (!is_monday($mondayDate)) {
        respond_error('monday_date debe ser una fecha ISO (YYYY-MM-DD) que caiga en lunes.', 422);
    }
    if (find_week_id($pdo, $mondayDate) !== null) {
        respond_error('Ya existe una semana con ese lunes.', 409);
    }

    $stmt = $pdo->prepare('INSERT INTO weeks (monday_date) VALUES (:d)');
    $stmt->execute(['d' => $mondayDate]);
    $weekId = (int) $pdo->lastInsertId();

    respond_ok(fetch_week_detail($pdo, $weekId, $mondayDate), 201);
}

if ($method === 'PUT') {
    if ($date === null) {
        respond_error('Falta el parámetro date.', 422);
    }
    $weekId = find_week_id($pdo, $date);
    if ($weekId === null) {
        respond_error('Semana no encontrada.', 404);
    }
    $body = read_json_body();
    if (!array_key_exists('note', $body)) {
        respond_error('Nada que actualizar.', 422);
    }
    $pdo->prepare('UPDATE weeks SET note = :n WHERE id = :id')
        ->execute(['n' => (string) $body['note'], 'id' => $weekId]);
    respond_ok(fetch_week_detail($pdo, $weekId, $date));
}

if ($method === 'DELETE') {
    if ($date === null) {
        respond_error('Falta el parámetro date.', 422);
    }
    $weekId = find_week_id($pdo, $date);
    if ($weekId === null) {
        respond_error('Semana no encontrada.', 404);
    }
    $pdo->prepare('DELETE FROM weeks WHERE id = :id')->execute(['id' => $weekId]);
    respond_ok(['deleted' => true]);
}

respond_error('Método no permitido.', 405);
