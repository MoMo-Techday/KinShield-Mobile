import { Redirect, useLocalSearchParams } from 'expo-router';
import { CallAlertsScreen } from '@/features/call-protection/components/CallAlertsScreen';

export default function CallAlertsRoute() {
    const { familyId } = useLocalSearchParams<{ familyId: string }>();
    if (!familyId) return <Redirect href="/family" />;
    return <CallAlertsScreen />;
}
