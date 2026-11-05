/**
 * Партія «Новий Рівень» — Авторизація та Режим Адміністратора (admin.js)
 * Дозволяє лише адміністратору додавати костюми, фото в альбоми та видаляти їх на живому сайті.
 * Для звичайних відвідувачів кнопки завантаження та видалення повністю приховані.
 */
(function() {
  // SHA-256 хеш пін-коду адміна — захищає від перегляду пароля в DevTools
  // УВАГА: не змінюйте цей рядок без оновлення пін-коду
  const ADMIN_PIN_HASH = "d103b1a477ee8cc92037b21f5ebff71a23e08bd561b7d9e63479f0bb5c93d627";
  // Секрет сесії — використовується для перевірки що сесія видана цим сайтом
  const SESSION_SECRET = "d9c2948df34e07f4657e6fe5595dd6dc233f0dc484166e2b6bc8770333957584";
  const STORAGE_KEY_ADMIN = "novyi_riven_admin_session_v2";

  async function sha256(str) {
    if (!str) return "";
    try {
      const msgBuffer = new TextEncoder().encode(String(str).trim());
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      return "";
    }
  }

  class AdminAuthManager {
    constructor() {
      this.isAdmin = false;
      this._sessionSig = null;
      this.initEvents();
      // Відновлюємо сесію асинхронно — з верифікацією підписаного токена
      this.restoreSession().then(isValid => {
        if (isValid) {
          this.isAdmin = true;
          this.applyState();
        }
        // Перевірка параметра URL після відновлення сесії
        this.checkUrlParam();
      });
    }

    checkSavedSession() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_ADMIN);
        if (!stored) return false;
        // Перевіряємо що токен відповідає формату, підписаному секретом сесії
        const [payload, sig] = stored.split(".");
        if (!payload || !sig) return false;
        // Верифікація: sha256(payload + SESSION_SECRET) має збігатися з sig
        // Оскільки crypto.subtle є асинхронним — зберігаємо хеш при вході і порівнюємо
        return payload === btoa("admin_session") && sig === this._sessionSig;
      } catch (e) {
        return false;
      }
    }

    async _buildSessionToken() {
      try {
        const payload = btoa("admin_session");
        const rawSig = await sha256(payload + SESSION_SECRET);
        const sig = rawSig.slice(0, 32);
        this._sessionSig = sig;
        return payload + "." + sig;
      } catch (e) {
        return null;
      }
    }

    async saveSession() {
      const token = await this._buildSessionToken();
      if (token) {
        try { localStorage.setItem(STORAGE_KEY_ADMIN, token); } catch (e) {}
      }
    }

    clearSession() {
      try { localStorage.removeItem(STORAGE_KEY_ADMIN); } catch (e) {}
      // Також очищаємо старий ключ від v1 на випадок якщо залишився
      try { localStorage.removeItem("novyi_riven_admin_session_v1"); } catch (e) {}
      this._sessionSig = null;
    }

    async restoreSession() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_ADMIN);
        if (!stored) return false;
        const [payload, sig] = stored.split(".");
        if (!payload || !sig) return false;
        if (payload !== btoa("admin_session")) return false;
        const rawSig = await sha256(payload + SESSION_SECRET);
        const expectedSig = rawSig.slice(0, 32);
        if (sig !== expectedSig) return false;
        this._sessionSig = expectedSig;
        return true;
      } catch (e) {
        return false;
      }
    }

    async checkUrlParam() {
      try {
        const params = new URLSearchParams(window.location.search);
        const adminParam = params.get("admin");
        if (adminParam) {
          const h = await sha256(adminParam);
          if (h === ADMIN_PIN_HASH) {
            this.isAdmin = true;
            await this.saveSession();
            this.applyState();
            this.showAdminToast("👑 Режим адміністратора активовано!");
          }
          // Прибираємо секретний параметр з адресного рядка
          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      } catch (e) {}
    }

    async login(pin) {
      const h = await sha256(pin);
      if (h === ADMIN_PIN_HASH) {
        this.isAdmin = true;
        await this.saveSession();
        this.applyState();
        this.showAdminToast("👑 Режим адміністратора активовано!");
        return true;
      }
      return false;
    }

    logout() {
      this.isAdmin = false;
      this.clearSession();
      this.applyState();
      this.showAdminToast("ℹ️ Ви вийшли з режиму адміністратора");
    }

    applyState() {
      if (this.isAdmin) {
        document.body.classList.add("admin-mode-active");
        this.renderAdminBar();
      } else {
        document.body.classList.remove("admin-mode-active");
        this.removeAdminBar();
      }
    }

    renderAdminBar() {
      if (document.getElementById("adminTopBar")) return;

      const bar = document.createElement("div");
      bar.id = "adminTopBar";
      bar.className = "admin-floating-badge";
      bar.innerHTML = `
        <span class="admin-badge-label">👑 Адмін</span>
        <button type="button" class="btn-admin-bar-export" id="btnAdminBarRename" title="Перейменувати або редагувати костюми">✏️ Перейменувати</button>
        <button type="button" class="btn-admin-bar-export" id="btnAdminBarFirebase" title="Синхронізувати голоси з хмарою Firebase">⚡ Хмара Firebase</button>
        <button type="button" class="btn-admin-bar-export" id="btnAdminBarExport" title="Завантажити актуальні JSON для git коміту">💾 Експорт JSON</button>
        <button type="button" class="btn-admin-bar-export" id="btnAdminBarImport" title="Імпортувати JSON файл">📥 Імпорт JSON</button>
        <input type="file" id="adminBarFileInput" accept=".json" style="display: none;">
        <button type="button" class="btn-admin-bar-logout" id="btnAdminBarLogout" title="Вийти з адмін-панелі">Вийти ✕</button>
      `;

      document.body.appendChild(bar);

      const btnRename = document.getElementById("btnAdminBarRename");
      if (btnRename) {
        btnRename.addEventListener("click", () => {
          if (window.halloweenApp && typeof window.halloweenApp.openEditCostumeModal === "function") {
            window.halloweenApp.openEditCostumeModal();
          } else {
            this.showAdminToast("ℹ️ Перейменування костюмів доступне на сторінці Івентів");
          }
        });
      }

      const btnFirebase = document.getElementById("btnAdminBarFirebase");
      if (btnFirebase) {
        btnFirebase.addEventListener("click", () => {
          if (window.halloweenApp && typeof window.halloweenApp.seedFirebaseFromLocal === "function") {
            window.halloweenApp.seedFirebaseFromLocal();
          } else {
            this.showAdminToast("ℹ️ Синхронізація доступна на сторінці Івентів");
          }
        });
      }

      document.getElementById("btnAdminBarLogout").addEventListener("click", () => {
        this.logout();
      });

      document.getElementById("btnAdminBarExport").addEventListener("click", () => {
        this.exportAllData();
      });

      const fileInput = document.getElementById("adminBarFileInput");
      if (fileInput) {
        document.getElementById("btnAdminBarImport").addEventListener("click", () => {
          fileInput.click();
        });

        fileInput.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const data = JSON.parse(event.target.result);
              let imported = false;
              if (Array.isArray(data)) {
                if (window.halloweenApp && typeof window.halloweenApp.importCostumes === "function") {
                  window.halloweenApp.importCostumes(data);
                  imported = true;
                } else if (window.galleryApp && typeof window.galleryApp.importAlbums === "function") {
                  window.galleryApp.importAlbums(data);
                  imported = true;
                }
              }
              if (imported) {
                this.showAdminToast("✅ Дані успішно імпортовано!");
              } else {
                alert("Не вдалося розпізнати формат файлу або поточна сторінка не підтримує цей файл.");
              }
            } catch (err) {
              alert("Помилка читання JSON: " + err.message);
            }
            fileInput.value = "";
          };
          reader.readAsText(file);
        });
      }
    }

    removeAdminBar() {
      const bar = document.getElementById("adminTopBar");
      if (bar) bar.remove();
    }

    exportAllData() {
      // Експорт костюмів
      if (window.halloweenApp && typeof window.halloweenApp.exportCostumesToJSON === "function") {
        window.halloweenApp.exportCostumesToJSON();
      }
      // Експорт альбомів
      if (window.galleryApp && typeof window.galleryApp.exportAlbumsToJSON === "function") {
        window.galleryApp.exportAlbumsToJSON();
      }
      this.showAdminToast("💾 Файли даних експортовано для коміту!");
    }

    showAdminToast(msg) {
      let container = document.getElementById("adminToastBox");
      if (!container) {
        container = document.createElement("div");
        container.id = "adminToastBox";
        container.className = "vote-toast-container";
        document.body.appendChild(container);
      }
      const toast = document.createElement("div");
      toast.className = "vote-toast";
      toast.innerHTML = `<span>${msg}</span>`;
      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add("fade-out");
        setTimeout(() => toast.remove(), 350);
      }, 2500);
    }

    initEvents() {
      // 1. Гарячі клавіші: Ctrl + Shift + A або Alt + A
      window.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "A" || e.key === "a" || e.code === "KeyA")) {
          e.preventDefault();
          this.promptPin();
        }
      });

      // 2. Секретний 5-кратний клік по логотипу
      let logoClicks = 0;
      let logoTimeout = null;
      document.addEventListener("click", (e) => {
        const target = e.target.closest(".nav-logo, #logoBadge");
        if (target) {
          logoClicks++;
          clearTimeout(logoTimeout);
          if (logoClicks >= 5) {
            logoClicks = 0;
            this.promptPin();
          } else {
            logoTimeout = setTimeout(() => { logoClicks = 0; }, 1200);
          }
        }
      });
    }

    promptPin() {
      if (this.isAdmin) {
        if (confirm("Ви вже в режимі адміністратора. Бажаєте вийти?")) {
          this.logout();
        }
        return;
      }

      const pin = prompt("🔐 Введіть PIN-код адміністратора партії:");
      if (pin === null) return; // Скасовано

      if (this.login(pin.trim())) {
        alert("✅ Режим адміністратора успішно активовано! Тепер вам доступні всі кнопки завантаження та видалення.");
      } else {
        alert("❌ Невірний PIN-код адміністратора.");
      }
    }
  }

  // Ініціалізація
  window.adminAuth = new AdminAuthManager();
})();
