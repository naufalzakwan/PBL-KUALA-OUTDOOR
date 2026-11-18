<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/database.php';

try {
    $json = file_get_contents('php://input');
    $input = json_decode($json, true);
    
    error_log("🎯 CART ADD - Received: " . $json);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }

    $customer_id = filter_var($input['customer_id'] ?? null, FILTER_VALIDATE_INT);
    $equipment_id = filter_var($input['equipment_id'] ?? null, FILTER_VALIDATE_INT);
    $quantity = filter_var($input['quantity'] ?? 1, FILTER_VALIDATE_INT);

    if ($customer_id <= 0) {
        throw new Exception('Customer ID tidak valid: ' . $customer_id);
    }
    
    if ($equipment_id <= 0) {
        throw new Exception('Equipment ID tidak valid: ' . $equipment_id);
    }
    
    if ($quantity <= 0) {
        throw new Exception('Quantity tidak valid: ' . $quantity);
    }

    $database = new Database();
    $db = $database->connect();
    $db->beginTransaction();
    $checkCustomer = $db->prepare('SELECT customer_id FROM customers WHERE customer_id = ?');
    $checkCustomer->execute([$customer_id]);
    if (!$checkCustomer->fetch()) {
        throw new Exception('Akun pelanggan tidak ditemukan. Silakan login kembali.');
    }
    
    // ✅ CEK EQUIPMENT EXIST - SESUAI STRUKTUR TABEL
    $checkEquipment = $db->prepare("SELECT equipment_id, name, stock_quantity, price_per_day FROM equipment WHERE equipment_id = :equipment_id FOR UPDATE");
    $checkEquipment->bindParam(':equipment_id', $equipment_id, PDO::PARAM_INT);
    $checkEquipment->execute();
    $equipment = $checkEquipment->fetch(PDO::FETCH_ASSOC);
    
    if (!$equipment) {
        throw new Exception('Equipment tidak ditemukan: ' . $equipment_id);
    }
    
    if ($quantity > $equipment['stock_quantity']) {
        throw new Exception('Quantity melebihi stok. Stok: ' . $equipment['stock_quantity'] . ', Request: ' . $quantity);
    }
    
    // ✅ CEK APAKAH SUDAH ADA DI CART
    $checkCart = $db->prepare("SELECT cart_id, quantity FROM cart WHERE customer_id = :customer_id AND equipment_id = :equipment_id");
    $checkCart->bindParam(':customer_id', $customer_id, PDO::PARAM_INT);
    $checkCart->bindParam(':equipment_id', $equipment_id, PDO::PARAM_INT);
    $checkCart->execute();
    $existingItem = $checkCart->fetch(PDO::FETCH_ASSOC);
    
    if ($existingItem) {
        // ✅ UPDATE QUANTITY JIKA SUDAH ADA
        $newQuantity = $existingItem['quantity'] + $quantity;
        
        if ($newQuantity > $equipment['stock_quantity']) {
            throw new Exception('Jumlah di keranjang melebihi stok tersedia: ' . $equipment['stock_quantity']);
        }
        
        $updateStmt = $db->prepare("UPDATE cart SET quantity = :quantity, price_per_day = :price, total_price = :total, updated_at = NOW() WHERE cart_id = :cart_id");
        $updateStmt->bindParam(':quantity', $newQuantity, PDO::PARAM_INT);
        $updateStmt->bindValue(':price', $equipment['price_per_day']);
        $updateStmt->bindValue(':total', $equipment['price_per_day'] * $newQuantity);
        $updateStmt->bindParam(':cart_id', $existingItem['cart_id'], PDO::PARAM_INT);
        $updateStmt->execute();
        $db->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Cart quantity updated',
            'cart_id' => (int)$existingItem['cart_id'],
            'quantity' => $newQuantity,
            'action' => 'updated'
        ]);
    } else {
        // ✅ INSERT BARU JIKA BELUM ADA
        $insertStmt = $db->prepare("INSERT INTO cart (customer_id, equipment_id, quantity, price_per_day, total_price) VALUES (:customer_id, :equipment_id, :quantity, :price, :total)");
        $insertStmt->bindParam(':customer_id', $customer_id, PDO::PARAM_INT);
        $insertStmt->bindParam(':equipment_id', $equipment_id, PDO::PARAM_INT);
        $insertStmt->bindParam(':quantity', $quantity, PDO::PARAM_INT);
        $insertStmt->bindValue(':price', $equipment['price_per_day']);
        $insertStmt->bindValue(':total', $equipment['price_per_day'] * $quantity);
        $insertStmt->execute();
        
        $cart_id = $db->lastInsertId();
        $db->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Item added to cart',
            'cart_id' => (int)$cart_id,
            'quantity' => $quantity,
            'action' => 'added'
        ]);
    }
    
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    error_log("❌ CART ADD ERROR: " . $e->getMessage());
    http_response_code($e instanceof PDOException ? 500 : 400);
    echo json_encode([
        'success' => false,
        'message' => $e instanceof PDOException ? 'Gagal menyimpan keranjang di database.' : $e->getMessage()
    ]);
}
?>
