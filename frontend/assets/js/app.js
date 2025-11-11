// frontend/assets/js/app.js (Bản Hoàn Chỉnh - ĐÃ SỬA LỖI)

// ==========================================================
// 1. CẤU HÌNH
// ==========================================================
const API_URL = "/nhathuocgb/backend/api";

/**
 * Hàm 'fetch' tùy chỉnh, tự động thêm 'credentials' VÀ CHỐNG CACHE
 */
async function apiFetch(url, options = {}) {
  const defaultOptions = {
    credentials: "include",
    ...options,
  };

  let fetchUrl = url;

  if (!options.method || options.method.toUpperCase() === "GET") {
    const cacheBuster = `_cache=${new Date().getTime()}`;
    fetchUrl += (url.includes("?") ? "&" : "?") + cacheBuster;
  }

  if (
    options.body &&
    typeof options.body === "object" &&
    !(options.body instanceof FormData)
  ) {
    defaultOptions.headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };
    defaultOptions.body = JSON.stringify(options.body);
  }

  return fetch(fetchUrl, defaultOptions);
}

/**
 * Hàm tải các component (header, footer)
 */
async function loadComponent(url, elementId) {
  try {
    const componentUrl = `/nhathuocgb/frontend/${url}`;
    const response = await fetch(componentUrl);
    if (!response.ok) throw new Error(`Could not fetch ${componentUrl}`);
    const html = await response.text();
    const placeholder = document.getElementById(elementId);

    if (placeholder) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      while (tempDiv.firstChild) {
        placeholder.parentNode.insertBefore(tempDiv.firstChild, placeholder);
      }
      placeholder.parentNode.removeChild(placeholder);
    }
  } catch (error) {
    console.error(`Error loading component ${url}:`, error);
  }
}

/**
 * Hàm định dạng tiền tệ (VND)
 */
