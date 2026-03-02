// Upload type is always daily

// Galaxy Star Generation
function createStars() {
  const container = document.getElementById("stars-container");
  const starCount = 200;

  for (let i = 0; i < starCount; i++) {
    const star = document.createElement("div");
    star.className = "star";

    // Random position
    const x = Math.random() * 100;
    const y = Math.random() * 100;

    // Random size
    const size = Math.random() * 2 + 1;

    // Random animation duration
    const duration = Math.random() * 3 + 2;

    star.style.left = `${x}%`;
    star.style.top = `${y}%`;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.setProperty("--duration", `${duration}s`);

    container.appendChild(star);
  }
}

// Sparkle mouse effect (optional but cool)
document.addEventListener("mousemove", (e) => {
  if (Math.random() > 0.9) {
    const sparkle = document.createElement("div");
    sparkle.className = "star";
    sparkle.style.left = e.pageX + "px";
    sparkle.style.top = e.pageY + "px";
    sparkle.style.width = "2px";
    sparkle.style.height = "2px";
    sparkle.style.background = "#ffd700";
    sparkle.style.boxShadow = "0 0 10px #ffd700";
    document.body.appendChild(sparkle);

    setTimeout(() => {
      sparkle.remove();
    }, 1000);
  }
});

window.onload = () => {
  createStars();
  initSlideshow();
  initDailyPhotos();
  initTypewriter();
  initFireworks(); // Bùm bùm Tết
};

// ===================== Typewriter (Tết Theme) =====================
const typewriterTexts = [
  "🧨 Chúc mừng năm mới gia đình mình! 🧨",
  "🧧 Vạn sự như ý - An khang thịnh vượng 🧧",
  "✨ Kỷ niệm nhà mình mãi mãi bền lâu ✨",
];
let twIndex = 0, twChar = 0, twDir = 1;

function initTypewriter() {
  const el = document.getElementById("typewriter");
  if (!el) return;
  function tick() {
    const txt = typewriterTexts[twIndex];
    el.textContent = txt.slice(0, twChar);
    if (twDir === 1) {
      twChar++;
      if (twChar > txt.length) {
        twDir = -1;
        setTimeout(tick, 1800);
        return;
      }
    } else {
      twChar--;
      if (twChar < 0) {
        twChar = 0;
        twDir = 1;
        twIndex = (twIndex + 1) % typewriterTexts.length;
        setTimeout(tick, 400);
        return;
      }
    }
    setTimeout(tick, twDir === 1 ? 55 : 30);
  }
  tick();
}

// ===================== Photo Slideshow =====================
let photos = [];
let currentIndex = 0;
let autoSlideTimer = null;

async function initSlideshow() {
  const img = document.getElementById("mainPhoto");
  const loading = document.getElementById("photoLoading");
  const dotsContainer = document.getElementById("slideDots");
  const prevBtn = document.getElementById("slidePrev");
  const nextBtn = document.getElementById("slideNext");

  // Thử fetch từ Google Drive API
  try {
    loading.classList.add("visible");
    const res = await fetch("/api/photos");
    if (res.ok) {
      const data = await res.json();
      if (data.photos && data.photos.length > 0) {
        photos = data.photos;
      }
    }
  } catch (err) {
    console.warn("Không lấy được ảnh từ Drive, dùng fallback:", err);
  } finally {
    loading.classList.remove("visible");
  }

  // Render dots
  renderDots(dotsContainer);

  // Hiển thị ảnh đầu tiên
  showPhoto(currentIndex, img, loading, dotsContainer);

  // Mở modal khi click vào ảnh đại diện gia đình
  const photoFrame = document.querySelector(".photo-frame");
  if (photoFrame) {
    photoFrame.style.cursor = "pointer";
    photoFrame.addEventListener("click", () => openMainModal());
  }

  // Prev / Next buttons — click thì reset timer
  prevBtn.addEventListener("click", () => {
    stopAutoSlide();
    goTo(currentIndex - 1, img, loading, dotsContainer);
    startAutoSlide(img, loading, dotsContainer);
  });
  nextBtn.addEventListener("click", () => {
    stopAutoSlide();
    goTo(currentIndex + 1, img, loading, dotsContainer);
    startAutoSlide(img, loading, dotsContainer);
  });

  // Ẩn nút nếu chỉ có 1 ảnh
  if (photos.length <= 1) {
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
    dotsContainer.style.display = "none";
  }

  // Bắt đầu tự chuyển ảnh (6s/ảnh)
  startAutoSlide(img, loading, dotsContainer);
}

