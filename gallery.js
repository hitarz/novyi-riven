/**
 * Партія «Новий Рівень» — Галерея ліцею (gallery.js)
 * Чиста галерея фотографій (без підписів та зайвого тексту).
 * Масове завантаження фотографій в альбоми (по 1, 10, 50+ фото за раз).
 * Додавання та видалення фото доступне виключно адміністратору партії (admin.js).
 */

// Початкові альбоми ліцею
const DEFAULT_ALBUMS = [
  {
    id: "halloween_2026",
    title: "🎃 Хеловін 2026",
    desc: "Містична атмосфера, фотозона з гарбузами, образи учнів та викладачів ліцею.",
    date: "02 Листопада 2026",
    category: "event",
    photos: []
  },
  {
    id: "general_album",
    title: "📸 Загальний альбом ліцею",
    desc: "Спільна історія нашого ліцею, пам'ятні моменти з перерв, уроків та життя ліцейної родини.",
    date: "2026",
    category: "general",
    photos: []
  }
];

const STORAGE_KEY_GALLERY = "novyi_riven_gallery_albums_v3";

class LyceumGalleryApp {
  constructor() {
    this.albums = this.loadAlbums();
    this.currentAlbumId = null; // null = список папок, string = перегляд папки
    this.activePhotoList = [];
    this.currentPhotoIndex = 0;
    this.selectedFiles = []; // Масив файлів для масового завантаження

    this.initDOMElements();
    this.attachEvents();
    this.checkUrlHash();
    this.checkRemoteData();
    this.render();
  }

  loadAlbums() {
    try {
      localStorage.removeItem("novyi_riven_gallery_albums_v1");
      localStorage.removeItem("novyi_riven_gallery_albums_v2");
      const data = localStorage.getItem(STORAGE_KEY_GALLERY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn("Помилка завантаження альбомів:", e);
    }
    this.saveAlbums(DEFAULT_ALBUMS);
    return DEFAULT_ALBUMS;
  }

  saveAlbums(list) {
    try {
      localStorage.setItem(STORAGE_KEY_GALLERY, JSON.stringify(list));
    } catch (e) {}
  }

  async checkRemoteData() {
    try {
      const res = await fetch("albums.json");
      if (res.ok) {
        const remoteAlbums = await res.json();
        if (Array.isArray(remoteAlbums) && remoteAlbums.length > 0) {
          let changed = false;
          remoteAlbums.forEach(ra => {
            const localAlbum = this.albums.find(a => a.id === ra.id);
            if (!localAlbum) {
              this.albums.push(ra);
              changed = true;
            } else if (Array.isArray(ra.photos)) {
              ra.photos.forEach(rp => {
                if (!localAlbum.photos.some(p => p.id === rp.id)) {
                  localAlbum.photos.push(rp);
                  changed = true;
                }
              });
            }
          });
          if (changed) {
            this.saveAlbums(this.albums);
            this.render();
          }
        }
      }
    } catch (e) {}
  }

  initDOMElements() {
    this.foldersView = document.getElementById("foldersOverviewSection");
    this.subfolderView = document.getElementById("subfolderViewSection");
    this.foldersGrid = document.getElementById("galleryFoldersGrid");
    this.photosGrid = document.getElementById("photosGrid");
    this.currentFolderTitle = document.getElementById("currentFolderTitle");
    this.currentFolderMeta = document.getElementById("currentFolderMeta");
    this.btnBackToFolders = document.getElementById("btnBackToFolders");
    this.mobileNavToggle = document.getElementById("mobileNavToggle");
    this.mobileDropdownMenu = document.getElementById("mobileDropdownMenu");

    // Lightbox елементи
    this.lightboxModal = document.getElementById("lightboxModal");
    this.lightboxImg = document.getElementById("lightboxImg");
    this.btnCloseLightbox = document.getElementById("btnCloseLightbox");
    this.btnPrevPhoto = document.getElementById("btnPrevPhoto");
    this.btnNextPhoto = document.getElementById("btnNextPhoto");

    // Модальне вікно завантаження фото
    this.btnOpenUploadModal = document.getElementById("btnOpenUploadPhoto");
    this.uploadPhotoModal = document.getElementById("uploadPhotoModal");
    this.btnCloseUploadModal = document.getElementById("btnCloseUploadModal");
    this.uploadPhotoForm = document.getElementById("uploadPhotoForm");
    this.targetAlbumSelect = document.getElementById("targetAlbumSelect");
    this.photoFileInput = document.getElementById("galleryPhotoFile");
    this.photoDropzone = document.getElementById("galleryPhotoDropzone");
    this.multiPreviewGrid = document.getElementById("galleryMultiPreviewGrid");
    this.multiCountEl = document.getElementById("galleryMultiCount");
    this.btnSubmitPhotos = document.getElementById("btnSubmitGalleryPhotos");
  }

  attachEvents() {
    // Мобільне меню
    if (this.mobileNavToggle && this.mobileDropdownMenu) {
      this.mobileNavToggle.addEventListener("click", () => {
        this.mobileDropdownMenu.classList.toggle("open");
      });
    }

    // Кнопка назад до списку папок
    if (this.btnBackToFolders) {
      this.btnBackToFolders.addEventListener("click", () => {
        this.openFolder(null);
      });
    }

    // Хлібні крихти
    const breadcrumbRoot = document.getElementById("breadcrumbRoot");
    if (breadcrumbRoot) {
      breadcrumbRoot.addEventListener("click", () => this.openFolder(null));
    }

    // Lightbox події
    if (this.btnCloseLightbox) {
      this.btnCloseLightbox.addEventListener("click", () => this.closeLightbox());
    }

    if (this.btnPrevPhoto) {
      this.btnPrevPhoto.addEventListener("click", () => this.navigateLightbox(-1));
    }

    if (this.btnNextPhoto) {
      this.btnNextPhoto.addEventListener("click", () => this.navigateLightbox(1));
    }

    if (this.lightboxModal) {
      this.lightboxModal.addEventListener("click", (e) => {
        if (e.target === this.lightboxModal) {
          this.closeLightbox();
        }
      });
    }

    // Клавіші стрілок для перегляду фото
    window.addEventListener("keydown", (e) => {
      if (!this.lightboxModal || !this.lightboxModal.classList.contains("open")) return;
      if (e.key === "ArrowLeft") this.navigateLightbox(-1);
      if (e.key === "ArrowRight") this.navigateLightbox(1);
      if (e.key === "Escape") this.closeLightbox();
    });

    // Відкриття модального вікна завантаження (тільки адмін)
    if (this.btnOpenUploadModal && this.uploadPhotoModal) {
      this.btnOpenUploadModal.addEventListener("click", () => {
        this.populateAlbumSelect();
        this.uploadPhotoModal.classList.add("open");
      });
    }

    if (this.btnCloseUploadModal && this.uploadPhotoModal) {
      this.btnCloseUploadModal.addEventListener("click", () => {
        this.uploadPhotoModal.classList.remove("open");
      });
    }

    if (this.uploadPhotoModal) {
      this.uploadPhotoModal.addEventListener("click", (e) => {
        if (e.target === this.uploadPhotoModal) {
          this.uploadPhotoModal.classList.remove("open");
        }
      });
    }

    // Дропзона та масовий вибір файлів (клік, drag&drop, Ctrl+V)
    if (this.photoDropzone && this.photoFileInput) {
      this.photoDropzone.addEventListener("click", () => this.photoFileInput.click());

      this.photoFileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.addSelectedFiles(Array.from(e.target.files));
          this.photoFileInput.value = ""; // Очищаємо для можливості повторного вибору
        }
      });

