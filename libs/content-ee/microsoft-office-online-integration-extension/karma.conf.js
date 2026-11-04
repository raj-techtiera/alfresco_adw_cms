const { join } = require('path');
const getBaseKarmaConfig = require('../../../karma.conf');

module.exports = function (config) {
    const baseConfig = getBaseKarmaConfig();
    config.set({
        ...baseConfig,
        coverageReporter: {
            ...baseConfig.coverageReporter,
            dir: join(__dirname, '../../../coverage/libs/content-ee/microsoft-office-online-integration-extension'),
        },
        proxies: {
            "/assets/adf-core/i18n/en.json": "node_modules/@alfresco/adf-core/bundles/assets/adf-core/i18n/en.json",
            "/app.config.json": "node_modules/@alfresco/adf-core/bundles/assets/adf-core/i18n/en.json",
            "/assets/adf-core/i18n/en-GB.json": "node_modules/@alfresco/adf-core/bundles/assets/adf-core/i18n/en.json",
            "/assets/adf-content-services/i18n/en.json": "node_modules/@alfresco/adf-core/bundles/assets/adf-core/i18n/en.json",
            "/assets/adf-core/i18n/en-US.json": "node_modules/@alfresco/adf-core/bundles/assets/adf-core/i18n/en.json",
        },
    });
};