function renderDots(container) {
  container.innerHTML = "";
  photos.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "slide-dot" + (i === currentIndex ? " active" : "");
    dot.setAttribute("aria-label", `Ảnh ${i + 1}`);
    dot.addEventListener("click", () => {
      goTo(i, document.getElementById("mainPhoto"),
           document.getElementById("photoLoading"),
           document.getElementById("slideDots"));
    });
    container.appendChild(dot);
  });
}

function updateDots(container) {
  const dots = container.querySelectorAll(".slide-dot");
  dots.forEach((d, i) => d.classList.toggle("active", i === currentIndex));
}

function showPhoto(index, img, loading, dotsContainer) {
  const photo = photos[index];
  const caption = document.getElementById("photoCaption");

  // Update dots ngay (không cần chờ ảnh)
  updateDots(dotsContainer);

  // Fade out ảnh VÀ caption cùng lúc
  img.classList.add("fading");
  if (caption) caption.classList.add("fading");

  setTimeout(() => {
    loading.classList.add("visible");

    const isVideo = photo.mimeType && photo.mimeType.startsWith("video/");

    if (isVideo) {
      // Dùng ảnh bìa từ Drive, nếu chưa có thì dùng icon mặc định
      const videoPlaceholder = "https://img.icons8.com/ios-filled/100/ffffff/video-message.png";
      const thumbnailLink = photo.thumbnail ? photo.thumbnail.replace(/=s\d+$/, "=s800") : videoPlaceholder;
      
      const tempThumb = new Image();
      tempThumb.onload = () => {
        img.src = thumbnailLink;
        img.style.objectFit = "cover";
        img.style.background = "transparent";
        loading.classList.remove("visible");
        img.classList.remove("fading");
      };
      tempThumb.onerror = () => {
        img.src = videoPlaceholder;
        img.style.objectFit = "center";
        img.style.background = "#1a1a1a";
        loading.classList.remove("visible");
        img.classList.remove("fading");
      };
      tempThumb.src = thumbnailLink;

      if (caption) {
        caption.textContent = photo.name || "🏠 Gia đình mình đây";
        caption.classList.remove("fading");
      }
    } else {
      const tempImg = new Image();
      tempImg.onload = () => {
        // Chỉ swap ảnh + caption SAU KHI ảnh đã load xong
        img.src = photo.url;
        img.style.objectFit = "cover";
        img.style.background = "transparent";

        if (caption) {
          caption.textContent = photo.name || "🏠 Gia đình mình đây";
          caption.classList.remove("fading");
        }
        loading.classList.remove("visible");
        img.classList.remove("fading");
      };

      tempImg.onerror = () => {
        // Bắt lỗi load ảnh (ví dụ 404)
        loading.classList.remove("visible");
        img.classList.remove("fading");
        if (caption) caption.classList.remove("fading");
      };

      tempImg.src = photo.url;
    }
  }, 350);
}

function goTo(index, img, loading, dotsContainer) {
  currentIndex = (index + photos.length) % photos.length;
  showPhoto(currentIndex, img, loading, dotsContainer);
}

function startAutoSlide(img, loading, dotsContainer) {
  if (photos.length <= 1) return;
  stopAutoSlide();
  autoSlideTimer = setInterval(() => {
    currentIndex = (currentIndex + 1) % photos.length;
    showPhoto(currentIndex, img, loading, dotsContainer);
  }, 30000);
}

function stopAutoSlide() {
  if (autoSlideTimer) {
    clearInterval(autoSlideTimer);
    autoSlideTimer = null;
  }
}

function openMainModal() {
  const photo = photos[currentIndex];
  if (!photo) return;
  openDailyModal(photo);
}

