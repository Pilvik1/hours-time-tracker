from getpass import getpass

from argon2 import PasswordHasher


def main() -> None:
    password = getpass("Password: ")
    confirmation = getpass("Confirm password: ")
    if not password:
        raise SystemExit("Password cannot be empty")
    if password != confirmation:
        raise SystemExit("Passwords do not match")
    print(PasswordHasher().hash(password))


if __name__ == "__main__":
    main()
