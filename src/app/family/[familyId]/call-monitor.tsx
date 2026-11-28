import { Redirect, useLocalSearchParams } from 'expo-router';
import { CallMonitorScreen } from '@/features/call-protection/components/CallMonitorScreen';

export default function CallMonitorRoute() {
    const { familyId } = useLocalSearchParams<{ familyId: string }>();
    if (!familyId) return <Redirect href="/family" />;
    return <CallMonitorScreen />;
}
