// frontend/assets/js/admin_order_detail.js
// File này được gọi bởi admin/order_detail_admin.html

// Hàm khởi tạo chính
async function initAdminOrderDetail() {
  console.log("Đang khởi tạo trang chi tiết đơn hàng Admin...");
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");

  if (!orderId) {
    document.getElementById("order-detail-content").innerHTML =
      '<p class="error-message text-center">Lỗi: Không tìm thấy ID đơn hàng.</p>';
    return;
  }

  await loadOrderDetails(orderId);
}

// 1. TẢI DỮ LIỆU
async function loadOrderDetails(orderId) {
  const contentDiv = document.getElementById("order-detail-content");
  if (!contentDiv) return;

  try {
    // Dùng API admin_detail mới tạo
    const response = await apiFetch(
      `${API_URL}/orders.php?action=admin_detail&id=${orderId}`
    );
    const result = await response.json();

    if (result.status === "success" && result.data) {
      renderOrderDetails(result.data, contentDiv);
      document.getElementById(
        "page-title"
      ).textContent = `Chi tiết Đơn hàng #${result.data.order_code}`;
      // Gắn sự kiện cho form cập nhật trạng thái
      attachStatusUpdateEvent(orderId);
    } else {
      contentDiv.innerHTML = `<p class="error-message text-center">Lỗi tải chi tiết đơn hàng: ${result.message}</p>`;
    }
  } catch (error) {
    console.error("Fetch error (Admin Order Detail):", error);
    contentDiv.innerHTML = `<p class="error-message text-center">Không thể tải chi tiết đơn hàng. Vui lòng thử lại sau.</p>`;
  }
}

// 2. RENDER (VẼ GIAO DIỆN)
function renderOrderDetails(order, container) {
  if (!container) return;

  const orderDate = new Date(order.created_at).toLocaleString("vi-VN");

  let itemsHtml = `
        <h4>Các sản phẩm trong đơn</h4>
        <table class="order-items-table">
            <thead>
                <tr>
                    <th>Sản phẩm</th>
                    <th>Đơn giá</th>
                    <th>Số lượng</th>
                    <th>Thành tiền</th>
                </tr>
            </thead>
            <tbody>
    `;

  if (order.items && order.items.length > 0) {
    order.items.forEach((item) => {
      let itemImagePath = item.product_image;
      if (
        itemImagePath &&
        typeof itemImagePath === "string" &&
        !itemImagePath.startsWith("products/")
      ) {
        itemImagePath = "products/" + itemImagePath;
      } else if (!itemImagePath) {
        itemImagePath = "placeholder.jpg";
      }
      const itemImageSrc = `../../uploads/${itemImagePath}`; // Lùi 2 cấp

      itemsHtml += `
                <tr>
                    <td class="product-info">
                        <img src="${itemImageSrc}" alt="${
        item.product_name
      }" width="50" onerror="this.onerror=null; this.src='../uploads/placeholder.jpg';">
                        <span>${item.product_name} (ID: ${
        item.product_id
      })</span>
                    </td>
                    <td>${formatCurrency(item.price)}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.subtotal)}</td>
                </tr>
            `;
    });
  } else {
    itemsHtml += `<tr><td colspan="4" class="text-center">Không có sản phẩm trong đơn hàng này.</td></tr>`;
  }
  itemsHtml += `</tbody></table>`;

  // HTML cho form cập nhật trạng thái
  const statusFormHtml = `
        <div class="order-section status-update-form">
            <h4>Cập nhật trạng thái</h4>
            <form id="status-form">
                <div class="form-group">
                    <label for="order_status">Trạng thái đơn hàng</label>
                    <select id="order_status" name="status">
                        <option value="pending" ${
                          order.status === "pending" ? "selected" : ""
                        }>Chờ xác nhận</option>
                        <option value="confirmed" ${
                          order.status === "confirmed" ? "selected" : ""
                        }>Đã xác nhận</option>
                        <option value="shipping" ${
                          order.status === "shipping" ? "selected" : ""
                        }>Đang giao</option>
                        <option value="completed" ${
                          order.status === "completed" ? "selected" : ""
                        }>Đã giao</option>
                        <option value="cancelled" ${
                          order.status === "cancelled" ? "selected" : ""
                        }>Đã hủy</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Cập nhật</button>
                <p id="status-form-message" class="form-message" style="margin-top: 1rem;"></p>
            </form>
        </div>
    `;

  container.innerHTML = `
        <div class="order-summary-header">
            <div>
                <p><strong>Mã đơn hàng:</strong> ${order.order_code}</p>
                <p><strong>Ngày đặt:</strong> ${orderDate}</p>
            </div>
        </div>
        <div class="order-detail-grid">
            <div class="order-section customer-info">
                <h4>Thông tin người nhận</h4>
                <p><strong>Họ tên:</strong> ${order.customer_name}</p>
                <p><strong>Số điện thoại:</strong> ${order.customer_phone}</p>
                ${
                  order.customer_email
                    ? `<p><strong>Email:</strong> ${order.customer_email}</p>`
                    : ""
                }
                <p><strong>Địa chỉ:</strong> ${order.address}</p>
                ${
                  order.note
                    ? `<p><strong>Ghi chú:</strong> ${order.note}</p>`
                    : ""
                }
            </div>
            <div class="order-section payment-info">
                <h4>Thông tin thanh toán</h4>
                <p><strong>Phương thức:</strong> ${
                  order.payment_method === "cod"
                    ? "Thanh toán khi nhận hàng (COD)"
                    : "Chuyển khoản ngân hàng"
                }</p>
                <p><strong>Tổng tiền hàng:</strong> ${formatCurrency(
                  order.total_amount
                )}</p>
                <p><strong>Phí vận chuyển:</strong> ${formatCurrency(
                  0
                )} (Tạm tính)</p>
                <p><strong>Tổng cộng:</strong> <span class="order-grand-total">${formatCurrency(
                  order.total_amount
                )}</span></p>
            </div>
        </div>
        <div class="order-section order-items">
            ${itemsHtml}
        </div>
        <div class="order-section">
             ${statusFormHtml}
        </div>
    `;
}

// 3. GẮN SỰ KIỆN CHO FORM CẬP NHẬT
function attachStatusUpdateEvent(orderId) {
  const form = document.getElementById("status-form");
  const messageP = document.getElementById("status-form-message");
  if (!form || !messageP) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageP.textContent = "Đang cập nhật...";
    messageP.style.color = "blue";

    const newStatus = document.getElementById("order_status").value;

    try {
      const response = await apiFetch(
        `${API_URL}/orders.php?action=update_status`,
        {
          method: "POST",
          body: {
            id: parseInt(orderId),
            status: newStatus,
          },
        }
      );
      const result = await response.json();

      if (result.status === "success") {
        messageP.textContent = "Cập nhật trạng thái thành công!";
        messageP.style.color = "green";
        // Tải lại trang để cập nhật thông tin
        setTimeout(() => {
          loadOrderDetails(orderId);
        }, 1000);
      } else {
        messageP.textContent = `Lỗi: ${result.message}`;
        messageP.style.color = "red";
      }
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
      messageP.textContent = "Lỗi kết nối. Vui lòng thử lại.";
      messageP.style.color = "red";
    }
  });
}

// Gọi hàm init chính
initAdminOrderDetail();
