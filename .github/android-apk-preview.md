# APK preview cho KinShield Mobile

Mỗi lần có commit mới trên `main`, workflow **Android APK preview** gửi một bản
Android lên EAS Build. Profile `preview` tạo file APK có thể cài trực tiếp với
package `click.kinshield.mobile.preview`.

## Chuẩn bị khóa ký một lần

Workflow dùng secret `EXPO_TOKEN` (tạo tại [Expo access tokens](https://docs.expo.dev/accounts/programmatic-access/)).
Trước lần chạy đầu, dùng tài khoản Expo có quyền quản lý project để tạo hoặc
chọn keystore Android cho profile `preview`. Chạy trong thư mục `KinShield-Mobile`:

```powershell
npm ci
npx eas-cli@27.11.0 login
npx eas-cli@27.11.0 credentials:configure-build --platform android --profile preview
```

Chọn keystore có sẵn nếu đã tạo cho package này, hoặc chọn tạo keystore mới nếu
chưa có. Expo lưu keystore để các lần build sau dùng lại cùng khóa ký.

## Tải APK

1. Vào **GitHub → Actions → Android APK preview**.
2. Mở log bước **Build Android APK via EAS** để lấy link trang EAS Build và link tải trực tiếp file `.apk`.
3. Tải và cài file APK trên điện thoại Android.

Có thể dùng **Run workflow** trên `main` để gửi lại yêu cầu build. Mỗi APK
dùng một lượt EAS Build.

APK mặc định dùng các endpoint khai báo trong profile `preview` của `eas.json`.
