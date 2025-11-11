<?php
// backend/api/categories.php (Bản Hoàn Chỉnh - Admin CRUD)

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

// === HÀM CHECK ADMIN ===
function check_admin() {
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
        json_response(403, ['status' => 'error', 'message' => 'Forbidden: Yêu cầu quyền Admin.']);
    }
    return $_SESSION['user_id'];
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

// === HÀM UPLOAD ẢNH (Riêng cho Danh mục) ===
function handle_category_image_upload($file_input_name) {
    if (empty($_FILES[$file_input_name]) || $_FILES[$file_input_name]['error'] != UPLOAD_ERR_OK) {
        return null;
    }
    $upload_dir = __DIR__ . '/../../uploads/categories/'; // Thư mục riêng
    if (!is_dir($upload_dir)) {
        if (!mkdir($upload_dir, 0777, true)) {
             error_log("Upload failed: Could not create directory " . $upload_dir);
             return null;
        }
    }
    $file = $_FILES[$file_input_name];
    $file_tmp_name = $file['tmp_name'];
    $file_name = basename($file['name']);
    $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
    $new_file_name = uniqid('cat_') . '_' . time() . '.' . $file_ext;
    $destination = $upload_dir . $new_file_name;
    $allowed_exts = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];
    if (!in_array($file_ext, $allowed_exts) || $file['size'] > 5 * 1024 * 1024) {
       error_log("Upload failed: Invalid extension or size for " . $file_name);
       return null;
    }
    if (move_uploaded_file($file_tmp_name, $destination)) {
        return 'categories/' . $new_file_name; // Đường dẫn lưu vào DB
    }
    return null;
}
// === HẾT HÀM UPLOAD ===


$action = $_GET['action'] ?? 'list';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($action) {
        
        // --- PUBLIC: LẤY DANH SÁCH (cho khách & admin form) ---
        case 'list':
            if ($method == 'GET') {
                $query = "SELECT id, name, slug FROM categories WHERE status = 1 ORDER BY name ASC";
                $stmt = $pdo->prepare($query);
                $stmt->execute();
                $categories = $stmt->fetchAll();
                json_response(200, ['status' => 'success', 'data' => $categories]);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;
        
        // --- ADMIN: LẤY TẤT CẢ (Kể cả ẩn) ---
        case 'admin_list':
             check_admin();
             if ($method == 'GET') {
                $query = "SELECT * FROM categories ORDER BY id DESC";
                $stmt = $pdo->prepare($query);
                $stmt->execute();
                $categories = $stmt->fetchAll();
                json_response(200, ['status' => 'success', 'data' => $categories]);
             } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;
            
        // --- ADMIN: LẤY CHI TIẾT 1 DANH MỤC ---
        case 'detail':
            check_admin();
            if ($method == 'GET') {
                if (empty($_GET['id'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Thiếu ID danh mục.']);
                }
                $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
                $stmt->execute([(int)$_GET['id']]);
                $category = $stmt->fetch();
                if ($category) {
                    json_response(200, ['status' => 'success', 'data' => $category]);
                } else {
                    json_response(404, ['status' => 'error', 'message' => 'Không tìm thấy danh mục.']);
                }
            } else {
                 json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;

        // --- ADMIN: TẠO DANH MỤC MỚI ---
        case 'create':
            check_admin();
            if ($method == 'POST') {
                $data = $_POST;
                if (empty($data['name']) || empty($data['slug'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Tên và slug là bắt buộc.']);
                }
                $image_path = handle_category_image_upload('image');
                $query = "INSERT INTO categories (name, slug, image, status) VALUES (?, ?, ?, ?)";
                $stmt = $pdo->prepare($query);
                $stmt->execute([
                    $data['name'],
                    $data['slug'],
                    $image_path,
                    isset($data['status']) ? (int)$data['status'] : 0 // Lấy từ checkbox
                ]);
                json_response(201, ['status' => 'success', 'message' => 'Tạo danh mục thành công.']);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;

        // --- ADMIN: CẬP NHẬT DANH MỤC ---
        case 'update':
            check_admin();
            if ($method == 'POST') {
                $data = $_POST;
                if (empty($data['id'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Thiếu ID danh mục.']);
                }
                $id = (int)$data['id'];
                $image_path = handle_category_image_upload('image');
                
                $query = "UPDATE categories SET name = ?, slug = ?, status = ?";
                $params = [
                    $data['name'],
                    $data['slug'],
                    isset($data['status']) ? (int)$data['status'] : 0 // Lấy từ checkbox
                ];
                
                if ($image_path !== null) {
                    $query .= ", image = ?";
                    $params[] = $image_path;
                }
                
                $query .= " WHERE id = ?";
                $params[] = $id;
                
                $stmt = $pdo->prepare($query);
                $stmt->execute($params);
                json_response(200, ['status' => 'success', 'message' => 'Cập nhật danh mục thành công.']);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;

        // --- ADMIN: XÓA DANH MỤC (Soft Delete) ---
        case 'delete':
            check_admin();
            if ($method == 'POST') {
                $data = json_decode(file_get_contents('php://input'), true); // Xóa dùng JSON
                if (empty($data['id'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Thiếu ID danh mục.']);
                }
                // Xóa mềm: Chuyển status = 0
                $stmt = $pdo->prepare("UPDATE categories SET status = 0 WHERE id = ?");
                $stmt->execute([(int)$data['id']]);
                json_response(200, ['status' => 'success', 'message' => 'Đã xóa (ẩn) danh mục.']);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;


        default:
            json_response(404, ['status' => 'error', 'message' => 'API endpoint không tìm thấy.']);
            break;
    }
} catch (Exception $e) {
    error_log("Error in categories.php: " . $e->getMessage());
    json_response(500, ['status' => 'error', 'message' => $e->getMessage()]);
}
?>