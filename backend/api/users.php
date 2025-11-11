<?php

// backend/api/users.php (Bản Hoàn Chỉnh - Admin CRUD + Profile)

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost:8080"); 
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

ini_set('display_errors', 1);
error_reporting(E_ALL);

// === HÀM JSON TRẢ VỀ ===
function json_response($code, $data) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

// === XỬ LÝ CORS OPTIONS ===
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// === BẮT ĐẦU SESSION ===
session_set_cookie_params([
    'lifetime' => 86400 * 7, 'path' => '/', 'domain' => '',
    'secure' => false, 'httponly' => true, 'samesite' => 'Lax'
]);
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// === HÀM CHECK ĐĂNG NHẬP ===
function check_login() {
    if (!isset($_SESSION['user_id'])) {
        json_response(401, ['status' => 'error', 'message' => 'Unauthorized: Yêu cầu đăng nhập.']);
    }
    return $_SESSION['user_id'];
}
// === HÀM CHECK ADMIN ===
function check_admin() {
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
        json_response(403, ['status' => 'error', 'message' => 'Forbidden: Yêu cầu quyền Admin.']);
    }
    return $_SESSION['user_id'];
}
// === HÀM LẤY JSON INPUT ===
function get_json_input() {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true); 
    if (json_last_error() !== JSON_ERROR_NONE) {
        json_response(400, ['status' => 'error', 'message' => 'Invalid JSON input']);
    }
    return $data;
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

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($action) {
        
        // --- USER: TỰ CẬP NHẬT PROFILE ---
        case 'update_profile':
            if ($method == 'POST') {
                $user_id = check_login();
                $data = get_json_input();
                $full_name = $data['full_name'] ?? null;
                $phone = $data['phone'] ?? null;

                if (empty($full_name)) {
                     json_response(400, ['status' => 'error', 'message' => 'Họ và tên không được để trống.']);
                }

                $query = "UPDATE users SET full_name = ?, phone = ? WHERE id = ?";
                $stmt = $pdo->prepare($query);
                $stmt->execute([$full_name, $phone, $user_id]);

                 if(isset($_SESSION['user_fullname']) && $_SESSION['user_fullname'] !== $full_name){
                     $_SESSION['user_fullname'] = $full_name;
                 }
                 $_SESSION['user_phone'] = $phone; // Cập nhật SĐT vào session

                json_response(200, ['status' => 'success', 'message' => 'Cập nhật thông tin thành công.']);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;
            
        // --- ADMIN: LẤY DANH SÁCH USER ---
        case 'admin_list':
             check_admin();
            if ($method == 'GET') {
                // Lấy tất cả user, không bao giờ lấy password
                $query = "SELECT id, role, email, full_name, phone, status, created_at FROM users ORDER BY id DESC";
                $stmt = $pdo->prepare($query);
                $stmt->execute();
                $users = $stmt->fetchAll();
                json_response(200, ['status' => 'success', 'data' => $users]);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;
            
        // --- ADMIN: LẤY CHI TIẾT 1 USER ---
        case 'admin_detail':
            check_admin();
            if ($method == 'GET') {
                 if (empty($_GET['id'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Thiếu ID người dùng.']);
                }
                $stmt = $pdo->prepare("SELECT id, role, email, full_name, phone, status FROM users WHERE id = ?");
                $stmt->execute([(int)$_GET['id']]);
                $user = $stmt->fetch();
                if ($user) {
                    json_response(200, ['status' => 'success', 'data' => $user]);
                } else {
                    json_response(404, ['status' => 'error', 'message' => 'Không tìm thấy người dùng.']);
                }
            } else {
                 json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;

        // --- ADMIN: CẬP NHẬT ROLE/STATUS ---
        case 'update_role_status':
             check_admin();
            if ($method == 'POST') {
                $data = get_json_input();
                if (empty($data['id']) || empty($data['role']) || !isset($data['status'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Thiếu ID, Role hoặc Status.']);
                }
                $user_id_to_update = (int)$data['id'];
                if ($user_id_to_update == $_SESSION['user_id']) {
                     json_response(403, ['status' => 'error', 'message' => 'Bạn không thể tự thay đổi vai trò hoặc trạng thái của chính mình.']);
                }
                $query = "UPDATE users SET role = ?, status = ? WHERE id = ?";
                $stmt = $pdo->prepare($query);
                $stmt->execute([ $data['role'], (int)$data['status'], $user_id_to_update ]);
                json_response(200, ['status' => 'success', 'message' => 'Cập nhật người dùng thành công.']);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;
            
         // --- ADMIN: XÓA USER (Xóa cứng) ---
        case 'delete':
            check_admin();
            if ($method == 'POST') {
                $data = get_json_input();
                if (empty($data['id'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Thiếu ID người dùng.']);
                }
                $user_id_to_delete = (int)$data['id'];
                 if ($user_id_to_delete == $_SESSION['user_id']) {
                     json_response(403, ['status' => 'error', 'message' => 'Bạn không thể tự xóa chính mình.']);
                }
                // (Nên thêm: kiểm tra xem user này có đơn hàng không trước khi xóa)
                $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
                $stmt->execute([$user_id_to_delete]);
                json_response(200, ['status' => 'success', 'message' => 'Đã xóa người dùng.']);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;

        default:
            json_response(404, ['status' => 'error', 'message' => 'API endpoint không tìm thấy.']);
            break;
    }
} catch (Exception $e) {
    error_log("Error in users.php: " . $e->getMessage());
    json_response(500, ['status' => 'error', 'message' => 'Lỗi server: ' . $e->getMessage()]);
}
?>