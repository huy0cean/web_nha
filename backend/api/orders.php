<?php
// backend/api/orders.php
// (ĐÃ SỬA LẠI ĐỂ CHẤP NHẬN 'customer_name' VÀ 'customer_phone' TỪ FORM)

require_once '../config/database.php';
require_once '../config/helpers.php';

// KHỞI TẠO SESSION THỐNG NHẤT
init_session();

// BẬT CORS
enable_cors();

$database = new Database();
$db = $database->connect();

$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($action) {
        
        // CREATE ORDER
        case 'create':
            if ($method == 'POST') {
                error_log("=== ORDER CREATE START ===");
                
                $user_id = check_login();
                error_log("User ID: " . $user_id);
                
                $data = get_json_input();
                error_log("Request data: " . print_r($data, true));
                
                // ✅ SỬA LỖI: Đổi lại thành customer_name và customer_phone
                // VALIDATION: Check required fields
                if (empty($data['customer_name']) || empty($data['customer_phone']) || empty($data['address'])) {
                    error_log("ERROR: Missing required fields (customer_name, customer_phone, address)");
                    json_response(400, ['status' => 'error', 'message' => 'Vui lòng cung cấp đầy đủ tên, SĐT và địa chỉ.']);
                }
                
                // KIỂM TRA: Có items từ frontend không?
                $cart_items = [];
                
                if (!empty($data['items']) && is_array($data['items'])) {
                    // SỬ DỤNG ITEMS TỪ FRONTEND
                    error_log("Using items from frontend");
                    $cart_items = $data['items'];
                } else {
                    // NẾU KHÔNG CÓ, THỬ LẤY TỪ DATABASE (fallback)
                    error_log("No items from frontend, trying database...");
                    
                    $stmt_cart = $db->prepare("
                        SELECT c.product_id, c.quantity, p.name, p.image, 
                               COALESCE(p.sale_price, p.price) as price, p.stock
                        FROM cart c
                        JOIN products p ON c.product_id = p.id
                        WHERE c.user_id = ? AND p.status = 1 AND p.stock > 0
                    ");
                    $stmt_cart->execute([$user_id]);
                    $cart_items = $stmt_cart->fetchAll();
                    error_log("Cart items from DB: " . count($cart_items));
                }
                
                // VALIDATION: Check if cart is empty
                if (empty($cart_items)) {
                    error_log("ERROR: No cart items available");
                    json_response(400, ['status' => 'error', 'message' => 'Giỏ hàng của bạn đang trống hoặc sản phẩm không khả dụng.']);
                }
                
                $db->beginTransaction();
                try {
                    // STEP 1: Calculate total
                    $total_amount = 0;
                    foreach ($cart_items as $item) {
                        $item_price = isset($item['price']) ? floatval($item['price']) : 0;
                        $item_quantity = isset($item['quantity']) ? intval($item['quantity']) : 0;
                        $total_amount += $item_price * $item_quantity;
                    }
                    
                    error_log("Total amount: " . $total_amount);

                    // STEP 2: Create order
                    // Bỏ order_code ra khỏi INSERT ban đầu để tránh duplicate key
                    $stmt_order = $db->prepare("
                        INSERT INTO orders 
                        (user_id, customer_name, customer_phone, customer_email, address, note, total_amount, payment_method) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    
                    // ✅ SỬA LỖI: Đổi lại thành customer_name và customer_phone
                    $stmt_order->execute([
                        $user_id, 
                        $data['customer_name'], // Sử dụng customer_name
                        $data['customer_phone'], // Sử dụng customer_phone
                        isset($data['customer_email']) ? $data['customer_email'] : null,
                        $data['address'], 
                        isset($data['note']) ? $data['note'] : null,
                        $total_amount, 
                        isset($data['payment_method']) ? $data['payment_method'] : 'cod'
                    ]);
                    $order_id = $db->lastInsertId();
                    error_log("Order created with ID: " . $order_id);

                    // Tạo order_code từ ID và UPDATE (100% không trùng)
                    $order_code = 'GB-' . str_pad($order_id, 6, '0', STR_PAD_LEFT);
                    $stmt_update_code = $db->prepare("UPDATE orders SET order_code = ? WHERE id = ?");
                    $stmt_update_code->execute([$order_code, $order_id]);
                    error_log("Order code generated and updated: " . $order_code);
                    
                    // STEP 3: Add order items and update stock
                    $stmt_item = $db->prepare("
                        INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, subtotal) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ");
                    $stmt_stock = $db->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
                    
                    foreach ($cart_items as $item) {
                        $product_id = isset($item['product_id']) ? intval($item['product_id']) : 0;
                        $name = isset($item['name']) ? $item['name'] : 'Unknown';
                        $image = isset($item['image']) ? $item['image'] : null;
                        $price = isset($item['price']) ? floatval($item['price']) : 0;
                        $quantity = isset($item['quantity']) ? intval($item['quantity']) : 0;
                        $subtotal = $price * $quantity;
                        
                        $stmt_item->execute([
                            $order_id, 
                            $product_id, 
                            $name, 
                            $image, 
                            $price, 
                            $quantity, 
                            $subtotal
                        ]);
                        
                        // Update stock
                        $stmt_stock->execute([$quantity, $product_id]);
                        error_log("Updated stock for product ID: " . $product_id);
                    }

                    // STEP 4: Clear cart (only if items were from database)
                    if (empty($data['items'])) {
                        $stmt_delete = $db->prepare("DELETE FROM cart WHERE user_id = ?");
                        $stmt_delete->execute([$user_id]);
                        error_log("Cart cleared for user: " . $user_id);
                    } else {
                        // If items from frontend, clear specific products
                        foreach ($cart_items as $item) {
                            $stmt_delete = $db->prepare("DELETE FROM cart WHERE user_id = ? AND product_id = ?");
                            $stmt_delete->execute([$user_id, $item['product_id']]);
                        }
                        error_log("Specific cart items cleared for user: " . $user_id);
                    }
                    
                    // STEP 5: Commit transaction
                    $db->commit();
                    error_log("=== ORDER CREATE SUCCESS ===");
                    
                    json_response(201, [
                        'status' => 'success', 
                        'message' => 'Đặt hàng thành công.', 
                        'order_id' => $order_id, 
                        'order_code' => $order_code
                    ]);

                } catch (Exception $e) {
                    $db->rollBack();
                    error_log("ERROR: Order creation exception: " . $e->getMessage());
                    // Trả về lỗi SQL cụ thể để debug
                    json_response(500, ['status' => 'error', 'message' => 'Lỗi server khi tạo đơn hàng: ' . $e->getMessage()]);
                }
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;

        // LIST ORDERS (Customer)
        case 'list':
            if ($method == 'GET') {
                $user_id = check_login();
                
                $query = "SELECT id, order_code, total_amount, status, created_at 
                          FROM orders 
                          WHERE user_id = ? 
                          ORDER BY created_at DESC";
                $stmt = $db->prepare($query);
                $stmt->execute([$user_id]);
                $orders = $stmt->fetchAll();
                json_response(200, ['status' => 'success', 'data' => $orders]);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;

        // ORDER DETAIL (Customer)
        case 'detail':
            if ($method == 'GET') {
                $user_id = check_login();
                
                if (empty($_GET['id'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Thiếu ID của đơn hàng.']);
                }
                $order_id = (int)$_GET['id'];
                
                $stmt_order = $db->prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?");
                $stmt_order->execute([$order_id, $user_id]);
                $order_details = $stmt_order->fetch();

                if (!$order_details) {
                    json_response(404, ['status' => 'error', 'message' => 'Không tìm thấy đơn hàng hoặc bạn không có quyền xem.']);
                }

                $stmt_items = $db->prepare("SELECT * FROM order_items WHERE order_id = ?");
                $stmt_items->execute([$order_id]);
                $items = $stmt_items->fetchAll();
                $order_details['items'] = $items;

                json_response(200, ['status' => 'success', 'data' => $order_details]);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;

        // ADMIN: LIST ALL ORDERS
        case 'admin_list':
            if ($method == 'GET') {
                check_admin();
                
                $query = "SELECT id, order_code, customer_name, total_amount, status, created_at 
                          FROM orders 
                          ORDER BY created_at DESC";
                $stmt = $db->prepare($query);
                $stmt->execute();
                $orders = $stmt->fetchAll();
                json_response(200, ['status' => 'success', 'data' => $orders]);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;

        // ADMIN: ORDER DETAIL
        case 'admin_detail':
            if ($method == 'GET') {
                check_admin();
                
                if (empty($_GET['id'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Thiếu ID của đơn hàng.']);
                }
                $order_id = (int)$_GET['id'];

                $stmt_order = $db->prepare("SELECT * FROM orders WHERE id = ?");
                $stmt_order->execute([$order_id]);
                $order_details = $stmt_order->fetch();

                if (!$order_details) {
                    json_response(404, ['status' => 'error', 'message' => 'Không tìm thấy đơn hàng.']);
                }

                $stmt_items = $db->prepare("SELECT * FROM order_items WHERE order_id = ?");
                $stmt_items->execute([$order_id]);
                $items = $stmt_items->fetchAll();
                $order_details['items'] = $items;

                json_response(200, ['status' => 'success', 'data' => $order_details]);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;

        // ADMIN: UPDATE ORDER STATUS
        case 'update_status':
            if ($method == 'POST') {
                check_admin();
                $data = get_json_input();
                
                if (empty($data['id']) || empty($data['status'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Thiếu ID đơn hàng hoặc trạng thái mới.']);
                }
                
                $stmt = $db->prepare("UPDATE orders SET status = ? WHERE id = ?");
                $stmt->execute([$data['status'], (int)$data['id']]);
                
                json_response(200, ['status' => 'success', 'message' => 'Cập nhật trạng thái đơn hàng thành công.']);
            } else {
                json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
            }
            break;

        default:
            json_response(404, ['status' => 'error', 'message' => 'API endpoint không tìm thấy.']);
            break;
    }
} catch (Exception $e) {
    error_log("Orders API Exception: " . $e->getMessage());
    json_response(500, ['status' => 'error', 'message' => $e->getMessage()]);
}
?>