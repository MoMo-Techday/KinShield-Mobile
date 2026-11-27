import { useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { FamilyPage } from '@/features/family/components/FamilyPage';
import { useActiveFamily } from '@/features/family/hooks/family-context';
import { callSpeechRecognizer } from '@/features/call-protection/native/call-speech-recognizer';
import { createCallMonitorSession } from '@/features/call-protection/services/call-monitor-session';
import { createCallWarningAudio } from '@/features/call-protection/services/call-warning-audio';
import {
    createInitialCallMonitorState,
    mapCallIntervention,
    reduceCallMonitorState,
} from '@/features/call-protection/utils/call-monitor-state';
import { canMonitorCall } from '@/features/call-protection/utils/call-protection-access';

type CaptureStatus =
    | 'idle'
    | 'requesting-permission'
    | 'permission-denied'
    | 'starting'
    | 'unavailable'
    | 'error';

const captureStatusMessage: Record<CaptureStatus, string> = {
    idle: 'Chưa bắt đầu thu giọng nói.',
    'requesting-permission': 'Đang chờ quyền truy cập micro và nhận dạng giọng nói.',
    'permission-denied': 'Bạn chưa cấp quyền nhận dạng giọng nói.',
    starting: 'Đang kết nối và khởi động phiên bảo vệ.',
    unavailable: 'Dịch vụ hoặc ngôn ngữ tiếng Việt không khả dụng trên thiết bị.',
    error: 'Không thể khởi động dịch vụ nhận dạng giọng nói.',
};

const phaseMessage = {
    idle: 'Sẵn sàng khi bạn chủ động bắt đầu.',
    consent: 'Vui lòng đọc thông tin trước khi tiếp tục.',
    permission: 'Cần quyền nhận dạng giọng nói trước khi bắt đầu.',
    connecting: 'Đang kết nối phiên bảo vệ.',
    'server-session': 'Đang mở phiên bảo vệ.',
    listening: 'Đang nghe. Bản xem trước chỉ lưu tạm trên thiết bị.',
    analyzing: 'Đang phân tích. Chưa có kết quả; không thể xem là an toàn.',
    degraded: 'Giám sát đã dừng do dịch vụ hoặc kết nối không khả dụng.',
    stopping: 'Đang dừng và xóa dữ liệu tạm.',
    stopped: 'Đã dừng và xóa bản xem trước.',
} as const;

function serviceErrorMessage(code: string): string {
    switch (code) {
        case 'UNAUTHORIZED':
        case 'FAMILY_FORBIDDEN':
        case 'FORBIDDEN':
            return 'Phiên đăng nhập hoặc quyền gia đình không còn hợp lệ.';
        case 'AI_UNAVAILABLE':
            return 'Dịch vụ phân tích hiện không khả dụng. Không có kết luận an toàn.';
        case 'RATE_LIMITED':
        case 'QUEUE_LIMIT':
            return 'Đã vượt giới hạn xử lý. Giám sát đã dừng để tránh bỏ sót nội dung.';
        case 'INTERRUPTED':
            return 'Nhận dạng giọng nói bị gián đoạn. Hãy thử lại khi cuộc gọi ổn định.';
        case 'UNAVAILABLE':
            return 'Dịch vụ hoặc ngôn ngữ tiếng Việt không khả dụng trên thiết bị.';
        case 'ERROR':
            return 'Nhận dạng giọng nói gặp lỗi. Hãy kiểm tra dịch vụ trên thiết bị.';
        default:
            return 'Kết nối bị gián đoạn. Hãy kiểm tra mạng và thử lại.';
    }
}

function alertConfirmationText(status: string) {
    switch (status) {
        case 'confirmed':
            return 'Máy chủ đã xác nhận lưu cảnh báo SOS.';
        case 'unconfirmed':
            return 'Chưa xác nhận lưu cảnh báo SOS. Hãy kiểm tra với người thân.';
        default:
            return 'Cảnh báo SOS chưa được yêu cầu.';
    }
}

export function CallMonitorScreen() {
    const family = useActiveFamily();
    const [state, dispatch] = useReducer(
        reduceCallMonitorState,
        undefined,
        createInitialCallMonitorState,
    );
    const [captureStatus, setCaptureStatus] = useState<CaptureStatus>('idle');
    const [serviceError, setServiceError] = useState<string | null>(null);
    const [warningAudioStatus, setWarningAudioStatus] = useState<
        'idle' | 'playing' | 'unavailable'
    >('idle');
    const [busy, setBusy] = useState(false);
    const warningAudioRef = useRef(createCallWarningAudio());
    const sessionRef = useRef<ReturnType<typeof createCallMonitorSession> | null>(
        null,
    );
    const mounted = useRef(true);
    const foreground = useRef(
        AppState.currentState === 'active' || AppState.currentState === null,
    );

    useEffect(() => {
        mounted.current = true;
        const warningAudio = warningAudioRef.current;
        const appState = AppState.addEventListener('change', (nextState) => {
            foreground.current = nextState === 'active';
            if (foreground.current) return;
            dispatch({ type: 'backgrounded' });
            setWarningAudioStatus(warningAudio.stop());
            void sessionRef.current?.stop();
        });

        return () => {
            mounted.current = false;
            appState.remove();
            warningAudio.stop();
            void sessionRef.current?.stop();
        };
    }, []);

    if (!canMonitorCall(family.viewerRole)) {
        return <Redirect href="/family" />;
    }

    async function requestPermission() {
        setServiceError(null);
        setCaptureStatus('requesting-permission');
        dispatch({ type: 'consent-presented' });
        dispatch({ type: 'consent-accepted' });
        dispatch({ type: 'permission-requested' });
        try {
            const granted = await callSpeechRecognizer.requestPermissions();
            if (!mounted.current || !foreground.current) return;
            setCaptureStatus(granted ? 'idle' : 'permission-denied');
            dispatch({
                type: granted ? 'permission-granted' : 'permission-denied',
            });
        } catch {
            if (!mounted.current) return;
            setCaptureStatus('error');
            dispatch({ type: 'permission-denied' });
        }
    }

    async function startCapture() {
        if (!state.consentAccepted || !state.permissionGranted || busy) return;
        setWarningAudioStatus(warningAudioRef.current.stop());
        setBusy(true);
        setServiceError(null);
        setCaptureStatus('starting');
        dispatch({ type: 'start-requested' });

        const session = createCallMonitorSession({
            familyId: family.id,
            stopRecognition: () => callSpeechRecognizer.stop(),
            onStatus: (status) => {
                if (!mounted.current) return;
                if (status === 'server-session')
                    dispatch({ type: 'connection-established' });
                if (status === 'listening')
                    dispatch({ type: 'session-started' });
                if (status === 'degraded') {
                    dispatch({ type: 'monitor-degraded' });
                    setWarningAudioStatus(warningAudioRef.current.stop());
                }
                if (status === 'stopped') {
                    dispatch({ type: 'cleanup-completed' });
                    setWarningAudioStatus(warningAudioRef.current.stop());
                }
            },
            onAnalysis: (analysis) => {
                if (!mounted.current) return;
                setWarningAudioStatus(warningAudioRef.current.stop());
                dispatch({ type: 'analysis-received', analysis });
                setServiceError(null);
            },
            onError: (code) => {
                if (mounted.current) setServiceError(serviceErrorMessage(code));
            },
        });
        sessionRef.current = session;

        let startFailure: CaptureStatus = 'error';
        try {
            await session.start(async (onFinalized, onInterrupted, onInterim) => {
                const result = await callSpeechRecognizer.start(
                    ({ transcript, isFinal }) => {
                        if (!mounted.current) return;
                        if (isFinal) {
                            dispatch({ type: 'transcript-finalized' });
                            onFinalized(transcript);
                        } else {
                            dispatch({
                                type: 'interim-transcript',
                                text: transcript,
                            });
                            onInterim(transcript);
                        }
                    },
                    (status) => {
                        if (mounted.current) {
                            setServiceError(
                                serviceErrorMessage(status.toUpperCase()),
                            );
                        }
                        onInterrupted();
                    },
                );
                if (result !== 'started') {
                    if (result === 'permission-denied') {
                        startFailure = 'permission-denied';
                        dispatch({ type: 'permission-lost' });
                    } else {
                        startFailure = 'unavailable';
                    }
                    throw new Error(result.toUpperCase());
                }
            });
        } catch {
            if (mounted.current) {
                setCaptureStatus(startFailure);
                dispatch({ type: 'monitor-degraded' });
            }
        } finally {
            if (mounted.current) setBusy(false);
        }
    }

    async function stopCapture() {
        dispatch({ type: 'stop-requested' });
        setWarningAudioStatus(warningAudioRef.current.stop());
        await sessionRef.current?.stop();
    }

    async function playWarningAudio() {
        if (!state.analysis) return;
        const status = await warningAudioRef.current.play(
            state.analysis.audioStatus,
            state.analysis.audio,
        );
        if (mounted.current) setWarningAudioStatus(status);
    }

    const intervention = mapCallIntervention(state.analysis);
    const isActive =
        state.phase === 'connecting' ||
        state.phase === 'server-session' ||
        state.phase === 'listening' ||
        state.phase === 'analyzing';
    const showIntervention =
        state.analysis !== null ||
        state.phase === 'listening' ||
        state.phase === 'analyzing';

    return (
        <FamilyPage>
            <View className="gap-2">
                <Text accessibilityRole="header" className="text-3xl font-bold">
                    Bảo vệ cuộc gọi
                </Text>
                <Text className="text-base text-muted-foreground">
                    Chỉ bắt đầu sau khi bạn đồng ý, cấp quyền và nhấn Bắt đầu.
                    Âm thanh không được gửi đến Kinshield.
                </Text>
            </View>

            <View className="gap-3 rounded-2xl border border-border bg-card p-4">
                <Text className="font-semibold">
                    Thông tin về nhận dạng giọng nói
                </Text>
                <Text>
                    Hãy bật loa ngoài khi thử nghiệm. Dịch vụ nhận dạng giọng
                    nói của hệ điều hành có thể xử lý âm thanh ngoài thiết bị.
                    Sau khi bạn bắt đầu, Kinshield nhận bản chép lời đã được
                    che một số mẫu thông tin nhạy cảm; không gửi âm thanh gốc.
                    Việc che dữ liệu chỉ là nỗ lực tốt nhất, không phát hiện
                    được mọi thông tin cá nhân.
                </Text>
                {!state.consentAccepted ? (
                    <Button
                        className="h-auto min-h-12"
                        disabled={captureStatus === 'requesting-permission'}
                        onPress={() => void requestPermission()}
                    >
                        <Text>Đồng ý và tiếp tục</Text>
                    </Button>
                ) : (
                    <Text accessibilityLiveRegion="polite">
                        Bạn đã đồng ý. Chỉ bản chép lời đã che mới được gửi khi
                        bạn nhấn Bắt đầu.
                    </Text>
                )}
            </View>

            <View className="gap-3 rounded-2xl border border-border p-4">
                <Text
                    accessibilityLiveRegion="polite"
                    accessibilityRole="text"
                    className="font-semibold"
                >
                    {serviceError ??
                        (captureStatus !== 'idle'
                            ? captureStatusMessage[captureStatus]
                            : phaseMessage[state.phase])}
                </Text>
                {(captureStatus === 'requesting-permission' ||
                    captureStatus === 'starting' ||
                    busy) && (
                    <ActivityIndicator accessibilityLabel="Đang xử lý phiên bảo vệ" />
                )}
                {state.consentAccepted && !state.permissionGranted && (
                    <Button
                        variant="outline"
                        className="h-auto min-h-12"
                        disabled={captureStatus === 'requesting-permission'}
                        onPress={() => void requestPermission()}
                    >
                        <Text>Yêu cầu quyền nhận dạng giọng nói</Text>
                    </Button>
                )}
                {state.permissionGranted && !isActive && (
                    <Button
                        className="h-auto min-h-12"
                        disabled={busy}
                        onPress={() => void startCapture()}
                    >
                        <Text>
                            {state.phase === 'degraded' ||
                            state.phase === 'stopped'
                                ? 'Thử lại'
                                : 'Bắt đầu nghe'}
                        </Text>
                    </Button>
                )}
                {isActive && (
                    <Button
                        variant="outline"
                        className="h-auto min-h-12"
                        onPress={() => void stopCapture()}
                    >
                        <Text>Dừng và xóa dữ liệu tạm</Text>
                    </Button>
                )}
            </View>

            {isActive && (
                <View className="min-h-24 gap-2 rounded-2xl border border-border bg-card p-4">
                    <Text className="font-semibold">
                        Bản xem trước tạm thời
                    </Text>
                    <Text accessibilityLiveRegion="polite">
                        {state.transcriptPreview ||
                            'Chưa có nội dung nhận dạng.'}
                    </Text>
                </View>
            )}

            {showIntervention && (
                <View
                    className="gap-2 rounded-2xl border border-border bg-card p-4"
                    accessibilityRole={
                        intervention.kind === 'high-risk' ? 'alert' : 'none'
                    }
                >
                    <Text className="font-semibold">
                        {intervention.kind === 'analyzing'
                            ? 'Đang phân tích — chưa có kết luận an toàn.'
                            : intervention.kind === 'non-interruptive'
                              ? 'Phân tích mới nhất chưa phát hiện rủi ro cao.'
                              : intervention.kind === 'counter-question'
                                ? intervention.question ??
                                  'Hãy tự xác minh người đang yêu cầu thông tin.'
                                : intervention.kind === 'warning'
                                  ? intervention.warning ??
                                    'Cẩn trọng và xác minh người gọi.'
                                  : 'Nguy cơ cao — hãy dừng và xác minh.'}
                    </Text>
                    {state.analysis && (
                        <Text>
                            Mức rủi ro {state.analysis.riskScore}/100 · Giai
                            đoạn {state.analysis.stage}
                        </Text>
                    )}
                    {intervention.kind === 'high-risk' && (
                        <Text accessibilityLiveRegion="polite">
                            {alertConfirmationText(intervention.alertStatus)}
                        </Text>
                    )}
                    {intervention.kind === 'warning' &&
                        intervention.canReplayAudio &&
                        warningAudioStatus !== 'unavailable' && (
                            <Button
                                className="h-auto min-h-12"
                                accessibilityLabel={
                                    warningAudioStatus === 'playing'
                                        ? 'Phát lại cảnh báo bằng âm thanh'
                                        : 'Phát cảnh báo bằng âm thanh'
                                }
                                onPress={() => void playWarningAudio()}
                            >
                                <Text>
                                    {warningAudioStatus === 'playing'
                                        ? 'Phát lại âm thanh cảnh báo'
                                        : 'Phát âm thanh cảnh báo'}
                                </Text>
                            </Button>
                        )}
                    {intervention.kind === 'warning' &&
                        (!intervention.canReplayAudio ||
                            warningAudioStatus === 'unavailable') && (
                            <Text accessibilityLiveRegion="polite">
                                Âm thanh cảnh báo không khả dụng. Hãy làm theo
                                hướng dẫn bằng văn bản.
                            </Text>
                        )}
                </View>
            )}
        </FamilyPage>
    );
}
