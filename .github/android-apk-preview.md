# APK preview cho KinShield Mobile (GitHub Actions + GitHub Releases)

Mỗi lần có commit mới trên `main` (hoặc bấm **Run workflow** trên `main`), workflow **Android APK preview** tự biên dịch file Android `.apk` (`arm64-v8a`) trực tiếp trên GitHub Actions bằng Gradle — **không tốn quota EAS** và **không cần `EXPO_TOKEN`**.

## Tải file `.apk`

- **Link cố định mới nhất:**
  `https://github.com/MoMo-Techday/KinShield-Mobile/releases/download/preview-latest/kinshield-mobile-preview.apk`
- **Trang Release:** `GitHub → Releases → preview-latest`
- Ngoài ra file `.apk` cũng được đính kèm 14 ngày trong mục **Artifacts** của từng lần chạy workflow.

## Cấu hình endpoint (tùy chọn)

Mặc định workflow trỏ về:
- `EXPO_PUBLIC_API_URL`: `https://api-core.kinshield.click/api`
- `EXPO_PUBLIC_WS_URL`: `https://api-core.kinshield.click`

Để đổi URL mà không sửa code, thêm repository variable `EXPO_PUBLIC_API_URL` hoặc `EXPO_PUBLIC_WS_URL` trong **GitHub → Settings → Secrets and variables → Actions → Variables**.
