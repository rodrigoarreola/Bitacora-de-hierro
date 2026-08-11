<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond_error('Método no permitido.', 405);
}

respond_ok(['authenticated' => !empty($_SESSION['user_id'])]);
