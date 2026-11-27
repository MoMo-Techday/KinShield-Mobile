import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCallSpeechRecognizer } from '@/features/call-protection/native/call-speech-recognizer';
import type {
    ExpoSpeechRecognitionErrorCode,
    ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

type ResultEvent = ExpoSpeechRecognitionResultEvent;
type ErrorEvent = { error: ExpoSpeechRecognitionErrorCode; message: string };
type ResultListener = (event: ResultEvent) => void;
type ErrorListener = (event: ErrorEvent) => void;

function makeSpeechModule() {
    const resultListeners = new Set<ResultListener>();
    const errorListeners = new Set<ErrorListener>();
    const module = {
        addErrorListener: vi.fn((listener: ErrorListener) => {
            errorListeners.add(listener);
            return {
                remove: vi.fn(() => errorListeners.delete(listener)),
            };
        }),
        addResultListener: vi.fn((listener: ResultListener) => {
            resultListeners.add(listener);
            return {
                remove: vi.fn(() => resultListeners.delete(listener)),
            };
        }),
        emitError(event: ErrorEvent) {
            errorListeners.forEach((listener) => listener(event));
        },
        emitResult(event: ResultEvent) {
            resultListeners.forEach((listener) => listener(event));
        },
        getSupportedLocales: vi.fn(async () => ({
            locales: ['vi-VN'],
            installedLocales: ['vi-VN'],
        })),
        isRecognitionAvailable: vi.fn(() => true),
        requestPermissionsAsync: vi.fn(async () => ({ granted: true })),
        start: vi.fn(),
        stop: vi.fn(),
        supportsOnDeviceRecognition: vi.fn(() => true),
    };
    return { module, resultListeners, errorListeners };
}

describe('call speech recognizer', () => {
    let speech: ReturnType<typeof makeSpeechModule>;

    beforeEach(() => {
        speech = makeSpeechModule();
    });

    it('does not start capture until explicitly started after permission', async () => {
        const recognizer = createCallSpeechRecognizer(speech.module);

        expect(speech.module.start).not.toHaveBeenCalled();
        await expect(recognizer.requestPermissions()).resolves.toBe(true);
        expect(speech.module.start).not.toHaveBeenCalled();
    });

    it('refuses to start when vi-VN is unavailable', async () => {
        speech.module.getSupportedLocales.mockResolvedValue({
            locales: ['en-US'],
            installedLocales: [],
        });
        const recognizer = createCallSpeechRecognizer(speech.module);
        await recognizer.requestPermissions();

        await expect(
            recognizer.start(vi.fn(), vi.fn()),
        ).resolves.toBe('unavailable');
        expect(speech.module.start).not.toHaveBeenCalled();
    });

    it('does not require on-device processing when the Vietnamese model is not installed', async () => {
        speech.module.getSupportedLocales.mockResolvedValue({
            locales: ['vi-VN'],
            installedLocales: [],
        });
        speech.module.supportsOnDeviceRecognition.mockReturnValue(false);
        const recognizer = createCallSpeechRecognizer(speech.module);
        await recognizer.requestPermissions();

        await expect(
            recognizer.start(vi.fn(), vi.fn()),
        ).resolves.toBe('started');
        expect(speech.module.start).toHaveBeenCalledWith(
            expect.objectContaining({ requiresOnDeviceRecognition: false }),
        );
    });

    it('uses vi-VN and forwards interim and finalized results separately', async () => {
        const recognizer = createCallSpeechRecognizer(speech.module);
        const onResult = vi.fn();
        const onStatus = vi.fn();
        await recognizer.requestPermissions();

        await expect(
            recognizer.start(onResult, onStatus),
        ).resolves.toBe('started');
        expect(speech.module.start).toHaveBeenCalledWith({
            lang: 'vi-VN',
            interimResults: true,
            continuous: true,
            requiresOnDeviceRecognition: true,
        });
        speech.module.emitResult({
            isFinal: false,
            results: [
                { transcript: 'Mã xác thực', confidence: 0, segments: [] },
            ],
        });
        speech.module.emitResult({
            isFinal: true,
            results: [
                {
                    transcript: 'mã xác thực 123456',
                    confidence: 0.9,
                    segments: [],
                },
            ],
        });

        expect(onResult).toHaveBeenNthCalledWith(1, {
            transcript: 'Mã xác thực',
            isFinal: false,
        });
        expect(onResult).toHaveBeenNthCalledWith(2, {
            transcript: 'mã xác thực 123456',
            isFinal: true,
        });
    });

    it('marks iOS audio interruption as interrupted', async () => {
        const recognizer = createCallSpeechRecognizer(speech.module);
        const onStatus = vi.fn();
        await recognizer.requestPermissions();

        await recognizer.start(vi.fn(), onStatus);
        speech.module.emitError({
            error: 'interrupted',
            message: 'Audio session interrupted',
        });

        expect(onStatus).toHaveBeenCalledWith('interrupted');
    });

    it('stops recognition and removes native listeners', async () => {
        const recognizer = createCallSpeechRecognizer(speech.module);

        await recognizer.requestPermissions();
        await recognizer.start(vi.fn(), vi.fn());
        recognizer.stop();

        expect(speech.module.stop).toHaveBeenCalledOnce();
        expect(speech.resultListeners.size).toBe(0);
        expect(speech.errorListeners.size).toBe(0);
    });

    it('reports denied speech permission without starting recognition', async () => {
        speech.module.requestPermissionsAsync.mockResolvedValue({
            granted: false,
        });
        const recognizer = createCallSpeechRecognizer(speech.module);

        await expect(recognizer.requestPermissions()).resolves.toBe(false);
        expect(speech.module.start).not.toHaveBeenCalled();
    });
});
