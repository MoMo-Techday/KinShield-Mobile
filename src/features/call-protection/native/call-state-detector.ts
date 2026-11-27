import type {
    CallInfo,
    CallState,
    NitroCallDetector,
} from 'react-native-nitro-call-detector';

type NativeCallDetector = Pick<
    NitroCallDetector,
    'addCallListener' | 'refreshPermissions'
>;
type PermissionRequester = () => Promise<boolean>;

export function createCallStateDetector(
    platform: 'android' | 'ios',
    nativeDetector: NativeCallDetector,
    requestAndroidPermission: PermissionRequester,
) {
    return {
        async enable(): Promise<boolean> {
            if (platform === 'android') {
                if (!(await requestAndroidPermission())) return false;
                return nativeDetector.refreshPermissions();
            }
            return true;
        },

        subscribe(onState: (state: CallState) => void): () => void {
            const unsubscribe = nativeDetector.addCallListener(
                (call: CallInfo) => onState(call.state),
            );
            return unsubscribe;
        },
    };
}
