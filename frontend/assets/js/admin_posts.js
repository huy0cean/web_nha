// frontend/assets/js/admin_posts.js

async function initAdminPosts() {
  await loadPostsIntoTable();
  attachModalEvents();
  attachFormSubmitEvent();
  attachTableEvents();
}

// 1. TẢI DỮ LIỆU
async function loadPostsIntoTable() {
  const tableBody = document.getElementById("posts-table-body");
  if (!tableBody) return;
  tableBody.innerHTML =
    '<tr><td colspan="7" class="text-center">Đang tải...</td></tr>';

  try {
    const response = await apiFetch(`${API_URL}/posts.php?action=admin_list`);
    const result = await response.json();

    if (result.status === "success" && result.data) {
      renderPostsTable(result.data);
    } else {
      tableBody.innerHTML = `<tr><td colspan="7" class="error-message text-center">Lỗi: ${result.message}</td></tr>`;
    }
  } catch (error) {
    console.error("Lỗi tải bài viết admin:", error);
    if (error.response && error.response.status !== 401) {
      tableBody.innerHTML = `<tr><td colspan="7" class="error-message text-center">Lỗi kết nối khi tải bài viết.</td></tr>`;
    }
  }
}

// 2. RENDER (VẼ GIAO DIỆN)
function renderPostsTable(posts) {
  const tableBody = document.getElementById("posts-table-body");
  if (!posts || posts.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="7" class="text-center">Chưa có bài viết nào.</td></tr>';
    return;
  }

  tableBody.innerHTML = "";
  posts.forEach((post) => {
    let imageHtml =
      '<img src="../../uploads/placeholder.jpg" alt="No image" class="product-image-thumb" onerror="this.style.display=\'none\';">';
    if (post.image) {
      let imageSrc = post.image;
      if (typeof imageSrc === "string" && !imageSrc.startsWith("posts/")) {
        imageSrc = "posts/" + imageSrc;
      }
      imageSrc = `../../uploads/${imageSrc}`;
      imageHtml = `<img src="${imageSrc}" alt="${post.title}" class="product-image-thumb" onerror="this.style.display='none';">`;
    }
    const postDate = new Date(post.created_at).toLocaleDateString("vi-VN");
    const statusText = post.status === "published" ? "Hiển thị" : "Bản nháp";
    const statusClass = post.status === "published" ? "active" : "inactive";

    const row = `
            <tr data-post-id="${post.id}">
                <td>${post.id}</td>
                <td>${imageHtml}</td>
                <td>${post.title}</td>
                <td>${post.slug}</td>
                <td>
                     <span class="status-dot ${statusClass}" title="${statusText}"></span>
                </td>
                <td>${postDate}</td>
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
  const modal = document.getElementById("post-modal");
  const addBtn = document.getElementById("btn-add-new-post");
  const closeBtn = document.getElementById("modal-close-btn");
  if (!modal || !addBtn || !closeBtn) return;

  addBtn.addEventListener("click", () => {
    resetForm();
    document.getElementById("modal-title").textContent = "Thêm bài viết mới";
    modal.style.display = "flex";
  });
  closeBtn.addEventListener("click", () => (modal.style.display = "none"));
  window.addEventListener("click", (e) => {
    if (e.target == modal) modal.style.display = "none";
  });

  document
    .getElementById("post_image")
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
  const tableBody = document.getElementById("posts-table-body");
  if (!tableBody) return;

  tableBody.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".btn-edit");
    const deleteBtn = e.target.closest(".btn-delete");

    if (editBtn) {
      const row = editBtn.closest("tr");
      const postId = row.dataset.postId;
      await handleEditPost(postId);
    }

    if (deleteBtn) {
      const row = deleteBtn.closest("tr");
      const postId = row.dataset.postId;
      const postTitle = row.cells[2].textContent;
      if (confirm(`Bạn có chắc muốn XÓA vĩnh viễn bài viết "${postTitle}"?`)) {
        await handleDeletePost(postId);
      }
    }
  });
}

function attachFormSubmitEvent() {
  const form = document.getElementById("post-form");
  const messageP = document.getElementById("post-form-message");
  if (!form || !messageP) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageP.textContent = "Đang lưu...";
    messageP.style.color = "blue";

    const formData = new FormData(form);
    const postId = formData.get("id");
    let apiUrl = "";
    let successMessage = "";

    if (postId) {
      apiUrl = `${API_URL}/posts.php?action=update`;
      successMessage = "Cập nhật bài viết thành công!";
    } else {
      apiUrl = `${API_URL}/posts.php?action=create`;
      successMessage = "Thêm bài viết thành công!";
    }

    // (Không cần set 'status' vì select-box đã có name)

    try {
      const response = await apiFetch(apiUrl, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (result.status === "success") {
        messageP.textContent = successMessage;
        messageP.style.color = "green";
        await loadPostsIntoTable();
        setTimeout(() => {
          document.getElementById("post-modal").style.display = "none";
        }, 1000);
      } else {
        messageP.textContent = `Lỗi: ${result.message}`;
        messageP.style.color = "red";
      }
    } catch (error) {
      console.error("Lỗi submit form post:", error);
      messageP.textContent = "Lỗi kết nối. Vui lòng thử lại.";
      messageP.style.color = "red";
    }
  });
}

// 4. HÀM XỬ LÝ LOGIC (Sửa/Xóa)
async function handleEditPost(postId) {
  const messageP = document.getElementById("post-form-message");
  messageP.textContent = "Đang tải dữ liệu...";
  messageP.style.color = "blue";

  resetForm();
  document.getElementById(
    "modal-title"
  ).textContent = `Sửa bài viết (ID: ${postId})`;
  document.getElementById("post-modal").style.display = "flex";

  try {
    const response = await apiFetch(
      `${API_URL}/posts.php?action=admin_detail&id=${postId}`
    );
    const result = await response.json();

    if (result.status === "success" && result.data) {
      const post = result.data;
      document.getElementById("post_id").value = post.id;
      document.getElementById("post_title").value = post.title;
      document.getElementById("post_slug").value = post.slug;
      document.getElementById("post_excerpt").value = post.excerpt;
      document.getElementById("post_content").value = post.content;
      document.getElementById("post_status").value = post.status;

      const preview = document.getElementById("image-preview");
      if (post.image) {
        let imageSrc = post.image;
        if (typeof imageSrc === "string" && !imageSrc.startsWith("posts/")) {
          imageSrc = "posts/" + imageSrc;
        }
        preview.src = `../../uploads/${imageSrc}`;
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
    console.error("Lỗi tải chi tiết bài viết:", error);
    messageP.textContent = "Lỗi kết nối khi tải chi tiết bài viết.";
    messageP.style.color = "red";
  }
}

async function handleDeletePost(postId) {
  try {
    const response = await apiFetch(`${API_URL}/posts.php?action=delete`, {
      method: "POST",
      body: { id: parseInt(postId) },
    });
    const result = await response.json();
    if (result.status === "success") {
      alert("Đã xóa bài viết thành công.");
      await loadPostsIntoTable();
    } else {
      alert(`Lỗi khi xóa: ${result.message}`);
    }
  } catch (error) {
    console.error("Lỗi xóa bài viết:", error);
    alert("Lỗi kết nối khi xóa bài viết.");
  }
}

// Hàm reset form modal
function resetForm() {
  const form = document.getElementById("post-form");
  form.reset();
  document.getElementById("post_id").value = "";
  document.getElementById("post_status").value = "published";
  document.getElementById("image-preview").style.display = "none";
  document.getElementById("image-preview").src = "";
  document.getElementById("post-form-message").textContent = "";
}

// Gọi hàm init chính
initAdminPosts();
