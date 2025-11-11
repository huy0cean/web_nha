<?php
// backend/api/cart.php (Fixed - Unified Session)

require_once '../config/database.php';
require_once '../config/helpers.php';

// KHỞI TẠO SESSION THỐNG NHẤT
init_session();

// BẬT CORS
enable_cors();

// KẾT NỐI DATABASE
$database = new Database();
$db = $database->connect();

$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($action) {
        
        // A. LẤY GIỎ HÀNG
        case 'get':
            if ($method == 'GET') {
                $user_id = check_login();
                
                error_log("cart.php get - User ID: " . $user_id);
                
                $query = "SELECT c.product_id, c.quantity, p.name, p.slug, p.image, p.price, p.sale_price, p.stock
                          FROM cart c
                          JOIN products p ON c.product_id = p.id
                          WHERE c.user_id = ? AND p.status = 1";
                
                $stmt = $db->prepare($query);
                $stmt->execute([$user_id]);
                $cart_items = $stmt->fetchAll();
                
                error_log("cart.php get - Items found: " . count($cart_items));

                json_response(200, ['status' => 'success', 'data' => $cart_items]);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;

        // B. THÊM SẢN PHẨM VÀO GIỎ
        case 'add':
            if ($method == 'POST') {
                $user_id = check_login();
                
                error_log("cart.php add - User ID: " . $user_id);
                
                $data = get_json_input();
                
                if (empty($data['product_id']) || empty($data['quantity'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Thiếu product_id hoặc quantity.']);
                }
                
                $product_id = (int)$data['product_id'];
                $quantity = (int)$data['quantity'];
                
                error_log("cart.php add - Product ID: $product_id, Quantity: $quantity");

                $query = "INSERT INTO cart (user_id, product_id, quantity)
                          VALUES (?, ?, ?)
                          ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)";
                
                $stmt = $db->prepare($query);
                $stmt->execute([$user_id, $product_id, $quantity]);
                
                error_log("cart.php add - Success");

                json_response(200, ['status' => 'success', 'message' => 'Đã thêm/cập nhật sản phẩm trong giỏ hàng.']);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;

        // C. CẬP NHẬT SỐ LƯỢNG
        case 'update':
            if ($method == 'POST') {
                $user_id = check_login();
                $data = get_json_input();
                
                if (empty($data['product_id']) || !isset($data['quantity'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Thiếu product_id hoặc quantity.']);
                }
                
                $product_id = (int)$data['product_id'];
                $quantity = (int)$data['quantity'];
                
                if ($quantity <= 0) {
                     $stmt = $db->prepare("DELETE FROM cart WHERE user_id = ? AND product_id = ?");
                     $stmt->execute([$user_id, $product_id]);
                } else {
                    $stmt = $db->prepare("UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?");
                    $stmt->execute([$quantity, $user_id, $product_id]);
                }

                json_response(200, ['status' => 'success', 'message' => 'Đã cập nhật giỏ hàng.']);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;
            
        // D. XÓA SẢN PHẨM
        case 'remove':
             if ($method == 'POST') {
                $user_id = check_login();
                $data = get_json_input();
                
                if (empty($data['product_id'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Thiếu product_id.']);
                }
                
                $product_id = (int)$data['product_id'];
                
                $stmt = $db->prepare("DELETE FROM cart WHERE user_id = ? AND product_id = ?");
                $stmt->execute([$user_id, $product_id]);

                json_response(200, ['status' => 'success', 'message' => 'Đã xóa sản phẩm khỏi giỏ hàng.']);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;

        default:
            json_response(404, ['status' => 'error', 'message' => 'API endpoint không tìm thấy.']);
            break;
    }
} catch (Exception $e) {
    error_log("cart.php error: " . $e->getMessage());
    json_response(500, ['status' => 'error', 'message' => $e->getMessage()]);
}
?>