      this.photoDropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        this.photoDropzone.classList.add("dragover");
      });
      this.photoDropzone.addEventListener("dragleave", () => {
        this.photoDropzone.classList.remove("dragover");
      });
      this.photoDropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        this.photoDropzone.classList.remove("dragover");
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.addSelectedFiles(Array.from(e.dataTransfer.files));
        }
      });
    }

    // Ctrl + V вставка фото в альбом
    window.addEventListener("paste", (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const pastedFiles = [];
      if (clipboardData.items) {
        for (let i = 0; i < clipboardData.items.length; i++) {
          const item = clipboardData.items[i];
          if (item.type && item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) pastedFiles.push(file);
          }
        }
      }

      if (pastedFiles.length === 0 && clipboardData.files && clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          const file = clipboardData.files[i];
          if (file.type && file.type.startsWith("image/")) {
            pastedFiles.push(file);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        if (this.uploadPhotoModal && !this.uploadPhotoModal.classList.contains("open")) {
          this.populateAlbumSelect();
          this.uploadPhotoModal.classList.add("open");
        }
        this.addSelectedFiles(pastedFiles);
        if (this.photoDropzone) {
          this.photoDropzone.classList.add("pasted-flash");
          setTimeout(() => this.photoDropzone.classList.remove("pasted-flash"), 600);
        }
      }
    });

    // Форма завантаження фото
    if (this.uploadPhotoForm) {
      this.uploadPhotoForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleUploadPhoto();
      });
    }
  }

  addSelectedFiles(files) {
    const validImages = files.filter(f => f && f.type && f.type.startsWith("image/"));
    if (validImages.length === 0) return;

    this.selectedFiles.push(...validImages);
    this.renderMultiPreviews();
  }

  removeSelectedFile(index) {
    if (index >= 0 && index < this.selectedFiles.length) {
      this.selectedFiles.splice(index, 1);
      this.renderMultiPreviews();
    }
  }

  renderMultiPreviews() {
    if (!this.multiPreviewGrid || !this.multiCountEl) return;

    if (this.selectedFiles.length === 0) {
      this.multiPreviewGrid.style.display = "none";
      this.multiPreviewGrid.innerHTML = "";
      this.multiCountEl.style.display = "none";
      this.multiCountEl.textContent = "";
      return;
    }

    this.multiPreviewGrid.style.display = "grid";
    this.multiCountEl.style.display = "block";
    this.multiCountEl.textContent = `📸 Обрано ${this.selectedFiles.length} фото для завантаження:`;

    this.multiPreviewGrid.innerHTML = this.selectedFiles.map((file, idx) => {
      const tempUrl = URL.createObjectURL(file);
      return `
        <div class="multi-preview-item" title="${file.name || 'Фото'}">
          <img src="${tempUrl}" alt="${file.name || 'Фото'}">
          <button type="button" class="multi-preview-remove" onclick="window.galleryApp.removeSelectedFile(${idx})" title="Прибрати це фото">✕</button>
        </div>
      `;
    }).join("");
  }

  checkUrlHash() {
    const hash = window.location.hash.replace("#", "");
    if (hash && this.albums.some(a => a.id === hash)) {
      this.currentAlbumId = hash;
    }
  }

  populateAlbumSelect() {
    if (!this.targetAlbumSelect) return;
    this.targetAlbumSelect.innerHTML = this.albums.map(a => `
      <option value="${a.id}" ${this.currentAlbumId === a.id ? 'selected' : ''}>${a.title}</option>
    `).join("");
  }

  async handleUploadPhoto() {
    if (this.selectedFiles.length === 0) {
      alert("Будь ласка, оберіть фотографії або вставте їх через Ctrl + V.");
      return;
    }

    const albumId = this.targetAlbumSelect ? this.targetAlbumSelect.value : (this.currentAlbumId || "halloween_2026");
    const album = this.albums.find(a => a.id === albumId);
    if (!album) {
      alert("Оберіть папку для завантаження.");
      return;
    }

    const submitBtn = this.btnSubmitPhotos || document.getElementById("btnSubmitGalleryPhotos");
    const originalBtnText = submitBtn ? submitBtn.innerHTML : "Завантажити фото в альбом";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = `⏳ Обробка ${this.selectedFiles.length} фото...`;
    }

    try {
      // Стискаємо всі обрані фото паралельно
      const compressedList = await Promise.all(
        this.selectedFiles.map(file => this.compressImageFile(file))
      );

      const timestamp = Date.now();
      // Зберігаємо виключно чисті фотографії без підписів
      const newPhotos = compressedList.map((src, i) => ({
        id: `photo_${timestamp}_${i}_${Math.random().toString(36).substr(2, 5)}`,
        src: src,
        date: new Date().toLocaleDateString("uk-UA")
      }));

      // Додаємо нові кадри на початок альбому
      album.photos.unshift(...newPhotos);
      this.saveAlbums(this.albums);

      // Очищаємо стан модалки
      this.selectedFiles = [];
      this.renderMultiPreviews();
      if (this.uploadPhotoForm) this.uploadPhotoForm.reset();
      if (this.uploadPhotoModal) this.uploadPhotoModal.classList.remove("open");

      // Відкриваємо цільову папку та оновлюємо вигляд
      this.openFolder(albumId);

      if (window.adminAuth && typeof window.adminAuth.showAdminToast === "function") {
        window.adminAuth.showAdminToast(`📸 Успішно додано ${newPhotos.length} фото до альбому!`);
      } else {
        alert(`📸 Успішно додано ${newPhotos.length} фото до папки «${album.title}»!`);
      }
    } catch (err) {
      console.error("Помилка обробки фотографій:", err);
      alert("Виникла помилка під час стиснення фотографій. Спробуйте ще раз.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  }

  deletePhoto(photoId) {
    const album = this.albums.find(a => a.id === this.currentAlbumId);
    if (!album) return;
    const photo = album.photos.find(p => p.id === photoId);
    if (!photo) return;

    if (!confirm("Ви впевнені, що хочете видалити це фото з альбому?")) {
      return;
    }

    album.photos = album.photos.filter(p => p.id !== photoId);
    this.saveAlbums(this.albums);
    this.renderSubfolder();

    if (window.adminAuth && typeof window.adminAuth.showAdminToast === "function") {
      window.adminAuth.showAdminToast("🗑️ Фото успішно видалено");
    }
  }

  exportAlbumsToJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.albums, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "albums.json");
    dlAnchorElem.click();
    console.log("Альбоми експортовано успішно!");
  }

  importAlbums(incoming) {
    if (!Array.isArray(incoming)) return;
    this.albums = incoming;
    this.saveAlbums(this.albums);
    this.render();
  }

  openFolder(albumId) {
    this.currentAlbumId = albumId;
    if (albumId) {
      window.location.hash = albumId;
    } else {
      history.pushState("", document.title, window.location.pathname + window.location.search);
    }
    this.render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  openLightbox(photoIndex) {
    this.currentPhotoIndex = photoIndex;
    const photo = this.activePhotoList[photoIndex];
    if (!photo) return;

    this.lightboxImg.src = photo.src;
    this.lightboxModal.classList.add("open");
  }

  closeLightbox() {
    if (this.lightboxModal) {
      this.lightboxModal.classList.remove("open");
    }
  }

  navigateLightbox(direction) {
    if (this.activePhotoList.length === 0) return;
    this.currentPhotoIndex = (this.currentPhotoIndex + direction + this.activePhotoList.length) % this.activePhotoList.length;
    this.openLightbox(this.currentPhotoIndex);
  }

  render() {
    if (!this.currentAlbumId) {
      if (this.foldersView) this.foldersView.style.display = "block";
      if (this.subfolderView) this.subfolderView.style.display = "none";
      this.renderFoldersGrid();
    } else {
      if (this.foldersView) this.foldersView.style.display = "none";
      if (this.subfolderView) this.subfolderView.style.display = "block";
      this.renderSubfolder();
    }
  }

  renderFoldersGrid() {
    if (!this.foldersGrid) return;

    this.foldersGrid.innerHTML = this.albums.map(album => {
      const count = album.photos.length;
      const previewThumbs = album.photos.slice(0, 3);

      return `
        <div class="folder-card" onclick="window.galleryApp.openFolder('${album.id}')">
          <div class="folder-top-row">
            <div class="folder-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <span class="folder-count-badge">📁 ${count} фото</span>
          </div>

          <h3 class="folder-title">${album.title}</h3>
          <p class="folder-desc">${album.desc}</p>

          <div class="folder-previews-collage" style="${count === 0 ? 'display:flex; align-items:center; justify-content:center; background:rgba(0,255,102,0.03); border:1px dashed rgba(0,255,102,0.2);' : ''}">
            ${count === 0
              ? `<span style="font-size: 11px; color: var(--text-muted);">📷 Папка готова до фотографій</span>`
              : previewThumbs.map(p => `
                <img src="${p.src}" alt="Фото" class="folder-preview-img" loading="lazy">
              `).join("")}
          </div>

          <div class="folder-footer-row">
            <span>📅 ${album.date}</span>
            <span style="color: var(--neon-green); font-weight: 700;">Відкрити папку →</span>
          </div>
        </div>
      `;
    }).join("");
  }

  renderSubfolder() {
    const album = this.albums.find(a => a.id === this.currentAlbumId);
    if (!album) {
      this.openFolder(null);
      return;
    }

    this.activePhotoList = album.photos;

    if (this.currentFolderTitle) {
      this.currentFolderTitle.textContent = album.title;
    }

    if (this.currentFolderMeta) {
      this.currentFolderMeta.textContent = `${album.photos.length} фотографій`;
    }

    if (this.photosGrid) {
      if (album.photos.length === 0) {
        this.photosGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
            <p style="font-size: 16px;">У цій папці ще немає фотографій.</p>
            <p style="font-size: 13px; margin-top: 6px;" class="admin-only">Адміністратор може завантажити фото через кнопку «Додати фото» вгорі.</p>
          </div>
        `;
        return;
      }

      // Чиста сітка фотографій без будь-яких підписів чи тексту
      this.photosGrid.innerHTML = album.photos.map((photo, idx) => `
        <div class="photo-card" onclick="window.galleryApp.openLightbox(${idx})">
          <button type="button" class="btn-photo-delete admin-only" onclick="event.stopPropagation(); window.galleryApp.deletePhoto('${photo.id}')" title="Видалити фото">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          <img src="${photo.src}" alt="Фото" class="photo-thumb" loading="lazy">
        </div>
      `).join("");
    }
  }

  compressImageFile(file, maxWidth = 1400, maxHeight = 1600, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// Ініціалізація галереї
document.addEventListener("DOMContentLoaded", () => {
  window.galleryApp = new LyceumGalleryApp();
});
