const { join } = require('path');
const getBaseKarmaConfig = require('../../../karma.conf');

module.exports = function (config) {
    const baseConfig = getBaseKarmaConfig();
    config.set({
        ...baseConfig,
        coverageReporter: {
            ...baseConfig.coverageReporter,
            dir: join(__dirname, '../../../coverage/libs/content-ee/government-extension'),
        },
        proxies: {
            '/assets/images/ft_ic_miscellaneous.svg': "node_modules/@alfresco/adf-core/bundles/assets/adf-core/i18n/en.json",
            '/assets/images/archive-icon.svg': "node_modules/@alfresco/adf-core/bundles/assets/adf-core/i18n/en.json",
            '/assets/images/restore-from-archive-24px.svg': "node_modules/@alfresco/adf-core/bundles/assets/adf-core/i18n/en.json",
            '/assets/images/ic-record-success.svg': "node_modules/@alfresco/adf-core/bundles/assets/adf-core/i18n/en.json",
            '/ecm/alfresco/api/-default-/public/gs/versions/1/files/id/declare?hideRecord=false': "node_modules/@alfresco/adf-core/bundles/assets/adf-core/i18n/en.json",
            '/assets/images/ic-record-alert.svg': "node_modules/@alfresco/adf-core/bundles/assets/adf-core/i18n/en.json",
            'http://localhost:9876/assets/images/ic-record-success.svg': "node_modules/@alfresco/adf-core/bundles/assets/adf-core/i18n/en.json",
            '/ecm/alfresco/api/-default-/public/gs/versions/1/files/fake-id/declare?hideRecord=false': "node_modules/@alfresco/adf-core/bundles/assets/adf-core/i18n/en.json"
        }
    });
};
