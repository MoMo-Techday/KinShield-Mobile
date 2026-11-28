import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createCallWarningAudio,
    type CallWarningAudioAdapter,
    type CallWarningAudioFile,
    type CallWarningAudioPlayer,
} from '@/features/call-protection/services/call-warning-audio';

describe('call warning audio', () => {
    let file: CallWarningAudioFile;
    let player: CallWarningAudioPlayer;
    let adapter: CallWarningAudioAdapter;

    beforeEach(() => {
        file = {
            uri: 'file:///cache/call-warning.mp3',
            create: vi.fn(),
            write: vi.fn(async () => {}),
            delete: vi.fn(),
        };
        player = {
            play: vi.fn(),
            seekTo: vi.fn(async () => {}),
            remove: vi.fn(),
        };
        adapter = {
            createCacheFile: vi.fn(() => file),
            createPlayer: vi.fn(() => player),
        };
    });

    it('requires available status and non-empty binary audio before creating a player', async () => {
        const service = createCallWarningAudio(adapter);

        expect(await service.play('unavailable', new Uint8Array([1]))).toBe(
            'unavailable',
        );
        expect(await service.play('available', new Uint8Array())).toBe(
            'unavailable',
        );
        expect(await service.play('available', new ArrayBuffer(0))).toBe(
            'unavailable',
        );
        expect(adapter.createCacheFile).not.toHaveBeenCalled();

        expect(
            await service.play('available', new Uint8Array([1, 2, 3])),
        ).toBe('playing');
        expect(file.write).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
        expect(player.play).toHaveBeenCalledOnce();
    });

    it('replays the same warning from the beginning', async () => {
        const service = createCallWarningAudio(adapter);
        const bytes = new Uint8Array([1, 2, 3]);

        await service.play('available', bytes);
        expect(await service.play('available', bytes)).toBe('playing');

        expect(adapter.createCacheFile).toHaveBeenCalledOnce();
        expect(adapter.createPlayer).toHaveBeenCalledOnce();
        expect(player.seekTo).toHaveBeenCalledWith(0);
        expect(player.play).toHaveBeenCalledTimes(2);
    });

    it('releases the player and deletes its temporary file on stop', async () => {
        const service = createCallWarningAudio(adapter);
        await service.play('available', new Uint8Array([1]));

        expect(await service.stop()).toBe('idle');
        expect(player.remove).toHaveBeenCalledOnce();
        expect(file.delete).toHaveBeenCalledOnce();
        expect(await service.stop()).toBe('idle');
        expect(player.remove).toHaveBeenCalledOnce();
    });

    it('reports playback failures as unavailable and cleans temporary resources', async () => {
        vi.mocked(player.play).mockImplementation(() => {
            throw new Error('native playback failed');
        });
        const service = createCallWarningAudio(adapter);

        expect(
            await service.play('available', new Uint8Array([1, 2, 3])),
        ).toBe('unavailable');
        expect(player.remove).toHaveBeenCalledOnce();
        expect(file.delete).toHaveBeenCalledOnce();
    });

    it('reports cleanup failures as unavailable while attempting both releases', async () => {
        vi.mocked(player.remove).mockImplementation(() => {
            throw new Error('player release failed');
        });
        const service = createCallWarningAudio(adapter);
        await service.play('available', new Uint8Array([1]));

        expect(await service.stop()).toBe('unavailable');
        expect(player.remove).toHaveBeenCalledOnce();
        expect(file.delete).toHaveBeenCalledOnce();
    });

    it('does not start playback if stopped while the cache file is being written', async () => {
        let finishWrite!: () => void;
        vi.mocked(file.write).mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    finishWrite = resolve;
                }),
        );
        const service = createCallWarningAudio(adapter);

        const playback = service.play('available', new Uint8Array([1]));
        await Promise.resolve();
        expect(await service.stop()).toBe('idle');
        finishWrite();

        expect(await playback).toBe('idle');
        expect(adapter.createPlayer).not.toHaveBeenCalled();
    });
});
