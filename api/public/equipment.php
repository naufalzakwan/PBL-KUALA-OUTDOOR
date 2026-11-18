<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => true, 'message' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $database = new Database();
    $pdo = $database->connect();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($id > 0) {
        $stmt = $pdo->prepare('SELECT * FROM equipment WHERE equipment_id = ?');
        $stmt->execute([$id]);
    } else {
        $stmt = $pdo->query('SELECT * FROM equipment WHERE stock_quantity > 0 ORDER BY created_at DESC');
    }

    $items = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $item = [
            'equipment_id' => (int) $row['equipment_id'],
            'name' => $row['name'],
            'code' => $row['code'],
            'description' => $row['description'] ?? '',
            'category' => $row['category'],
            'size_capacity' => $row['size_capacity'] ?? '',
            'dimensions' => $row['dimensions'] ?? '',
            'weight' => (float) ($row['weight'] ?? 0),
            'material' => $row['material'] ?? '',
            'stock_quantity' => (int) $row['stock_quantity'],
            'available_stock' => (int) $row['stock_quantity'],
            'reserved_stock' => 0,
            'rented_stock' => 0,
            'price_per_day' => (float) $row['price_per_day'],
            'condition' => $row['condition_item'] ?? 'baik',
            'equipment_type' => $row['equipment_type'] ?? 'single',
            'image_url' => $database->buildImageUrl($row['image_url'] ?? null),
            'images' => $database->getEquipmentImages($pdo, $row['equipment_id']),
            'created_at' => $row['created_at'],
        ];
        if ($id > 0) {
            $item['usage_guide'] = $database->getUsageGuide($pdo, $id);
            $item['rental_terms'] = $database->getRentalTerms($pdo, $id);
        }
        $items[] = $item;
    }

    if ($id > 0 && !$items) {
        http_response_code(404);
        echo json_encode(['error' => true, 'message' => 'Equipment not found']);
    } else {
        echo json_encode($id > 0 ? $items[0] : $items, JSON_INVALID_UTF8_SUBSTITUTE);
    }
} catch (Throwable $e) {
    error_log('Equipment API error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => true, 'message' => 'Gagal mengambil data equipment dari database.']);
}
