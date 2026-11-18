<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
include_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    http_response_code(405);
    echo json_encode(array("message" => "Method not allowed"));
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (empty($data->username) || empty($data->password)) {
    http_response_code(400);
    echo json_encode(array("message" => "Username and password are required"));
    exit();
}

// UNTUK TEST - allow admin/kuala2024
if ($data->username === "admin" && $data->password === "kuala2024") {
    try {
        $pdo = (new Database())->connect();
        $token = bin2hex(random_bytes(32));
        $stmt = $pdo->prepare('INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, DATE_ADD(NOW(), INTERVAL 12 HOUR))');
        $stmt->execute([hash('sha256', $token)]);
    } catch (Throwable $e) {
        error_log('Admin session error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['message' => 'Gagal memulai sesi admin.']);
        exit;
    }
    
    http_response_code(200);
    echo json_encode(array(
        "message" => "Login successful",
        "token" => $token,
        "user" => array(
            "id" => 1,
            "username" => "admin",
            "name" => "Admin Kuala Outdoor",
            "role" => "super_admin"
        )
    ));
} else {
    http_response_code(401);
    echo json_encode(array("message" => "Invalid credentials"));
}
?>
