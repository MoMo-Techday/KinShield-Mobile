import type {
    ExpoSpeechRecognitionErrorEvent,
    ExpoSpeechRecognitionOptions,
    ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

type ExpoNativeSpeechModule =
    typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;
type RecognitionOptions = Pick<
    ExpoSpeechRecognitionOptions,
    'continuous' | 'interimResults' | 'lang' | 'requiresOnDeviceRecognition'
>;

type SpeechSubscription = { remove: () => void };

type SpeechNativeModule = {
    addErrorListener: (
        listener: (event: ExpoSpeechRecognitionErrorEvent) => void,
    ) => SpeechSubscription;
    addResultListener: (
        listener: (event: ExpoSpeechRecognitionResultEvent) => void,
    ) => SpeechSubscription;
    getSupportedLocales: () => Promise<{
        installedLocales: string[];
        locales: string[];
    }>;
    isRecognitionAvailable: () => boolean;
    requestPermissionsAsync: () => Promise<{ granted: boolean }>;
    start: (options: RecognitionOptions) => void;
    stop: () => void;
    supportsOnDeviceRecognition: () => boolean;
};

export type CallSpeechResult = {
    isFinal: boolean;
    transcript: string;
};

export type CallSpeechStatus = 'error' | 'interrupted' | 'unavailable';
export type CallSpeechStartResult =
    | 'permission-denied'
    | 'started'
    | 'unavailable';

function createNativeSpeechModule(
    nativeModule: ExpoNativeSpeechModule,
): SpeechNativeModule {
    return {
        addErrorListener: (listener) =>
            nativeModule.addListener('error', listener),
        addResultListener: (listener) =>
            nativeModule.addListener('result', listener),
        getSupportedLocales: () =>
            nativeModule.getSupportedLocales({}),
        isRecognitionAvailable: () =>
            nativeModule.isRecognitionAvailable(),
        requestPermissionsAsync: () =>
            nativeModule.requestPermissionsAsync(),
        start: (options) => nativeModule.start(options),
        stop: () => nativeModule.stop(),
        supportsOnDeviceRecognition: () =>
            nativeModule.supportsOnDeviceRecognition(),
    };
}

export function createCallSpeechRecognizer(
    initialModule?: SpeechNativeModule,
) {
    let module = initialModule;
    let permissionGranted = false;
    let active = false;
    let subscriptions: SpeechSubscription[] = [];

    async function resolveModule(): Promise<SpeechNativeModule> {
        if (module) return module;
        const nativeModule = await import('expo-speech-recognition');
        module = createNativeSpeechModule(
            nativeModule.ExpoSpeechRecognitionModule,
        );
        return module;
    }

    function removeListeners() {
        subscriptions.forEach((subscription) => subscription.remove());
        subscriptions = [];
    }

    return {
        async requestPermissions(): Promise<boolean> {
            const permissions = await (
                await resolveModule()
            ).requestPermissionsAsync();
            permissionGranted = permissions.granted;
            return permissionGranted;
        },

        async start(
            onResult: (result: CallSpeechResult) => void,
            onStatus: (status: CallSpeechStatus) => void,
        ): Promise<CallSpeechStartResult> {
            if (!permissionGranted) return 'permission-denied';
            if (active) return 'started';
            const nativeModule = await resolveModule();
            if (!nativeModule.isRecognitionAvailable()) return 'unavailable';

            const locales = await nativeModule.getSupportedLocales();
            if (!locales.locales.includes('vi-VN')) return 'unavailable';

            const requireOnDevice =
                nativeModule.supportsOnDeviceRecognition() &&
                locales.installedLocales.includes('vi-VN');
            subscriptions = [
                nativeModule.addResultListener(
                    (event: ExpoSpeechRecognitionResultEvent) => {
                        const transcript = event.results[0]?.transcript;
                        if (!transcript) return;
                        onResult({ transcript, isFinal: event.isFinal });
                    },
                ),
                nativeModule.addErrorListener(
                    (event: ExpoSpeechRecognitionErrorEvent) => {
                        onStatus(
                            event.error === 'interrupted'
                                ? 'interrupted'
                                : event.error === 'language-not-supported' ||
                                    event.error === 'service-not-allowed'
                                  ? 'unavailable'
                                  : 'error',
                        );
                    },
                ),
            ];

            try {
                nativeModule.start({
                    lang: 'vi-VN',
                    interimResults: true,
                    continuous: true,
                    requiresOnDeviceRecognition: requireOnDevice,
                });
                active = true;
                return 'started';
            } catch (error) {
                removeListeners();
                throw error;
            }
        },

        stop() {
            if (active) module?.stop();
            active = false;
            removeListeners();
        },
    };
}

export const callSpeechRecognizer = createCallSpeechRecognizer();
