// frontend/assets/js/admin.js (Đã sửa để gọi admin_auth.php)

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("admin-login-form");
  if (loginForm) {
    initAdminLogin();
  }
});

function initAdminLogin() {
  const loginForm = document.getElementById("admin-login-form");
  const messageP = document.getElementById("login-message");

  // Tự động kiểm tra nếu đã đăng nhập admin
  (async () => {
    try {
      // Vẫn dùng auth.php?action=check (vì nó an toàn và dùng chung)
      const response = await apiFetch(`${API_URL}/auth.php?action=check`);
      const result = await response.json();
      if (result.status === "success" && result.user.role === "admin") {
        window.location.href = "index.html"; // Chuyển đến dashboard
      }
    } catch (e) {
      // Không làm gì
    }
  })();

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageP.textContent = "Đang kiểm tra...";
    messageP.style.color = "blue";

    const formData = new FormData(loginForm);
    const data = Object.fromEntries(formData.entries());

    try {
      // *** THAY ĐỔI QUAN TRỌNG: Gọi file admin_auth.php ***
      const response = await apiFetch(
        `${API_URL}/admin_auth.php?action=login`,
        {
          method: "POST",
          body: data,
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        // Kiểm tra lại quyền admin (dù backend đã check)
        if (result.user && result.user.role === "admin") {
          messageP.textContent = "Đăng nhập thành công! Đang chuyển hướng...";
          messageP.style.color = "green";

          setTimeout(() => {
            window.location.href = "index.html";
          }, 1000);
        } else {
          messageP.textContent = "Lỗi: Tài khoản này không có quyền Admin.";
          messageP.style.color = "red";
        }
      } else {
        messageP.textContent = `Lỗi: ${result.message}`;
        messageP.style.color = "red";
      }
    } catch (error) {
      messageP.textContent = `Lỗi kết nối: ${error.message}`;
      messageP.style.color = "red";
    }
  });
}
