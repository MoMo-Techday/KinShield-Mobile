// Route gốc điều hướng tới màn đăng nhập của luồng auth.
import { Redirect } from 'expo-router';

// Dùng chuyển hướng của Expo Router để màn gốc không nằm trong lịch sử quay lại.
export default function Index() {
    return <Redirect href="/auth" />;
}
