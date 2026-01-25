const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withAndroidSplits(config) {
    return withAppBuildGradle(config, (config) => {
        if (config.modResults.language === 'groovy') {
            config.modResults.contents = enableSplits(config.modResults.contents);
        } else {
            throw new Error('Cannot enable splits in build.gradle because the file is not groovy');
        }
        return config;
    });
};

function enableSplits(buildGradle) {
    // Check if splits block already exists to avoid duplication
    if (buildGradle.includes('splits {')) {
        return buildGradle;
    }

    const splitsConfig = `
    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
            universalApk false
        }
    }
`;

    // Insert inside android { ... } block
    // We look for 'android {' and insert it after that.
    // A safer bet is often to put it before 'defaultConfig {' or similar common blocks inside android.
    // However, simple regex replacement usually works for standard templates.

    if (buildGradle.includes('android {')) {
        return buildGradle.replace('android {', `android {${splitsConfig}`);
    }

    return buildGradle;
}
