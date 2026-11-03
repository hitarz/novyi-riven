/**
 * Партія «Новий Рівень» — Битва Костюмів (Хеловін 2026)
 * Образи завантажуються адміністратором, імена учасників залишаються анонімними (лише костюм та клас).
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

// Генератор гарних SVG-ілюстрацій за замовчуванням
function generateCostumeSvg(type, bgGrad1, bgGrad2, accentColor) {
  const icons = {
    cyber_witch: `<path d="M50 15 L25 55 L75 55 Z" fill="${accentColor}" opacity="0.9"/>
                  <ellipse cx="50" cy="55" rx="35" ry="8" fill="${accentColor}"/>
                  <circle cx="50" cy="68" r="14" fill="#f8fafc"/>
                  <circle cx="45" cy="66" r="2" fill="#000"/><circle cx="55" cy="66" r="2" fill="#000"/>
                  <path d="M46 73 Q50 77 54 73" stroke="#000" stroke-width="1.5" fill="none"/>
                  <path d="M36 78 C36 78 50 92 64 78" stroke="${accentColor}" stroke-width="4" fill="none"/>`,
    pumpkin: `<circle cx="50" cy="52" r="24" fill="#ea580c"/>
              <polygon points="50,22 47,32 53,32" fill="#15803d"/>
              <polygon points="42,44 47,48 39,48" fill="#18181b"/>
              <polygon points="58,44 61,48 53,48" fill="#18181b"/>
              <polygon points="50,51 52,55 48,55" fill="#18181b"/>
              <path d="M38 60 L42 64 L46 60 L50 64 L54 60 L58 64 L62 60" stroke="#18181b" stroke-width="3" stroke-linecap="round" fill="none"/>`
  };

  const svgInner = icons[type] || icons.pumpkin;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
    <defs>
      <linearGradient id="grad_halloween" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGrad1}"/>
        <stop offset="100%" stop-color="${bgGrad2}"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#grad_halloween)"/>
    <circle cx="50" cy="50" r="42" fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.3"/>
    ${svgInner}
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// За замовчуванням список пустий — костюми завантажуються користувачем
const DEFAULT_COSTUMES = [];

const STORAGE_KEY_COSTUMES = "novyi_riven_halloween_costumes_v2";
const STORAGE_KEY_VOTES = "novyi_riven_user_costume_votes_v2";
const STORAGE_KEY_USER_TAGS = "novyi_riven_costume_user_tags_v1";

const PRESET_TAGS = [
  "👻 Страшний",
  "🎨 Креативний",
  "😂 Смішний",
  "🔥 Топ",
  "💀 Моторошний",
  "👥 Парний",
  "✨ Вайбовий",
  "👑 Легендарний"
];

/**
 * Генератор цифрового відбитка пристрою (Browser Device Fingerprint)
 * Безпечно генерує унікальний SHA-256 хеш на основі апаратних властивостей:
 * 1. Canvas 2D (субпіксельний рендеринг шрифтів та градієнтів GPU)
 * 2. WebGL (інформація про відеочіп та вендора графічного прискорювача)
 * 3. AudioContext (апаратні нюанси аудіо-декодера та процесора)
 * 4. Параметри екрана (роздільна здатність, піксельна щільність, глибина кольору)
 * 5. Апаратні потоки (CPU cores, touch points, часовий пояс)
 */
class DeviceFingerprint {
  static async getFingerprint() {
    if (this._cached) return this._cached;

    const components = [];

    // 1. Апаратний профіль екрана та заліза
    try {
      components.push(`screen:${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);
      components.push(`dpr:${window.devicePixelRatio || 1}`);
      components.push(`cores:${navigator.hardwareConcurrency || 4}`);
      components.push(`touch:${navigator.maxTouchPoints || 0}`);
      components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone || ''}`);
      components.push(`lang:${navigator.language || ''}`);
    } catch (e) {}

    // 2. Canvas 2D fingerprint
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 240;
      canvas.height = 60;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial', sans-serif";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("Новий Рівень 🎃 2026", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("Новий Рівень 🎃 2026", 4, 17);
        components.push(`canvas:${canvas.toDataURL().slice(-64)}`);
      }
    } catch (e) {}

    // 3. WebGL GPU vendor & renderer
    try {
      const glCanvas = document.createElement("canvas");
      const gl = glCanvas.getContext("webgl") || glCanvas.getContext("experimental-webgl");
      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "";
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "";
          components.push(`gpu:${vendor}~${renderer}`);
        }
      }
    } catch (e) {}

    // 4. AudioContext fingerprint
    try {
      const AudioCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (AudioCtx) {
        const context = new AudioCtx(1, 44100, 44100);
        const oscillator = context.createOscillator();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(10000, context.currentTime);

        const compressor = context.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-50, context.currentTime);
        compressor.knee.setValueAtTime(40, context.currentTime);
        compressor.ratio.setValueAtTime(12, context.currentTime);
        compressor.reduction.setValueAtTime(-20, context.currentTime);
        compressor.attack.setValueAtTime(0, context.currentTime);
        compressor.release.setValueAtTime(0.25, context.currentTime);

        oscillator.connect(compressor);
        compressor.connect(context.destination);
        oscillator.start(0);

        const renderedBuffer = await context.startRendering();
        const samples = renderedBuffer.getChannelData(0).slice(4500, 5000);
        let audioSum = 0;
        for (let i = 0; i < samples.length; i++) {
          audioSum += Math.abs(samples[i]);
        }
        components.push(`audio:${audioSum.toFixed(6)}`);
      }
    } catch (e) {}

    const rawString = components.join("||");

    // Хешування в SHA-256
    let hash = "";
    try {
      if (window.crypto && window.crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(rawString);
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      }
    } catch (e) {}

    if (!hash) {
      let h1 = 0xdeadbeef;
      for (let i = 0; i < rawString.length; i++) {
        h1 = Math.imul(h1 ^ rawString.charCodeAt(i), 2654435761);
      }
      hash = ((h1 ^ (h1 >>> 16)) >>> 0).toString(16);
    }

    this._cached = "fp_" + hash.slice(0, 24);
    return this._cached;
  }
}

