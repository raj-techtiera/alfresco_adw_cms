/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

module.exports = {
    getIdentityProxy: function(host) {
        console.log('Target for /auth', host);
        return {
            '/auth': {
                target: host,
                pathFilter: '/auth',
                secure: false,
                logger: console,
                changeOrigin: true,
            },
        }
    },
    getShareProxy: function(host) {
        console.log('Target for /alfresco', host);
        return {
            '/alfresco': {
                target: host,
                pathFilter: '/alfresco',
                secure: false,
                logger: console,
                changeOrigin: true,
                onProxyReq: function(request) {
                    if(request["method"] !== "GET")
                        request.setHeader("origin", host);
                },
                // workaround for REPO-2260
                onProxyRes: function (proxyRes, req, res) {
                    const header = proxyRes.headers['www-authenticate'];
                    if (header && header.startsWith('Basic')) {
                        proxyRes.headers['www-authenticate'] = 'x' + header;
                    }
                }

            },
        }
    },
    getApsProxy: function(host) {
        console.log('Target for /activiti-app', host);
        return {
            '/activiti-app': {
                target: host,
                pathFilter: '/activiti-app',
                secure: false,
                logger: console,
                changeOrigin: true,
                onProxyReq: function(request) {
                    if(request["method"] !== "GET")
                        request.setHeader("origin", host);
                }
            },
        }
    },
    getMicrosoftOfficeProxy: function(host) {
        console.log('Target for /ooi-service', host);
        return {
            '/ooi-service': {
                target: host,
                pathFilter: '/ooi-service',
                secure: false,
                changeOrigin: true,
                onProxyReq: function(request) {
                    if (request.method !== 'GET') {
                        request.setHeader('origin', host);
                    }
                }
            },
        }
    }
};