function formatCurrency(amount) {
  const numericAmount = Number(amount);
  if (isNaN(numericAmount)) {
    return "Invalid Price";
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(numericAmount);
}

// ==========================================================
// 2. CÁC HÀM HỖ TRỢ TOÀN CỤC (GLOBAL)
// ==========================================================

/**
 * Hàm chuyển hướng về login (cho khách)
 */
function redirectToLogin(message = "Vui lòng đăng nhập.") {
  alert(message);
  window.location.href = "login.html";
}

/**
 * Hàm kiểm tra trạng thái đăng nhập (KHÁCH HÀNG)
 * Sẽ được gọi tự động trên MỌI trang khách.
 */
async function checkAuthStatus() {
  const authLink = document.getElementById("auth-link");
  const userMenu = document.getElementById("user-menu");

  // Nếu không tìm thấy header (ví dụ: trang admin), thì bỏ qua
  if (!authLink || !userMenu) {
    // Thử lại sau 50ms, có thể header chưa tải xong
    await new Promise((resolve) => setTimeout(resolve, 50));
    const authLinkRetry = document.getElementById("auth-link");
    const userMenuRetry = document.getElementById("user-menu");
    if (!authLinkRetry || !userMenuRetry) {
      console.log("Không tìm thấy header, bỏ qua checkAuthStatus");
      return;
    }
    // Nếu tìm thấy, tiếp tục ở bên dưới
  }

  try {
    const response = await apiFetch(
      `${API_URL}/auth.php?action=check_customer`
    );
    const result = await response.json();
    const userDisplayName = document.getElementById("user-display-name");
    const logoutButton = document.getElementById("logout-button");

    // Đợi các element trong dropdown load xong
    if (!userDisplayName || !logoutButton) {
      console.log("Đang đợi dropdown... thử lại sau 50ms");
      await new Promise((resolve) => setTimeout(resolve, 50));
      await checkAuthStatus(); // Gọi lại chính nó
      return;
    }

    if (result.status === "success" && result.user) {
      authLink.style.display = "none";
      userMenu.style.display = "flex";
      userDisplayName.textContent = result.user.full_name || result.user.email;
      if (!logoutButton.dataset.listenerAttached) {
        logoutButton.addEventListener("click", handleLogout);
        logoutButton.dataset.listenerAttached = "true";
      }
    } else {
      authLink.style.display = "flex";
      userMenu.style.display = "none";
    }
  } catch (error) {
    // Lỗi 401 (chưa đăng nhập) là bình thường, không cần log
    if (error.response && error.response.status !== 401) {
      console.error("Error checking auth status:", error);
    }
    if (document.getElementById("auth-link"))
      document.getElementById("auth-link").style.display = "flex";
    if (document.getElementById("user-menu"))
      document.getElementById("user-menu").style.display = "none";
  }
}

/**
 * Hàm xử lý logout (KHÁCH HÀNG)
 */
async function handleLogout(e) {
  if (e) e.preventDefault();
  try {
    const logoutResponse = await apiFetch(
      `${API_URL}/auth.php?action=logout_customer`,
      { method: "POST" }
    );
    const logoutResult = await logoutResponse.json();
    if (logoutResult.status === "success") {
      alert("Đăng xuất thành công!");
      window.location.href = "index.html"; // Về trang chủ sau khi logout
    } else {
      alert("Đăng xuất thất bại: " + logoutResult.message);
    }
  } catch (error) {
    alert("Lỗi kết nối khi đăng xuất.");
  }
}

/**
 * Hàm tải danh mục vào dropdown header
 * Sẽ được gọi tự động trên MỌI trang khách.
 */
async function loadCategoriesDropdown() {
  const dropdownContent = document.getElementById("category-dropdown");
  if (!dropdownContent) {
    // Thử lại nếu header chưa tải xong
    await new Promise((resolve) => setTimeout(resolve, 100));
    await loadCategoriesDropdown();
    return;
  }
  try {
    const response = await apiFetch(`${API_URL}/categories.php?action=list`);
    const result = await response.json();
    if (result.status === "success" && result.data.length > 0) {
      dropdownContent.innerHTML = "";
      result.data.forEach((category) => {
        const link = document.createElement("a");
        link.href = `products.html?category_id=${category.id}`;
        link.textContent = category.name;
        dropdownContent.appendChild(link);
      });
    } else {
      dropdownContent.innerHTML = '<a href="#">Không có danh mục.</a>';
    }
  } catch (error) {
    console.error("Lỗi khi tải danh mục:", error);
    dropdownContent.innerHTML = '<a href="#">Lỗi tải danh mục.</a>';
  }
}

// ==========================================================
// 3. KHỞI CHẠY KHI TẢI TRANG
// ==========================================================
document.addEventListener("DOMContentLoaded", async () => {
  const isAdminPage = window.location.pathname.includes("/admin/");

  if (!isAdminPage) {
    // 1. Tải Header/Footer
    await Promise.all([
      loadComponent("components/header.html", "main-header"),
      loadComponent("components/footer.html", "main-footer"),
    ]);

    // 2. Tự động chạy các hàm chung cho MỌI trang khách
    await checkAuthStatus();
    await loadCategoriesDropdown();
  }

  // 3. TÌM HÀM INIT CỦA TRANG HIỆN TẠI ĐỂ CHẠY
  if (document.getElementById("featured-products-grid")) {
    if (typeof initHome === "function") {
      initHome();
    }
  } else if (document.getElementById("login-form")) {
    if (document.getElementById("admin-login-form")) {
      // (admin.js sẽ xử lý)
    } else {
      if (typeof initLogin === "function") {
        initLogin();
      }
    }
  } else if (document.getElementById("products-list-grid")) {
    if (typeof initProductsPage === "function") {
      initProductsPage();
    }
  } else if (document.getElementById("product-detail-content")) {
    if (typeof initProductDetailPage === "function") {
      initProductDetailPage();
    }
  } else if (document.getElementById("cart-content")) {
    if (typeof initCartPage === "function") {
      initCartPage();
    }
  } else if (document.getElementById("checkout-form")) {
    if (typeof initCheckoutPage === "function") {
      initCheckoutPage();
    }
  } else if (document.getElementById("user-info-section")) {
    if (typeof initProfilePage === "function") {
      initProfilePage();
    }
  } else if (document.getElementById("order-detail-content")) {
    if (isAdminPage) {
      // (admin_order_detail.js sẽ xử lý)
      if (typeof initAdminOrderDetail === "function") {
        initAdminOrderDetail();
      }
    } else {
      // Đây là trang order-detail.html của khách
      if (typeof initOrderDetailPage === "function") {
        initOrderDetailPage();
      }
    }
  } else if (document.getElementById("blog-posts-grid")) {
    if (typeof initBlogPage === "function") {
      initBlogPage();
    }
  } else if (document.getElementById("post-content-area")) {
    if (typeof initPostDetailPage === "function") {
      initPostDetailPage();
    }
  }

  // --- ADMIN PAGES ---
  else if (document.getElementById("admin-dashboard")) {
    // (admin_common.js sẽ xử lý)
  } else if (document.getElementById("admin-product-manager")) {
    // (admin_products.js sẽ xử lý)
  } else if (document.getElementById("admin-order-manager")) {
    // (admin_orders.js sẽ xử lý)
  } else if (document.getElementById("admin-category-manager")) {
    // (admin_categories.js sẽ xử lý)
  } else if (document.getElementById("admin-posts-manager")) {
    // (admin_posts.js sẽ xử lý)
  } else if (document.getElementById("admin-users-manager")) {
    // (admin_users.js sẽ xử lý)
  }
});

// ==========================================================
// 4. HÀM XỬ LÝ TRANG LOGIN (Khách hàng)
// ==========================================================
function initLogin() {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const showRegisterBtn = document.getElementById("show-register-form");
  const showLoginBtn = document.getElementById("show-login-form");
  const loginMessage = document.getElementById("login-message");
  const registerMessage = document.getElementById("register-message");

  if (!showRegisterBtn || !loginForm || !registerForm || !showLoginBtn) return;

  showRegisterBtn.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.style.display = "none";
    registerForm.style.display = "block";
  });
  showLoginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.style.display = "block";
    registerForm.style.display = "none";
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginMessage.textContent = "Đang xử lý...";
    loginMessage.style.color = "blue";
    const formData = new FormData(loginForm);
    const data = Object.fromEntries(formData.entries());
    try {
      const response = await apiFetch(`${API_URL}/auth.php?action=login`, {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (result.status === "success") {
        loginMessage.textContent = "Đăng nhập thành công! Đang chuyển hướng...";
        loginMessage.style.color = "green";
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1500);
      } else {
        loginMessage.textContent = `Lỗi: ${result.message}`;
        loginMessage.style.color = "red";
      }
    } catch (error) {
      loginMessage.textContent = `Lỗi kết nối: ${error.message}`;
      loginMessage.style.color = "red";
    }
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    registerMessage.textContent = "Đang xử lý...";
    registerMessage.style.color = "blue";
    const formData = new FormData(registerForm);
    const data = Object.fromEntries(formData.entries());
    if (data.password !== data.confirm_password) {
      registerMessage.textContent = "Lỗi: Mật khẩu không khớp!";
      registerMessage.style.color = "red";
      return;
    }
    try {
      const response = await apiFetch(`${API_URL}/auth.php?action=register`, {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (result.status === "success") {
        registerMessage.textContent = "Đăng ký thành công! Vui lòng đăng nhập.";
        registerMessage.style.color = "green";
        setTimeout(() => {
          loginForm.style.display = "block";
          registerForm.style.display = "none";
          loginMessage.textContent = "Vui lòng đăng nhập với tài khoản mới.";
          loginMessage.style.color = "green";
        }, 2000);
      } else {
        registerMessage.textContent = `Lỗi: ${result.message}`;
        registerMessage.style.color = "red";
      }
    } catch (error) {
      registerMessage.textContent = `Lỗi kết nối: ${error.message}`;
      registerMessage.style.color = "red";
    }
  });
}

