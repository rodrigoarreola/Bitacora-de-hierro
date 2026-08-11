<?php
/**
 * Helpers compartidos por los endpoints. Requiere que config.php ya
 * se haya incluido (sesión iniciada, $pdo disponible).
 */

declare(strict_types=1);

function respond_json($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function respond_ok($data = null, int $status = 200): void
{
    respond_json(['ok' => true, 'data' => $data], $status);
}

function respond_error(string $message, int $status = 400): void
{
    respond_json(['ok' => false, 'error' => $message], $status);
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function require_login(): int
{
    if (empty($_SESSION['user_id'])) {
        respond_error('No autenticado.', 401);
    }
    return (int) $_SESSION['user_id'];
}