class HalloweenEventsApp {
  constructor() {
    this.visitorId = null;
    this.cleanLegacyStorage();
    this.costumes = this.loadCostumes();
    this.userVotes = this.loadUserVotes();
    this.userTagVotes = this.loadUserTagVotes();
    this.currentCategory = "all";
    this.currentSort = "votes";
    this.activeTagCostumeId = null;

    this.initFingerprint();
    this.initSyncChannel();
    this.checkRemoteData();
    this.initDOMElements();
    this.attachEvents();
    this.render();
  }

  async checkRemoteData() {
    try {
      const res = await fetch("costumes.json?_t=" + Date.now());
      if (res.ok) {
        const remoteCostumes = await res.json();
        if (Array.isArray(remoteCostumes) && remoteCostumes.length > 0) {
          let changed = false;
          if (!this.costumes || this.costumes.length === 0) {
            this.costumes = remoteCostumes;
            changed = true;
          } else {
            remoteCostumes.forEach(rc => {
              const local = this.costumes.find(c => c.id === rc.id);
              if (!local) {
                this.costumes.push(rc);
                changed = true;
              } else {
                if (rc.title && local.title !== rc.title) {
                  local.title = rc.title;
                  changed = true;
                }
                if (rc.grade !== undefined && local.grade !== rc.grade) {
                  local.grade = rc.grade;
                  changed = true;
                }
                if (rc.desc !== undefined && local.desc !== rc.desc) {
                  local.desc = rc.desc;
                  changed = true;
                }
                if (rc.num !== undefined && local.num !== rc.num) {
                  local.num = rc.num;
                  changed = true;
                }
                if (rc.votes !== undefined && (local.votes === undefined || rc.votes > (local.votes || 0))) {
                  local.votes = rc.votes;
                  changed = true;
                }
                if (rc.tags && typeof rc.tags === "object") {
                  local.tags = Object.assign({}, rc.tags, local.tags || {});
                  changed = true;
                }
                if (rc.image && (!local.image || local.image.startsWith("data:image/svg") || local.image !== rc.image)) {
                  local.image = rc.image;
                  changed = true;
                }
              }
            });
          }
          if (changed) {
            this.saveCostumes(this.costumes);
            this.render();
          }
        }
      }
    } catch (e) {}
  }

  cleanLegacyStorage() {
    try {
      localStorage.removeItem("novyi_riven_halloween_costumes_v1");
      localStorage.removeItem("novyi_riven_user_costume_votes_v1");
    } catch (e) {}
  }

  async initFingerprint() {
    try {
      this.visitorId = await DeviceFingerprint.getFingerprint();
      // Синхронізуємо локальні голоси з унікальним цифровим відбитком пристрою
      let changed = false;
      this.costumes.forEach(c => {
        if (!Array.isArray(c.voters)) {
          c.voters = [];
        }
        if (this.userVotes.has(c.id) && !c.voters.includes(this.visitorId)) {
          c.voters.push(this.visitorId);
          changed = true;
        } else if (c.voters.includes(this.visitorId) && !this.userVotes.has(c.id)) {
          this.userVotes.add(c.id);
          changed = true;
        }
        c.votes = Math.max(c.votes || 0, c.voters.length);
      });
      if (changed) {
        this.saveCostumes(this.costumes);
        this.saveUserVotes();
        this.render();
      }
    } catch (e) {
      console.warn("Помилка генерації цифрового відбитка:", e);
    }
  }

  initSyncChannel() {
    try {
      if ("BroadcastChannel" in window) {
        this.syncChannel = new BroadcastChannel("novyi_riven_voting_sync");
        this.syncChannel.onmessage = (event) => {
          if (event.data && event.data.type === "VOTES_SYNC") {
            const incoming = event.data.costumes;
            if (Array.isArray(incoming)) {
              this.costumes = incoming;
              if (this.visitorId) {
                this.userVotes = new Set(
                  this.costumes.filter(c => (c.voters || []).includes(this.visitorId)).map(c => c.id)
                );
              }
              this.saveCostumes(this.costumes);
              this.saveUserVotes();
              this.render();
            }
          }
        };
      }
    } catch (e) {}
  }

  broadcastSync() {
    if (this.syncChannel) {
      try {
        this.syncChannel.postMessage({
          type: "VOTES_SYNC",
          costumes: this.costumes
        });
      } catch (e) {}
    }
  }

