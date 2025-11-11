// frontend/assets/js/admin_products.js
// (Bản sửa lỗi đường dẫn ảnh Admin)

async function initAdminProducts() {
  await loadProductsIntoTable();
  await loadCategoriesIntoSelect();
  attachModalEvents();
  attachFormSubmitEvent();
  attachTableEvents();
}

// 1. TẢI DỮ LIỆU
async function loadProductsIntoTable() {
  const tableBody = document.getElementById("products-table-body");
  if (!tableBody) return;
  tableBody.innerHTML =
    '<tr><td colspan="10" class="text-center">Đang tải...</td></tr>';

  try {
    const response = await apiFetch(
      `${API_URL}/products.php?action=admin_list`
    );
    const result = await response.json();

    if (result.status === "success" && result.data) {
      renderProductsTable(result.data);
    } else {
      tableBody.innerHTML = `<tr><td colspan="10" class="error-message text-center">Lỗi: ${result.message}</td></tr>`;
    }
  } catch (error) {
    console.error("Lỗi tải sản phẩm admin:", error);
    if (error.response && error.response.status !== 401) {
      tableBody.innerHTML = `<tr><td colspan="10" class="error-message text-center">Lỗi kết nối khi tải sản phẩm.</td></tr>`;
    }
  }
}

async function loadCategoriesIntoSelect() {
  const select = document.getElementById("product_category");
  if (!select) return;
  select.innerHTML = '<option value="">Đang tải...</option>';

  try {
    const response = await apiFetch(`${API_URL}/categories.php?action=list`);
    const result = await response.json();

    if (result.status === "success" && result.data) {
      select.innerHTML = '<option value="">-- Chọn danh mục --</option>';
      result.data.forEach((cat) => {
        select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
      });
    } else {
      select.innerHTML = '<option value="">Lỗi tải danh mục</option>';
    }
  } catch (error) {
    console.error("Lỗi tải danh mục:", error);
    select.innerHTML = '<option value="">Lỗi kết nối</option>';
  }
}

