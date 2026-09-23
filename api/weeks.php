<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/week_helpers.php';

require_login();

const DAY_KEYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

$method = $_SERVER['REQUEST_METHOD'];
$date = isset($_GET['date']) ? trim((string) $_GET['date']) : null;

if ($method === 'GET') {
    if ($date === null) {
        // Todas las semanas de una — ver el comentario en
        // fetch_all_weeks_detail() sobre por qué esto reemplazó a N
        // peticiones individuales (una por semana) del lado del frontend.
        respond_ok(fetch_all_weeks_detail($pdo));
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
    // Tope de "1 semana en el futuro" — mismo límite que ya aplica el date
    // picker del frontend (js/app.js, handler de #new-week-date), espejado
    // acá por si alguien pega el POST directo sin pasar por el picker.
    $todayMonday = new DateTime('monday this week');
    $maxMonday = (clone $todayMonday)->modify('+7 days');
    if (new DateTime($mondayDate) > $maxMonday) {
        respond_error('Solo se puede crear hasta una semana en el futuro.', 422);
    }
    if (find_week_id($pdo, $mondayDate) !== null) {
        respond_error('Ya existe una semana con ese lunes.', 409);
    }

    $stmt = $pdo->prepare('INSERT INTO weeks (monday_date) VALUES (:d)');
    $stmt->execute(['d' => $mondayDate]);
    $weekId = (int) $pdo->lastInsertId();
    materialize_week_groups($pdo, $weekId);

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
    if (!array_key_exists('note', $body) && !array_key_exists('day_key', $body)) {
        respond_error('Nada que actualizar.', 422);
    }

    if (array_key_exists('note', $body)) {
        $pdo->prepare('UPDATE weeks SET note = :n WHERE id = :id')
            ->execute(['n' => (string) $body['note'], 'id' => $weekId]);
    }

    // Sesión del día (botón "Iniciar/Finalizar entrenamiento" y los inputs
    // de hora en el panel del día): los tres campos viajan juntos porque el
    // frontend siempre los manda como un solo objeto. Si los tres llegan
    // vacíos/null se borra la fila en vez de dejar un registro sin datos.
    if (array_key_exists('day_key', $body)) {
        $dayKey = (string) $body['day_key'];
        if (!in_array($dayKey, DAY_KEYS, true)) {
            respond_error('day_key inválido.', 422);
        }
        $startTime = !empty($body['start_time']) ? (string) $body['start_time'] : null;
        $endTime = !empty($body['end_time']) ? (string) $body['end_time'] : null;
        $durationMin = isset($body['duration_min']) && $body['duration_min'] !== null && $body['duration_min'] !== ''
            ? (int) $body['duration_min']
            : null;

        if ($startTime === null && $endTime === null && $durationMin === null) {
            $pdo->prepare('DELETE FROM week_day_sessions WHERE week_id = :w AND day_key = :d')
                ->execute(['w' => $weekId, 'd' => $dayKey]);
        } else {
            $pdo->prepare(
                'INSERT INTO week_day_sessions (week_id, day_key, start_time, end_time, duration_min)
                 VALUES (:w, :d, :st, :et, :dm)
                 ON DUPLICATE KEY UPDATE start_time = VALUES(start_time), end_time = VALUES(end_time), duration_min = VALUES(duration_min)'
            )->execute(['w' => $weekId, 'd' => $dayKey, 'st' => $startTime, 'et' => $endTime, 'dm' => $durationMin]);
        }
    }

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
