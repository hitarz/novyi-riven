/**
 * Модуль криптографії Web Crypto API для захищеного відео
 * Стандарт: AES-256-GCM + PBKDF2 (SHA-256, 100,000 ітерацій)
 * Формат зашифрованого файлу:
 * [16 байт SALT] + [12 байт IV] + [Шифротекст + 16 байт GCM Auth Tag]
 */

const CryptoHelper = {
  SALT_LEN: 16,
  IV_LEN: 12,
  ITERATIONS: 100000,

  /**
   * Отримання AES-GCM ключа з пароля за допомогою PBKDF2
   */
  async deriveKey(password, salt, usage) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      [usage]
    );
  },

  /**
   * Зашифрувати буфер даних паролем
   * @param {ArrayBuffer} dataBuffer 
   * @param {string} password 
   * @returns {Promise<Uint8Array>}
   */
  async encrypt(dataBuffer, password) {
    const salt = window.crypto.getRandomValues(new Uint8Array(this.SALT_LEN));
    const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LEN));
    const key = await this.deriveKey(password, salt, 'encrypt');

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      dataBuffer
    );

    const result = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, this.SALT_LEN);
    result.set(new Uint8Array(encrypted), this.SALT_LEN + this.IV_LEN);
    return result;
  },

  /**
   * Розшифрувати буфер даних паролем
   * @param {Uint8Array|ArrayBuffer} encryptedBuffer 
   * @param {string} password 
   * @returns {Promise<ArrayBuffer>}
   */
  async decrypt(encryptedBuffer, password) {
    const bytes = encryptedBuffer instanceof Uint8Array 
      ? encryptedBuffer 
      : new Uint8Array(encryptedBuffer);

    if (bytes.byteLength < this.SALT_LEN + this.IV_LEN + 16) {
      throw new Error('Файл пошкоджений або занадто малий для формату AES-GCM');
    }

    const salt = bytes.slice(0, this.SALT_LEN);
    const iv = bytes.slice(this.SALT_LEN, this.SALT_LEN + this.IV_LEN);
    const ciphertext = bytes.slice(this.SALT_LEN + this.IV_LEN);

    const key = await this.deriveKey(password, salt, 'decrypt');

    // Якщо пароль невірний, AES-GCM викине виняток OperationError
    return await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );
  }
};

window.CryptoHelper = CryptoHelper;
