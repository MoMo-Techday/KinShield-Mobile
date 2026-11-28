import { describe, expect, it } from 'vitest';
import {
    computeTier2Progress,
    getMobileTier2Steps,
    runMobileTier1Preview,
} from '@/features/xray/utils/tier1-preview';

describe('tier1-preview', () => {
    it('flags APK, OTP and suspicious domains immediately offline', () => {
        const res = runMobileTier1Preview({
            text: 'Cập nhật VNeID và đọc mã OTP tại link',
            url: 'http://evn-thanhtoan.xyz/app.apk',
            hasImage: false,
        });

        expect(res.hasHotRisk).toBe(true);
        expect(res.flags.length).toBeGreaterThan(0);
    });

    it('keeps benign family messages clean without false hot risk', () => {
        const res = runMobileTier1Preview({
            text: 'Con về ăn cơm chiều nay nhé mẹ nấu canh chua',
            url: '',
            hasImage: false,
        });

        expect(res.hasHotRisk).toBe(false);
        expect(res.flags).toEqual([]);
    });

    it('guides image-only scans to Tier-2 Vision smoothly', () => {
        const res = runMobileTier1Preview({
            text: '',
            url: '',
            hasImage: true,
        });

        expect(res.hasHotRisk).toBe(false);
        expect(res.summary).toContain('Tầng 2');
        expect(getMobileTier2Steps(true)[0]).toContain('ELA');
    });

    it('computes monotonically increasing bounded Tier-2 progress', () => {
        const start = computeTier2Progress(0);
        const mid = computeTier2Progress(3000);
        const late = computeTier2Progress(12000);

        expect(start.percent).toBe(18);
        expect(start.activeStepIndex).toBe(0);
        expect(mid.percent).toBeGreaterThan(start.percent);
        expect(mid.activeStepIndex).toBe(1);
        expect(late.percent).toBeLessThanOrEqual(94);
        expect(late.activeStepIndex).toBe(2);
    });
});
