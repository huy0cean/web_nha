<?php
/**
 * API: posts.php
 * Dùng cho blog và tin tức trong website Nhà Thuốc GB
 */

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost:8080");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// === DEBUG MODE ===
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

// === KẾT NỐI DATABASE ===
$DB_HOST = "127.0.0.1";
$DB_PORT = "3306"; // Cổng MySQL của XAMPP
$DB_NAME = "nhathuocgb";
$DB_USER = "root";
$DB_PASS = "";

try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (Exception $e) {
    json_response(500, ["status" => "error", "message" => "Lỗi kết nối CSDL: " . $e->getMessage()]);
}

// === ROUTER ===
$action = $_GET['action'] ?? 'list';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($action) {
        // --- DANH SÁCH BÀI VIẾT ---
        case 'list':
            if ($method === 'GET') {
                $query = "SELECT id, title, slug, image, excerpt, created_at
                          FROM posts
                          WHERE status = 'published'
                          ORDER BY created_at DESC";

                // ✅ FIX lỗi LIMIT (không dùng ? trong LIMIT)
                if (!empty($_GET['limit'])) {
                    $limit = abs((int)$_GET['limit']);
                    if ($limit > 0) {
                        $query .= " LIMIT $limit"; // an toàn vì đã ép kiểu int
                    }
                }

                $stmt = $pdo->query($query);
                $posts = $stmt->fetchAll();

                json_response(200, ["status" => "success", "data" => $posts]);
            } else {
                json_response(405, ["status" => "error", "message" => "Phương thức không được phép."]);
            }
            break;

        // --- CHI TIẾT BÀI VIẾT ---
        case 'detail':
            if ($method === 'GET') {
                if (empty($_GET['slug'])) {
                    json_response(400, ["status" => "error", "message" => "Thiếu slug bài viết."]);
                }

                $stmt = $pdo->prepare("SELECT * FROM posts WHERE status = 'published' AND slug = ?");
                $stmt->execute([$_GET['slug']]);
                $post = $stmt->fetch();

                if ($post) {
                    json_response(200, ["status" => "success", "data" => $post]);
                } else {
                    json_response(404, ["status" => "error", "message" => "Không tìm thấy bài viết."]);
                }
            } else {
                json_response(405, ["status" => "error", "message" => "Phương thức không được phép."]);
            }
            break;

        default:
            json_response(404, ["status" => "error", "message" => "API endpoint không tồn tại."]);
    }
} catch (PDOException $e) {
    json_response(500, ["status" => "error", "message" => "SQL Error: " . $e->getMessage()]);
} catch (Exception $e) {
    json_response(500, ["status" => "error", "message" => "Server Error: " . $e->getMessage()]);
}
