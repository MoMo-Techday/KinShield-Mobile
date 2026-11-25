# Preview KinShield Mobile bằng Expo Go

Khi có commit mới trên `main`, GitHub Actions publish EAS Update vào nhánh
`expo-go-preview`. Mỗi lần chạy thành công có một mã QR trong **Summary**, trỏ
đến đúng bản Android và iOS của lần chạy đó.

## Kết nối một lần

1. Tạo hoặc chọn project `kinshield-mobile` trong Expo Organization của team.
   Lấy **Project ID** (UUID) trong phần cài đặt project trên
   [Expo Dashboard](https://expo.dev/accounts).
2. Trong [GitHub Actions settings](https://github.com/MoMo-Techday/KinShield-Mobile/settings/secrets/actions),
   thêm repository secret `EXPO_TOKEN` từ tài khoản hoặc robot có quyền publish
   update cho project. Tạo token qua
   [Expo access tokens](https://docs.expo.dev/accounts/programmatic-access/).
3. Trong tab **Variables**, thêm repository variable `EXPO_PROJECT_ID` với UUID
   trên. Có thể đặt thêm `EXPO_PUBLIC_API_URL` và `EXPO_PUBLIC_WS_URL` để đổi
   endpoint preview. Mặc định workflow dùng các URL trong `.env.example`.
   Nếu cùng một biến được đặt trong môi trường `preview` trên Expo, giá trị
   từ Expo được ưu tiên khi publish update.

## Mở bản preview

Trong GitHub, vào **Actions → Expo Go preview → lần chạy thành công → Summary**
và quét QR bằng thiết bị có [Expo Go đúng SDK](https://expo.dev/go). Có thể dùng
**Run workflow** trên `main` để publish lại thủ công.

Repo dùng SDK 58. Android có thể cài Expo Go tương ứng. Với iPhone thật, bản Expo
Go trên App Store chỉ hỗ trợ đến SDK 54. Để mở bản SDK 58, dùng iOS Simulator
hoặc dùng Expo Go tương ứng qua TestFlight theo
[hướng dẫn Expo](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/).

Nếu app mở được nhưng các request auth bị từ chối trên Android hoặc iOS, kiểm
tra Origin guard của Core. Preview dùng cùng API với bản app được publish.
