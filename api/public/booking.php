<?php
// filepath: api/public/booking.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

error_reporting(E_ALL);
ini_set('display_errors', 0); // Production

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include_once __DIR__ . '/../config/database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();

    if (!$pdo) {
        throw new Exception("Database connection failed");
    }

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $requestKey = $input['request_key'] ?? '';
        if ($requestKey !== '' && !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $requestKey)) throw new Exception('Kunci permintaan booking tidak valid');
        $existing = $pdo->prepare('SELECT b.booking_id, b.booking_code, b.total_estimated_cost, b.estimated_duration FROM booking_requests r JOIN bookings b ON b.booking_id = r.booking_id WHERE r.request_key = ?');
        $existing->execute([$requestKey]);
        if ($saved = $existing->fetch()) {
            $details = $pdo->prepare("SELECT bi.item_type, bi.equipment_id, bi.package_id, bi.quantity, bi.unit_price, COALESCE(e.name, p.name) AS name FROM booking_items bi LEFT JOIN equipment e ON e.equipment_id = bi.equipment_id LEFT JOIN equipment_packages p ON p.package_id = bi.package_id WHERE bi.booking_id = ? ORDER BY bi.booking_item_id");
            $details->execute([$saved['booking_id']]);
            $items = array_map(fn($i) => ['type' => $i['item_type'] === 'single' ? 'equipment' : 'package', 'id' => (int)($i['equipment_id'] ?: $i['package_id']), 'name' => $i['name'], 'quantity' => (int)$i['quantity'], 'price_per_day' => (float)$i['unit_price']], $details->fetchAll());
            echo json_encode(['success' => true, 'booking_id' => $saved['booking_id'], 'booking_code' => $saved['booking_code'], 'total_price' => (float)$saved['total_estimated_cost'], 'duration' => (int)$saved['estimated_duration'], 'items' => $items]);
            exit;
        }

        // ✅ VALIDASI - CEK ADA EQUIPMENT ATAU PACKAGE
        $hasEquipment = !empty($input['equipment_items']);
        $hasPackage = !empty($input['package_items']);

        if (!$hasEquipment && !$hasPackage) {
            throw new Exception("Minimal harus ada 1 equipment atau 1 paket");
        }

        if (
            empty($input['customer_name']) ||
            empty($input['start_date']) ||
            empty($input['end_date'])
        ) {
            throw new Exception("Data booking tidak lengkap");
        }

        $customer_name = $input['customer_name'];
        $customer_phone = $input['customer_phone'] ?? null;
        $customer_email = $input['customer_email'] ?? null;
        $customer_identity_number = $input['customer_identity_number'] ?? null;
        $customer_id = $input['customer_id'] ?? null;
        $start_date = $input['start_date'];
        $end_date = $input['end_date'];
        $notes = $input['notes'] ?? '';

        // Hitung durasi
        $start = new DateTime($start_date);
        $end = new DateTime($end_date);
        if ($end < $start) throw new Exception('Tanggal selesai tidak boleh sebelum tanggal mulai');
        $duration = $start->diff($end)->days;
        if ($duration <= 0) $duration = 1;

        $pdo->beginTransaction();

        try {
            $total_price = 0;
            $pricedItems = [];

            // ✅ HITUNG HARGA DARI EQUIPMENT
            if ($hasEquipment) {
                foreach ($input['equipment_items'] as $item) {
                    if (filter_var($item['quantity'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) throw new Exception('Jumlah equipment tidak valid');
                    $stmt = $pdo->prepare("SELECT price_per_day, name FROM equipment WHERE equipment_id = ?");
                    $stmt->execute([$item['equipment_id']]);
                    $equipment = $stmt->fetch(PDO::FETCH_ASSOC);

                    if (!$equipment) {
                        throw new Exception("Equipment ID {$item['equipment_id']} tidak ditemukan");
                    }

                    $item_total = $equipment['price_per_day'] * $item['quantity'] * $duration;
                    $total_price += $item_total;
                    $pricedItems[] = ['type' => 'equipment', 'id' => (int)$item['equipment_id'], 'name' => $equipment['name'], 'quantity' => (int)$item['quantity'], 'price_per_day' => (float)$equipment['price_per_day']];
                    
                    error_log("💰 Equipment: {$equipment['name']} | Qty: {$item['quantity']} | Total: {$item_total}");
                }
            }

            // ✅ HITUNG HARGA DARI PAKET
            if ($hasPackage) {
                foreach ($input['package_items'] as $item) {
                    if (filter_var($item['quantity'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) throw new Exception('Jumlah paket tidak valid');
                    $stmt = $pdo->prepare("SELECT package_price, name FROM equipment_packages WHERE package_id = ?");
                    $stmt->execute([$item['package_id']]);
                    $package = $stmt->fetch(PDO::FETCH_ASSOC);

                    if (!$package) {
                        throw new Exception("Package ID {$item['package_id']} tidak ditemukan");
                    }

                    $item_total = $package['package_price'] * $item['quantity'] * $duration;
                    $total_price += $item_total;
                    $pricedItems[] = ['type' => 'package', 'id' => (int)$item['package_id'], 'name' => $package['name'], 'quantity' => (int)$item['quantity'], 'price_per_day' => (float)$package['package_price']];
                    
                    error_log("📦 Package: {$package['name']} | Qty: {$item['quantity']} | Total: {$item_total}");
                }
            }

            error_log("💵 Total Price: Rp " . number_format($total_price, 0, ',', '.'));

            // Generate booking code
            $booking_code = "KO-" . date('Ymd') . "-" . str_pad(rand(100, 999), 3, '0', STR_PAD_LEFT);

            // ✅ INSERT BOOKING
            $query = "INSERT INTO bookings (
                customer_name, customer_phone, customer_email, customer_identity_number,
                customer_id, booking_code, start_date, end_date, estimated_duration, 
                total_estimated_cost, status, payment_status, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid', ?, NOW())";

            $stmt = $pdo->prepare($query);
            $success = $stmt->execute([
                $customer_name, $customer_phone, $customer_email, $customer_identity_number,
                $customer_id, $booking_code, $start_date, $end_date, $duration,
                $total_price, $notes
            ]);

            if (!$success) {
                throw new Exception("Gagal menyimpan booking");
            }

            $booking_id = $pdo->lastInsertId();

            // ✅ INSERT EQUIPMENT ITEMS
            if ($hasEquipment) {
                foreach ($input['equipment_items'] as $item) {
                    $insertQuery = "INSERT INTO booking_items (booking_id, equipment_id, quantity, unit_price, item_type)
                                    VALUES (?, ?, ?, ?, 'single')";
                    $stmt = $pdo->prepare($insertQuery);
                    $price = array_values(array_filter($pricedItems, fn($p) => $p['type'] === 'equipment' && $p['id'] === (int)$item['equipment_id']))[0]['price_per_day'];
                    $stmt->execute([$booking_id, $item['equipment_id'], $item['quantity'], $price]);
                }
            }

            // ✅ INSERT PACKAGE ITEMS
            if ($hasPackage) {
                foreach ($input['package_items'] as $item) {
                    $insertQuery = "INSERT INTO booking_items (booking_id, package_id, quantity, unit_price, item_type)
                                    VALUES (?, ?, ?, ?, 'package')";
                    $stmt = $pdo->prepare($insertQuery);
                    $price = array_values(array_filter($pricedItems, fn($p) => $p['type'] === 'package' && $p['id'] === (int)$item['package_id']))[0]['price_per_day'];
                    $stmt->execute([$booking_id, $item['package_id'], $item['quantity'], $price]);
                }
            }

            if ($requestKey !== '') $pdo->prepare('INSERT INTO booking_requests (request_key, booking_id) VALUES (?, ?)')->execute([$requestKey, $booking_id]);
            $pdo->commit();

            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "Booking berhasil dibuat",
                "booking_id" => $booking_id,
                "booking_code" => $booking_code,
                "total_price" => $total_price,
                "duration" => $duration,
                "items" => $pricedItems
            ]);
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
        exit;
    }

} catch (Exception $e) {
    error_log("❌ Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>
