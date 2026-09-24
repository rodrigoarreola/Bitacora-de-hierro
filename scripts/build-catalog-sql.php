<?php
declare(strict_types=1);

/**
 * Genera la siembra del catálogo global de ejercicios (ADR 0021):
 * api/db/migrations/2026-09-23-catalogo.sql
 *
 * Entrada:
 *   - scripts/.cache/exercises-raw.json — dataset completo de
 *     hasaneyldrm/exercises-dataset (se descarga con
 *     scripts/build-exercises-dataset.php si falta). Solo se usan los datos
 *     con licencia MIT: nombre, músculos, equipo e instrucciones en/es.
 *     Los otros 8 idiomas se descartan. La media (© Gym visual) no se copia:
 *     media_ref apunta al proxy api/exercise_media.php.
 *   - data/exercises-dataset.json — traducción por reglas (name_es, 321).
 *   - data/catalog-names-es.json — traducciones en lote ('auto') y
 *     revisadas a mano ('revisada'); gana sobre la de reglas.
 *
 * El id del catálogo es el id del dataset como entero (0584 → 584): estable
 * entre instalaciones, así js/split-catalog.js puede apuntar a él. Los
 * ejercicios propios del catálogo empiezan en 100000 (AUTO_INCREMENT).
 *
 * El SQL es idempotente: INSERT ... ON DUPLICATE KEY UPDATE por id, así se
 * puede volver a correr para re-sincronizar nombres o instrucciones.
 *
 * Uso: php scripts/build-catalog-sql.php
 */

$root = dirname(__DIR__);
$rawPath = $root . '/scripts/.cache/exercises-raw.json';
$outPath = $root . '/api/db/migrations/2026-09-23-catalogo.sql';

if (!is_file($rawPath)) {
    fwrite(STDERR, "Falta $rawPath — corre primero: php scripts/build-exercises-dataset.php\n");
    exit(1);
}

$raw = json_decode((string) file_get_contents($rawPath), true);
$ruleEs = [];
foreach (json_decode((string) file_get_contents($root . '/data/exercises-dataset.json'), true) as $e) {
    if (!empty($e['name_es'])) {
        $ruleEs[$e['id']] = $e['name_es'];
    }
}
$names = json_decode((string) file_get_contents($root . '/data/catalog-names-es.json'), true);
if (!is_array($raw) || !is_array($names)) {
    fwrite(STDERR, "JSON de entrada inválido.\n");
    exit(1);
}

/** Algunos nombres del origen traen "45в°" (UTF-8 mal decodificado) en vez de "45°". */
function clean_name(string $s): string
{
    return trim(str_replace('в°', '°', $s));
}

function sql_str(?string $s): string
{
    if ($s === null) {
        return 'NULL';
    }
    return "'" . str_replace(["\\", "'"], ["\\\\", "''"], $s) . "'";
}

function sql_json($v): string
{
    if ($v === null || $v === [] || $v === '') {
        return 'NULL';
    }
    return sql_str(json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

/** Pasos: lista del origen; si no hay, el párrafo partido por oraciones. */
function steps(array $e, string $lang): ?array
{
    $list = $e['instruction_steps'][$lang] ?? null;
    if (is_array($list) && $list) {
        return array_values(array_filter(array_map('trim', $list), 'strlen'));
    }
    $text = trim((string) ($e['instructions'][$lang] ?? ''));
    if ($text === '') {
        return null;
    }
    return preg_split('/(?<=[.!?])\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY);
}

$rows = [];
$stats = ['regla' => 0, 'auto' => 0, 'revisada' => 0, 'sin_es' => 0];
foreach ($raw as $e) {
    $id = (string) $e['id'];
    $es = null;
    $status = null;
    if (isset($names[$id])) {
        $es = $names[$id]['es'];
        $status = $names[$id]['status'];
    } elseif (isset($ruleEs[$id])) {
        $es = $ruleEs[$id];
        $status = 'regla';
    }
    $stats[$status ?? 'sin_es']++;

    $rows[] = sprintf(
        '(%d, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
        (int) $id,
        "'dataset'",
        sql_str($id),
        sql_str(clean_name($e['name'])),
        sql_str($es),
        sql_str($status),
        sql_str($e['target']),
        sql_str($e['body_part']),
        sql_str($e['equipment']),
        sql_json($e['secondary_muscles'] ?? null),
        sql_json(steps($e, 'en')),
        sql_json(steps($e, 'es')),
        sql_str($id)
    );
}

$sql = <<<SQL
-- ============================================================
-- Catálogo global de ejercicios (ADR 0021) — GENERADO por
-- scripts/build-catalog-sql.php, no editar a mano.
-- {$stats['regla']} nombres en español por reglas, {$stats['auto']} traducidos en lote,
-- {$stats['revisada']} revisados a mano, {$stats['sin_es']} sin español.
-- Datos del dataset hasaneyldrm/exercises-dataset (licencia MIT). La media
-- (© Gym visual) no se incluye: media_ref apunta a api/exercise_media.php.
-- Idempotente: se puede volver a correr para re-sincronizar.
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS catalog_exercises (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source               ENUM('dataset','propio') NOT NULL DEFAULT 'propio',
  source_ref           VARCHAR(10)  NULL,
  name_en              VARCHAR(150) NOT NULL,
  name_es              VARCHAR(150) NULL,
  name_es_status       ENUM('regla','auto','revisada') NULL,
  target               VARCHAR(40)  NOT NULL,
  body_part            VARCHAR(40)  NULL,
  equipment            VARCHAR(40)  NULL,
  secondary_muscles    TEXT NULL,
  instruction_steps_en MEDIUMTEXT NULL,
  instruction_steps_es MEDIUMTEXT NULL,
  media_ref            VARCHAR(40)  NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_catalog_source_ref (source_ref),
  KEY idx_catalog_target (target)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=100000;

SQL;

$cols = '(id, source, source_ref, name_en, name_es, name_es_status, target, body_part, equipment, secondary_muscles, instruction_steps_en, instruction_steps_es, media_ref)';
$update = 'ON DUPLICATE KEY UPDATE name_en = VALUES(name_en), name_es = VALUES(name_es), name_es_status = VALUES(name_es_status),'
    . ' target = VALUES(target), body_part = VALUES(body_part), equipment = VALUES(equipment), secondary_muscles = VALUES(secondary_muscles),'
    . ' instruction_steps_en = VALUES(instruction_steps_en), instruction_steps_es = VALUES(instruction_steps_es)';

foreach (array_chunk($rows, 100) as $chunk) {
    $sql .= "\nINSERT INTO catalog_exercises $cols VALUES\n" . implode(",\n", $chunk) . "\n$update;\n";
}

@mkdir(dirname($outPath), 0777, true);
file_put_contents($outPath, $sql);
printf("build-catalog-sql: %s (%d ejercicios, %.0f KB) — %s\n",
    basename($outPath), count($rows), strlen($sql) / 1024, json_encode($stats));
