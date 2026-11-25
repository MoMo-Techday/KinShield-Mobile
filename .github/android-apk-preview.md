# APK preview cho KinShield Mobile

Mỗi lần có commit mới trên `main`, workflow **Android APK preview** gửi một bản
Android lên EAS Build. Profile `preview` tạo file APK có thể cài trực tiếp với
package `click.kinshield.mobile.preview`.

## Chuẩn bị khóa ký một lần

Workflow dùng lại `EXPO_TOKEN` và `EXPO_PROJECT_ID` của [Expo Go preview](expo-go-preview.md).
Trước lần chạy đầu, dùng tài khoản Expo có quyền quản lý project để tạo hoặc
chọn keystore Android cho profile `preview`. Chạy trong thư mục `KinShield-Mobile`:

```powershell
npm ci
npx eas-cli@27.11.0 login
npx eas-cli@27.11.0 project:init --id <EXPO_PROJECT_ID> --no-icon
npx eas-cli@27.11.0 credentials:configure-build --platform android --profile preview
```

Thay `<EXPO_PROJECT_ID>` bằng UUID project `kinshield-mobile` của MoMo Techday.
Chọn keystore có sẵn nếu đã tạo cho package này, hoặc chọn tạo keystore mới nếu
chưa có. Expo lưu keystore để các lần build sau dùng lại cùng khóa ký.
Lệnh `project:init` có thể ghi liên kết project vào `app.json` trên máy chạy lệnh.

## Tải APK

1. Vào **GitHub → Actions → Android APK preview → Summary**.
2. Bấm **Theo dõi build và tải APK khi hoàn tất**. GitHub báo xanh khi Expo đã
   nhận yêu cầu, còn trạng thái biên dịch nằm trên trang EAS Build.
3. Khi EAS báo **Finished**, tải và cài file APK trên Android.

Có thể dùng **Run workflow** trên `main` để gửi lại yêu cầu build. Mỗi APK
dùng một lượt EAS Build. iOS tiếp tục quét QR từ workflow **Expo Go preview**.

APK mặc định dùng `https://api-core.kinshield.click/api`. Để đổi API cho các
bản Android chạy từ GitHub, đặt repository variable `EXPO_PUBLIC_API_URL`.
Giá trị này được chuyển vào profile build để có mặt trong APK.
