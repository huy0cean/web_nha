// frontend/assets/js/admin_categories.js
// File này được gọi bởi admin/categories.html

// Hàm khởi tạo chính
async function initAdminCategories() {
  await loadCategoriesIntoTable();
  attachModalEvents();
  attachFormSubmitEvent();
  attachTableEvents();
}

// 1. TẢI DỮ LIỆU
async function loadCategoriesIntoTable() {
  const tableBody = document.getElementById("categories-table-body");
  if (!tableBody) return;
  tableBody.innerHTML =
    '<tr><td colspan="5" class="text-center">Đang tải...</td></tr>'; // Sửa colspan

  try {
    const response = await apiFetch(
      `${API_URL}/categories.php?action=admin_list`
    );
    const result = await response.json();

    if (result.status === "success" && result.data) {
      renderCategoriesTable(result.data);
    } else {
      tableBody.innerHTML = `<tr><td colspan="5" class="error-message text-center">Lỗi: ${result.message}</td></tr>`;
    }
  } catch (error) {
    console.error("Lỗi tải danh mục admin:", error);
    if (error.response && error.response.status !== 401) {
      tableBody.innerHTML = `<tr><td colspan="5" class="error-message text-center">Lỗi kết nối khi tải danh mục.</td></tr>`;
    }
  }
}