// 2. RENDER (VẼ GIAO DIỆN)
function renderProductsTable(products) {
  const tableBody = document.getElementById("products-table-body");
  if (!products || products.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="10" class="text-center">Chưa có sản phẩm nào.</td></tr>';
    return;
  }

  tableBody.innerHTML = "";
  products.forEach((p) => {
    // *** SỬA LỖI ĐƯỜNG DẪN ẢNH (../ => ../../) ***
    let imageHtml =
      '<img src="../../uploads/placeholder.jpg" alt="No image" class="product-image-thumb" onerror="this.style.display=\'none\';">'; // Mặc định
    if (p.image) {
      let imageSrc = p.image;
      if (typeof imageSrc === "string" && !imageSrc.startsWith("products/")) {
        imageSrc = "products/" + imageSrc;
      }
      imageSrc = `../../uploads/${imageSrc}`; // SỬA Ở ĐÂY
      imageHtml = `<img src="${imageSrc}" alt="${p.name}" class="product-image-thumb" onerror="this.style.display='none';">`;
    }
    // *** HẾT PHẦN SỬA ***

    const row = `
            <tr data-product-id="${p.id}">
                <td>${p.id}</td>
                <td>${imageHtml}</td>
                <td>${p.name}</td>
                <td>${p.category_name || "N/A"}</td>
                <td>${formatCurrency(p.price)}</td>
                <td>${p.sale_price ? formatCurrency(p.sale_price) : "---"}</td>
                <td>${p.stock}</td>
                <td>
                    <span class="status-dot ${
                      p.featured == 1 ? "active" : "inactive"
                    }" title="${p.featured == 1 ? "Nổi bật" : "Không"}"></span>
                </td>
                <td>
                     <span class="status-dot ${
                       p.status == 1 ? "active" : "inactive"
                     }" title="${p.status == 1 ? "Đang bán" : "Bị ẩn"}"></span>
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
  const modal = document.getElementById("product-modal");
  const addBtn = document.getElementById("btn-add-new-product");
  const closeBtn = document.getElementById("modal-close-btn");
  if (!modal || !addBtn || !closeBtn) return;

  addBtn.addEventListener("click", () => {
    resetForm();
    document.getElementById("modal-title").textContent = "Thêm sản phẩm mới";
    modal.style.display = "flex";
  });
  closeBtn.addEventListener("click", () => (modal.style.display = "none"));
  window.addEventListener("click", (e) => {
    if (e.target == modal) modal.style.display = "none";
  });

  document
    .getElementById("product_image")
    .addEventListener("change", function (e) {
      const preview = document.getElementById("image-preview");
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          preview.src = e.target.result;
          preview.style.display = "block";
        };
        reader.readAsDataURL(this.files[0]);
      } else {
        preview.style.display = "none";
        preview.src = "";
      }
    });
}

function attachTableEvents() {
  const tableBody = document.getElementById("products-table-body");
  if (!tableBody) return;

  tableBody.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".btn-edit");
    const deleteBtn = e.target.closest(".btn-delete");

    if (editBtn) {
      const row = editBtn.closest("tr");
      const productId = row.dataset.productId;
      await handleEditProduct(productId);
    }

    if (deleteBtn) {
      const row = deleteBtn.closest("tr");
      const productId = row.dataset.productId;
      const productName = row.cells[2].textContent;
      if (
        confirm(
          `Bạn có chắc muốn XÓA (ẩn) sản phẩm "${productName}" (ID: ${productId})?`
        )
      ) {
        await handleDeleteProduct(productId);
      }
    }
  });
}

function attachFormSubmitEvent() {
  const form = document.getElementById("product-form");
  const messageP = document.getElementById("product-form-message");
  if (!form || !messageP) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageP.textContent = "Đang lưu...";
    messageP.style.color = "blue";

    const formData = new FormData(form);
    const productId = formData.get("id");
    let apiUrl = "";
    let successMessage = "";

    if (productId) {
      apiUrl = `${API_URL}/products.php?action=update`;
      successMessage = "Cập nhật sản phẩm thành công!";
    } else {
      apiUrl = `${API_URL}/products.php?action=create`;
      successMessage = "Thêm sản phẩm thành công!";
    }

    formData.set(
      "featured",
      document.getElementById("product_featured").checked ? "1" : "0"
    );
    formData.set(
      "status",
      document.getElementById("product_status").checked ? "1" : "0"
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
        await loadProductsIntoTable();
        setTimeout(() => {
          document.getElementById("product-modal").style.display = "none";
        }, 1000);
      } else {
        messageP.textContent = `Lỗi: ${result.message}`;
        messageP.style.color = "red";
      }
    } catch (error) {
      console.error("Lỗi submit form:", error);
      messageP.textContent = "Lỗi kết nối. Vui lòng thử lại.";
      messageP.style.color = "red";
    }
  });
}

// 4. HÀM XỬ LÝ LOGIC (Sửa/Xóa)
async function handleEditProduct(productId) {
  const messageP = document.getElementById("product-form-message");
  messageP.textContent = "Đang tải dữ liệu sản phẩm...";
  messageP.style.color = "blue";

  resetForm();
  document.getElementById(
    "modal-title"
  ).textContent = `Sửa sản phẩm (ID: ${productId})`;
  document.getElementById("product-modal").style.display = "flex";

  try {
    const response = await apiFetch(
      `${API_URL}/products.php?action=detail&id=${productId}`
    );
    const result = await response.json();

    if (result.status === "success" && result.data) {
      const p = result.data;
      document.getElementById("product_id").value = p.id;
      document.getElementById("product_name").value = p.name;
      document.getElementById("product_slug").value = p.slug;
      document.getElementById("product_category").value = p.category_id;
      document.getElementById("product_price").value = p.price;
      document.getElementById("product_sale_price").value = p.sale_price;
      document.getElementById("product_stock").value = p.stock;
      document.getElementById("product_unit").value = p.unit;
      document.getElementById("product_description").value = p.description;
      document.getElementById("product_usage").value = p.usage;
      document.getElementById("product_featured").checked = p.featured == 1;
      document.getElementById("product_status").checked = p.status == 1;

      const preview = document.getElementById("image-preview");
      if (p.image) {
        // *** SỬA LỖI ĐƯỜNG DẪN ẢNH (../ => ../../) ***
        let imageSrc = p.image;
        if (typeof imageSrc === "string" && !imageSrc.startsWith("products/")) {
          imageSrc = "products/" + imageSrc;
        }
        preview.src = `../../uploads/${imageSrc}`; // SỬA Ở ĐÂY
        preview.style.display = "block";
      } else {
        preview.style.display = "none";
        preview.src = "";
      }
      messageP.textContent = "";
    } else {
      messageP.textContent = `Lỗi: ${result.message}`;
      messageP.style.color = "red";
    }
  } catch (error) {
    console.error("Lỗi tải chi tiết sản phẩm:", error);
    messageP.textContent = "Lỗi kết nối khi tải chi tiết sản phẩm.";
    messageP.style.color = "red";
  }
}

async function handleDeleteProduct(productId) {
  try {
    const response = await apiFetch(`${API_URL}/products.php?action=delete`, {
      method: "POST",
      body: { id: parseInt(productId) },
    });
    const result = await response.json();

    if (result.status === "success") {
      alert("Đã xóa (ẩn) sản phẩm thành công.");
      await loadProductsIntoTable();
    } else {
      alert(`Lỗi khi xóa: ${result.message}`);
    }
  } catch (error) {
    console.error("Lỗi xóa sản phẩm:", error);
    alert("Lỗi kết nối khi xóa sản phẩm.");
  }
}

// Hàm reset form modal
function resetForm() {
  const form = document.getElementById("product-form");
  form.reset();
  document.getElementById("product_id").value = "";
  document.getElementById("product_featured").checked = false;
  document.getElementById("product_status").checked = true;
  document.getElementById("image-preview").style.display = "none";
  document.getElementById("image-preview").src = "";
  document.getElementById("product-form-message").textContent = "";
}

// Gọi hàm init chính
initAdminProducts();
