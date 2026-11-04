# Linking

This article describes how the applications can be linked with local and/or modified versions of ACA and ADF.

## Linking ADF

### Using Custom ADF Branches

Clone the ADF repository in the parent folder, so that you have the following structure:

```text
projects
  ├── alfresco-applications
  └── alfresco-ng2-components
```

> You can also use Nx Console UI to run the project with the corresponding configuration.

#### Building

```bash
# developer build
npm run build <project> -- -c adf

# production build
npm run build <project> -- -c adfprod
```

#### Running

```bash
# developer build
npm start <project> -- -c adf

# production build
npm start <project> -- -c adfprod
```

## Linking ACA

### Using Custom ACA Branches

Clone the ACA repository in the parent folder, so that you have the following structure:

```text
projects
  ├── alfresco-applications
  └── alfresco-content-app
```

> You can also use Nx Console UI to run the project with the corresponding configuration.

#### Building

```bash
npm run build <project> -- -c aca
```

#### Running

```bash
npm start <project> -- -c aca
```

### Using Custom ADF/ACA Branches with CI/CD

To create a PR that utilises a custom ADF branch, use `[link-adf:<branch>]` text block in the commit message:

```text
1. [link-adf:develop] Your commit message
2. Your commit message [link-adf:develop]
3. Your [link-adf:develop] commit message
4. [link-adf:develop]
```

For custom ACA branch, use `[link-aca:<branch>]` text block in the commit message.
There is also an option to use custom ADF and custom ACA branch simultaneously:

```text
1. [link-adf:develop] Your commit message [link-aca:develop]
2. [link-aca:develop] Your commit message [link-adf:develop]
3. Your [link-adf:develop] commit message [link-aca:develop]
4. [link-adf:develop][link-aca:develop]
```

Note that the message should be present in every latest commit for your PR to make CI/CD use ADF/ACA linking feature.

### Linking Localisation Resources

In the module directory create an `i18n` folder and add `en.json` with translation keys, i.e. `/libs/<library>/i18n`

Provide translations in the module:

```ts
import { provideTranslations } from '@alfresco/adf-core';

providers: [
    provideTranslations('<feature-name>', 'assets/<feature-name>')
]
```

In `apps/<project>/project.json`, configure the assets target to pick the translation keys:

```json
{
  "input": "libs/<library>/i18n",
  "output": "assets/<feature-name>/i18n",
  "glob": "**/*"
}
```
