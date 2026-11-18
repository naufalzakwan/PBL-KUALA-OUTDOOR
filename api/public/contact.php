<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/admin_session.php';
try {
    $pdo = (new Database())->connect();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $data = $pdo->query('SELECT phone1, phone2, instagram, address FROM contact_settings WHERE id = 1')->fetch();
        echo json_encode(['success' => true, 'data' => $data ?: null]);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT') { http_response_code(405); echo json_encode(['success' => false, 'message' => 'Metode tidak didukung']); exit; }
    if (!hasValidAdminSession($pdo)) { http_response_code(401); echo json_encode(['success' => false, 'message' => 'Sesi admin tidak valid atau berakhir. Silakan login kembali.']); exit; }
    $data = json_decode(file_get_contents('php://input'), true);
    foreach (['phone1', 'phone2', 'instagram', 'address'] as $field) {
        if (!isset($data[$field]) || !is_string($data[$field]) || trim($data[$field]) === '') {
            http_response_code(400); echo json_encode(['success' => false, 'message' => 'Semua kolom kontak wajib diisi.']); exit;
        }
    }
    $phone = preg_replace('/[\s().-]/', '', trim($data['phone1']));
    if (!preg_match('/^(?:\+?62|0)8[0-9]{8,11}$/', $phone)) {
        http_response_code(400); echo json_encode(['success' => false, 'message' => 'Nomor WhatsApp utama tidak valid.']); exit;
    }
    $stmt = $pdo->prepare('INSERT INTO contact_settings (id, phone1, phone2, instagram, address) VALUES (1, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE phone1=VALUES(phone1), phone2=VALUES(phone2), instagram=VALUES(instagram), address=VALUES(address)');
    $stmt->execute([trim($data['phone1']), trim($data['phone2']), trim($data['instagram']), trim($data['address'])]);
    echo json_encode(['success' => true]);
} catch (Throwable $e) {
    error_log('Contact settings: ' . $e->getMessage());
    http_response_code(500); echo json_encode(['success' => false, 'message' => 'Pengaturan kontak tidak dapat diakses.']);
}
