document.addEventListener('DOMContentLoaded', () => {
  const passwordInput = document.getElementById('passwordInput');
  const pasteBtn = document.getElementById('pasteBtn');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const eyeIcon = document.getElementById('eyeIcon');
  const charCount = document.getElementById('charCount');
  const unlockBtn = document.getElementById('unlockBtn');
  const loadingAlert = document.getElementById('loadingAlert');
  const loadingText = document.getElementById('loadingText');
  const errorAlert = document.getElementById('errorAlert');
  const errorMsg = document.getElementById('errorMsg');
  const lockCard = document.getElementById('lockCard');
  const videoSection = document.getElementById('videoSection');
  const secretVideo = document.getElementById('secretVideo');
  const lockAgainBtn = document.getElementById('lockAgainBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const telegramSendBtn = document.getElementById('telegramSendBtn');

  let currentBlobUrl = null;

  // Оновлення посилання на Telegram із вставленим паролем
  function updateTelegramLink() {
    const pwd = passwordInput.value.trim();
    if (pwd) {
      const msg = encodeURIComponent(`Привіт! Я зібрав код квесту партії «Новий Рівень»:\n${pwd}\n\nПретендую на Telegram Premium на 6 місяців! 🎁💎`);
      telegramSendBtn.href = `https://t.me/zyabl1kkk?text=${msg}`;
    } else {
      telegramSendBtn.href = 'https://t.me/zyabl1kkk';
    }
  }

  // Оновлення лічильника символів
  function updateCharCount() {
    const len = passwordInput.value.length;
    charCount.textContent = `${len} / 30 символів`;
    if (len >= 30) {
      charCount.classList.add('valid');
    } else {
      charCount.classList.remove('valid');
    }
    updateTelegramLink();
  }

  passwordInput.addEventListener('input', () => {
    hideError();
    updateCharCount();
  });

  // Кнопка вставки з буфера обміну
  pasteBtn.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          passwordInput.value = text.trim();
          updateCharCount();
          hideError();
          passwordInput.focus();
        }
      } else {
        const text = prompt('Вставте сюди ваш 30-значний ключ:');
        if (text) {
          passwordInput.value = text.trim();
          updateCharCount();
          hideError();
        }
      }
    } catch (err) {
      console.warn('Clipboard read error, fallback to focus:', err);
      passwordInput.focus();
    }
  });

  // Показати / приховати пароль
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    if (isPassword) {
      eyeIcon.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      `;
    } else {
      eyeIcon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      `;
    }
  });

  function showError(message) {
    errorMsg.textContent = message;
    errorAlert.style.display = 'flex';
  }

  function hideError() {
    errorAlert.style.display = 'none';
  }

  function showLoading(text) {
    loadingText.textContent = text || 'Розшифрування відео прямо в браузері...';
    loadingAlert.style.display = 'flex';
    unlockBtn.disabled = true;
  }

  function hideLoading() {
    loadingAlert.style.display = 'none';
    unlockBtn.disabled = false;
  }

  // Обробник натискання "Розшифрувати відео"
  async function handleUnlock() {
    const password = passwordInput.value.trim();
    hideError();

    if (!password) {
      showError('Будь ласка, введіть зібраний 30-значний пароль.');
      passwordInput.focus();
      return;
    }

    if (password.length < 5) {
      showError('Ключ занадто короткий.');
      return;
    }

    showLoading('Завантаження зашифрованого файлу...');

    try {
      const response = await fetch('video.enc', { cache: 'no-cache' });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Файл video.enc ще не додано до сайту! Скористайтеся encrypt.html для шифрування відео.');
        }
        throw new Error(`Не вдалося завантажити video.enc (HTTP ${response.status})`);
      }

      showLoading('Розшифрування AES-256-GCM (100k PBKDF2)...');
      const encryptedBuffer = await response.arrayBuffer();

      // Розшифровуємо через Web Crypto API
      const decryptedBuffer = await window.CryptoHelper.decrypt(encryptedBuffer, password);

      // Створюємо тимчасовий безпечний URL для відео у пам'яті браузера
      const blob = new Blob([decryptedBuffer], { type: 'video/mp4' });
      
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
      currentBlobUrl = URL.createObjectURL(blob);

      secretVideo.src = currentBlobUrl;

      // Генеруємо та показуємо таємне підтверджувальне послання переможця
      const confirmationCode = `NR-PREMIUM-${password.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const codeValEl = document.getElementById('confirmationCodeValue');
      if (codeValEl) {
        codeValEl.textContent = confirmationCode;
      }

      const winMessage = `🔥 Привіт! Я перший розгадав грандіозний квест партії «Новий Рівень» та отримав таємне підтверджувальне послання!\n\n🔑 Мій 30-значний пароль: ${password}\n💎 Код переможця: ${confirmationCode}\n\nХочу забрати свій Telegram Premium на 6 місяців! 🎁`;

      const claimPrizeBtn = document.getElementById('claimPrizeBtn');
      if (claimPrizeBtn) {
        claimPrizeBtn.href = `https://t.me/zyabl1kkk?text=${encodeURIComponent(winMessage)}`;
      }

      const copyConfirmationBtn = document.getElementById('copyConfirmationBtn');
      if (copyConfirmationBtn) {
        copyConfirmationBtn.onclick = async () => {
          try {
            await navigator.clipboard.writeText(winMessage);
            copyConfirmationBtn.innerHTML = '<span>✅ Підтвердження скопійовано!</span>';
            setTimeout(() => {
              copyConfirmationBtn.innerHTML = '<span>📋 Скопіювати підтвердження</span>';
            }, 2500);
          } catch (e) {
            prompt('Скопіюйте це повідомлення для надсилання президенту:', winMessage);
          }
        };
      }

      // Перемикаємо екран на відеоплеєр
      hideLoading();
      lockCard.style.display = 'none';
      videoSection.style.display = 'block';

      try {
        await secretVideo.play();
      } catch (playErr) {
        console.log('Автозапуск очікує ручного запуску:', playErr);
      }

    } catch (err) {
      console.error('Помилка розшифрування:', err);
      hideLoading();

      if (err.name === 'OperationError' || err.message.includes('operation failed')) {
        showError('Невірний пароль! Перевірте правильність зібраних символів.');
      } else {
        showError(err.message || 'Помилка розшифрування або пошкоджений файл.');
      }
    }
  }

  unlockBtn.addEventListener('click', handleUnlock);

  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  });

  // Заблокувати знову (очищення пам'яті та повернення)
  lockAgainBtn.addEventListener('click', () => {
    secretVideo.pause();
    secretVideo.removeAttribute('src');
    secretVideo.load();

    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }

    passwordInput.value = '';
    updateCharCount();
    hideError();
    hideLoading();

    videoSection.style.display = 'none';
    lockCard.style.display = 'block';
  });

  // Повноекранний режим
  fullscreenBtn.addEventListener('click', () => {
    if (secretVideo.requestFullscreen) {
      secretVideo.requestFullscreen();
    } else if (secretVideo.webkitRequestFullscreen) {
      secretVideo.webkitRequestFullscreen();
    } else if (secretVideo.msRequestFullscreen) {
      secretVideo.msRequestFullscreen();
    }
  });

  updateCharCount();
});
