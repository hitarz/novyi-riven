#!/usr/bin/env python3
"""
Скрипт для шифрування відеофайлу 30-значним паролем (AES-256-GCM + PBKDF2)
Сумісний з клієнтським дешифратором сайту "Новий Рівень" (crypto.js).
"""

import sys
import os
import secrets
import string
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

SALT_LEN = 16
IV_LEN = 12
ITERATIONS = 100000

def generate_strong_password(length=30) -> str:
    """Генерація надійного 30-значного ключа без візуально схожих символів."""
    chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz!@#*+=-"
    return "".join(secrets.choice(chars) for _ in range(length))

def derive_key(password: str, salt: bytes) -> bytes:
    """Отримання ключа AES-256 з пароля через PBKDF2 (SHA-256, 100k ітерацій)."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=ITERATIONS,
    )
    return kdf.derive(password.encode("utf-8"))

def encrypt_file(input_file: str, output_file: str, password: str):
    if not os.path.exists(input_file):
        print(f"Помилка: файл '{input_file}' не знайдено!")
        sys.exit(1)

    print(f"[*] Читання файлу: {input_file} ({os.path.getsize(input_file) / (1024*1024):.2f} MB)...")
    with open(input_file, "rb") as f:
        plaintext = f.read()

    print("[*] Генерація солі (16 байт) та вектора ініціалізації IV (12 байт)...")
    salt = os.urandom(SALT_LEN)
    iv = os.urandom(IV_LEN)

    print(f"[*] Генерація ключа PBKDF2 ({ITERATIONS} ітерацій)...")
    key = derive_key(password, salt)

    print("[*] Шифрування AES-256-GCM...")
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(iv, plaintext, None)

    print(f"[*] Запис зашифрованого файлу в '{output_file}'...")
    with open(output_file, "wb") as f:
        f.write(salt + iv + ciphertext)

    print("\n" + "=" * 55)
    print(" УСПІШНО ЗАШИФРОВАНО!")
    print(f" Зашифрований файл : {output_file}")
    print(f" Довжина пароля    : {len(password)} символів")
    print(f" ВАШ ПАРОЛЬ        : {password}")
    print("=" * 55)
    print("\nСкопіюйте цей пароль та розмістіть 'video.enc' поруч з index.html.")

def decrypt_verify(encrypted_file: str, password: str) -> bool:
    """Перевірка валідності розшифрування."""
    with open(encrypted_file, "rb") as f:
        data = f.read()

    salt = data[:SALT_LEN]
    iv = data[SALT_LEN:SALT_LEN+IV_LEN]
    ciphertext = data[SALT_LEN+IV_LEN:]

    key = derive_key(password, salt)
    aesgcm = AESGCM(key)
    try:
        aesgcm.decrypt(iv, ciphertext, None)
        return True
    except Exception:
        return False

def main():
    args = sys.argv[1:]
    
    if len(args) == 0:
        print("Використання:")
        print("  python3 encrypt.py <відеофайл.mp4> [пароль_30_символів] [вихідний_файл.enc]")
        print("\nПриклад:")
        print("  python3 encrypt.py secret.mp4")
        sys.exit(0)

    input_video = args[0]
    password = args[1] if len(args) > 1 else None
    output_file = args[2] if len(args) > 2 else "video.enc"

    if not password:
        password = generate_strong_password(30)
        print(f"[*] Згенеровано випадковий 30-значний пароль: {password}")
    else:
        print(f"[*] Використовується вказаний пароль: {password} ({len(password)} симв.)")

    encrypt_file(input_video, output_file, password)

    # Верифікація
    print("[*] Перевірка цілісності шифрування...")
    if decrypt_verify(output_file, password):
        print("[+] Верифікація пройдена: пароль успішно розшифровує файл!")
    else:
        print("[-] Помилка верифікації!")

if __name__ == "__main__":
    main()
