const { join } = require('path');
const getBaseKarmaConfig = require('../../../karma.conf');

module.exports = function (config) {
    const baseConfig = getBaseKarmaConfig();
    config.set({
        ...baseConfig,
        coverageReporter: {
            ...baseConfig.coverageReporter,
            dir: join(__dirname, '../../../coverage/libs/content-ee/process-services-extension'),
        },
        proxies: {
            '/bpm/activiti-app/api/enterprise/runtime-app-definitions': 'node_modules/@alfresco/adf-core/bundles/assets/adf-core/i18n/en.json',
        },
    });
};
