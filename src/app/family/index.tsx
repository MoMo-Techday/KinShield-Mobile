// Route danh sách gia đình; nội dung và thao tác thuộc feature Family.
import { FamilyPicker } from '@/features/family/components/FamilyPicker';

// Hiện các gia đình được phép đọc hoặc form ghép cặp cho người chưa tham gia.
export default function FamilyIndex() {
    return <FamilyPicker />;
}