// ==========================================================
// 5. HÀM XỬ LÝ TRANG CHECKOUT (Thanh toán)
// ==========================================================
// LƯU Ý: checkout.html đã có logic riêng, hàm này chỉ là placeholder
function initCheckoutPage() {
  console.log(
    "Trang checkout (initCheckoutPage) đã được gọi - Logic trong checkout.html"
  );
  // Logic chạy trực tiếp trong checkout.html, không cần thêm gì
}

// ==========================================================
// 6. CÁC HÀM INIT KHÁC (PLACEHOLDERS)
// ==========================================================

function initHome() {
  console.log("Trang chủ (initHome) đã được gọi.");
  // TODO: Code tải sản phẩm nổi bật, v.v...
}

function initProductsPage() {
  console.log("Trang sản phẩm (initProductsPage) đã được gọi.");
  // TODO: Code tải danh sách sản phẩm, phân trang, filter...
}

function initProductDetailPage() {
  console.log("Trang chi tiết SP (initProductDetailPage) đã được gọi.");
  // TODO: Code tải chi tiết 1 sản phẩm, xử lý "Thêm vào giỏ hàng"...
}

function initCartPage() {
  console.log("Trang giỏ hàng (initCartPage) đã được gọi.");
  // TODO: Code tải chi tiết giỏ hàng, cập nhật số lượng, xóa sản phẩm...
}

function initProfilePage() {
  console.log("Trang tài khoản (initProfilePage) đã được gọi.");
  // TODO: Code tải thông tin user, lịch sử đơn hàng...
}

function initOrderDetailPage() {
  console.log("Trang chi tiết đơn hàng (initOrderDetailPage) đã được gọi.");
  // TODO: Code tải chi tiết 1 đơn hàng của khách...
}

function initBlogPage() {
  console.log("Trang Blog (initBlogPage) đã được gọi.");
  // TODO: Code tải danh sách bài viết blog...
}

function initPostDetailPage() {
  console.log("Trang chi tiết bài viết (initPostDetailPage) đã được gọi.");
  // TODO: Code tải nội dung 1 bài viết...
}
