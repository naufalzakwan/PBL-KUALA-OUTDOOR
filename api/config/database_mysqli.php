<?php
// filepath: api/config/database_mysqli.php
// ✅ InfinityFree Database Configuration for MySQLi

class DatabaseMySQLi {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $port;
    public $conn;

    public function __construct() {
        $this->host = getenv('MYSQLHOST') ?: getenv('DB_HOST') ?: 'localhost';
        $this->port = (int) (getenv('MYSQLPORT') ?: getenv('DB_PORT') ?: 3306);
        $this->db_name = getenv('MYSQLDATABASE') ?: getenv('DB_NAME') ?: 'kuala_outdoor';
        $this->username = getenv('MYSQLUSER') ?: getenv('DB_USER') ?: 'root';
        $this->password = getenv('MYSQLPASSWORD') ?: getenv('DB_PASSWORD') ?: '';
    }

    public function connect() {
        $this->conn = new mysqli($this->host, $this->username, $this->password, $this->db_name, $this->port);
        
        if ($this->conn->connect_error) {
            error_log("Database Connection Error: " . $this->conn->connect_error);
            http_response_code(500);
            die(json_encode([
                'success' => false,
                'error' => 'Database connection failed'
            ]));
        }
        
        $this->conn->set_charset("utf8mb4");
        return $this->conn;
    }
    
    public function getConnection() {
        return $this->connect();
    }
}
?>
