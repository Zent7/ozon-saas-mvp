import os
from cryptography.fernet import Fernet, InvalidToken

_key = os.getenv("OZON_SECRETS_KEY")
if not _key:
    raise RuntimeError("OZON_SECRETS_KEY is not set in environment")

_fernet = Fernet(_key.encode())


def encrypt_str(value: str) -> str:
    return _fernet.encrypt(value.encode()).decode()


def decrypt_str(token: str) -> str:
    try:
        return _fernet.decrypt(token.encode()).decode()
    except InvalidToken:
        raise ValueError("Invalid secrets key or corrupted ciphertext")