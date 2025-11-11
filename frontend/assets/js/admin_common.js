// frontend/assets/js/admin_common.js
// File này được dùng chung cho tất cả các trang trong /admin/ (trừ login.html)

document.addEventListener("DOMContentLoaded", () => {
  // 1. Kiểm tra đăng nhập
  // 2. Tải thông tin user vào sidebar
  checkAdminLoginAndLoadSidebar();
});

async function checkAdminLoginAndLoadSidebar() {
  // *** SỬA LỖI: Tìm đúng ID là "admin-sidebar-user" ***
  const userInfoDiv = document.getElementById("admin-sidebar-user");

  if (!userInfoDiv) {
    console.error("Không tìm thấy div #admin-sidebar-user");
    return; // Không phải trang admin có sidebar
  }

  userInfoDiv.innerHTML = "<p>Đang xác thực...</p>"; // Cập nhật trạng thái

  try {
    const response = await apiFetch(`${API_URL}/auth.php?action=check`);
    const result = await response.json();

    if (result.status === "success" && result.user.role === "admin") {
      // Đăng nhập hợp lệ và là admin
      userInfoDiv.innerHTML = `
                <p>Xin chào, <strong id="admin-name">${result.user.full_name}</strong></p>
                <a href="#" id="admin-logout-btn">Đăng xuất</a>
            `;
      // Gắn sự kiện cho nút logout
      document
        .getElementById("admin-logout-btn")
        .addEventListener("click", async (e) => {
          e.preventDefault();
          await apiFetch(`${API_URL}/auth.php?action=logout`, {
            method: "POST",
          });
          alert("Đã đăng xuất.");
          window.location.href = "login.html"; // Quay về trang login admin
        });
    } else {
      // Không phải admin hoặc chưa đăng nhập
      redirectToAdminLogin();
    }
  } catch (error) {
    console.error("Lỗi kiểm tra Admin:", error);
    redirectToAdminLogin();
  }
}

function redirectToAdminLogin() {
  // Bỏ alert để tránh "nhảy giật"
  console.error("Redirecting to login: No valid admin session.");
  window.location.href = "login.html";
}
