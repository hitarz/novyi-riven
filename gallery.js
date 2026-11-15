/**
 * Партія «Новий Рівень» — Фотогалерея ліцею
 * З підтримкою Live-хмари Google Firebase: синхронізація фотографій наживо без комітів
 */

// Екранування HTML від XSS
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Початкові чисті альбоми ліцею
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

const STORAGE_KEY_GALLERY = "novyi_riven_gallery_albums_v4";

class LyceumGalleryApp {
  constructor() {
    this.db = null;
    this.isFirebaseLive = false;
    this.uploadMode = "files"; // "files" | "urls"
    this.albums = this.loadAlbums();
    this.currentAlbumId = null; // null = список папок, string = перегляд папки
    this.activePhotoList = [];
    this.currentPhotoIndex = 0;
    this.selectedFiles = []; // Масив файлів для масового завантаження

    this.initDOMElements();
    this.attachEvents();
    this.initTabs();
    this.initCreateAlbumModal();
    this.checkUrlHash();
    this.initFirebase();
    this.checkRemoteData();
    this.render();
  }

  loadAlbums() {
    try {
      // Повне очищення старих кешів попередніх версій
      localStorage.removeItem("novyi_riven_gallery_albums_v1");
      localStorage.removeItem("novyi_riven_gallery_albums_v2");
      localStorage.removeItem("novyi_riven_gallery_albums_v3");
      const data = localStorage.getItem(STORAGE_KEY_GALLERY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Помилка завантаження альбомів:", e);
    }
    this.saveAlbums(DEFAULT_ALBUMS);
    return JSON.parse(JSON.stringify(DEFAULT_ALBUMS));
  }

  saveAlbums(list) {
    try {
      localStorage.setItem(STORAGE_KEY_GALLERY, JSON.stringify(list));
    } catch (e) {}
  }

  initFirebase() {
    if (typeof firebase === "undefined" || !window.FIREBASE_CONFIG) {
      console.warn("Firebase SDK або FIREBASE_CONFIG не знайдені, працюємо в локальному режимі.");
      this.updateLiveIndicator(false);
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      this.db = firebase.database();

      // Індикатор зв'язку із сервером
      const connectedRef = this.db.ref(".info/connected");
      connectedRef.on("value", (snap) => {
        const isOnline = snap.val() === true;
        this.isFirebaseLive = isOnline;
        this.updateLiveIndicator(isOnline);
      });

      // Підписка на живі дані галереї у реальному часі
      this.db.ref("gallery_live").on("value", (snapshot) => {
        const liveData = snapshot.val();
        if (!liveData) return;

        let changed = false;

        // 1. Синхронізація створених альбомів з хмари
        if (liveData.albums && typeof liveData.albums === "object") {
          for (const [albId, albData] of Object.entries(liveData.albums)) {
            if (!albData) continue;
            let existing = this.albums.find(a => a.id === albId);
            if (!existing) {
              this.albums.push({
                id: albId,
                title: albData.title || albId,
                desc: albData.desc || "",
                date: albData.date || "",
                category: albData.category || "event",
                photos: []
              });
              changed = true;
            } else {
              if (albData.title && existing.title !== albData.title) {
                existing.title = albData.title;
                changed = true;
              }
              if (albData.desc && existing.desc !== albData.desc) {
                existing.desc = albData.desc;
                changed = true;
              }
            }
          }
        }

        // 2. Синхронізація фотографій за альбомами
        if (liveData.photos && typeof liveData.photos === "object") {
          for (const [albId, photosMap] of Object.entries(liveData.photos)) {
            let targetAlbum = this.albums.find(a => a.id === albId);
            if (!targetAlbum) {
              targetAlbum = {
                id: albId,
                title: albId,
                desc: "",
                date: "",
                category: "event",
                photos: []
              };
              this.albums.push(targetAlbum);
              changed = true;
            }

            if (photosMap && typeof photosMap === "object") {
              const cloudPhotosList = Object.values(photosMap).filter(p => p && p.src);
              // Сортуємо: свіжіші фото спочатку
              cloudPhotosList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

              // Перевірка змін
              const cloudIds = new Set(cloudPhotosList.map(p => p.id));
              const localIds = new Set(targetAlbum.photos.map(p => p.id));

              if (cloudIds.size !== localIds.size || [...cloudIds].some(id => !localIds.has(id))) {
                targetAlbum.photos = cloudPhotosList;
                changed = true;
              }
            } else {
              if (targetAlbum.photos.length > 0) {
                targetAlbum.photos = [];
                changed = true;
              }
            }
          }
        }

        if (changed) {
          this.saveAlbums(this.albums);
          this.render();
          this.populateAlbumSelect();
        }
      }, (error) => {
        console.warn("Помилка синхронізації gallery_live у Firebase:", error);
        this.updateLiveIndicator(false, error.message);
      });
    } catch (err) {
      console.warn("Помилка ініціалізації Firebase у галереї:", err);
      this.isFirebaseLive = false;
      this.updateLiveIndicator(false);
    }
  }

  updateLiveIndicator(isOnline, errorMsg) {
    const textEl = document.getElementById("liveSyncStatusGallery");
    const dotEl = document.getElementById("galleryLiveIndicatorDot");
    if (!textEl) return;

    if (isOnline) {
      textEl.textContent = "Live-хмара онлайн ⚡ (без комітів)";
      textEl.style.color = "var(--neon-green)";
      if (dotEl) {
        dotEl.style.backgroundColor = "var(--neon-green)";
        dotEl.style.boxShadow = "0 0 10px rgba(0, 255, 102, 0.6)";
      }
    } else {
      textEl.textContent = "Локальний режим (хмара очікує підключення)";
      textEl.style.color = "var(--text-muted)";
      if (dotEl) {
        dotEl.style.backgroundColor = "var(--text-muted)";
        dotEl.style.boxShadow = "none";
      }
    }
  }

  async checkRemoteData() {
    try {
      const res = await fetch("albums.json?_t=" + Date.now());
      if (res.ok) {
        const remoteAlbums = await res.json();
        if (Array.isArray(remoteAlbums) && remoteAlbums.length > 0) {
          let changed = false;
          remoteAlbums.forEach(ra => {
            const localAlbum = this.albums.find(a => a.id === ra.id);
            if (!localAlbum) {
              this.albums.push(ra);
              changed = true;
            } else if (Array.isArray(ra.photos) && ra.photos.length > 0) {
              if (!Array.isArray(localAlbum.photos) || localAlbum.photos.length === 0) {
                localAlbum.photos = [...ra.photos];
                changed = true;
              } else {
                ra.photos.forEach(rp => {
                  if (!localAlbum.photos.some(p => p.id === rp.id)) {
                    localAlbum.photos.push(rp);
                    changed = true;
                  }
                });
              }
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
    this.btnClearCurrentAlbum = document.getElementById("btnClearCurrentAlbum");
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
    this.photoUrlsInput = document.getElementById("galleryPhotoUrls");
    this.urlPreviewGrid = document.getElementById("galleryUrlPreviewGrid");
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

    // Кнопка очищення поточної папки
    if (this.btnClearCurrentAlbum) {
      this.btnClearCurrentAlbum.addEventListener("click", () => {
        this.clearCurrentAlbum();
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

    // Відкриття модального вікна завантаження
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
          this.photoFileInput.value = "";
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
        // Перемикаємо на вкладку файлів
        const tabFiles = document.getElementById("tabUploadFiles");
        if (tabFiles) tabFiles.click();

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

  initTabs() {
    const tabFiles = document.getElementById("tabUploadFiles");
    const tabUrls = document.getElementById("tabUploadUrls");
    const contentFiles = document.getElementById("tabContentFiles");
    const contentUrls = document.getElementById("tabContentUrls");

    if (tabFiles && tabUrls && contentFiles && contentUrls) {
      tabFiles.addEventListener("click", () => {
        this.uploadMode = "files";
        tabFiles.classList.add("active");
        tabUrls.classList.remove("active");
        contentFiles.style.display = "block";
        contentUrls.style.display = "none";
      });

      tabUrls.addEventListener("click", () => {
        this.uploadMode = "urls";
        tabUrls.classList.add("active");
        tabFiles.classList.remove("active");
        contentFiles.style.display = "none";
        contentUrls.style.display = "block";
      });
    }

    // Живе прев'ю посилань
    if (this.photoUrlsInput && this.urlPreviewGrid) {
      this.photoUrlsInput.addEventListener("input", () => {
        this.renderUrlPreviews();
      });
    }
  }

  renderUrlPreviews() {
    if (!this.photoUrlsInput || !this.urlPreviewGrid) return;
    const lines = this.photoUrlsInput.value
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.startsWith("http://") || l.startsWith("https://") || l.startsWith("data:image/"));

    if (lines.length === 0) {
      this.urlPreviewGrid.style.display = "none";
      this.urlPreviewGrid.innerHTML = "";
      return;
    }

    this.urlPreviewGrid.style.display = "grid";
    this.urlPreviewGrid.innerHTML = lines.slice(0, 6).map((url) => `
      <div class="multi-preview-item" title="${escapeHtml(url)}">
        <img src="${escapeHtml(url)}" alt="Прев'ю" onerror="this.parentElement.style.opacity='0.4';">
      </div>
    `).join("");
  }

  initCreateAlbumModal() {
    const btnOpen = document.getElementById("btnOpenCreateAlbumModal");
    const modal = document.getElementById("createAlbumModal");
    const btnClose = document.getElementById("btnCloseCreateAlbumModal");
    const form = document.getElementById("createAlbumForm");

    if (btnOpen && modal) {
      btnOpen.addEventListener("click", () => {
        modal.classList.add("open");
      });
    }

    if (btnClose && modal) {
      btnClose.addEventListener("click", () => {
        modal.classList.remove("open");
      });
    }

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("open");
      });
    }

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleCreateAlbum();
      });
    }
  }

  handleCreateAlbum() {
    if (!window.adminAuth || !window.adminAuth.isAdmin) {
      alert("Створення альбомів доступне виключно адміністратору партії!");
      return;
    }

    const titleInput = document.getElementById("newAlbumTitle");
    const descInput = document.getElementById("newAlbumDesc");
    const dateInput = document.getElementById("newAlbumDate");

    const title = (titleInput ? titleInput.value : "").trim();
    if (!title) {
      alert("Вкажіть назву альбому.");
      return;
    }

    const desc = descInput ? descInput.value.trim() : "";
    const date = dateInput && dateInput.value.trim() ? dateInput.value.trim() : new Date().toLocaleDateString("uk-UA");
    const albumId = "album_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);

    const newAlbum = {
      id: albumId,
      title: title,
      desc: desc || "Фотографії з події ліцею",
      date: date,
      category: "event",
      photos: []
    };

    this.albums.push(newAlbum);
    this.saveAlbums(this.albums);
    this.render();
    this.populateAlbumSelect();

    if (this.db) {
      this.db.ref(`gallery_live/albums/${albumId}`).set({
        id: albumId,
        title: newAlbum.title,
        desc: newAlbum.desc,
        date: newAlbum.date,
        category: newAlbum.category
      }).then(() => {
        if (window.adminAuth && typeof window.adminAuth.showAdminToast === "function") {
          window.adminAuth.showAdminToast(`📁 Альбом «${title}» створено наживо без коміту!`);
        }
      }).catch(err => console.warn(err));
    }

    const modal = document.getElementById("createAlbumModal");
    if (modal) modal.classList.remove("open");
    const form = document.getElementById("createAlbumForm");
    if (form) form.reset();

    // Переходимо до нового альбому
    this.openFolder(albumId);
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
      const safeName = escapeHtml(file.name || 'Фото');
      return `
        <div class="multi-preview-item" title="${safeName}">
          <img src="${tempUrl}" alt="${safeName}">
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
      <option value="${escapeHtml(a.id)}" ${this.currentAlbumId === a.id ? 'selected' : ''}>${escapeHtml(a.title)}</option>
    `).join("");
  }

  async handleUploadPhoto() {
    if (!window.adminAuth || !window.adminAuth.isAdmin) {
      alert("Завантаження фото доступне виключно адміністратору партії!");
      return;
    }

    const albumId = this.targetAlbumSelect ? this.targetAlbumSelect.value : (this.currentAlbumId || "halloween_2026");
    const album = this.albums.find(a => a.id === albumId);
    if (!album) {
      alert("Оберіть папку для завантаження.");
      return;
    }

    const submitBtn = this.btnSubmitPhotos || document.getElementById("btnSubmitGalleryPhotos");
    const originalBtnText = submitBtn ? submitBtn.innerHTML : "⚡ Опублікувати наживо в альбом";

    // 1. Якщо обрано режим URL посилань
    if (this.uploadMode === "urls") {
      const rawUrls = this.photoUrlsInput ? this.photoUrlsInput.value : "";
      const urls = rawUrls
        .split("\n")
        .map(u => u.trim())
        .filter(u => u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:image/"));

      if (urls.length === 0) {
        alert("Будь ласка, вкажіть хоча б одне пряме посилання на фотографію (http:// або https://).");
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = `⏳ Додавання ${urls.length} фото...`;
      }

      const timestamp = Date.now();
      const newPhotos = urls.map((url, i) => ({
        id: `photo_${timestamp}_${i}_${Math.random().toString(36).substr(2, 5)}`,
        src: url,
        date: new Date().toLocaleDateString("uk-UA"),
        timestamp: timestamp + i
      }));

      album.photos.unshift(...newPhotos);
      this.saveAlbums(this.albums);

      // Синхронізація з хмарою Firebase
      if (this.db) {
        const updates = {};
        newPhotos.forEach(p => {
          updates[`gallery_live/photos/${albumId}/${p.id}`] = p;
        });
        this.db.ref().update(updates).catch(err => console.warn("Firebase upload error:", err));
      }

      if (this.photoUrlsInput) this.photoUrlsInput.value = "";
      if (this.urlPreviewGrid) this.urlPreviewGrid.style.display = "none";
      if (this.uploadPhotoForm) this.uploadPhotoForm.reset();
      if (this.uploadPhotoModal) this.uploadPhotoModal.classList.remove("open");

      this.openFolder(albumId);

      const successMsg = `📸 ${newPhotos.length} фото успішно додано наживо для всіх учнів (без коміту)!`;
      if (window.adminAuth && typeof window.adminAuth.showAdminToast === "function") {
        window.adminAuth.showAdminToast(successMsg);
      } else {
        alert(successMsg);
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
      return;
    }

    // 2. Якщо обрано файли з пристрою
    if (this.selectedFiles.length === 0) {
      alert("Будь ласка, оберіть фотографії або вставте їх через Ctrl + V.");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = `⏳ Стиснення ${this.selectedFiles.length} фото...`;
    }

    try {
      // Стискаємо всі обрані фото паралельно
      const compressedList = await Promise.all(
        this.selectedFiles.map(file => this.compressImageFile(file))
      );

      const timestamp = Date.now();
      const newPhotos = compressedList.map((src, i) => ({
        id: `photo_${timestamp}_${i}_${Math.random().toString(36).substr(2, 5)}`,
        src: src,
        date: new Date().toLocaleDateString("uk-UA"),
        timestamp: timestamp + i
      }));

      // Додаємо нові кадри на початок альбому
      album.photos.unshift(...newPhotos);
      this.saveAlbums(this.albums);

      // Синхронізуємо кожне фото в Firebase Realtime Database
      if (this.db) {
        const updates = {};
        newPhotos.forEach(p => {
          updates[`gallery_live/photos/${albumId}/${p.id}`] = p;
        });
        this.db.ref().update(updates).then(() => {
          if (window.adminAuth && typeof window.adminAuth.showAdminToast === "function") {
            window.adminAuth.showAdminToast(`⚡ Синхронізовано з хмарою наживо!`);
          }
        }).catch(err => {
          console.warn("Firebase upload error:", err);
        });
      }

      // Очищаємо стан модалки
      this.selectedFiles = [];
      this.renderMultiPreviews();
      if (this.uploadPhotoForm) this.uploadPhotoForm.reset();
      if (this.uploadPhotoModal) this.uploadPhotoModal.classList.remove("open");

      // Відкриваємо цільову папку та оновлюємо вигляд
      this.openFolder(albumId);

      const successMsg = `📸 ${newPhotos.length} фото успішно додано до папки «${album.title}» без коміту!`;
      if (window.adminAuth && typeof window.adminAuth.showAdminToast === "function") {
        window.adminAuth.showAdminToast(successMsg);
      } else {
        alert(successMsg);
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
    if (!window.adminAuth || !window.adminAuth.isAdmin) {
      alert("Видалення фото доступне виключно адміністратору партії!");
      return;
    }
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

    // Видаляємо з Firebase Realtime Database
    if (this.db) {
      this.db.ref(`gallery_live/photos/${this.currentAlbumId}/${photoId}`).remove()
        .then(() => {
          if (window.adminAuth && typeof window.adminAuth.showAdminToast === "function") {
            window.adminAuth.showAdminToast("🗑️ Фото видалено з хмари наживо");
          }
        })
        .catch(err => console.warn("Firebase delete error:", err));
    } else {
      if (window.adminAuth && typeof window.adminAuth.showAdminToast === "function") {
        window.adminAuth.showAdminToast("🗑️ Фото успішно видалено");
      }
    }
  }

  clearCurrentAlbum() {
    if (!window.adminAuth || !window.adminAuth.isAdmin) {
      alert("Очищення альбому доступне виключно адміністратору партії!");
      return;
    }
    const album = this.albums.find(a => a.id === this.currentAlbumId);
    if (!album) return;

    if (album.photos.length === 0) {
      alert("Ця папка вже порожня!");
      return;
    }

    if (!confirm(`Ви впевнені, що хочете видалити ВСІ ${album.photos.length} фотографій з альбому «${album.title}»?`)) {
      return;
    }

    album.photos = [];
    this.saveAlbums(this.albums);
    this.renderSubfolder();

    // Очищаємо вузол у Firebase
    if (this.db) {
      this.db.ref(`gallery_live/photos/${this.currentAlbumId}`).remove()
        .then(() => {
          if (window.adminAuth && typeof window.adminAuth.showAdminToast === "function") {
            window.adminAuth.showAdminToast(`🗑️ Альбом «${album.title}» повністю очищено в хмарі!`);
          }
        })
        .catch(err => console.warn("Firebase clear album error:", err));
    } else {
      if (window.adminAuth && typeof window.adminAuth.showAdminToast === "function") {
        window.adminAuth.showAdminToast(`🗑️ Альбом «${album.title}» очищено`);
      }
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

  seedFirebaseFromLocal() {
    if (!this.db) {
      alert("Firebase ще не підключено або недоступний.");
      return;
    }
    const updates = {};
    this.albums.forEach(album => {
      updates[`gallery_live/albums/${album.id}`] = {
        id: album.id,
        title: album.title,
        desc: album.desc || "",
        date: album.date || "",
        category: album.category || "event"
      };
      if (Array.isArray(album.photos)) {
        album.photos.forEach(p => {
          updates[`gallery_live/photos/${album.id}/${p.id}`] = p;
        });
      }
    });

    this.db.ref().update(updates).then(() => {
      const msg = `⚡ Всі ${this.albums.length} альбомів синхронізовано з хмарою Firebase!`;
      if (window.adminAuth && typeof window.adminAuth.showAdminToast === "function") {
        window.adminAuth.showAdminToast(msg);
      } else {
        alert(msg);
      }
    }).catch(err => {
      alert("Помилка запису у Firebase: " + err.message);
    });
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
      const count = album.photos ? album.photos.length : 0;
      const previewThumbs = (album.photos || []).slice(0, 3);
      const safeId = escapeHtml(album.id);
      const safeTitle = escapeHtml(album.title);
      const safeDesc = escapeHtml(album.desc);
      const safeDate = escapeHtml(album.date);

      return `
        <div class="folder-card" onclick="window.galleryApp.openFolder('${safeId}')">
          <div class="folder-top-row">
            <div class="folder-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <span class="folder-count-badge">📁 ${count} фото</span>
          </div>

          <h3 class="folder-title">${safeTitle}</h3>
          <p class="folder-desc">${safeDesc}</p>

          <div class="folder-previews-collage" style="${count === 0 ? 'display:flex; align-items:center; justify-content:center; background:rgba(0,255,102,0.03); border:1px dashed rgba(0,255,102,0.2);' : ''}">
            ${count === 0
              ? `<span style="font-size: 11px; color: var(--text-muted);">📷 Папка готова до фотографій</span>`
              : previewThumbs.map(p => `
                <img src="${escapeHtml(p.src)}" alt="Фото" class="folder-preview-img" loading="lazy">
              `).join("")}
          </div>

          <div class="folder-footer-row">
            <span>📅 ${safeDate}</span>
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

    this.activePhotoList = album.photos || [];

    if (this.currentFolderTitle) {
      this.currentFolderTitle.textContent = album.title;
    }

    if (this.currentFolderMeta) {
      this.currentFolderMeta.textContent = `${this.activePhotoList.length} фотографій`;
    }

    if (this.photosGrid) {
      if (this.activePhotoList.length === 0) {
        this.photosGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
            <p style="font-size: 16px;">У цій папці ще немає фотографій.</p>
            <p style="font-size: 13px; margin-top: 6px;" class="admin-only">Адміністратор може завантажити фото через кнопку «Додати фото» вгорі (без коміту).</p>
          </div>
        `;
        return;
      }

      // Чиста сітка фотографій без підписів
      this.photosGrid.innerHTML = this.activePhotoList.map((photo, idx) => {
        const safeId = escapeHtml(photo.id);
        const safeSrc = escapeHtml(photo.src);
        return `
        <div class="photo-card" onclick="window.galleryApp.openLightbox(${idx})">
          <button type="button" class="btn-photo-delete admin-only" onclick="event.stopPropagation(); window.galleryApp.deletePhoto('${safeId}')" title="Видалити фото">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          <img src="${safeSrc}" alt="Фото" class="photo-thumb" loading="lazy">
        </div>
      `;
      }).join("");
    }
  }

  compressImageFile(file, maxWidth = 1400, maxHeight = 1600, quality = 0.82) {
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
