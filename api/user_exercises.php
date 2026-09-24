<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/exercise_helpers.php';

$userId = require_login();
require_catalog($pdo);

/**
 * Ejercicios del usuario (ADR 0021): lo que el usuario hace de verdad,
 * vinculado a un ejercicio del catálogo o propio (con músculo).
 *
 * GET [?archived=1]  → lista (con datos del catálogo y cuántos registros tiene)
 * POST {name, catalog_exercise_id}         → vinculado al catálogo
 * POST {name, target, equipment?}          → propio
 * PUT ?id= {name?, catalog_exercise_id?, target?, equipment?, archived?}
 *     name: renombra también la copia en todos sus registros.
 *     catalog_exercise_id: null = desvincular (queda propio).
 *     target/equipment: null = volver al del catálogo.
 * DELETE ?id= → borra si no tiene registros; si tiene, lo archiva.
 */

$method = $_SERVER['REQUEST_METHOD'];

function validate_name(string $name): string
{
    $name = trim($name);
    if ($name === '' || mb_strlen($name) > 150) {
        respond_error('El nombre debe tener entre 1 y 150 caracteres.', 422);
    }
    if (str_starts_with($name, 'Garmin: ')) {
        respond_error('Los nombres "Garmin: …" están reservados para las sesiones importadas.', 422);
    }
    return $name;
}

function validate_vocab(PDO $pdo, $value, string $column, string $label): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    $value = (string) $value;
    if (!in_array($value, catalog_vocabulary($pdo, $column), true)) {
        respond_error("$label inválido.", 422);
    }
    return $value;
}

function validate_catalog_id(PDO $pdo, $value): ?int
{
    if ($value === null || $value === '') {
        return null;
    }
    $stmt = $pdo->prepare('SELECT id FROM catalog_exercises WHERE id = :id');
    $stmt->execute(['id' => (int) $value]);
    if ($stmt->fetchColumn() === false) {
        respond_error('Ese ejercicio no existe en el catálogo.', 422);
    }
    return (int) $value;
}

/** ¿Otro ejercicio del usuario (no $exceptId) ya usa ese nombre? */
function name_taken(PDO $pdo, int $userId, string $name, ?int $exceptId = null): ?array
{
    $stmt = $pdo->prepare('SELECT id, archived_at FROM user_exercises WHERE user_id = :uid AND name = :name'
        . ($exceptId ? ' AND id <> :except' : '') . ' LIMIT 1');
    $params = ['uid' => $userId, 'name' => $name];
    if ($exceptId) {
        $params['except'] = $exceptId;
    }
    $stmt->execute($params);
    $row = $stmt->fetch();
    return $row ?: null;
}

if ($method === 'GET') {
    respond_ok(fetch_user_exercises($pdo, $userId, !empty($_GET['archived'])));
}

if ($method === 'POST') {
    $body = read_json_body();
    $name = validate_name((string) ($body['name'] ?? ''));
    $catalogId = validate_catalog_id($pdo, $body['catalog_exercise_id'] ?? null);
    $target = validate_vocab($pdo, $body['target'] ?? null, 'target', 'Músculo');
    $equipment = validate_vocab($pdo, $body['equipment'] ?? null, 'equipment', 'Equipo');
    if ($catalogId === null && $target === null) {
        respond_error('Un ejercicio propio necesita su músculo principal.', 422);
    }

    $existing = name_taken($pdo, $userId, $name);
    if ($existing && $existing['archived_at'] === null) {
        respond_error('Ya tienes un ejercicio con ese nombre.', 409);
    }
    if ($existing) {
        // Estaba archivado: se reactiva con los datos nuevos.
        $pdo->prepare('UPDATE user_exercises SET archived_at = NULL, catalog_exercise_id = :c, target = :t, equipment = :e WHERE id = :id')
            ->execute(['c' => $catalogId, 't' => $target, 'e' => $equipment, 'id' => $existing['id']]);
        $id = (int) $existing['id'];
    } else {
        $pdo->prepare('INSERT INTO user_exercises (user_id, name, catalog_exercise_id, target, equipment) VALUES (:uid, :n, :c, :t, :e)')
            ->execute(['uid' => $userId, 'n' => $name, 'c' => $catalogId, 't' => $target, 'e' => $equipment]);
        $id = (int) $pdo->lastInsertId();
    }
    respond_ok(fetch_user_exercises($pdo, $userId, true, $id)[0], 201);
}

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$current = $id ? find_user_exercise($pdo, $userId, $id) : null;
if (!$current) {
    respond_error('Ejercicio no encontrado.', 404);
}

if ($method === 'PUT') {
    $body = read_json_body();
    $sets = [];
    $params = ['id' => $id];

    $pdo->beginTransaction();
    if (array_key_exists('name', $body)) {
        $name = validate_name((string) $body['name']);
        if ($name !== $current['name']) {
            if (name_taken($pdo, $userId, $name, $id)) {
                $pdo->rollBack();
                respond_error('Ya tienes otro ejercicio con ese nombre.', 409);
            }
            $sets[] = 'name = :name';
            $params['name'] = $name;
            // La copia del nombre en los registros se mantiene al día.
            $pdo->prepare('UPDATE exercises SET name = :name WHERE user_exercise_id = :id')
                ->execute(['name' => $name, 'id' => $id]);
        }
    }
    if (array_key_exists('catalog_exercise_id', $body)) {
        $sets[] = 'catalog_exercise_id = :c';
        $params['c'] = validate_catalog_id($pdo, $body['catalog_exercise_id']);
    }
    if (array_key_exists('target', $body)) {
        $sets[] = 'target = :t';
        $params['t'] = validate_vocab($pdo, $body['target'], 'target', 'Músculo');
    }
    if (array_key_exists('equipment', $body)) {
        $sets[] = 'equipment = :e';
        $params['e'] = validate_vocab($pdo, $body['equipment'], 'equipment', 'Equipo');
    }
    if (array_key_exists('archived', $body)) {
        $sets[] = $body['archived'] ? 'archived_at = COALESCE(archived_at, NOW())' : 'archived_at = NULL';
    }
    if ($sets) {
        $pdo->prepare('UPDATE user_exercises SET ' . implode(', ', $sets) . ' WHERE id = :id')->execute($params);
    }
    $pdo->commit();
    respond_ok(fetch_user_exercises($pdo, $userId, true, $id)[0]);
}

if ($method === 'DELETE') {
    $uses = (int) $pdo->query('SELECT COUNT(*) FROM exercises WHERE user_exercise_id = ' . $id)->fetchColumn();
    if ($uses > 0) {
        $pdo->prepare('UPDATE user_exercises SET archived_at = COALESCE(archived_at, NOW()) WHERE id = :id')->execute(['id' => $id]);
        respond_ok(['deleted' => false, 'archived' => true, 'uses' => $uses]);
    }
    $pdo->prepare('DELETE FROM user_exercises WHERE id = :id')->execute(['id' => $id]);
    respond_ok(['deleted' => true, 'archived' => false]);
}

respond_error('Método no permitido.', 405);