// ===================== Camera Roll =====================
let dailyPhotos = [];

async function initDailyPhotos() {
  try {
    const res = await fetch("/api/daily");
    if (res.ok) {
      const data = await res.json();
      if (data.photos) {
        dailyPhotos = data.photos;
        renderCameraRoll();
      }
    }
  } catch (err) {
    console.error("Không lấy được ảnh daily:", err);
  }
}

function formatMonthLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
}

function formatDayLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function getMonthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function renderCameraRoll() {
  const body = document.getElementById("cameraRollBody");
  if (!body) return;

  if (dailyPhotos.length === 0) {
    body.innerHTML = '<div class="daily-placeholder">Chưa có kỷ niệm nào 🫖<br><small style="opacity:0.5;font-size:0.75rem">Hãy upload ảnh đầu tiên của gia đình nào!</small></div>';
    return;
  }

  // Bước 1: Group theo tháng
  const monthGroups = {};
  const monthOrder = [];
  dailyPhotos.forEach((photo, idx) => {
    const monthKey = photo.time ? getMonthKey(photo.time) : "unknown";
    if (!monthGroups[monthKey]) {
      monthGroups[monthKey] = { photos: [], label: "" };
      monthOrder.push(monthKey);
    }
    monthGroups[monthKey].photos.push({ ...photo, _idx: idx });
    monthGroups[monthKey].label = photo.time ? formatMonthLabel(photo.time) : "Không xác định";
  });

  // Bước 2: Trong mỗi tháng, group theo ngày
  function groupByDay(photos) {
    const dayGroups = {};
    const dayOrder = [];
    photos.forEach(p => {
      const d = p.time ? new Date(p.time) : null;
      const dayKey = d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` : "unknown";
      const dayLabel = d ? d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" }) : "Không rõ ngày";
      if (!dayGroups[dayKey]) { dayGroups[dayKey] = { photos: [], label: dayLabel }; dayOrder.push(dayKey); }
      dayGroups[dayKey].photos.push(p);
    });
    return { dayGroups, dayOrder };
  }

  // Bước 3: Render
  body.innerHTML = monthOrder.map((mKey, mIdx) => {
    const { photos, label } = monthGroups[mKey];
    const count = photos.length;
    const { dayGroups, dayOrder } = groupByDay(photos);

    const dayRowsHTML = dayOrder.map(dKey => {
      const { photos: dayPhotos, label: dayLabel } = dayGroups[dKey];
      const thumbsHTML = dayPhotos.map(p => {
        const isVideo = p.mimeType && p.mimeType.startsWith("video/");
        return `
        <div class="cr-item ${isVideo ? 'video' : ''}" onclick="openDailyModal(dailyPhotos[${p._idx}])">
          ${isVideo 
            ? `<img src="${p.thumbnail || "https://img.icons8.com/ios-filled/100/ffffff/video-message.png"}" alt="${p.name}" loading="lazy" style="${p.thumbnail ? '' : 'object-fit:center;background:#1a1a1a;padding:20px;'}" />` 
            : `<img src="${p.url}" alt="${p.name}" loading="lazy" />`}
          ${isVideo ? `<div class="video-preview-overlay"><span class="play-icon">▶</span></div>` : ""}
          <div class="cr-item-overlay"><span class="cr-item-day">${p.name}</span></div>
        </div>`;
      }).join("");
      return `
        <div class="cr-day-group">
          <div class="cr-day-label">${dayLabel}</div>
          <div class="cr-grid">${thumbsHTML}</div>
        </div>`;
    }).join("");

    // Tất cả đóng mặc định
    const isOpen = false;
    return `
      <div class="cr-month-group" id="cr-month-${mKey}">
        <div class="cr-month-label" onclick="toggleMonth('${mKey}')">
          <span class="cr-month-text">${label}</span>
          <span class="cr-month-meta">${count} ảnh</span>
          <span class="cr-month-arrow ${isOpen ? "open" : ""}">›</span>
        </div>
        <div class="cr-month-content ${isOpen ? "open" : ""}" style="${isOpen ? "max-height:none" : ""}">
          ${dayRowsHTML}
        </div>
      </div>`;
  }).join("");
}

function toggleMonth(key) {
  const group = document.getElementById(`cr-month-${key}`);
  if (!group) return;
  const content = group.querySelector(".cr-month-content");
  const arrow = group.querySelector(".cr-month-arrow");
  const isOpen = content.classList.contains("open");

  if (isOpen) {
    // Đóng: set lại height thật rồi collapse về 0
    content.style.maxHeight = content.scrollHeight + "px";
    requestAnimationFrame(() => {
      content.style.maxHeight = "0";
      content.classList.remove("open");
      arrow.classList.remove("open");
    });
  } else {
    // Mở: add class trước rồi set height thật
    content.classList.add("open");
    arrow.classList.add("open");
    content.style.maxHeight = content.scrollHeight + "px";
    // Sau animation xong, bỏ max-height cứng để nội dung tự co giãn
    content.addEventListener("transitionend", () => {
      if (content.classList.contains("open")) {
        content.style.maxHeight = "none";
      }
    }, { once: true });
  }
}

// ===================== Fireworks (Tết) =====================
function initFireworks() {
  const container = document.getElementById("fireworks-container");
  if (!container) return;

  // Sound effects - Dùng file nội bộ của bạn
  const fireworkSound = new Audio("/fire.mp3");
  fireworkSound.volume = 0.5;

  function playSound() {
    // Clone node để nổ nhiều phát cùng lúc không bị ngắt
    const s = fireworkSound.cloneNode();
    s.volume = 0.2 + Math.random() * 0.2;
    s.play().catch(() => {
      // Chrome/Safari chặn tự động phát nếu chưa tương tác với trang
    });
  }

  function createFirework() {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * (window.innerHeight * 0.6); // Chỉ nổ ở nửa trên màn hình

    playSound();

    const colors = ["#ffd700", "#ff4500", "#ff0000", "#fffbef", "#ffcc00"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const particleCount = 30 + Math.floor(Math.random() * 20);

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      particle.className = "firework-particle";
      particle.style.background = color;
      particle.style.boxShadow = `0 0 8px ${color}`;
      particle.style.left = x + "px";
      particle.style.top = y + "px";

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      let opacity = 1;

      container.appendChild(particle);

      let px = x;
      let py = y;

      const animate = () => {
        px += vx;
        py += vy + 0.05; // gravity
        opacity -= 0.015;

        particle.style.left = px + "px";
        particle.style.top = py + "px";
        particle.style.opacity = opacity;

        if (opacity > 0) {
          requestAnimationFrame(animate);
        } else {
          particle.remove();
        }
      };
      requestAnimationFrame(animate);
    }
  }

  // Nổ pháo mỗi 2-3 giây
  setInterval(() => {
    if (Math.random() > 0.3) createFirework();
  }, 1500);

  // Nổ khi click
  document.addEventListener("click", (e) => {
    // Không nổ khi click vào nút hoặc input
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest(".cr-item")) return;
    
    // Play sound immediately on click
    playSound();
    createFireworkClick(e.pageX, e.pageY);
  });

  function createFireworkClick(x, y) {
    const colors = ["#ffd700", "#ff4500", "#fff"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < 40; i++) {
        const particle = document.createElement("div");
        particle.className = "firework-particle";
        particle.style.background = color;
        particle.style.left = x + "px";
        particle.style.top = y + "px";
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 1;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        let opacity = 1;
        container.appendChild(particle);
        let px = x; let py = y;
        const animate = () => {
            px += vx; py += vy + 0.1; opacity -= 0.02;
            particle.style.left = px + "px";
            particle.style.top = py + "px";
            particle.style.opacity = opacity;
            if (opacity > 0) requestAnimationFrame(animate);
            else particle.remove();
        };
        requestAnimationFrame(animate);
    }
  }
}

// ===================== Daily Photo Modal =====================
// ===================== Camera Roll Modal =====================
function openDailyModal(photo) {
  if (!photo) return;
  const modal = document.getElementById("dailyModal");
  const modalImg = document.getElementById("dailyModalImg");
  const modalVideo = document.getElementById("dailyModalVideo");
  const modalTitle = document.getElementById("dailyModalTitle");
  
  const isVideo = photo.mimeType && photo.mimeType.startsWith("video/");
  
  if (isVideo) {
    modalImg.style.display = "none";
    modalVideo.style.display = "block";
    modalVideo.src = photo.url;
    modalVideo.play();
  } else {
    modalVideo.style.display = "none";
    modalVideo.pause();
    modalVideo.src = "";
    modalImg.style.display = "block";
    modalImg.src = photo.url;
    modalImg.alt = photo.name || "";
  }
  
  // Hiện tên + ngày trong modal
  const dateStr = photo.time
    ? new Date(photo.time).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })
    : "";
  const titleParts = [photo.name, dateStr].filter(Boolean);
  modalTitle.innerHTML =
    titleParts.map((t, i) =>
      i === 0
        ? `<span style="font-size:1rem;font-weight:400">${t}</span>`
        : `<span style="font-size:0.72rem;opacity:0.6;display:block;margin-top:4px">${t}</span>`
    ).join("");
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDailyModal(e) {
  if (e && e.target !== e.currentTarget && e.target.className !== "daily-modal-close") return;
  const modal = document.getElementById("dailyModal");
  const modalVideo = document.getElementById("dailyModalVideo");
  
  modal.classList.remove("open");
  document.body.style.overflow = "";
  
  // Stop video
  modalVideo.pause();
  modalVideo.src = "";
}

// Đóng modal bằng phím Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = document.getElementById("dailyModal");
    if (modal && modal.classList.contains("open")) {
      closeDailyModal(); // Call the new closeDailyModal
    }
  }
});

// ===================== Upload Panel =====================
const currentUploadType = "daily";

function toggleUpload() {
  const body = document.getElementById("uploadBody");
  const chevron = document.getElementById("uploadChevron");
  body.classList.toggle("open");
  chevron.classList.toggle("open");
}

// File preview khi chọn ảnh
document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const dropZone = document.getElementById("dropZone");

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      if (fileInput.files[0]) previewFile(fileInput.files[0]);
    });
  }

  // Drag & drop support
  if (dropZone) {
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      const file = e.dataTransfer.files[0];
      if (file && (file.type.startsWith("image/") || file.type.startsWith("video/"))) {
        document.getElementById("fileInput").files = e.dataTransfer.files;
        previewFile(file);
      }
    });
  }
});

function previewFile(file) {
  const nameInput = document.getElementById("photoName");
  const previewContent = document.getElementById("previewContent");
  const previewImg = document.getElementById("previewImg");
  const dropContent = document.getElementById("dropContent");

  // Xóa preview cũ (nếu là video)
  const oldVideo = previewContent.querySelector("video");
  if (oldVideo) oldVideo.remove();
  previewImg.style.display = "none"; // Hide image by default

  if (file.type.startsWith("video/")) {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.controls = true; // Add controls for video preview
    video.style.maxWidth = "100%"; // Ensure video fits
    video.style.maxHeight = "100%";
    video.style.objectFit = "contain";
    previewContent.appendChild(video);
  } else {
    previewImg.src = URL.createObjectURL(file);
    previewImg.style.display = "block";
  }

  dropContent.style.display = "none";
  previewContent.style.display = "flex"; // Use flex to center content
  nameInput.value = file.name.replace(/\.[^/.]+$/, "") || "family_photo";

  // Auto-fill tên file nếu input trống
  if (!nameInput.value.trim()) {
    nameInput.value = file.name.replace(/\.[^/.]+$/, "");
  }
}

async function uploadPhoto() {
  const fileInput = document.getElementById("fileInput");
  const nameInput = document.getElementById("photoName");
  const uploadBtn = document.getElementById("uploadBtn");
  const btnText = document.getElementById("uploadBtnText");
  const status = document.getElementById("uploadStatus");

  if (!fileInput.files[0]) {
    showUploadStatus("⚠️ Chưa chọn file nào!", "error");
    return;
  }

  const file = fileInput.files[0];
  const name = nameInput.value.trim() || file.name.replace(/\.[^/.]+$/, "") || "photo";

  // Giới hạn 50MB (base64 sẽ phình ~1.33x)
  if (file.size > 50 * 1024 * 1024) {
    showUploadStatus("⚠️ File quá lớn (tối đa 50MB)", "error");
    return;
  }

  uploadBtn.disabled = true;
  btnText.textContent = "⏳ Đang upload...";
  status.textContent = "";
  status.className = "upload-status";

  const reader = new FileReader();
  reader.onerror = () => {
    showUploadStatus("❌ Không đọc được file", "error");
    uploadBtn.disabled = false;
    btnText.textContent = "📸 Lưu ảnh";
  };
  reader.onload = async (e) => {
    try {
      const dataUrl = e.target.result;
      // Lấy mimeType từ data URL (chính xác hơn file.type trên iOS)
      const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
      let mimeType = mimeMatch ? mimeMatch[1] : (file.type || "image/jpeg");

      // Lấy phần base64 thực sự
      const commaIdx = dataUrl.indexOf(",");
      if (commaIdx === -1) {
        showUploadStatus("❌ File không hợp lệ", "error");
        return;
      }
      const base64 = dataUrl.substring(commaIdx + 1);

      // Gửi lên server để normalize
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mimeType, data: base64, folderType: currentUploadType }),
      });

      const result = await res.json();

      if (res.ok) {
        showUploadStatus("✅ Đã lưu kỷ niệm của nhà! 📸", "success");

        // Reset form
        fileInput.value = "";
        nameInput.value = "";
        document.getElementById("previewContent").style.display = "none";
        document.getElementById("dropContent").style.display = "flex";

        // Thêm ảnh mới vào camera roll
        const newPhoto = {
          id: result.id,
          name: name,
          url: `/api/image?id=${result.id}`,
          time: new Date().toISOString(),
        };
        dailyPhotos.unshift(newPhoto);
        renderCameraRoll();
      } else {
        // Hiện đúng lỗi từ server để dễ debug
        const errMsg = result.error || "Upload thất bại";
        const errDetail = result.detail?.errors?.[0]?.message || "";
        showUploadStatus(`❌ ${errMsg}${errDetail ? " — " + errDetail : ""}`, "error");
        console.error("Upload failed:", result);
      }
    } catch (err) {
      showUploadStatus(`❌ Lỗi kết nối: ${err.message}`, "error");
      console.error("Upload exception:", err);
    } finally {
      uploadBtn.disabled = false;
      btnText.textContent = "📸 Lưu ảnh";
    }
  };
  reader.readAsDataURL(file);
}

function showUploadStatus(msg, type) {
  const status = document.getElementById("uploadStatus");
  status.textContent = msg;
  status.className = `upload-status ${type}`;
}

// Refresh danh sách ảnh sau khi upload — mượt, không reinit toàn bộ
async function refreshSlideshow() {
  const img = document.getElementById("mainPhoto");
  const loading = document.getElementById("photoLoading");
  const dotsContainer = document.getElementById("slideDots");
  const prevBtn = document.getElementById("slidePrev");
  const nextBtn = document.getElementById("slideNext");

  try {
    const res = await fetch("/api/photos");
    if (res.ok) {
      const data = await res.json();
      if (data.photos && data.photos.length > 0) {
        const newPhotos = data.photos;

        // Cập nhật danh sách
        photos = newPhotos;

        // Chuyển đến ảnh vừa upload (cuối danh sách) — mượt
        const newIndex = photos.length - 1;
        currentIndex = newIndex;

        // Cập nhật dots
        renderDots(dotsContainer);

        // Hiển thị ảnh mới với fade
        showPhoto(currentIndex, img, loading, dotsContainer);

        // Hiện lại nút nếu có >1 ảnh
        if (photos.length > 1) {
          prevBtn.style.display = "";
          nextBtn.style.display = "";
          dotsContainer.style.display = "";
        }
      }
    }
  } catch (err) {
    console.warn("Không thể refresh slideshow:", err);
  }
}
