# KinShield — Khiên Gia Đình

> **Dự án tham gia giải MoMo TechDay 2026** — Chủ đề **Anti-Scam**: *Nhận diện và cảnh báo lừa đảo trước khi mất tiền hoặc thông tin.*

🌐 **Website:** [https://www.kinshield.click](https://www.kinshield.click)

---

## Giới thiệu dự án

**KinShield (Khiên Gia Đình)** là ứng dụng bảo vệ gia đình trên điện thoại (**Android & iOS**), giúp cha mẹ và người lớn tuổi nhận diện, phòng tránh các kịch bản lừa đảo trực tuyến tại Việt Nam trước khi mất tiền hoặc lộ thông tin nhạy cảm, đồng thời kết nối con cái từ xa mà vẫn tôn trọng tối đa sự riêng tư.

---

## 3 Lớp Bảo Vệ Cốt Lõi

1. **Lớp 1 — Soi 1 chạm X-Ray:** Chia sẻ ảnh chụp Zalo, biên lai chuyển khoản, mã VietQR hoặc đường link lạ sang ứng dụng để phát hiện ảnh chỉnh sửa số tiền (ELA), mã QR đánh tráo, tên miền giả mạo và tệp `.apk` độc hại.
2. **Lớp 2 — Can thiệp giọng nói tiếng Việt (Voice Guardian):** Phát hiện dấu hiệu thao túng tâm lý (cô lập, hù dọa, đòi đọc mã OTP) ngay trong cuộc gọi và cất tiếng Việt ấm áp qua loa điện thoại giúp cha mẹ bình tĩnh cúp máy.
3. **Lớp 3 — Hạ nhiệt 180 giây & Con đồng duyệt (Family Co-Sign):** Tạm đóng băng giao dịch lớn tới số tài khoản lạ và gửi thẻ cảnh báo (ẩn nội dung trò chuyện riêng) sang điện thoại con để bấm chặn từ xa; hết 180 giây nếu con bận, giao dịch tự động hủy an toàn.

---

## 4 Kịch Bản Lừa Đảo Phổ Biến Tại Việt Nam

- **Bill chuyển khoản giả & Quishing VietQR:** Soi vùng chỉnh sửa số tiền và bóc đúng số tài khoản thật từ mã QR.
- **DeepVoice / Giả giọng người thân báo tai nạn gấp:** Phát hiện kịch bản hối chuyển tiền khẩn cấp vào tài khoản lạ và nhắc gọi xác minh trực tiếp máy thật của con.
- **Shipper giả gọi hủy gói cước, đòi OTP:** Chặn liên kết mạo danh và nhắc tuyệt đối không đọc 6 số OTP.
- **Giả Công an / VNeID gửi tệp `.apk`:** Cảnh báo tệp cài đặt độc hại, cắt cơn hoảng loạn bằng giọng Việt và khóa giao dịch 180 giây.

---

## Hệ Sinh Thái Repository

Dự án **KinShield** được tổ chức theo kiến trúc tách dịch vụ gồm **6 repository**:

| Repository | Công nghệ | Vai trò |
| :--- | :--- | :--- |
| [**KinShield-Mobile**](https://github.com/MoMo-Techday/KinShield-Mobile) | React Native / Expo | Ứng dụng điện thoại Android & iOS (Chế độ Cha Mẹ & Chế độ Con) |
| [**KinShield-Web**](https://github.com/MoMo-Techday/KinShield-Web) | Next.js / Tailwind CSS | Trang giới thiệu sản phẩm & cổng tài khoản gia đình |
| [**KinShield-Core**](https://github.com/MoMo-Techday/KinShield-Core) | NestJS / PostgreSQL / Redis / Socket.IO | Backend lõi xác thực, ghép đôi gia đình & đồng duyệt thời gian thực |
| [**KinShield-AI**](https://github.com/MoMo-Techday/KinShield-AI) | Python / FastAPI / Claude / Qdrant | Động cơ AI & pháp y số (X-Ray ảnh/URL/QR, phân tích cuộc gọi, RAG, TTS tiếng Việt) |
| [**KinShield-LocalStack**](https://github.com/MoMo-Techday/KinShield-LocalStack) | Docker Compose | Hạ tầng phát triển local (PostgreSQL, Redis, MinIO S3) |
| [**KinShield-Benchmark**](https://github.com/MoMo-Techday/KinShield-Benchmark) | JSON / Python | Bộ mẫu kịch bản lừa đảo tiếng Việt & kiểm thử đối chứng |

---

*KinShield — Khiên Gia Đình • Dự án tham gia giải **MoMo TechDay 2026**.*
