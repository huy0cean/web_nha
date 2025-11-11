<?php
// backend/config/database.php

// Ngăn chặn truy cập trực tiếp
if (basename($_SERVER['PHP_SELF']) == basename(__FILE__)) {
    die('Access Denied');
}

class Database {
    // Thông số kết nối XAMPP
    private $host = 'localhost';
    private $db_name = 'nhathuocgb'; 
    private $username = 'root';
    private $password = ''; 
    private $port = '3306'; // <--- Đây là cổng MySQL mặc định
    private $conn;

    // Hàm kết nối
    public function connect() {
        $this->conn = null;

        try {
            // Thêm $this->port vào chuỗi kết nối (DSN)
            $dsn = 'mysql:host=' . $this->host . ';port=' . $this->port . ';dbname=' . $this->db_name . ';charset=utf8mb4';
            
            $this->conn = new PDO($dsn, $this->username, $this->password);
            
            // Cài đặt chế độ lỗi
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $e) {
            // Hiển thị lỗi kết nối
            echo 'Connection Error: ' . $e->getMessage();
        }

        return $this->conn;
    }
}
?>