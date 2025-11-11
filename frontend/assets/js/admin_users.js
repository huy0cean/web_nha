// frontend/assets/js/admin_users.js (ĐÃ SỬA LỖI)

async function initAdminUsers() {
  await loadUsersIntoTable();
  attachModalEvents();
  attachFormSubmitEvent();
  attachTableEvents();
}

// 1. TẢI DỮ LIỆU
async function loadUsersIntoTable() {
  const tableBody = document.getElementById("users-table-body");
  if (!tableBody) return;
  tableBody.innerHTML =
    '<tr><td colspan="7" class="text-center">Đang tải...</td></tr>';

  try {
    const response = await apiFetch(`${API_URL}/users.php?action=admin_list`);
    const result = await response.json();

    if (result.status === "success" && result.data) {
      renderUsersTable(result.data);
    } else {
      tableBody.innerHTML = `<tr><td colspan="7" class="error-message text-center">Lỗi: ${result.message}</td></tr>`;
    }
  } catch (error) {
    console.error("Lỗi tải người dùng:", error);
    if (error.response && error.response.status !== 401) {
      tableBody.innerHTML = `<tr><td colspan="7" class="error-message text-center">Lỗi kết nối khi tải người dùng.</td></tr>`;
    }
  }
}

// 2. RENDER (VẼ GIAO DIỆN)
function renderUsersTable(users) {
  const tableBody = document.getElementById("users-table-body");
  if (!users || users.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="7" class="text-center">Không có người dùng nào.</td></tr>';
    return;
  }

  tableBody.innerHTML = "";
  users.forEach((user) => {
    const statusText = user.status == 1 ? "Hoạt động" : "Bị khóa";
    const statusClass = user.status == 1 ? "active" : "inactive";
    const roleText = user.role === "admin" ? "Admin" : "Khách hàng";

    const row = `
      <tr data-user-id="${user.id}">
        <td>${user.id}</td>
        <td>${user.full_name}</td>
        <td>${user.email}</td>
        <td>${user.phone || "---"}</td>
        <td>${roleText}</td>
        <td>
          <span class="status-dot ${statusClass}" title="${statusText}"></span>
        </td>
        <td class="action-buttons">
          <button class="btn-edit" title="Sửa quyền/trạng thái"><i class="fas fa-user-shield"></i></button>
          <button class="btn-delete" title="Xóa người dùng"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `;
    tableBody.innerHTML += row;
  });
}

// 3. GẮN SỰ KIỆN
function attachModalEvents() {
  const modal = document.getElementById("user-modal");
  const closeBtn = document.getElementById("modal-close-btn");
  if (!modal || !closeBtn) return;

  // Đóng modal khi click nút X
  closeBtn.addEventListener("click", () => {
    modal.classList.remove("show");
  });

  // Đóng modal khi click bên ngoài
  window.addEventListener("click", (e) => {
    if (e.target == modal) {
      modal.classList.remove("show");
    }
  });
}

function attachTableEvents() {
  const tableBody = document.getElementById("users-table-body");
  if (!tableBody) return;

  tableBody.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".btn-edit");
    const deleteBtn = e.target.closest(".btn-delete");

    if (editBtn) {
      const row = editBtn.closest("tr");
      const userId = row.dataset.userId;
      await handleEditUser(userId);
    }

    if (deleteBtn) {
      const row = deleteBtn.closest("tr");
      const userId = row.dataset.userId;
      const userName = row.cells[1].textContent;
      if (
        confirm(
          `Bạn có chắc muốn XÓA vĩnh viễn người dùng "${userName}"? Mọi đơn hàng của họ cũng có thể bị ảnh hưởng.`
        )
      ) {
        await handleDeleteUser(userId);
      }
    }
  });
}

function attachFormSubmitEvent() {
  const form = document.getElementById("user-form");
  const messageP = document.getElementById("user-form-message");
  if (!form || !messageP) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageP.textContent = "Đang lưu...";
    messageP.style.color = "blue";

    const userId = document.getElementById("user_id").value;
    const newRole = document.getElementById("user_role").value;
    const newStatus = document.getElementById("user_status").value;

    try {
      const response = await apiFetch(
        `${API_URL}/users.php?action=update_role_status`,
        {
          method: "POST",
          body: {
            id: parseInt(userId),
            role: newRole,
            status: parseInt(newStatus),
          },
        }
      );
      const result = await response.json();

      if (result.status === "success") {
        messageP.textContent = "Cập nhật thành công!";
        messageP.style.color = "green";
        await loadUsersIntoTable();
        setTimeout(() => {
          document.getElementById("user-modal").classList.remove("show");
        }, 1000);
      } else {
        messageP.textContent = `Lỗi: ${result.message}`;
        messageP.style.color = "red";
      }
    } catch (error) {
      console.error("Lỗi submit form user:", error);
      messageP.textContent = "Lỗi kết nối. Vui lòng thử lại.";
      messageP.style.color = "red";
    }
  });
}

// 4. HÀM XỬ LÝ LOGIC (Sửa/Xóa)
async function handleEditUser(userId) {
  const messageP = document.getElementById("user-form-message");
  messageP.textContent = "Đang tải dữ liệu...";
  messageP.style.color = "blue";

  resetForm();
  document.getElementById(
    "modal-title"
  ).textContent = `Sửa người dùng (ID: ${userId})`;

  // Hiển thị modal bằng class "show"
  document.getElementById("user-modal").classList.add("show");

  try {
    const response = await apiFetch(
      `${API_URL}/users.php?action=admin_detail&id=${userId}`
    );
    const result = await response.json();

    if (result.status === "success" && result.data) {
      const user = result.data;
      document.getElementById("user_id").value = user.id;
      document.getElementById("user_fullname").value = user.full_name;
      document.getElementById("user_email").value = user.email;
      document.getElementById("user_role").value = user.role;
      document.getElementById("user_status").value = user.status;
      messageP.textContent = "";
    } else {
      messageP.textContent = `Lỗi: ${result.message}`;
      messageP.style.color = "red";
    }
  } catch (error) {
    console.error("Lỗi tải chi tiết user:", error);
    messageP.textContent = "Lỗi kết nối khi tải chi tiết người dùng.";
    messageP.style.color = "red";
  }
}

async function handleDeleteUser(userId) {
  try {
    const response = await apiFetch(`${API_URL}/users.php?action=delete`, {
      method: "POST",
      body: { id: parseInt(userId) },
    });
    const result = await response.json();
    if (result.status === "success") {
      alert("Đã xóa người dùng thành công.");
      await loadUsersIntoTable();
    } else {
      alert(`Lỗi khi xóa: ${result.message}`);
    }
  } catch (error) {
    console.error("Lỗi xóa user:", error);
    alert("Lỗi kết nối khi xóa người dùng.");
  }
}

// Hàm reset form modal
function resetForm() {
  const form = document.getElementById("user-form");
  form.reset();
  document.getElementById("user_id").value = "";
  document.getElementById("user-form-message").textContent = "";
}

// Gọi hàm init chính
initAdminUsers();