// 2. RENDER (VẼ GIAO DIỆN)
function renderCategoriesTable(categories) {
  const tableBody = document.getElementById("categories-table-body");
  if (!categories || categories.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="5" class="text-center">Chưa có danh mục nào.</td></tr>'; // Sửa colspan
    return;
  }

  tableBody.innerHTML = ""; // Xóa "Đang tải..."
  categories.forEach((cat) => {
    // ĐÃ XÓA LOGIC imageHtml

    const row = `
            <tr data-category-id="${cat.id}">
                <td>${cat.id}</td>
                <td>${cat.name}</td>
                <td>${cat.slug}</td>
                <td>
                     <span class="status-dot ${
                       cat.status == 1 ? "active" : "inactive"
                     }" title="${
      cat.status == 1 ? "Hoạt động" : "Bị ẩn"
    }"></span>
                </td>
                <td class="action-buttons">
                    <button class="btn-edit" title="Sửa"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" title="Xóa"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    tableBody.innerHTML += row;
  });
}

// 3. GẮN SỰ KIỆN
function attachModalEvents() {
  const modal = document.getElementById("category-modal");
  const addBtn = document.getElementById("btn-add-new-category");
  const closeBtn = document.getElementById("modal-close-btn");
  if (!modal || !addBtn || !closeBtn) return;

  addBtn.addEventListener("click", () => {
    resetForm();
    document.getElementById("modal-title").textContent = "Thêm danh mục mới";
    modal.style.display = "flex";
  });
  closeBtn.addEventListener("click", () => (modal.style.display = "none"));
  window.addEventListener("click", (e) => {
    if (e.target == modal) modal.style.display = "none";
  });

  // ĐÃ XÓA SỰ KIỆN XEM TRƯỚC ẢNH
}

function attachTableEvents() {
  const tableBody = document.getElementById("categories-table-body");
  if (!tableBody) return;

  tableBody.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".btn-edit");
    const deleteBtn = e.target.closest(".btn-delete");

    if (editBtn) {
      const row = editBtn.closest("tr");
      const categoryId = row.dataset.categoryId;
      await handleEditCategory(categoryId);
    }

    if (deleteBtn) {
      const row = deleteBtn.closest("tr");
      const categoryId = row.dataset.categoryId;
      const categoryName = row.cells[1].textContent; // Sửa index cột tên
      if (
        confirm(
          `Bạn có chắc muốn XÓA (ẩn) danh mục "${categoryName}"? Sản phẩm thuộc danh mục này có thể bị ảnh hưởng.`
        )
      ) {
        await handleDeleteCategory(categoryId);
      }
    }
  });
}

function attachFormSubmitEvent() {
  const form = document.getElementById("category-form");
  const messageP = document.getElementById("category-form-message");
  if (!form || !messageP) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageP.textContent = "Đang lưu...";
    messageP.style.color = "blue";

    const formData = new FormData(form);
    const categoryId = formData.get("id");
    let apiUrl = "";
    let successMessage = "";

    if (categoryId) {
      apiUrl = `${API_URL}/categories.php?action=update`;
      successMessage = "Cập nhật danh mục thành công!";
    } else {
      apiUrl = `${API_URL}/categories.php?action=create`;
      successMessage = "Thêm danh mục thành công!";
    }

    formData.set(
      "status",
      document.getElementById("category_status").checked ? "1" : "0"
    );

    try {
      const response = await apiFetch(apiUrl, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (result.status === "success") {
        messageP.textContent = successMessage;
        messageP.style.color = "green";
        await loadCategoriesIntoTable();
        // Tải lại danh sách danh mục trong select của trang Products (nếu nó đang mở)
        if (
          typeof loadCategoriesIntoSelect === "function" &&
          document.getElementById("product_category")
        ) {
          loadCategoriesIntoSelect();
        }
        setTimeout(() => {
          document.getElementById("category-modal").style.display = "none";
        }, 1000);
      } else {
        messageP.textContent = `Lỗi: ${result.message}`;
        messageP.style.color = "red";
      }
    } catch (error) {
      console.error("Lỗi submit form category:", error);
      messageP.textContent = "Lỗi kết nối. Vui lòng thử lại.";
      messageP.style.color = "red";
    }
  });
}

// 4. HÀM XỬ LÝ LOGIC (Sửa/Xóa)
async function handleEditCategory(categoryId) {
  const messageP = document.getElementById("category-form-message");
  messageP.textContent = "Đang tải dữ liệu...";
  messageP.style.color = "blue";

  resetForm();
  document.getElementById(
    "modal-title"
  ).textContent = `Sửa danh mục (ID: ${categoryId})`;
  document.getElementById("category-modal").style.display = "flex";

  try {
    const response = await apiFetch(
      `${API_URL}/categories.php?action=detail&id=${categoryId}`
    );
    const result = await response.json();

    if (result.status === "success" && result.data) {
      const cat = result.data;
      document.getElementById("category_id").value = cat.id;
      document.getElementById("category_name").value = cat.name;
      document.getElementById("category_slug").value = cat.slug;
      document.getElementById("category_status").checked = cat.status == 1;

      // ĐÃ XÓA LOGIC XEM TRƯỚC ẢNH

      messageP.textContent = "";
    } else {
      messageP.textContent = `Lỗi: ${result.message}`;
      messageP.style.color = "red";
    }
  } catch (error) {
    console.error("Lỗi tải chi tiết danh mục:", error);
    messageP.textContent = "Lỗi kết nối khi tải chi tiết danh mục.";
    messageP.style.color = "red";
  }
}

async function handleDeleteCategory(categoryId) {
  try {
    const response = await apiFetch(`${API_URL}/categories.php?action=delete`, {
      method: "POST",
      body: { id: parseInt(categoryId) },
    });
    const result = await response.json();

    if (result.status === "success") {
      alert("Đã xóa (ẩn) danh mục thành công.");
      await loadCategoriesIntoTable();
      // Tải lại danh sách danh mục trong select của trang Products (nếu nó đang mở)
      if (
        typeof loadCategoriesIntoSelect === "function" &&
        document.getElementById("product_category")
      ) {
        loadCategoriesIntoSelect();
      }
    } else {
      alert(`Lỗi khi xóa: ${result.message}`);
    }
  } catch (error) {
    console.error("Lỗi xóa danh mục:", error);
    alert("Lỗi kết nối khi xóa danh mục.");
  }
}

// Hàm reset form modal
function resetForm() {
  const form = document.getElementById("category-form");
  form.reset();
  document.getElementById("category_id").value = "";
  document.getElementById("category_status").checked = true;

  // ĐÃ XÓA LOGIC ẢNH

  document.getElementById("category-form-message").textContent = "";
}

// Gọi hàm init chính
initAdminCategories();
