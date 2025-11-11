<?php
// backend/api/admin_auth.php
// FILE ĐĂNG NHẬP DEBUG CHO ADMIN - BỎ QUA MẬT KHẨU

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost:8080"); 
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

ini_set('display_errors', 1);
error_reporting(E_ALL);

function json_response($code, $data) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_set_cookie_params([
    'lifetime' => 86400 * 7, 'path' => '/', 'domain' => '',
    'secure' => false, 'httponly' => true, 'samesite' => 'Lax'
]);
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// === KẾT NỐI DB ===
$DB_HOST = "127.0.0.1";
$DB_PORT = "3306";
$DB_NAME = "nhathuocgb";
$DB_USER = "root";
$DB_PASS = "";
$pdo = null;
try {
    $pdo = new PDO("mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC 
    ]);
} catch (Exception $e) {
    json_response(500, ["status" => "error", "message" => "Lỗi kết nối CSDL."]);
}

function get_json_input() {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true); 
    if (json_last_error() !== JSON_ERROR_NONE) {
        json_response(400, ['status' => 'error', 'message' => 'Invalid JSON input']);
    }
    return $data;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// === ROUTING (CHỈ DÀNH CHO ADMIN) ===
if ($action === 'login' && $method === 'POST') {
    $data = get_json_input();
    $email = $data['email'] ?? '';

    // Chỉ cần email là admin, không cần mật khẩu
    if ($email === 'admin@gmail.com') {
        
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND role = 'admin' LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
             json_response(401, ['status'=>'error','message'=>'Tài khoản admin@gmail.com không tồn tại hoặc không có quyền admin.']);
        }
        
        // *** BỎ QUA HOÀN TOÀN BƯỚC KIỂM TRA MẬT KHẨU ***

        // Tạo session
        $_SESSION['user_id']       = (int)$user['id'];
        $_SESSION['user_role']     = $user['role'];
        $_SESSION['user_fullname'] = $user['full_name'];
        $_SESSION['user_phone']    = $user['phone'] ?? null;
        $_SESSION['user_email']    = $user['email'];

        unset($user['password']);
        json_response(200, [
            'status'  => 'success',
            'message' => 'Đăng nhập Admin thành công (Debug Mode).',
            'user'    => $user
        ]);

    } else {
        // Nếu email không phải là admin@gmail.com
        json_response(401, ['status' => 'error', 'message' => 'Email không phải là tài khoản Admin.']);
    }
} else {
    json_response(404, ['status' => 'error', 'message' => 'Hành động không hợp lệ cho Admin Auth.']);
}
?>