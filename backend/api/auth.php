<?php
// backend/api/auth.php (Fixed - Unified Session)

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

// ROUTING
switch ($action) {
    
    // A. ĐĂNG NHẬP
    case 'login':
        if ($method == 'POST') {
            try {
                $data = get_json_input();
                if (!isset($data['email']) || !isset($data['password'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Email và mật khẩu là bắt buộc.']);
                }

                $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
                $stmt->execute([$data['email']]);
                $user = $stmt->fetch();

                if ($user && password_verify($data['password'], $user['password'])) {
                    
                    // LƯU SESSION
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['user_role'] = $user['role'];
                    $_SESSION['user_fullname'] = $user['full_name'];
                    $_SESSION['user_email'] = $user['email'];
                    $_SESSION['user_phone'] = $user['phone'];
                    
                    // Debug log
                    error_log("Login success - Session ID: " . session_id());
                    error_log("Login success - User ID: " . $user['id']);

                    // Trả về thông tin user
                    unset($user['password']);
                    json_response(200, [
                        'status' => 'success',
                        'message' => 'Đăng nhập thành công.',
                        'user' => $user
                    ]);

                } else {
                    json_response(401, ['status' => 'error', 'message' => 'Email hoặc mật khẩu không chính xác.']);
                }
            } catch (Exception $e) {
                json_response(500, ['status' => 'error', 'message' => $e->getMessage()]);
            }
        } else {
            json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
        }
        break;

    // B. ĐĂNG KÝ
    case 'register':
        if ($method == 'POST') {
            try {
                $data = get_json_input();
                if (!isset($data['full_name']) || !isset($data['email']) || !isset($data['password'])) {
                    json_response(400, ['status' => 'error', 'message' => 'Họ tên, email và mật khẩu là bắt buộc.']);
                }
                
                $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
                $stmt->execute([$data['email']]);
                if ($stmt->fetch()) {
                    json_response(409, ['status' => 'error', 'message' => 'Email này đã được sử dụng.']);
                }

                $hashed_password = password_hash($data['password'], PASSWORD_BCRYPT);

                $stmt = $db->prepare("INSERT INTO users (full_name, email, password, phone, role) VALUES (?, ?, ?, ?, 'customer')");
                $stmt->execute([
                    $data['full_name'],
                    $data['email'],
                    $hashed_password,
                    isset($data['phone']) ? $data['phone'] : null
                ]);

                json_response(201, ['status' => 'success', 'message' => 'Đăng ký tài khoản thành công.']);

            } catch (Exception $e) {
                json_response(500, ['status' => 'error', 'message' => $e->getMessage()]);
            }
        } else {
            json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
        }
        break;

    // C. ĐĂNG XUẤT (CUSTOMER)
    case 'logout':
    case 'logout_customer':
        if ($method == 'POST') {
            error_log("Logout - Session ID before destroy: " . session_id());
            session_destroy();
            json_response(200, ['status' => 'success', 'message' => 'Đăng xuất thành công.']);
        } else {
            json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
        }
        break;

    // D. KIỂM TRA PHIÊN (CUSTOMER) - Alias cho 'check'
    case 'check':
    case 'check_customer':
        if ($method == 'GET') {
            error_log("check_customer - Session ID: " . session_id());
            error_log("check_customer - Session data: " . print_r($_SESSION, true));
            
            if (isset($_SESSION['user_id'])) {
                // Lấy thông tin đầy đủ từ DB
                $stmt = $db->prepare("SELECT id, full_name, email, phone, role FROM users WHERE id = ?");
                $stmt->execute([$_SESSION['user_id']]);
                $user = $stmt->fetch();
                
                if ($user) {
                    json_response(200, [
                        'status' => 'success',
                        'user' => $user
                    ]);
                } else {
                    // User không tồn tại trong DB -> Xóa session
                    session_destroy();
                    json_response(401, ['status' => 'error', 'message' => 'Phiên không hợp lệ.']);
                }
            } else {
                json_response(401, ['status' => 'error', 'message' => 'Chưa đăng nhập.']);
            }
        } else {
            json_response(405, ['status' => 'error', 'message' => 'Method Not Allowed']);
        }
        break;

    default:
        json_response(404, ['status' => 'error', 'message' => 'API endpoint không tìm thấy.']);
        break;
}
?>