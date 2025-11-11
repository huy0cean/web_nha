// frontend/assets/js/admin_orders.js
// File này được gọi bởi admin/orders.html

// Hàm khởi tạo chính
async function initAdminOrders() {
  await loadOrdersIntoTable();
  attachOrderTableEvents(); // Gắn sự kiện cho các nút (nếu có)
}

// 1. TẢI DỮ LIỆU
async function loadOrdersIntoTable() {
  const tableBody = document.getElementById("orders-table-body");
  if (!tableBody) return;
  tableBody.innerHTML =
    '<tr><td colspan="6" class="text-center">Đang tải...</td></tr>';

  try {
    const response = await apiFetch(`${API_URL}/orders.php?action=admin_list`);
    const result = await response.json();

    if (result.status === "success" && result.data) {
      renderOrdersTable(result.data);
    } else {
      tableBody.innerHTML = `<tr><td colspan="6" class="error-message text-center">Lỗi: ${result.message}</td></tr>`;
    }
  } catch (error) {
    console.error("Lỗi tải đơn hàng admin:", error);
    if (error.response && error.response.status !== 401) {
      tableBody.innerHTML = `<tr><td colspan="6" class="error-message text-center">Lỗi kết nối khi tải đơn hàng.</td></tr>`;
    }
  }
}

// 2. RENDER (VẼ GIAO DIỆN)
function renderOrdersTable(orders) {
  const tableBody = document.getElementById("orders-table-body");
  if (!orders || orders.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="6" class="text-center">Chưa có đơn hàng nào.</td></tr>';
    return;
  }

  tableBody.innerHTML = ""; // Xóa "Đang tải..."
  orders.forEach((order) => {
    const orderDate = new Date(order.created_at).toLocaleDateString("vi-VN");

    // Chuyển đổi trạng thái
    let statusText = order.status;
    let statusClass = order.status;
    switch (order.status) {
      case "pending":
        statusText = "Chờ xác nhận";
        statusClass = "pending";
        break;
      case "confirmed":
        statusText = "Đã xác nhận";
        statusClass = "confirmed";
        break;
      case "shipping":
        statusText = "Đang giao";
        statusClass = "shipping";
        break;
      case "completed":
        statusText = "Đã giao";
        statusClass = "completed";
        break;
      case "cancelled":
        statusText = "Đã hủy";
        statusClass = "cancelled";
        break;
    }

    const row = `
            <tr data-order-id="${order.id}">
                <td><strong>${order.order_code}</strong></td>
                <td>${order.customer_name}</td>
                <td>${orderDate}</td>
                <td>${formatCurrency(order.total_amount)}</td>
                <td>
                    <span class="order-status status-${statusClass}">${statusText}</span>
                </td>
                <td class="action-buttons">
                    <a href="order_detail_admin.html?id=${
                      order.id
                    }" class="btn-edit" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </a>
                     <button class="btn-edit" title="Cập nhật trạng thái">
                         <i class="fas fa-truck-fast"></i>
                    </button>
                </td>
            </tr>
        `;
    tableBody.innerHTML += row;
  });
}

// 3. GẮN SỰ KIỆN (Tạm thời chưa có)
function attachOrderTableEvents() {
  // (Chúng ta sẽ thêm logic cho nút "Cập nhật trạng thái" ở đây sau)
}

// Gọi hàm init chính
initAdminOrders();
