#!/usr/bin/env node --experimental-specifier-resolution=node

import inquirer from 'inquirer';
import { execSync } from 'child_process';

const adfLibs = [
    '@alfresco/adf-cli',
    '@alfresco/adf-core',
    '@alfresco/adf-content-services',
    '@alfresco/adf-extensions',
    '@alfresco/adf-process-services',
    '@alfresco/eslint-plugin-eslint-angular'
];

const acaLibs = [
    '@alfresco/aca-content',
    '@alfresco/aca-shared',
    '@alfresco/aca-playwright-shared',
];

const jsApiLib = '@alfresco/js-api';

(async () => {
    try {
        const answers = await getAnswers();
        upgradeLibs(answers);
    } catch (err) {
        console.error(`There was an error while talking to the API: ${err.message}`, err);
    }
})();

async function getAnswers() {
    return inquirer.prompt([
        {
            name: 'updateAdf',
            message: 'Update ADF libraries?',
            type: 'confirm'
        },
        {
            name: 'adfVersion',
            when: (answers) => answers['updateAdf'],
            message: 'New version of the ADF libraries (can also be alpha|beta|latest)',
            type: 'input',
            default: 'alpha',
            validate: (adfVersion) => {
              if (!adfVersion.length) {
                  return 'Please provide a valid version'
              }
              return true;
            },
            filter: (adfVersion) => {
                return adfVersion.trim()
            }
        },
        {
            name: 'updateJsApi',
            message: 'Update JS-API version?',
            type: 'confirm'
        },
        {
            name: 'jsApiVersion',
            when: (answers) => answers['updateJsApi'],
            message: 'New version of JS-API (can also be alpha|beta|latest)',
            type: 'input',
            default: 'alpha',
            validate: (jsApiVersion) => {
                if (!jsApiVersion.length) {
                    return 'Please provide a valid version'
                }
                return true;
            },
            filter: (jsApiVersion) => {
                return jsApiVersion.trim();
            }
        },
        {
            name: 'updateAca',
            message: 'Update ACA libs?',
            type: 'confirm'
        },
        {
            name: 'acaVersion',
            when: (answers) => answers['updateAca'],
            message: 'New version of the ACA libraries (can also be alpha|beta|latest)',
            type: 'input',
            default: 'alpha',
            validate: (acaVersion) => {
                if (!acaVersion.length) {
                    return 'Please provide a valid version';
                }
                return true;
            },
            filter: (acaVersion) => {
                return acaVersion.trim();
            }
        }
    ]);
}

function upgradeLibs(options) {
    const libs = getLibsToUpgrade(options);

    if (libs.length > 0) {
        const command = `npm i --ignore-scripts -E ${libs.join(' ')}`;
        execSync(command, {stdio: 'inherit'});
    } else {
        console.log('No libraries to upgrade.');
    }
}

function getLibsToUpgrade(options) {
    const result = [];

    if (options.updateAdf) {
        result.push(
            ...adfLibs.map(lib => `${lib}@${options.adfVersion}`)
        );
    }

    if (options.updateJsApi) {
        result.push(`${jsApiLib}@${options.jsApiVersion}`);
    }

    if (options.updateAca) {
        result.push(
            ...acaLibs.map(lib => `${lib}@${options.acaVersion}`)
        );
    }

    return result;
}
