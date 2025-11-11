<?php
// backend/api/products.php (Bản Hoàn Chỉnh - Đã Bổ Sung Admin CRUD)

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost:8080"); 
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// Bật hiển thị lỗi (để debug)
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

// === HÀM XỬ LÝ UPLOAD ẢNH ===
function handle_image_upload($file_input_name) {
    if (empty($_FILES[$file_input_name]) || $_FILES[$file_input_name]['error'] != UPLOAD_ERR_OK) {
        return null;
    }
    $upload_dir = __DIR__ . '/../../uploads/products/';
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
    $new_file_name = uniqid('prod_') . '_' . time() . '.' . $file_ext;
    $destination = $upload_dir . $new_file_name;
    $allowed_exts = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];
    if (!in_array($file_ext, $allowed_exts) || $file['size'] > 5 * 1024 * 1024) {
       error_log("Upload failed: Invalid extension or size for " . $file_name);
       return null;
    }
    if (move_uploaded_file($file_tmp_name, $destination)) {
        return 'products/' . $new_file_name;
    } else {
         error_log("Upload failed: Could not move file " . $file_name . " to " . $destination);
        return null;
    }
}
// === HẾT HÀM UPLOAD ===


$action = $_GET['action'] ?? 'list';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($action) {

        // --- PUBLIC: LẤY DANH SÁCH (cho khách) ---
        case 'list':
            // ... (code case 'list' của bạn đã đúng, giữ nguyên) ...
            $limit  = max(1, (int)($_GET['limit'] ?? 12));
            $offset = max(0, (int)($_GET['offset'] ?? 0));
            $featured = isset($_GET['featured']) && $_GET['featured'] == '1' ? 1 : null;
            $category_id = isset($_GET['category_id']) ? (int)$_GET['category_id'] : null;
            
            $where = ["p.status = 1"]; 
            $params = [];
            if ($featured !== null) { $where[] = "p.featured = :featured"; $params[':featured'] = $featured; }
            if ($category_id) { $where[] = "p.category_id = :cid"; $params[':cid'] = $category_id; }
            $whereSql = "WHERE " . implode(" AND ", $where);

            $sql = "SELECT p.id, p.name, p.slug, p.price, p.sale_price, p.image, p.unit, c.name AS category_name
                    FROM products p LEFT JOIN categories c ON c.id = p.category_id
                    $whereSql ORDER BY p.featured DESC, p.created_at DESC LIMIT :limit OFFSET :offset";
            
            $stmt = $pdo->prepare($sql);
            foreach ($params as $k => $v) $stmt->bindValue($k, $v);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll();
            json_response(200, ["status" => "success", "data" => $rows]);
            break;

        // --- PUBLIC: LẤY CHI TIẾT (cho khách) ---
        case 'detail':
            // ... (code case 'detail' của bạn đã đúng, giữ nguyên) ...
            $product = null;
            $query = "SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.status = 1 AND ";
            $params = [];
            if (!empty($_GET['id'])) { $query .= "p.id = :id"; $params[':id'] = (int)$_GET['id']; }
            elseif (!empty($_GET['slug'])) { $query .= "p.slug = :slug"; $params[':slug'] = $_GET['slug']; }
            else { json_response(400, ['status' => 'error', 'message' => 'Thiếu id hoặc slug.']); }
            $stmt = $pdo->prepare($query); $stmt->execute($params); $product = $stmt->fetch();
            if ($product) { json_response(200, ['status' => 'success', 'data' => $product]); }
            else { json_response(404, ['status' => 'error', 'message' => 'Không tìm thấy sản phẩm.']); }
            break;

        // --- ADMIN: LẤY TẤT CẢ SẢN PHẨM ---
        case 'admin_list':
            if ($method == 'GET') {
                check_admin(); // BẢO VỆ
                $query = "SELECT p.*, c.name as category_name 
                          FROM products p
                          LEFT JOIN categories c ON p.category_id = c.id
                          ORDER BY p.id DESC";
                $stmt = $pdo->prepare($query);
                $stmt->execute();
                $products = $stmt->fetchAll();
                json_response(200, ['status' => 'success', 'data' => $products]);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;

        // --- ADMIN: TẠO SẢN PHẨM ---
        case 'create':
            if ($method == 'POST') {
                check_admin(); // BẢO VỆ
                $data = $_POST; // Dùng $_POST vì có upload file (multipart/form-data)

                if (empty($data['name']) || empty($data['slug']) || empty($data['category_id']) || empty($data['price'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Tên, slug, danh mục và giá là bắt buộc.']);
                }

                $image_path = handle_image_upload('image');
                if ($image_path === null && isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                    json_response(400, ['status' => 'error', 'message' => 'Upload ảnh thất bại. Kiểm tra định dạng/dung lượng (tối đa 5MB).']);
                }

                $query = "INSERT INTO products (name, slug, category_id, description, `usage`, price, sale_price, stock, unit, featured, status, image)
                          VALUES (:name, :slug, :category_id, :description, :usage, :price, :sale_price, :stock, :unit, :featured, :status, :image)";
                
                $stmt = $pdo->prepare($query);
                $stmt->execute([
                    ':name' => $data['name'],
                    ':slug' => $data['slug'],
                    ':category_id' => (int)$data['category_id'],
                    ':description' => $data['description'] ?? null,
                    ':usage' => $data['usage'] ?? null,
                    ':price' => $data['price'],
                    ':sale_price' => !empty($data['sale_price']) ? $data['sale_price'] : null,
                    ':stock' => !empty($data['stock']) ? (int)$data['stock'] : 0,
                    ':unit' => !empty($data['unit']) ? $data['unit'] : 'Hộp',
                    ':featured' => $data['featured'] ?? 0, // Giá trị từ form là '1' hoặc '0'
                    ':status' => $data['status'] ?? 0,   // Giá trị từ form là '1' hoặc '0'
                    ':image' => $image_path
                ]);
                json_response(201, ['status' => 'success', 'message' => 'Tạo sản phẩm thành công.']);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;

        // --- ADMIN: CẬP NHẬT SẢN PHẨM ---
        case 'update':
            if ($method == 'POST') {
                check_admin(); // BẢO VỆ
                $data = $_POST;
                
                if (empty($data['id'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Thiếu ID sản phẩm.']);
                }
                $product_id = (int)$data['id'];

                $image_path = handle_image_upload('image');
                if ($image_path === null && isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                    json_response(400, ['status' => 'error', 'message' => 'Upload ảnh mới thất bại.']);
                }

                $query = "UPDATE products SET 
                            name = :name, slug = :slug, category_id = :category_id, 
                            description = :description, `usage` = :usage, price = :price, 
                            sale_price = :sale_price, stock = :stock, unit = :unit, 
                            featured = :featured, status = :status";
                $params = [
                    ':name' => $data['name'], ':slug' => $data['slug'],
                    ':category_id' => (int)$data['category_id'],
                    ':description' => $data['description'] ?? null,
                    ':usage' => $data['usage'] ?? null,
                    ':price' => $data['price'],
                    ':sale_price' => !empty($data['sale_price']) ? $data['sale_price'] : null,
                    ':stock' => !empty($data['stock']) ? (int)$data['stock'] : 0,
                    ':unit' => !empty($data['unit']) ? $data['unit'] : 'Hộp',
                    ':featured' => $data['featured'] ?? 0,
                    ':status' => $data['status'] ?? 0,
                    ':id' => $product_id
                ];

                if ($image_path !== null) {
                    $query .= ", image = :image";
                    $params[':image'] = $image_path;
                    // (Thêm code xóa ảnh cũ nếu cần)
                }
                
                $query .= " WHERE id = :id";
                
                $stmt = $pdo->prepare($query);
                $stmt->execute($params);
                json_response(200, ['status' => 'success', 'message' => 'Cập nhật sản phẩm thành công.']);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;
            
        // --- ADMIN: XÓA SẢN PHẨM ---
        case 'delete':
             if ($method == 'POST') {
                check_admin(); // BẢO VỆ
                // Dùng get_json_input vì nút Xóa gửi JSON
                $data = json_decode(file_get_contents('php://input'), true);
                
                if (empty($data['id'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Thiếu ID sản phẩm.']);
                }
                
                // Xóa mềm: Chuyển status = 0
                $query = "UPDATE products SET status = 0 WHERE id = ?";
                $stmt = $pdo->prepare($query);
                $stmt->execute([(int)$data['id']]);
                json_response(200, ['status' => 'success', 'message' => 'Đã xóa (ẩn) sản phẩm.']);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;


        default:
            json_response(404, ['status' => 'error', 'message' => 'API endpoint không tìm thấy.']);
    }
} catch (Exception $e) {
    error_log("Error in products.php: " . $e->getMessage());
    json_response(500, ['status' => 'error', 'message' => 'Lỗi server: ' . $e->getMessage()]);
}
?>