  showToastNotification(message, duration = 2800) {
    let container = document.getElementById("voteToastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "voteToastContainer";
      container.className = "vote-toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "vote-toast";
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 350);
    }, duration);
  }

  exportCostumesToJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.costumes, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "costumes.json");
    dlAnchorElem.click();
    console.log("Костюми експортовано успішно!");
  }

  importCostumes(incoming) {
    if (!Array.isArray(incoming)) return;
    this.costumes = incoming;
    this.saveCostumes(this.costumes);
    this.broadcastSync();
    this.render();
    if (this.visitorId) {
      this.initFingerprint();
    }
  }

  isDefaultTitle(title) {
    if (!title || typeof title !== "string") return true;
    const clean = title.trim().toLowerCase();
    return clean === "" || 
           clean.startsWith("образ #") || 
           clean.startsWith("образ ") || 
           clean === "образ" ||
           /^образ\s*#?\d+$/i.test(clean) ||
           clean.startsWith("костюм #") ||
           clean.startsWith("костюм №") ||
           clean === "костюм" ||
           /^костюм\s*№?\d+$/i.test(clean) ||
           clean.startsWith("учасник #") ||
           clean.startsWith("учасник №");
  }

  getCostumeNumber(item) {
    if (item && item.num) return item.num;
    if (item && item.title) {
      const match = item.title.match(/\d+/);
      if (match) return parseInt(match[0], 10);
    }
    const chronological = [...(this.costumes || [])].sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.id > b.id ? 1 : -1));
    const idx = chronological.findIndex(c => c.id === (item && item.id));
    return idx >= 0 ? idx + 1 : 1;
  }

  getCostumeDisplayName(item, prefix = "Костюм") {
    if (!item) return "";
    if (!this.isDefaultTitle(item.title)) {
      return item.title;
    }
    const num = this.getCostumeNumber(item);
    return `${prefix} №${num}`;
  }

  loadCostumes() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_COSTUMES);
      if (data) {
        let list = JSON.parse(data);
        if (Array.isArray(list)) {
          // Оновлюємо старі за назвою "Образ #..." на охайне "Костюм №..."
          list = list.map((c, i) => {
            if (!c.num) {
              const match = c.title ? c.title.match(/\d+/) : null;
              c.num = match ? parseInt(match[0], 10) : (list.length - i);
            }
            if (this.isDefaultTitle(c.title)) {
              c.title = `Костюм №${c.num}`;
            }
            if (!Array.isArray(c.voters)) {
              c.voters = [];
            }
            c.votes = Math.max(c.votes || 0, c.voters.length);
            return c;
          });
          return list;
        }
      }
    } catch (e) {
      console.warn("Помилка читання costumes:", e);
    }
    return DEFAULT_COSTUMES;
  }

  saveCostumes(list) {
    try {
      localStorage.setItem(STORAGE_KEY_COSTUMES, JSON.stringify(list));
    } catch (e) {
      console.warn("Не вдалося зберегти в localStorage:", e);
    }
  }

  loadUserVotes() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_VOTES);
      if (data) {
        return new Set(JSON.parse(data));
      }
    } catch (e) {}
    return new Set();
  }

  saveUserVotes() {
    try {
      localStorage.setItem(STORAGE_KEY_VOTES, JSON.stringify(Array.from(this.userVotes)));
    } catch (e) {}
  }

  loadUserTagVotes() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_USER_TAGS);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return {};
  }

  saveUserTagVotes() {
    try {
      localStorage.setItem(STORAGE_KEY_USER_TAGS, JSON.stringify(this.userTagVotes));
    } catch (e) {}
  }

  initDOMElements() {
    this.podiumContainer = document.getElementById("podiumContainer");
    this.leaderboardList = document.getElementById("leaderboardList");
    this.costumesGrid = document.getElementById("costumesGrid");
    this.tabButtons = document.querySelectorAll(".tab-btn");
    this.sortSelect = document.getElementById("sortSelect");
    this.openModalBtn = document.getElementById("btnOpenAddCostume");
    this.modalOverlay = document.getElementById("addCostumeModal");
    this.closeModalBtn = document.getElementById("btnCloseModal");
    this.addCostumeForm = document.getElementById("addCostumeForm");
    this.photoInput = document.getElementById("costumePhotoFile");
    this.photoDropzone = document.getElementById("photoDropzone");
    this.photoPreview = document.getElementById("costumePhotoPreview");
    this.mobileNavToggle = document.getElementById("mobileNavToggle");
    this.mobileDropdownMenu = document.getElementById("mobileDropdownMenu");
    this.totalVotesCountEl = document.getElementById("totalVotesStat");

    // Модальне вікно перегляду повного фото
    this.previewModal = document.getElementById("costumePreviewModal");
    this.previewImg = document.getElementById("costumePreviewImg");
    this.previewTitle = document.getElementById("costumePreviewTitle");
    this.previewDesc = document.getElementById("costumePreviewDesc");
    this.closePreviewBtn = document.getElementById("btnCloseCostumePreview");

    // Модальне вікно вибору тегів ліцеїстами
    this.tagPickerModal = document.getElementById("tagPickerModal");
    this.btnCloseTagPickerModal = document.getElementById("btnCloseTagPickerModal");
    this.btnDoneTagPicker = document.getElementById("btnDoneTagPicker");
    this.presetTagsContainer = document.getElementById("presetTagsContainer");
    this.tagPickerModalTitle = document.getElementById("tagPickerModalTitle");
    this.tagPickerDesc = document.getElementById("tagPickerDesc");

    // Модальне вікно редагування / перейменування костюма (Адмін)
    this.editCostumeModal = document.getElementById("editCostumeModal");
    this.editCostumeForm = document.getElementById("editCostumeForm");
    this.editCostumeSelect = document.getElementById("editCostumeSelect");
    this.editCostumeIdInput = document.getElementById("editCostumeId");
    this.editCostumeTitleInput = document.getElementById("editCostumeTitle");
    this.editCostumeGradeInput = document.getElementById("editCostumeGrade");
    this.editCostumeDescInput = document.getElementById("editCostumeDesc");
    this.editCostumeVotesInput = document.getElementById("editCostumeVotes");
    this.editCostumeThumb = document.getElementById("editCostumeThumb");
    this.editCostumeNumLabel = document.getElementById("editCostumeNumLabel");
    this.btnCloseEditCostumeModal = document.getElementById("btnCloseEditCostumeModal");
    this.btnCancelEditCostume = document.getElementById("btnCancelEditCostume");
  }

  attachEvents() {
    // Мобільне меню
    if (this.mobileNavToggle && this.mobileDropdownMenu) {
      this.mobileNavToggle.addEventListener("click", () => {
        this.mobileDropdownMenu.classList.toggle("open");
      });
    }

    // Закриття прев'ю фото
    if (this.closePreviewBtn) {
      this.closePreviewBtn.addEventListener("click", () => this.closePhotoPreview());
    }

    if (this.previewModal) {
      this.previewModal.addEventListener("click", (e) => {
        if (e.target === this.previewModal) {
          this.closePhotoPreview();
        }
      });
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closePhotoPreview();
        this.closeTagPickerModal();
        this.closeEditCostumeModal();
      }
    });

    // Модальне вікно редагування костюма (Адмін)
    if (this.btnCloseEditCostumeModal) {
      this.btnCloseEditCostumeModal.addEventListener("click", () => this.closeEditCostumeModal());
    }
    if (this.btnCancelEditCostume) {
      this.btnCancelEditCostume.addEventListener("click", () => this.closeEditCostumeModal());
    }
    if (this.editCostumeModal) {
      this.editCostumeModal.addEventListener("click", (e) => {
        if (e.target === this.editCostumeModal) this.closeEditCostumeModal();
      });
    }
    if (this.editCostumeSelect) {
      this.editCostumeSelect.addEventListener("change", (e) => {
        this.loadCostumeIntoEditForm(e.target.value);
      });
    }
    if (this.editCostumeForm) {
      this.editCostumeForm.addEventListener("submit", (e) => this.handleSaveEditCostume(e));
    }

    // Модальне вікно вибору тегів
    if (this.btnCloseTagPickerModal) {
      this.btnCloseTagPickerModal.addEventListener("click", () => this.closeTagPickerModal());
    }

    if (this.btnDoneTagPicker) {
      this.btnDoneTagPicker.addEventListener("click", () => this.closeTagPickerModal());
    }

    if (this.tagPickerModal) {
      this.tagPickerModal.addEventListener("click", (e) => {
        if (e.target === this.tagPickerModal) {
          this.closeTagPickerModal();
        }
      });
    }

    // Вкладки категорій
    if (this.tabButtons) {
      this.tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
          this.tabButtons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          this.currentCategory = btn.getAttribute("data-category") || "all";
          this.renderCostumesGrid();
        });
      });
    }

    // Сортування
    if (this.sortSelect) {
      this.sortSelect.addEventListener("change", (e) => {
        this.currentSort = e.target.value;
        this.renderCostumesGrid();
      });
    }

    // Модальне вікно додавання
    if (this.openModalBtn && this.modalOverlay) {
      this.openModalBtn.addEventListener("click", () => {
        this.modalOverlay.classList.add("open");
      });
    }

    if (this.closeModalBtn && this.modalOverlay) {
      this.closeModalBtn.addEventListener("click", () => {
        this.modalOverlay.classList.remove("open");
      });
    }

    if (this.modalOverlay) {
      this.modalOverlay.addEventListener("click", (e) => {
        if (e.target === this.modalOverlay) {
          this.modalOverlay.classList.remove("open");
        }
      });
    }

    // Завантаження фото (клік, drag&drop та Ctrl+V)
    if (this.photoDropzone && this.photoInput) {
      this.photoDropzone.addEventListener("click", () => this.photoInput.click());
      this.photoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) this.applyImageFile(file);
      });

      // Перетягування файлів мишкою
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
        const file = e.dataTransfer && e.dataTransfer.files[0];
        if (file && file.type && file.type.startsWith("image/")) {
          this.applyImageFile(file);
        }
      });
    }

    // Вставка з буфера обміну через Ctrl + V
    window.addEventListener("paste", (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const items = clipboardData.items;
      let imageFile = null;

      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type && items[i].type.startsWith("image/")) {
            imageFile = items[i].getAsFile();
            break;
          }
        }
      }

      if (!imageFile && clipboardData.files && clipboardData.files.length > 0) {
        const file = clipboardData.files[0];
        if (file.type && file.type.startsWith("image/")) {
          imageFile = file;
        }
      }

      if (imageFile) {
        e.preventDefault();

        // Автоматично відкриваємо модалку додавання, якщо вона ще не відкрита
        if (this.modalOverlay && !this.modalOverlay.classList.contains("open")) {
          this.modalOverlay.classList.add("open");
        }

        this.applyImageFile(imageFile);

        // Фокусуємо кнопку для миттєвої відправки через клавішу Enter
        setTimeout(() => {
          const submitBtn = document.getElementById("btnSubmitCostume");
          if (submitBtn) submitBtn.focus();
        }, 100);
      }
    });

    // Відправка форми
    if (this.addCostumeForm) {
      this.addCostumeForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleCreateCostume();
      });
    }
  }

  handleCreateCostume() {
    const titleInput = document.getElementById("costumeTitle");
    const title = titleInput ? titleInput.value.trim() : "";
    const gradeInput = document.getElementById("costumeGrade");
    const grade = gradeInput ? gradeInput.value.trim() : "";
    
    const photoSrc = this.photoPreview.src && this.photoPreview.style.display !== "none"
      ? this.photoPreview.src
      : null;

    if (!photoSrc) {
      alert("Будь ласка, спочатку вставте фото через Ctrl + V або виберіть файл.");
      return;
    }

    // Обчислюємо наступний номер для костюма
    const maxExistingNum = this.costumes.reduce((max, c) => Math.max(max, this.getCostumeNumber(c)), 0);
    const nextIndex = maxExistingNum + 1;
    const finalTitle = title || `Костюм №${nextIndex}`;
    const initialVoters = this.visitorId ? [this.visitorId] : [];

    const newCostume = {
      id: "costume_" + Date.now(),
      num: nextIndex,
      title: finalTitle,
      grade: grade,
      desc: "",
      votes: Math.max(1, initialVoters.length), // початковий голос автора
      voters: initialVoters,
      tags: {}, // учні обирають теги з переліку при голосуванні
      image: photoSrc,
      date: new Date().toISOString().split("T")[0]
    };

    this.costumes.unshift(newCostume);
    this.userVotes.add(newCostume.id);
    this.saveCostumes(this.costumes);
    this.saveUserVotes();
    this.broadcastSync();

    this.modalOverlay.classList.remove("open");
    this.addCostumeForm.reset();
    this.photoPreview.style.display = "none";

    this.render();
  }

  deleteCostume(costumeId) {
    const item = this.costumes.find(c => c.id === costumeId);
    if (!item) return;
    const name = this.getCostumeDisplayName(item);
    if (!confirm(`Ви впевнені, що хочете видалити «${name}» з конкурсу?`)) {
      return;
    }
    this.costumes = this.costumes.filter(c => c.id !== costumeId);
    this.userVotes.delete(costumeId);
    delete this.userTagVotes[costumeId];
    this.saveCostumes(this.costumes);
    this.saveUserVotes();
    this.saveUserTagVotes();
    this.broadcastSync();
    this.render();
  }

  openEditCostumeModal(costumeId) {
    if (!this.costumes || this.costumes.length === 0) {
      this.showToastNotification("Немає костюмів для редагування");
      return;
    }

    const targetId = costumeId || (this.costumes[0] && this.costumes[0].id);
    this.populateEditCostumeSelect(targetId);
    this.loadCostumeIntoEditForm(targetId);

    if (this.editCostumeModal) {
      this.editCostumeModal.classList.add("open");
      setTimeout(() => {
        if (this.editCostumeTitleInput) {
          this.editCostumeTitleInput.focus();
          this.editCostumeTitleInput.select();
        }
      }, 100);
    }
  }

  closeEditCostumeModal() {
    if (this.editCostumeModal) {
      this.editCostumeModal.classList.remove("open");
    }
    this.editingCostumeId = null;
  }

  populateEditCostumeSelect(selectedId) {
    if (!this.editCostumeSelect) return;
    const sorted = [...this.costumes].sort((a, b) => (b.num || 0) - (a.num || 0));
    this.editCostumeSelect.innerHTML = sorted.map(c => {
      const isSelected = c.id === selectedId;
      const dName = this.getCostumeDisplayName(c);
      const gradePart = c.grade ? `(${c.grade})` : '';
      return `<option value="${c.id}" ${isSelected ? 'selected' : ''}>🎃 №${c.num || ''} — ${dName} ${gradePart}</option>`;
    }).join("");
  }

  loadCostumeIntoEditForm(costumeId) {
    const costume = this.costumes.find(c => c.id === costumeId);
    if (!costume) return;

    this.editingCostumeId = costume.id;
    if (this.editCostumeSelect) this.editCostumeSelect.value = costume.id;
    if (this.editCostumeIdInput) this.editCostumeIdInput.value = costume.id;
    if (this.editCostumeTitleInput) this.editCostumeTitleInput.value = this.isDefaultTitle(costume.title) ? "" : costume.title;
    if (this.editCostumeGradeInput) this.editCostumeGradeInput.value = costume.grade || "";
    if (this.editCostumeDescInput) this.editCostumeDescInput.value = costume.desc || "";
    if (this.editCostumeVotesInput) this.editCostumeVotesInput.value = costume.votes || 0;
    if (this.editCostumeThumb) this.editCostumeThumb.src = costume.image || "";
    if (this.editCostumeNumLabel) {
      this.editCostumeNumLabel.textContent = `🎃 Костюм №${costume.num || ''} — ${this.getCostumeDisplayName(costume)}`;
    }
  }

  quickAdjustVotes(delta) {
    if (!this.editCostumeVotesInput) return;
    const current = parseInt(this.editCostumeVotesInput.value, 10) || 0;
    this.editCostumeVotesInput.value = Math.max(0, current + delta);
  }

  handleSaveEditCostume(e) {
    e.preventDefault();
    if (!this.editingCostumeId) return;

    const costume = this.costumes.find(c => c.id === this.editingCostumeId);
    if (!costume) return;

    const newTitle = this.editCostumeTitleInput ? this.editCostumeTitleInput.value.trim() : "";
    const newGrade = this.editCostumeGradeInput ? this.editCostumeGradeInput.value.trim() : "";
    const newDesc = this.editCostumeDescInput ? this.editCostumeDescInput.value.trim() : "";
    const newVotes = this.editCostumeVotesInput ? parseInt(this.editCostumeVotesInput.value, 10) : costume.votes;

    costume.title = newTitle || `Костюм №${costume.num}`;
    costume.grade = newGrade;
    costume.desc = newDesc;
    if (!isNaN(newVotes)) {
      costume.votes = Math.max(0, newVotes);
    }

    this.saveCostumes(this.costumes);
    this.render();
    this.closeEditCostumeModal();
    this.broadcastSync();

    this.showToastNotification(`✅ Зміни збережено: «${this.getCostumeDisplayName(costume)}» (${costume.votes} голосів)! Натисніть «💾 Експорт JSON».`);
  }

  async toggleVote(costumeId) {
    if (!this.visitorId) {
      this.visitorId = await DeviceFingerprint.getFingerprint();
    }

    const item = this.costumes.find(c => c.id === costumeId);
    if (!item) return;

    if (!Array.isArray(item.voters)) {
      item.voters = [];
    }

    const hasVoted = item.voters.includes(this.visitorId) || this.userVotes.has(costumeId);

    if (hasVoted) {
      // Знімаємо голос
      item.voters = item.voters.filter(fp => fp !== this.visitorId);
      item.votes = Math.max(0, (item.votes || 1) - 1);
      this.userVotes.delete(costumeId);
      this.showToastNotification("ℹ️ Ви зняли свій голос з цього костюма");
    } else {
      // Фіксуємо голос за цифровим відбитком пристрою (1 голос за костюм з пристрою)
      if (!item.voters.includes(this.visitorId)) {
        item.voters.push(this.visitorId);
      }
      item.votes = (item.votes || 0) + 1;
      this.userVotes.add(costumeId);
      this.triggerVoteSound();
      this.showToastNotification("🎉 Ваш голос враховано! (1 голос за цей костюм)");
    }

    this.saveCostumes(this.costumes);
    this.saveUserVotes();
    this.broadcastSync();
    this.render();

    // Якщо проголосували щойно — пропонуємо обрати теги!
    if (!hasVoted) {
      this.openTagPickerModal(costumeId, true);
    }
  }

  triggerVoteSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {}
  }

  getSortedCostumes() {
    const sorted = [...this.costumes];
    if (this.currentSort === "votes") {
      sorted.sort((a, b) => b.votes - a.votes);
    } else if (this.currentSort === "newest") {
      sorted.sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.id > a.id ? 1 : -1));
    } else if (this.currentSort === "class") {
      sorted.sort((a, b) => (a.grade || "").localeCompare(b.grade || ""));
    }
    return sorted;
  }

  render() {
    this.renderLeaderboard();
    this.renderCostumesGrid();
    this.updateStats();
  }

  updateStats() {
    if (this.totalVotesCountEl) {
      const total = this.costumes.reduce((acc, c) => acc + (c.votes || 0), 0);
      this.totalVotesCountEl.textContent = total;
    }
  }

  renderLeaderboard() {
    const byVotes = [...this.costumes].sort((a, b) => b.votes - a.votes);

    if (!this.podiumContainer) return;

    if (byVotes.length === 0) {
      this.podiumContainer.innerHTML = `
        <div style="text-align: center; padding: 36px 16px; color: var(--text-muted); width: 100%;">
          <div style="font-size: 42px; margin-bottom: 8px;">🎃</div>
          <h3 style="font-size: 17px; font-weight: 800; color: #fff; margin-bottom: 6px;">П'єдестал очікує перших образів</h3>
          <p style="font-size: 13px; max-width: 440px; margin: 0 auto;">
            Завантажте фотографії через кнопку «Завантажити костюм» вгорі, щоб відкрити голосування ліцею!
          </p>
        </div>
      `;

      if (this.leaderboardList) {
        this.leaderboardList.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 13px;">Рейтинг формується одразу після появи перших костюмів.</p>`;
      }
      return;
    }

    const top1 = byVotes[0];
    const top2 = byVotes[1];
    const top3 = byVotes[2];

    let podiumHtml = "";

    // 2-ге місце (якщо є хоча б 2 костюми)
    if (top2) {
      podiumHtml += `
        <div class="podium-column second">
          <div class="podium-avatar-wrap" onclick="window.halloweenApp.openCostumeById('${top2.id}')" style="cursor: zoom-in;" title="Переглянути фото на весь екран">
            <span class="podium-crown-badge">🥈</span>
            <img src="${top2.image}" alt="${this.getCostumeDisplayName(top2)}" class="podium-avatar">
          </div>
          <div class="podium-info">
            <div class="podium-costume-name">
              ${this.getCostumeDisplayName(top2)}
              <button type="button" class="btn-podium-edit admin-only" onclick="window.halloweenApp.openEditCostumeModal('${top2.id}')" title="Перейменувати костюм">✏️</button>
            </div>
            <div class="podium-user-name">${top2.grade ? top2.grade : ''}</div>
          </div>
          <div class="podium-step">
            <div class="podium-rank-num">2</div>
            <div class="podium-votes-count">${top2.votes} голосів</div>
          </div>
        </div>
      `;
    }

    // 1-ше місце (Центр)
    if (top1) {
      podiumHtml += `
        <div class="podium-column first">
          <div class="podium-avatar-wrap" onclick="window.halloweenApp.openCostumeById('${top1.id}')" style="cursor: zoom-in;" title="Переглянути фото на весь екран">
            <span class="podium-crown-badge">👑</span>
            <img src="${top1.image}" alt="${this.getCostumeDisplayName(top1)}" class="podium-avatar">
          </div>
          <div class="podium-info">
            <div class="podium-costume-name" style="color: #ffd700; font-size: 17px;">
              ${this.getCostumeDisplayName(top1)}
              <button type="button" class="btn-podium-edit admin-only" onclick="window.halloweenApp.openEditCostumeModal('${top1.id}')" title="Перейменувати костюм">✏️</button>
            </div>
            <div class="podium-user-name">${top1.grade ? top1.grade : ''}</div>
          </div>
          <div class="podium-step">
            <div class="podium-rank-num" style="color: #ffd700;">1</div>
            <div class="podium-votes-count" style="font-size: 14px; font-weight: 800;">🔥 ${top1.votes} голосів</div>
          </div>
        </div>
      `;
    }

    // 3-тє місце (якщо є 3+ костюмів)
    if (top3) {
      podiumHtml += `
        <div class="podium-column third">
          <div class="podium-avatar-wrap" onclick="window.halloweenApp.openCostumeById('${top3.id}')" style="cursor: zoom-in;" title="Переглянути фото на весь екран">
            <span class="podium-crown-badge">🥉</span>
            <img src="${top3.image}" alt="${this.getCostumeDisplayName(top3)}" class="podium-avatar">
          </div>
          <div class="podium-info">
            <div class="podium-costume-name">
              ${this.getCostumeDisplayName(top3)}
              <button type="button" class="btn-podium-edit admin-only" onclick="window.halloweenApp.openEditCostumeModal('${top3.id}')" title="Перейменувати костюм">✏️</button>
            </div>
            <div class="podium-user-name">${top3.grade ? top3.grade : ''}</div>
          </div>
          <div class="podium-step">
            <div class="podium-rank-num">3</div>
            <div class="podium-votes-count">${top3.votes} голосів</div>
          </div>
        </div>
      `;
    }

    this.podiumContainer.innerHTML = podiumHtml;

    // Решта учасників у компактній таблиці (місця 4+)
    if (this.leaderboardList) {
      const rest = byVotes.slice(3, 10);
      if (rest.length === 0) {
        this.leaderboardList.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 13px;">Всі наявні образи зараз на п'єдесталі!</p>`;
      } else {
        this.leaderboardList.innerHTML = rest.map((item, index) => `
          <div class="lb-row">
            <div class="lb-left">
              <span class="lb-rank">#${index + 4}</span>
              <img src="${item.image}" alt="${this.getCostumeDisplayName(item)}" class="lb-thumb" onclick="window.halloweenApp.openCostumeById('${item.id}')" style="cursor: zoom-in;" title="Переглянути фото на весь екран">
              <div class="lb-details">
                <span class="lb-costume">
                  ${this.getCostumeDisplayName(item)}
                  <button type="button" class="btn-lb-edit admin-only" onclick="window.halloweenApp.openEditCostumeModal('${item.id}')" title="Перейменувати костюм">✏️</button>
                </span>
                <span class="lb-author">${item.grade ? item.grade : ''}</span>
              </div>
            </div>
            <div class="lb-votes-badge">
              <span>❤️ ${item.votes}</span>
            </div>
          </div>
        `).join("");
      }
    }
  }

  renderCostumesGrid() {
    if (!this.costumesGrid) return;

    let list = this.getSortedCostumes();
    if (this.currentCategory !== "all") {
      list = list.filter(item => {
        const tagsStr = Object.keys(item.tags || {}).join(" ").toLowerCase();
        if (this.currentCategory === "scary") {
          return tagsStr.includes("страш") || tagsStr.includes("моторош") || tagsStr.includes("scary");
        }
        if (this.currentCategory === "creative") {
          return tagsStr.includes("креатив") || tagsStr.includes("оригінал") || tagsStr.includes("creative");
        }
        if (this.currentCategory === "funny") {
          return tagsStr.includes("сміш") || tagsStr.includes("мем") || tagsStr.includes("funny");
        }
        if (this.currentCategory === "pair") {
          return tagsStr.includes("парн") || tagsStr.includes("дует") || tagsStr.includes("pair");
        }
        return true;
      });
    }

    if (list.length === 0) {
      this.costumesGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--text-muted);">
          <div style="font-size: 42px; margin-bottom: 12px;">👻</div>
          <h3 style="font-size: 17px; font-weight: 800; color: #fff; margin-bottom: 6px;">Костюми скоро з'являться!</h3>
          <p style="font-size: 13px; max-width: 440px; margin: 0 auto;">
            Скористайтеся кнопкою «Завантажити костюм» вгорі для публікації образу.
          </p>
        </div>
      `;
      return;
    }

    const rankMap = new Map();
    [...this.costumes].sort((a, b) => b.votes - a.votes).forEach((c, idx) => {
      rankMap.set(c.id, idx + 1);
    });

    this.costumesGrid.innerHTML = list.map(item => {
      const isVoted = this.userVotes.has(item.id);
      const rank = rankMap.get(item.id);
      const num = this.getCostumeNumber(item);
      const hasCustomTitle = !this.isDefaultTitle(item.title);
      const rawName = this.getCostumeDisplayName(item);
      const displayName = escapeHtml(rawName);
      const gradeHtml = item.grade ? `<span class="costume-class-badge">${escapeHtml(item.grade)}</span>` : '';
      const descHtml = item.desc ? `<p class="costume-desc">${escapeHtml(item.desc)}</p>` : '';

      const tagsMap = item.tags || {};
      const userTags = this.userTagVotes[item.id] || [];

      // Топовий тег для кутового бейджа
      const sortedTags = Object.entries(tagsMap).sort((a, b) => b[1] - a[1]);
      const topTagEntry = sortedTags[0];
      const mainTagLabel = topTagEntry && topTagEntry[1] > 0
        ? `${escapeHtml(topTagEntry[0])} • ${topTagEntry[1]}`
        : `🏷️ Оцінити тегом`;

      // Генерація чіпсів тегів
      let tagsRowHtml = "";
      if (sortedTags.length > 0) {
        const chips = sortedTags.map(([tag, count]) => {
          const isUserVoted = userTags.includes(tag);
          const escapedTag = escapeHtml(tag).replace(/'/g, "\\'");
          return `
            <button type="button" class="costume-tag-chip ${isUserVoted ? 'voted' : ''}" 
              onclick="window.halloweenApp.toggleTag('${item.id}', '${escapedTag}')"
              title="${isUserVoted ? 'Ви проголосували за цей тег (натисніть щоб зняти)' : 'Проголосувати за цей тег'}">
              <span>${escapeHtml(tag)}</span>
              <span class="tag-chip-count">${count}</span>
            </button>
          `;
        }).join("");

        tagsRowHtml = `
          <div class="costume-tags-row">
            ${chips}
            <button type="button" class="btn-add-tag-chip" onclick="window.halloweenApp.openTagPickerModal('${item.id}')" title="Додати або обрати тег">
              <span>➕ Тег</span>
            </button>
          </div>
        `;
      } else {
        tagsRowHtml = `
          <div class="costume-tags-row">
            <button type="button" class="btn-add-tag-chip empty-cta" onclick="window.halloweenApp.openTagPickerModal('${item.id}')">
              <span>➕ Додати тег</span>
            </button>
          </div>
        `;
      }

      return `
        <div class="costume-card" data-id="${item.id}">
          <div class="costume-image-wrap" onclick="window.halloweenApp.openCostumeById('${item.id}')" title="Клікніть для перегляду на весь екран">
            <img src="${item.image}" alt="" class="costume-img-bg" aria-hidden="true">
            <span class="costume-num-pill" title="Номер костюма">🎃 № ${num}</span>
            <span class="costume-rank-badge" title="Місце в рейтингу">#${rank}</span>
            <img src="${item.image}" alt="${displayName}" class="costume-img" loading="lazy">
          </div>
          <div class="costume-content">
            <div class="costume-title-row">
              <h3 class="costume-card-title ${hasCustomTitle ? '' : 'costume-default-title'}">${displayName}</h3>
              ${gradeHtml}
            </div>
            ${descHtml}
            ${tagsRowHtml}
            <div class="costume-footer">
              <div class="costume-votes-display">
                <span class="vote-number">${item.votes}</span>
                <span class="vote-label">голосів</span>
              </div>
              <div class="costume-footer-actions">
                <button type="button" class="btn-card-edit admin-only" onclick="window.halloweenApp.openEditCostumeModal('${item.id}')" title="Перейменувати / редагувати костюм">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button type="button" class="btn-card-delete admin-only" onclick="window.halloweenApp.deleteCostume('${item.id}')" title="Видалити костюм">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
                <button class="btn-vote ${isVoted ? 'voted' : ''}" onclick="window.halloweenApp.toggleVote('${item.id}')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="${isVoted ? '#fff' : 'none'}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                  <span>${isVoted ? 'Ви проголосували' : 'Голосувати'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  openTagPickerModal(costumeId, isAfterVote = false) {
    const costume = this.costumes.find(c => c.id === costumeId);
    if (!costume) return;
    this.activeTagCostumeId = costumeId;

    if (this.tagPickerModalTitle) {
      this.tagPickerModalTitle.textContent = isAfterVote 
        ? "🎉 Ваш голос враховано!" 
        : "🏷️ Оберіть теги до образу";
    }

    if (this.tagPickerDesc) {
      const name = this.getCostumeDisplayName(costume);
      this.tagPickerDesc.innerHTML = isAfterVote
        ? `Оберіть теги для <b>«${name}»</b> із переліку:`
        : `Оберіть теги для <b>«${name}»</b> із переліку:`;
    }

    this.renderPresetTags();

    if (this.tagPickerModal) {
      this.tagPickerModal.classList.add("open");
    }
  }

  renderPresetTags() {
    if (!this.presetTagsContainer || !this.activeTagCostumeId) return;
    const costume = this.costumes.find(c => c.id === this.activeTagCostumeId);
    if (!costume) return;

    const userTags = this.userTagVotes[this.activeTagCostumeId] || [];
    const tagsMap = costume.tags || {};

    this.presetTagsContainer.innerHTML = PRESET_TAGS.map(tag => {
      const isActive = userTags.includes(tag);
      const count = tagsMap[tag] || 0;
      const escapedTag = tag.replace(/'/g, "\\'");
      return `
        <button type="button" class="tag-preset-btn ${isActive ? 'active' : ''}" onclick="window.halloweenApp.toggleTag('${this.activeTagCostumeId}', '${escapedTag}')">
          <span>${tag} ${count > 0 ? `<small style="opacity: 0.8; font-size: 11px; margin-left: 4px;">(${count})</small>` : ''}</span>
          <span class="tag-preset-check">${isActive ? '✓' : '+'}</span>
        </button>
      `;
    }).join("");
  }

  toggleTag(costumeId, tag) {
    const costume = this.costumes.find(c => c.id === costumeId);
    if (!costume) return;

    if (!costume.tags) costume.tags = {};
    if (!this.userTagVotes[costumeId]) this.userTagVotes[costumeId] = [];

    const userList = this.userTagVotes[costumeId];
    const idx = userList.indexOf(tag);

    if (idx >= 0) {
      // Видаляємо голос за тег
      userList.splice(idx, 1);
      costume.tags[tag] = Math.max(0, (costume.tags[tag] || 1) - 1);
      if (costume.tags[tag] === 0) {
        delete costume.tags[tag];
      }
    } else {
      // Додаємо голос за тег
      userList.push(tag);
      costume.tags[tag] = (costume.tags[tag] || 0) + 1;
    }

    this.saveCostumes(this.costumes);
    this.saveUserTagVotes();
    this.broadcastSync();
    this.render();

    // Якщо відкрито модалку вибору тегів — оновлюємо стан кнопок
    if (this.activeTagCostumeId === costumeId) {
      this.renderPresetTags();
    }
  }

  closeTagPickerModal() {
    if (this.tagPickerModal) {
      this.tagPickerModal.classList.remove("open");
    }
    this.activeTagCostumeId = null;
  }

  openCostumeById(id) {
    const item = this.costumes.find(c => c.id === id);
    if (!item) return;
    const name = this.getCostumeDisplayName(item);
    this.openPhotoPreview(item.image, name, item.grade ? `Клас: ${item.grade} • ${item.desc || ''}` : (item.desc || ""));
  }

  openPhotoPreview(imgSrc, title = "", desc = "") {
    if (!this.previewModal || !this.previewImg) return;
    this.previewImg.src = imgSrc;
    if (this.previewTitle) this.previewTitle.textContent = title;
    if (this.previewDesc) this.previewDesc.textContent = desc;
    this.previewModal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  closePhotoPreview() {
    if (!this.previewModal) return;
    this.previewModal.classList.remove("open");
    document.body.style.overflow = "";
  }

  async applyImageFile(file) {
    if (!file) return;
    try {
      const compressed = await this.compressImageFile(file);
      this.photoPreview.src = compressed;
      this.photoPreview.style.display = "block";
      if (this.photoDropzone) {
        this.photoDropzone.classList.add("pasted-flash");
        setTimeout(() => this.photoDropzone.classList.remove("pasted-flash"), 600);
      }
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (event) => {
        this.photoPreview.src = event.target.result;
        this.photoPreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  }

  compressImageFile(file, maxWidth = 1200, maxHeight = 1600, quality = 0.85) {
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

// Запуск після завантаження DOM
document.addEventListener("DOMContentLoaded", () => {
  window.halloweenApp = new HalloweenEventsApp();
});
