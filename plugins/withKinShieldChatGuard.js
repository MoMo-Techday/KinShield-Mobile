// Expo Config Plugin: Android NotificationListener (Zalo/SMS) + Floating Shield Overlay + 1-Tap Screen Capture.
const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require('expo/config-plugins');

const ANDROID_PACKAGE = 'click.kinshield.mobile';
const CHAT_GUARD_PACKAGE = `${ANDROID_PACKAGE}.chatguard`;
const REQUIRED_PERMISSIONS = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
  'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
];

function ensurePermission(manifest, name) {
  if (!manifest['uses-permission']) {
    manifest['uses-permission'] = [];
  }
  const exists = manifest['uses-permission'].some(
    (entry) => entry?.$?.['android:name'] === name,
  );
  if (!exists) {
    manifest['uses-permission'].push({ $: { 'android:name': name } });
  }
}

function upsertByName(list, item) {
  const targetName = item?.$?.['android:name'];
  const idx = list.findIndex((entry) => entry?.$?.['android:name'] === targetName);
  if (idx >= 0) {
    list[idx] = item;
  } else {
    list.push(item);
  }
}

function withChatGuardManifest(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    REQUIRED_PERMISSIONS.forEach((perm) => ensurePermission(manifest, perm));

    const application = manifest.application?.[0];
    if (!application) return mod;

    if (!application.service) application.service = [];
    if (!application.activity) application.activity = [];

    upsertByName(application.service, {
      $: {
        'android:name': `${CHAT_GUARD_PACKAGE}.KinShieldNotificationListener`,
        'android:label': 'KinShield Bảo vệ tin nhắn Zalo/SMS',
        'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          action: [
            {
              $: {
                'android:name':
                  'android.service.notification.NotificationListenerService',
              },
            },
          ],
        },
      ],
    });

    upsertByName(application.service, {
      $: {
        'android:name': `${CHAT_GUARD_PACKAGE}.KinShieldFloatingShieldService`,
        'android:exported': 'false',
        'android:foregroundServiceType': 'specialUse',
      },
      property: [
        {
          $: {
            'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
            'android:value': 'Floating anti-scam quick-scan shield overlay',
          },
        },
      ],
    });

    upsertByName(application.service, {
      $: {
        'android:name': `${CHAT_GUARD_PACKAGE}.KinShieldScreenCaptureService`,
        'android:exported': 'false',
        'android:foregroundServiceType': 'mediaProjection',
      },
    });

    upsertByName(application.activity, {
      $: {
        'android:name': `${CHAT_GUARD_PACKAGE}.KinShieldScreenCaptureActivity`,
        'android:exported': 'false',
        'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
        'android:excludeFromRecents': 'true',
        'android:launchMode': 'singleInstance',
      },
    });

    return mod;
  });
}

function withChatGuardSources(config) {
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const srcDir = path.join(
        mod.modRequest.projectRoot,
        'plugins',
        'android-chatguard',
      );
      const destDir = path.join(
        mod.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        ...CHAT_GUARD_PACKAGE.split('.'),
      );

      fs.mkdirSync(destDir, { recursive: true });
      const entries = fs.readdirSync(srcDir).filter((file) => file.endsWith('.kt'));
      for (const file of entries) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      }
      return mod;
    },
  ]);
}

function withChatGuardMainApplication(config) {
  return withMainApplication(config, (mod) => {
    let contents = mod.modResults.contents;
    const importLine = `import ${CHAT_GUARD_PACKAGE}.KinShieldChatGuardPackage`;

    if (!contents.includes(importLine)) {
      contents = contents.replace(
        /^(package\s+[^\r\n]+[\r\n]+)/m,
        `$1\n${importLine}\n`,
      );
    }

    if (!contents.includes('KinShieldChatGuardPackage()')) {
      if (contents.includes('PackageList(this).packages.apply {')) {
        contents = contents.replace(
          'PackageList(this).packages.apply {',
          'PackageList(this).packages.apply {\n              add(KinShieldChatGuardPackage())',
        );
      } else if (contents.includes('PackageList(this).packages')) {
        contents = contents.replace(
          'PackageList(this).packages',
          'PackageList(this).packages.apply { add(KinShieldChatGuardPackage()) }',
        );
      }
    }

    mod.modResults.contents = contents;
    return mod;
  });
}

module.exports = function withKinShieldChatGuard(config) {
  let next = withChatGuardManifest(config);
  next = withChatGuardSources(next);
  next = withChatGuardMainApplication(next);
  return next;
};
