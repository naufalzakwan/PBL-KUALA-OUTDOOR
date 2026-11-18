<?php
// filepath: api/config/database.php
// ✅ Multi-environment Database Configuration (Railway + Local)

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $port;
    public $conn;

    public function __construct() {
        $this->host = getenv('MYSQLHOST') ?: getenv('DB_HOST') ?: 'localhost';
        $this->port = getenv('MYSQLPORT') ?: getenv('DB_PORT') ?: '3306';
        $this->db_name = getenv('MYSQLDATABASE') ?: getenv('DB_NAME') ?: 'kuala_outdoor';
        $this->username = getenv('MYSQLUSER') ?: getenv('DB_USER') ?: 'root';
        $this->password = getenv('MYSQLPASSWORD') ?: getenv('DB_PASSWORD') ?: '';
    }

    public function connect() {
        if (!$this->conn) {
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->db_name};charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }
        return $this->conn;
    }

    // ✅ METHOD: Get base URL for environment (Railway vs Local)
    public function getBaseUrl() {
        $railwayDomain = getenv('RAILWAY_PUBLIC_DOMAIN');
        $host = $_SERVER['HTTP_HOST'] ?? '';
        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https://' : 'http://';
        
        if ($railwayDomain) {
            return 'https://' . $railwayDomain;
        } elseif ($host && (strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false)) {
            $script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
            $apiPosition = strpos($script, '/api/');
            return $protocol . $host . ($apiPosition === false ? '' : substr($script, 0, $apiPosition));
        } else {
            return 'https://pbl-kuala-outdoor-production.up.railway.app';
        }
    }
    
    // ✅ METHOD: Build complete image URL
    public function buildImageUrl($imageUrl) {
        if (!$imageUrl) return null;
        
        // If image URL already starts with http:// or https://, return as-is
        if (strpos($imageUrl, 'http://') === 0 || strpos($imageUrl, 'https://') === 0) {
            return $imageUrl;
        }
        
        // Otherwise construct from relative path
        return $this->getBaseUrl() . '/' . ltrim($imageUrl, '/');
    }
    
    // ✅ METHOD: Get equipment images
    public function getEquipmentImages($pdo, $equipment_id) {
        $stmt = $pdo->prepare("
            SELECT image_id, image_url, is_primary, display_order
            FROM equipment_images
            WHERE equipment_id = ?
            ORDER BY is_primary DESC, display_order ASC
        ");
        $stmt->execute([$equipment_id]);
        
        $images = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $images[] = [
                'image_id' => (int)$row['image_id'],
                'image_url' => $this->buildImageUrl($row['image_url']),
                'is_primary' => (bool)$row['is_primary'],
                'display_order' => (int)$row['display_order']
            ];
        }
        
        return $images;
    }
    
    // ✅ METHOD: Get usage guide steps
    public function getUsageGuide($pdo, $equipment_id) {
        $stmt = $pdo->prepare("
            SELECT guide_id, step_number, title, description
            FROM equipment_usage_guides
            WHERE equipment_id = ?
            ORDER BY step_number ASC
        ");
        $stmt->execute([$equipment_id]);
        
        $steps = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $steps[] = [
                'guide_id' => (int)$row['guide_id'],
                'step_number' => (int)$row['step_number'],
                'title' => $row['title'],
                'description' => $row['description']
            ];
        }
        
        return $steps;
    }
    
    // ✅ METHOD: Get rental terms
    public function getRentalTerms($pdo, $equipment_id) {
        $stmt = $pdo->prepare("
            SELECT term_id, category, term_text, display_order
            FROM equipment_rental_terms
            WHERE equipment_id = ?
            ORDER BY display_order ASC
        ");
        $stmt->execute([$equipment_id]);
        
        $terms = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $terms[] = [
                'term_id' => (int)$row['term_id'],
                'category' => $row['category'],
                'term_text' => $row['term_text'],
                'display_order' => (int)$row['display_order']
            ];
        }
        
        return $terms;
    }
    
    // ✅ METHOD ALTERNATIVE JIKA PERLU
    public function getConnection() {
        return $this->connect();
    }
}
?>
