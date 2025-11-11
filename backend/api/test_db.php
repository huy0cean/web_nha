
<?php//test_db.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json; charset=UTF-8");

$host = "127.0.0.1";
$port = "3306"; // Port bạn đang dùng trong XAMPP
$dbname = "nhathuocgb";
$username = "root";
$password = "";

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4", $username, $password);
    echo json_encode(["status" => "success", "message" => "Kết nối thành công"]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
