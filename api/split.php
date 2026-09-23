<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/week_helpers.php';

require_login();

const DAY_KEYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

/**
 * Split vigente (ADR 0018): day_templates, una fila por día con su grupo,
 * notas y plantilla de la Guía del día (template_key → DAY_PLANS en
 * js/split-catalog.js). El catálogo de presets vive solo en el frontend;
 * acá se guarda el resultado, así "Personalizado" no necesita nada aparte.
 *
 * GET → { days: { [day_key]: {group_name, notes, template_key} } }
 * PUT { days: { [day_key]: {group_name, notes?, template_key} }, apply_to_week?: 'YYYY-MM-DD' }
 *   Solo cambia las semanas que se creen de acá en adelante (cada semana
 *   congela su grupo en week_day_groups al crearse). apply_to_week además
 *   reescribe los grupos de esa semana puntual — los días migrados
 *   (week_day_overrides) no se tocan.
 */

if (!split_schema_ready($pdo)) {
    respond_error('Falta correr la migración de splits en la base de datos (ver instrucciones de despliegue).', 409);
}

function read_split(PDO $pdo): array
{
    $days = [];
    foreach ($pdo->query('SELECT day_key, group_name, notes, template_key FROM day_templates ORDER BY sort_order') as $r) {
        $days[$r['day_key']] = [
            'group_name'   => $r['group_name'],
            'notes'        => $r['notes'],
            'template_key' => $r['template_key'],
        ];
    }
    return ['days' => $days];
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    respond_ok(read_split($pdo));
}

if ($method !== 'PUT') {
    respond_error('Método no permitido.', 405);
}

$body = read_json_body();
$days = $body['days'] ?? null;
if (!is_array($days) || empty($days)) {
    respond_error('days debe ser un objeto con al menos un día.', 422);
}

$clean = [];
foreach ($days as $dayKey => $d) {
    if (!in_array($dayKey, DAY_KEYS, true) || !is_array($d)) {
        respond_error("Día \"{$dayKey}\" inválido.", 422);
    }
    $group = trim((string) ($d['group_name'] ?? ''));
    if ($group === '' || mb_strlen($group) > 80) {
        respond_error("El nombre del día \"{$dayKey}\" debe tener entre 1 y 80 caracteres.", 422);
    }
    $templateKey = $d['template_key'] ?? null;
    if ($templateKey !== null && $templateKey !== '' && !preg_match('/^[a-z_]{1,30}$/', (string) $templateKey)) {
        respond_error("Plantilla inválida para \"{$dayKey}\".", 422);
    }
    $clean[$dayKey] = [
        'group_name'   => $group,
        'template_key' => ($templateKey === null || $templateKey === '') ? null : (string) $templateKey,
        'has_notes'    => array_key_exists('notes', $d),
        'notes'        => isset($d['notes']) && trim((string) $d['notes']) !== '' ? trim((string) $d['notes']) : null,
    ];
}

$applyWeekId = null;
if (!empty($body['apply_to_week'])) {
    $applyWeekId = find_week_id($pdo, (string) $body['apply_to_week']);
    if ($applyWeekId === null) {
        respond_error('Semana no encontrada.', 404);
    }
}

$updateWithNotes = $pdo->prepare(
    'UPDATE day_templates SET group_name = :g, notes = :n, template_key = :t WHERE day_key = :d'
);
$updateKeepNotes = $pdo->prepare(
    'UPDATE day_templates SET group_name = :g, template_key = :t WHERE day_key = :d'
);

$pdo->beginTransaction();
foreach ($clean as $dayKey => $d) {
    if ($d['has_notes']) {
        $updateWithNotes->execute(['g' => $d['group_name'], 'n' => $d['notes'], 't' => $d['template_key'], 'd' => $dayKey]);
    } else {
        $updateKeepNotes->execute(['g' => $d['group_name'], 't' => $d['template_key'], 'd' => $dayKey]);
    }
}
if ($applyWeekId !== null) {
    $pdo->prepare('DELETE FROM week_day_groups WHERE week_id = :w')->execute(['w' => $applyWeekId]);
    materialize_week_groups($pdo, $applyWeekId);
}
$pdo->commit();

respond_ok(read_split($pdo));
