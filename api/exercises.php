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

if ($method === 'POST' && ($_GET['action'] ?? null) === 'reorder') {
    $body = read_json_body();
    $mondayDate = trim((string) ($body['monday_date'] ?? ''));
    $dayKey = trim((string) ($body['day_key'] ?? ''));
    $order = $body['order'] ?? null;

    if (!in_array($dayKey, DAY_KEYS, true)) {
        respond_error('day_key inválido.', 422);
    }
    if (!is_array($order) || empty($order)) {
        respond_error('order debe ser una lista de IDs.', 422);
    }
    $weekId = find_week_id_by_date($pdo, $mondayDate);
    if ($weekId === null) {
        respond_error('Semana no encontrada.', 404);
    }

    // Antes de tocar nada: el "order" recibido tiene que ser exactamente
    // el mismo conjunto de IDs que ya existen en ese día — ni de menos
    // (perdería ejercicios sin sort_order), ni de más (IDs ajenos a esta
    // semana/día, que no deberían poder reordenarse desde acá).
    $stmt = $pdo->prepare('SELECT id FROM exercises WHERE week_id = :w AND day_key = :d');
    $stmt->execute(['w' => $weekId, 'd' => $dayKey]);
    $existingIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    $orderIds = array_map('intval', $order);
    sort($existingIds);
    $sortedOrderIds = $orderIds;
    sort($sortedOrderIds);
    if ($existingIds !== $sortedOrderIds) {
        respond_error('El orden recibido no coincide con los ejercicios de ese día.', 422);
    }

    $update = $pdo->prepare('UPDATE exercises SET sort_order = :s WHERE id = :id AND week_id = :w AND day_key = :d');
    $pdo->beginTransaction();
    try {
        foreach ($orderIds as $i => $id) {
            $update->execute(['s' => $i, 'id' => $id, 'w' => $weekId, 'd' => $dayKey]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        respond_error('Error al reordenar: ' . $e->getMessage(), 500);
    }

    respond_ok(['reordered' => count($orderIds)]);
}

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

    // client_time solo viene en mutaciones reproducidas desde la cola
    // offline (ver js/offline-queue.js) — si el registro ya tiene un
    // cambio más nuevo que este, se descarta en vez de pisarlo
    // (last-write-wins). Las ediciones normales en vivo no mandan
    // client_time y se comportan exactamente igual que siempre.
    //
    // La comparación se hace como una DURACIÓN ("hace cuántos segundos
    // fue client_time"), no como timestamps absolutos: el servidor PHP y
    // MySQL pueden estar en zonas horarias distintas (en este entorno,
    // PHP corre en UTC y MySQL 6 horas atrás), así que comparar
    // strtotime(client_time) directo contra strtotime(updated_at) da
    // resultados falsos. Una duración en segundos, calculada con
    // DateTime timezone-aware en PHP, es independiente de en qué zona
    // esté cada sistema — y se compara contra NOW() de MySQL, no contra
    // updated_at parseado por PHP, para que ambos lados de la
    // comparación vivan en el reloj de MySQL.
    if (isset($body['client_time'])) {
        try {
            $clientDt = new DateTime((string) $body['client_time']);
            $nowUtc = new DateTime('now', new DateTimeZone('UTC'));
            $secondsAgo = max(0, $nowUtc->getTimestamp() - $clientDt->getTimestamp());

            $stmt = $pdo->prepare('SELECT (updated_at > (NOW() - INTERVAL :secs SECOND)) AS is_newer FROM exercises WHERE id = :id');
            $stmt->execute(['secs' => $secondsAgo, 'id' => $id]);
            if ((bool) $stmt->fetchColumn()) {
                respond_ok(array_merge(fetch_exercise($pdo, $id), ['stale' => true]));
            }
        } catch (Exception $e) {
            // client_time con formato inválido: se ignora el guard y se aplica normal, no vale la pena bloquear la escritura por esto.
        }
    }
    unset($body['client_time']);

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
