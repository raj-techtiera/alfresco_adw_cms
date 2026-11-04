/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

require('@alfresco/adf-cli/tooling').dotenvConfig();
const { getIdentityProxy, getShareProxy, getApsProxy, getMicrosoftOfficeProxy } = require('../../proxy-helpers');

// Node-only: BASE_URL / APS_URL from repo `.env` (not NG_APP_* — those are for the Angular bundle)
const legacyHost = process.env.BASE_URL || 'http://192.168.60.142';
const apsHost = process.env.APS_URL || process.env.BASE_URL || 'http://192.168.60.142';

module.exports = {
    ...getIdentityProxy(legacyHost),
    ...getShareProxy(legacyHost),
    ...getApsProxy(apsHost),
    ...getMicrosoftOfficeProxy(legacyHost),
    '/arender': {
        target: legacyHost,
        secure: false,
        changeOrigin: true
    },
    '/api': {
        target: 'http://localhost:5000',
        secure: false,
        changeOrigin: true,
        pathRewrite: {
            '^/api': ''
        },
        logLevel: 'debug'
    }
};
