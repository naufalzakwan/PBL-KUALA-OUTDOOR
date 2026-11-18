<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); echo json_encode(['success' => false]); exit; }
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/admin_session.php';
try {
    if (!hasValidAdminSession((new Database())->connect())) {
        http_response_code(401); echo json_encode(['success' => false, 'message' => 'Sesi admin tidak valid atau berakhir. Silakan login kembali.']); exit;
    }
    echo json_encode(['success' => true]);
} catch (Throwable $e) {
    error_log('Admin session check: ' . $e->getMessage());
    http_response_code(500); echo json_encode(['success' => false, 'message' => 'Sesi admin tidak dapat diperiksa.']);
}
