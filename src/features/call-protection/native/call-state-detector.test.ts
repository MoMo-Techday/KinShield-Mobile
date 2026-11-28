import { describe, expect, it, vi } from 'vitest';
import { createCallStateDetector } from '@/features/call-protection/native/call-state-detector';
import type { CallInfo } from 'react-native-nitro-call-detector';

function makeDetector() {
    let onCall: ((call: CallInfo) => void) | undefined;
    const unsubscribe = vi.fn();
    const detector = {
        addCallListener: vi.fn((listener: (call: CallInfo) => void) => {
            onCall = listener;
            return unsubscribe;
        }),
        refreshPermissions: vi.fn(() => true),
    };
    return {
        detector,
        emit(call: CallInfo) {
            onCall?.(call);
        },
        unsubscribe,
    };
}

describe('optional call-state detector', () => {
    it('does not refresh the Android detector when permission is denied', async () => {
        const native = makeDetector();
        const requestPermission = vi.fn(async () => false);
        const detector = createCallStateDetector(
            'android',
            native.detector,
            requestPermission,
        );

        await expect(detector.enable()).resolves.toBe(false);
        expect(requestPermission).toHaveBeenCalledOnce();
        expect(native.detector.refreshPermissions).not.toHaveBeenCalled();
    });

    it('refreshes Android detection after READ_PHONE_STATE is granted', async () => {
        const native = makeDetector();
        const detector = createCallStateDetector(
            'android',
            native.detector,
            vi.fn(async () => true),
        );

        await expect(detector.enable()).resolves.toBe(true);
        expect(native.detector.refreshPermissions).toHaveBeenCalledOnce();
    });

    it('does not request Android permission on iOS', async () => {
        const native = makeDetector();
        const requestPermission = vi.fn(async () => false);
        const detector = createCallStateDetector(
            'ios',
            native.detector,
            requestPermission,
        );

        await expect(detector.enable()).resolves.toBe(true);
        expect(requestPermission).not.toHaveBeenCalled();
    });

    it('forwards only call state and returns the native unsubscribe handle', () => {
        const native = makeDetector();
        const detector = createCallStateDetector(
            'ios',
            native.detector,
            vi.fn(async () => true),
        );
        const onState = vi.fn();
        const stop = detector.subscribe(onState);

        native.emit({
            id: 'opaque-call-id',
            type: 'pstn',
            state: 'connected',
            remoteHandle: '+84912345678',
            startedAt: 1,
        });

        expect(onState).toHaveBeenCalledWith('connected');
        expect(onState).not.toHaveBeenCalledWith('+84912345678');
        stop();
        expect(native.unsubscribe).toHaveBeenCalledOnce();
    });
});
