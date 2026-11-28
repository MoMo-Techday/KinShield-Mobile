import { isValidCallAudio } from '@/features/call-protection/utils/call-monitor-state';
import type {
    CallAnalysisEvent,
    CallAudioStatus,
} from '@/features/call-protection/types/call-protection';

export type CallWarningAudioState = 'idle' | 'playing' | 'unavailable';

export type CallWarningAudioFile = {
    uri: string;
    create(): void;
    write(bytes: Uint8Array): Promise<void>;
    delete(): void;
};

export type CallWarningAudioPlayer = {
    play(): void;
    seekTo(seconds: number): Promise<void>;
    remove(): void;
};

export type CallWarningAudioAdapter = {
    createCacheFile(): CallWarningAudioFile;
    createPlayer(uri: string): CallWarningAudioPlayer;
};

async function loadNativeAdapter(): Promise<CallWarningAudioAdapter> {
    const [{ File, Paths }, { createAudioPlayer }, { randomUUID }] =
        await Promise.all([
            import('expo-file-system'),
            import('expo-audio'),
            import('expo-crypto'),
        ]);
    return {
        createCacheFile() {
            const file = new File(
                Paths.cache,
                `kinshield-call-warning-${randomUUID()}.mp3`,
            );
            return {
                uri: file.uri,
                create: () => {
                    file.create();
                },
                write: (bytes) => file.write(bytes),
                delete: () => {
                    file.delete();
                },
            };
        },
        createPlayer: (uri) => createAudioPlayer(uri),
    };
}

export function createCallWarningAudio(
    adapter?: CallWarningAudioAdapter,
) {
    let activeAdapter = adapter;
    let file: CallWarningAudioFile | null = null;
    let player: CallWarningAudioPlayer | null = null;
    let currentAudio: CallAnalysisEvent['audio'] = null;
    let generation = 0;

    function release(): CallWarningAudioState {
        generation += 1;
        const previousPlayer = player;
        const previousFile = file;
        player = null;
        file = null;
        currentAudio = null;
        let failed = false;

        try {
            previousPlayer?.remove();
        } catch {
            failed = true;
        }
        try {
            previousFile?.delete();
        } catch {
            failed = true;
        }

        return failed ? 'unavailable' : 'idle';
    }

    async function play(
        audioStatus: CallAudioStatus,
        audio: CallAnalysisEvent['audio'],
    ): Promise<CallWarningAudioState> {
        if (audioStatus !== 'available' || !isValidCallAudio(audio)) {
            release();
            return 'unavailable';
        }

        if (player && currentAudio === audio) {
            const playbackGeneration = generation;
            const currentPlayer = player;
            try {
                await currentPlayer.seekTo(0);
                if (generation !== playbackGeneration) return 'idle';
                currentPlayer.play();
                return 'playing';
            } catch {
                if (generation !== playbackGeneration) return 'idle';
                release();
                return 'unavailable';
            }
        }

        if (release() === 'unavailable') return 'unavailable';
        const playbackGeneration = generation;
        let nextFile: CallWarningAudioFile | null = null;

        try {
            activeAdapter ??= await loadNativeAdapter();
            if (generation !== playbackGeneration) return 'idle';
            nextFile = activeAdapter.createCacheFile();
            file = nextFile;
            nextFile.create();
            const bytes =
                audio instanceof ArrayBuffer ? new Uint8Array(audio) : audio;
            await nextFile.write(bytes);
            if (generation !== playbackGeneration) {
                try {
                    nextFile.delete();
                } catch {
                    return 'unavailable';
                }
                return 'idle';
            }
            player = activeAdapter.createPlayer(nextFile.uri);
            currentAudio = audio;
            player.play();
            return 'playing';
        } catch {
            if (generation !== playbackGeneration) {
                try {
                    nextFile?.delete();
                } catch {
                    return 'unavailable';
                }
                return 'idle';
            }
            release();
            return 'unavailable';
        }
    }

    return {
        play,
        stop: release,
    };
}
