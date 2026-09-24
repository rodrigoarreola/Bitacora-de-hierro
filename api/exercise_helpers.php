<?php
declare(strict_types=1);

/**
 * Helpers del catálogo de ejercicios y los ejercicios del usuario (ADR 0021).
 * Requiere que config.php ya se haya incluido ($pdo disponible).
 */

/**
 * ¿Ya se corrieron las migraciones del catálogo (catalog_exercises,
 * user_exercises, exercises.user_exercise_id)? Mismo criterio que
 * split_schema_ready(): el código puede llegar antes que el SQL, y mientras
 * tanto la app sigue funcionando por nombre, como antes.
 */
function catalog_ready(PDO $pdo): bool
{
    static $ready = null;
    if ($ready === null) {
        $ready = (bool) $pdo->query(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exercises' AND COLUMN_NAME = 'user_exercise_id'"
        )->fetchColumn();
    }
    return $ready;
}

function require_catalog(PDO $pdo): void
{
    if (!catalog_ready($pdo)) {
        respond_error('Falta correr la migración del catálogo de ejercicios en la base de datos (ver instrucciones de despliegue).', 409);
    }
}

/**
 * Ejercicios del usuario con los datos de su vínculo al catálogo. `target`
 * y `equipment` son los efectivos (lo propio del usuario gana sobre el
 * catálogo); `own_target` dice si el músculo lo eligió el usuario.
 */
function fetch_user_exercises(PDO $pdo, int $userId, bool $includeArchived = false, ?int $onlyId = null): array
{
    $sql = 'SELECT u.id, u.name, u.catalog_exercise_id, u.target AS own_target, u.equipment AS own_equipment,
                   u.archived_at, c.name_es AS catalog_name_es, c.name_en AS catalog_name_en,
                   c.target AS catalog_target, c.equipment AS catalog_equipment, c.media_ref,
                   (SELECT COUNT(*) FROM exercises e WHERE e.user_exercise_id = u.id) AS uses
            FROM user_exercises u
            LEFT JOIN catalog_exercises c ON c.id = u.catalog_exercise_id
            WHERE u.user_id = :uid';
    $params = ['uid' => $userId];
    if (!$includeArchived) {
        $sql .= ' AND u.archived_at IS NULL';
    }
    if ($onlyId !== null) {
        $sql .= ' AND u.id = :id';
        $params['id'] = $onlyId;
    }
    $stmt = $pdo->prepare($sql . ' ORDER BY u.name');
    $stmt->execute($params);
    return array_map('shape_user_exercise', $stmt->fetchAll());
}

function shape_user_exercise(array $r): array
{
    return [
        'id'                  => (int) $r['id'],
        'name'                => $r['name'],
        'catalog_exercise_id' => $r['catalog_exercise_id'] !== null ? (int) $r['catalog_exercise_id'] : null,
        'target'              => $r['own_target'] ?? $r['catalog_target'],
        'equipment'           => $r['own_equipment'] ?? $r['catalog_equipment'],
        'own_target'          => $r['own_target'] !== null,
        'archived'            => $r['archived_at'] !== null,
        'uses'                => (int) $r['uses'],
        'catalog'             => $r['catalog_exercise_id'] === null ? null : [
            'name_es'   => $r['catalog_name_es'],
            'name_en'   => $r['catalog_name_en'],
            'media_ref' => $r['media_ref'],
        ],
    ];
}

/**
 * El ejercicio del usuario con ese nombre (sin distinguir acentos ni
 * mayúsculas, por la collation), o uno nuevo propio sin músculo si no
 * existe — así escribir un nombre nuevo en el gimnasio nunca bloquea el
 * registro. Uno archivado se desarchiva. Devuelve [id, nombre canónico].
 */
function resolve_user_exercise(PDO $pdo, int $userId, string $name): array
{
    $name = trim($name);
    $stmt = $pdo->prepare('SELECT id, name, archived_at FROM user_exercises WHERE user_id = :uid AND name = :name LIMIT 1');
    $stmt->execute(['uid' => $userId, 'name' => $name]);
    $row = $stmt->fetch();
    if ($row) {
        if ($row['archived_at'] !== null) {
            $pdo->prepare('UPDATE user_exercises SET archived_at = NULL WHERE id = :id')->execute(['id' => $row['id']]);
        }
        return [(int) $row['id'], $row['name']];
    }
    $pdo->prepare('INSERT INTO user_exercises (user_id, name) VALUES (:uid, :name)')
        ->execute(['uid' => $userId, 'name' => $name]);
    return [(int) $pdo->lastInsertId(), $name];
}

/**
 * [user_exercise_id, nombre] para una fila de exercises a partir del body
 * de la petición: `user_exercise_id` manda (el nombre sale de él); si no,
 * `name` se resuelve o crea. Nombre vacío = fila en blanco, sin vínculo.
 * Antes de la migración (catalog_ready() = false) solo pasa el nombre.
 */
function link_exercise_fields(PDO $pdo, int $userId, array $body): array
{
    $name = trim((string) ($body['name'] ?? ''));
    if (!catalog_ready($pdo)) {
        return [null, $name];
    }
    if (!empty($body['user_exercise_id'])) {
        $ue = find_user_exercise($pdo, $userId, (int) $body['user_exercise_id']);
        if (!$ue) {
            respond_error('Ese ejercicio no es tuyo o no existe.', 422);
        }
        return [$ue['id'], $ue['name']];
    }
    if ($name === '' || str_starts_with($name, 'Garmin: ')) {
        return [null, $name];
    }
    return resolve_user_exercise($pdo, $userId, $name);
}

/** El ejercicio del usuario por id, solo si es de ese usuario. */
function find_user_exercise(PDO $pdo, int $userId, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT id, name FROM user_exercises WHERE id = :id AND user_id = :uid');
    $stmt->execute(['id' => $id, 'uid' => $userId]);
    $row = $stmt->fetch();
    return $row ? ['id' => (int) $row['id'], 'name' => $row['name']] : null;
}

/** Valores válidos de músculo y equipo: los que usa el catálogo. */
function catalog_vocabulary(PDO $pdo, string $column): array
{
    static $cache = [];
    if (!isset($cache[$column])) {
        $col = $column === 'equipment' ? 'equipment' : 'target';
        $cache[$column] = $pdo->query("SELECT DISTINCT $col FROM catalog_exercises WHERE $col IS NOT NULL")->fetchAll(PDO::FETCH_COLUMN);
    }
    return $cache[$column];
}
