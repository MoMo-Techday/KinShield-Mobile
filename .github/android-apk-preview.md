# Bản cài đặt Android cho KinShield (GitHub Actions + GitHub Releases)

Mỗi lần có commit mới trên `main` (hoặc bấm **Run workflow** trên `main`), workflow **Android APK preview** tự biên dịch file `KinShield.apk` (`arm64-v8a`) trực tiếp trên GitHub Actions bằng Gradle — **không tốn quota EAS** và **không cần `EXPO_TOKEN`**.

## Tải file `.apk`

- **Link cố định mới nhất:**
  `https://github.com/MoMo-Techday/KinShield-Mobile/releases/download/preview-latest/KinShield.apk`
- **Checksum SHA-256:**
  `https://github.com/MoMo-Techday/KinShield-Mobile/releases/download/preview-latest/KinShield.apk.sha256`
- **Trang Release:** `GitHub → Releases → preview-latest`

## Ký phát hành cố định (Release Keystore) để tránh lỗi cập nhật & giảm cảnh báo Play Protect

Tạo 1 keystore duy nhất (chạy 1 lần trên máy):

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore kinshield-release.jks -alias kinshield -keyalg RSA -keysize 2048 -validity 10000
base64 -w 0 kinshield-release.jks
```

Sau đó thêm 4 **GitHub Repository Secrets** (`Settings → Secrets and variables → Actions → Secrets`):
- `ANDROID_KEYSTORE_BASE64`: chuỗi base64 của file `kinshield-release.jks`
- `ANDROID_KEYSTORE_PASSWORD`: mật khẩu keystore
- `ANDROID_KEY_ALIAS`: `kinshield`
- `ANDROID_KEY_PASSWORD`: mật khẩu key (nếu trùng keystore password thì điền giống nhau)

## Cấu hình endpoint (tùy chọn)

Mặc định workflow trỏ về:
- `EXPO_PUBLIC_API_URL`: `https://api-core.kinshield.click/api`
- `EXPO_PUBLIC_WS_URL`: `https://api-core.kinshield.click`
