/**
 * Партія «Новий Рівень» — Авторизація та Режим Адміністратора (admin.js)
 * Дозволяє лише адміністратору додавати костюми, фото в альбоми та видаляти їх на живому сайті.
 * Для звичайних відвідувачів кнопки завантаження та видалення повністю приховані.
 */
(function() {
  const ADMIN_PIN_DEFAULT = "2026";
  const STORAGE_KEY_ADMIN = "novyi_riven_admin_session_v1";

  class AdminAuthManager {
    constructor() {
      this.isAdmin = this.checkAuthStatus();
      this.initEvents();
      this.applyState();
    }

    checkAuthStatus() {
      // 1. Перевірка параметра в URL: ?admin=2026 або ?admin=true
      try {
        const params = new URLSearchParams(window.location.search);
        const adminParam = params.get("admin");
        if (adminParam === ADMIN_PIN_DEFAULT || adminParam === "true" || adminParam === "novyiriven") {
          localStorage.setItem(STORAGE_KEY_ADMIN, "true");
          // Прибираємо секретний параметр з адресного рядка, щоб не світити його
          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
          return true;
        }
      } catch (e) {}

      // 2. Перевірка збереженої сесії в localStorage
      try {
        return localStorage.getItem(STORAGE_KEY_ADMIN) === "true";
      } catch (e) {
        return false;
      }
    }

    login(pin) {
      if (pin === ADMIN_PIN_DEFAULT || pin === "novyiriven") {
        this.isAdmin = true;
        localStorage.setItem(STORAGE_KEY_ADMIN, "true");
        this.applyState();
        this.showAdminToast("👑 Режим адміністратора активовано!");
        return true;
      }
      return false;
    }

    logout() {
      this.isAdmin = false;
      localStorage.removeItem(STORAGE_KEY_ADMIN);
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
        <button type="button" class="btn-admin-bar-export" id="btnAdminBarExport" title="Завантажити актуальні JSON для git коміту">💾 Зберегти дані</button>
        <button type="button" class="btn-admin-bar-logout" id="btnAdminBarLogout" title="Вийти з адмін-панелі">Вийти ✕</button>
      `;

      document.body.appendChild(bar);

      document.getElementById("btnAdminBarLogout").addEventListener("click", () => {
        this.logout();
      });

      document.getElementById("btnAdminBarExport").addEventListener("click", () => {
        this.exportAllData();
      });
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
