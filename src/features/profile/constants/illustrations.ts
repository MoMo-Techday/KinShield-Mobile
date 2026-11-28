// Bộ minh họa gia đình ấm áp (đã nén nhẹ ~15–25KB) dùng cho các thẻ chính trên Mobile.
import type { ImageSourcePropType } from 'react-native';

export const MOBILE_ILLUSTRATIONS = {
    heroFamily:
        require('../../../../assets/illustrations/hero-family.jpg') as ImageSourcePropType,
    layerXray:
        require('../../../../assets/illustrations/layer-xray.jpg') as ImageSourcePropType,
    layerVoice:
        require('../../../../assets/illustrations/layer-voice.jpg') as ImageSourcePropType,
    layerCosign:
        require('../../../../assets/illustrations/layer-cosign.jpg') as ImageSourcePropType,
    scenarioPolice:
        require('../../../../assets/illustrations/scenario-police.jpg') as ImageSourcePropType,
    scenarioShipper:
        require('../../../../assets/illustrations/scenario-shipper.jpg') as ImageSourcePropType,
    scenarioBill:
        require('../../../../assets/illustrations/scenario-bill.jpg') as ImageSourcePropType,
    scenarioDeepvoice:
        require('../../../../assets/illustrations/scenario-deepvoice.jpg') as ImageSourcePropType,
} as const;
