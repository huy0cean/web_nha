<?php
// backend/config/helpers.php (Fixed - Unified Session Management)

if (basename($_SERVER['PHP_SELF']) == basename(__FILE__)) {
    die('Access Denied');
}

// ============================================
// KHỞI TẠO SESSION THỐNG NHẤT
// ============================================
function init_session() {
    if (session_status() == PHP_SESSION_NONE) {
        // Cấu hình session cookie THỐNG NHẤT cho toàn bộ hệ thống
        session_set_cookie_params([
            'lifetime' => 86400,      // 24 giờ
            'path' => '/',
            'domain' => '',           // Để trống = domain hiện tại
            'secure' => false,        // true nếu dùng HTTPS
            'httponly' => true,       // Bảo mật: JS không đọc được
            'samesite' => 'Lax'       // Lax hoặc None (None cần HTTPS)
        ]);
        session_start();
        
        // Debug: Log session info
        error_log("Session started - ID: " . session_id());
        error_log("Session data: " . print_r($_SESSION, true));
    }
}

// ============================================
// BẬT CORS
// ============================================
function enable_cors() {
    // Cho phép frontend từ localhost:8080
    header("Access-Control-Allow-Origin: http://localhost:8080"); 
    
    // QUAN TRỌNG: Cho phép gửi cookie/session
    header("Access-Control-Allow-Credentials: true"); 
    
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    
    // Content-Type JSON
    header("Content-Type: application/json; charset=UTF-8");

    // Xử lý preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

// ============================================
// TRẢ VỀ JSON RESPONSE
// ============================================
function json_response($code, $data) {
    http_response_code($code);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

// ============================================
// LẤY JSON INPUT
// ============================================
function get_json_input() {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true); 
    if (json_last_error() !== JSON_ERROR_NONE) {
        json_response(400, ['status' => 'error', 'message' => 'Invalid JSON input']);
    }
    return $data;
}

// ============================================
// KIỂM TRA ĐĂNG NHẬP (CUSTOMER)
// ============================================
function check_login() {
    init_session(); // Đảm bảo session đã start
    
    error_log("check_login() - Session ID: " . session_id());
    error_log("check_login() - user_id: " . (isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 'NOT SET'));
    
    if (!isset($_SESSION['user_id'])) {
        json_response(401, ['status' => 'error', 'message' => 'Unauthorized. Vui lòng đăng nhập.']);
    }
    
    return $_SESSION['user_id']; 
}

// ============================================
// KIỂM TRA ADMIN
// ============================================
function check_admin() {
    $user_id = check_login(); // Đã bao gồm init_session()
    
    if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] != 'admin') {
         json_response(403, ['status' => 'error', 'message' => 'Forbidden. Bạn không có quyền Admin.']);
    }
    
    return $user_id;
}
?>