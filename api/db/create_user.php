<?php
/**
 * Crea (o actualiza la contraseña de) el usuario único de la app.
 * Solo se corre por CLI — nunca se expone vía HTTP.
 *
 * Uso:
 *   php create_user.php <usuario> <contraseña>
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Este script solo se puede ejecutar por línea de comandos.');
}

if ($argc !== 3) {
    fwrite(STDERR, "Uso: php create_user.php <usuario> <contraseña>\n");
    exit(1);
}

[, $username, $password] = $argv;

require __DIR__ . '/../config.php';

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare(
    'INSERT INTO users (username, password_hash) VALUES (:username, :hash)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)'
);
$stmt->execute(['username' => $username, 'hash' => $hash]);

echo "Usuario \"{$username}\" creado/actualizado.\n";
