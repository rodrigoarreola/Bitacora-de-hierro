<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_error('Método no permitido.', 405);
}

// Invalida el token "recordarme" en la BD (no solo la cookie del
// navegador que cierra sesión) — si no, seguiría reautenticando sola en
// cualquier otro dispositivo/navegador donde haya quedado esa cookie.
// try/catch por si remember_token_hash/expires todavía no existen en
// producción (deploy sin el ALTER TABLE todavía) — el logout por sesión
// sigue funcionando igual.
if (!empty($_SESSION['user_id'])) {
    try {
        $pdo->prepare('UPDATE users SET remember_token_hash = NULL, remember_token_expires = NULL WHERE id = :id')
            ->execute(['id' => $_SESSION['user_id']]);
    } catch (PDOException $e) {
        // Columnas inexistentes todavía — nada que invalidar.
    }
}
clear_remember_cookie($isHttps);

$_SESSION = [];
session_destroy();

respond_ok(['authenticated' => false]);
