# Alfresco Digital Workspace

This folder contains the source code of the Alfresco Digital Workspace applications, which is based on the Alfresco Content Application + "out of the box" Alfresco extensions.
Project structure is based on the [Nx Workspace](https://nx.dev/angular) dev tools for monorepos.

## Development vs production

- **Development**: Uses `app.config.dev.json` (e.g. `msRedirectUri` for localhost), proxy from `proxy.conf.js` (backed by `.env`: `BASE_URL`, `APS_URL`), and `environment.ts`.
- **Production**: Uses `app.config.prod.json` (placeholders for deploy-time substitution), no dev proxy, and `environment.prod.ts`. Build with the production script so the correct config is copied before build.

## Running (development)

In the project root folder, copy `.env.example` to `.env` and set your backend URLs:

```yaml
BASE_URL=http://192.168.60.225        # your DEV ACS/IdP host
# APS_URL=http://192.168.60.225      # optional, defaults to BASE_URL
```

Run:

```shell
npm install
npm start content-ee
```

Before serve, `prepare-config` copies `app.config.dev.json` → `app.config.json`. The dev server uses `proxy.conf.js` to proxy `/alfresco`, `/auth`, `/activiti-app`, `/ooi-service` and `/api` to the URLs from `.env`.

## Building

- **Quick commands**

  - Local dev server (uses proxy and dev config):

    ```shell
    npm start content-ee
    ```

  - Dev dist (uses `environment.ts` and `app.config.dev.json`):

    ```shell
    npm run build content-ee
    # or:
    npx nx build content-ee --configuration=development
    ```

  - Prod dist (uses `environment.prod.ts` and `app.config.prod.json` pointing to `http://sara-adp-2531.sales-demohyland.com`):

    ```shell
    npm run build:content-ee:prod
    ```

- **Development build** (default):

```shell
npm run build content-ee
# or: nx build content-ee --configuration=development
```

- **Production build** (uses `app.config.prod.json` and `environment.prod.ts`):

```shell
npm run build:content-ee:prod
```

Or with env set manually (e.g. PowerShell: `$env:BUILD_ENV='production'; nx build content-ee --configuration=production`).

The output can be found at `dist/alfresco-digital-workspace` folder.

### Libraries

The workspace contains the following libraries:

| Name                                                                                                                           | Description                         |
|--------------------------------------------------------------------------------------------------------------------------------|-------------------------------------|
| [content-services-extension](../../libs/content-ee/content-services-extension/README.md)                                       | Alfresco Content Services extension |
| [governance](../../libs/content-ee/governance/README.md)                                                                       | Alfresco Governance extension       |
| [microsoft-office-online-integration-extension](../../libs/content-ee/microsoft-office-online-integration-extension/README.md) | Office365 extension                 |
| [process-services-extension](../../libs/content-ee/process-services-extension/README.md)                                       | Alfresco Process Services extension |

For the full set of projects please refer to the "libs/content-ee" folder.

## Compiling without Extensions

To exclude any of the bundled extensions you need to update the `apps/content-ee/src/app/extensions.module.ts` file.

```ts
@NgModule({
    imports: [
        AosExtensionModule,
        AcaAboutModule,
        AcaSettingsModule,
        AiViewModule,
        RecordModule,
        ProcessServicesExtensionModule,
        ContentServicesExtensionModule,
    ],
})
export class AppExtensionsModule {}
```

Remove the modules that correspond to the extension you want to exclude from the build.

## See Also

- [Migration guide from 1.4.x to 2.0.x](/developer-docs/content-apps/upgrade-content-apps-from-1.[4,6].x-2.0.x.md)
- [Extending Alfresco Digital Workspace](/developer-docs/content-apps/extending.md)
- [Docker support for ADW](/developer-docs/content-apps/docker.md)
- [Enable the Process Service plugin](/libs/content-ee/process-services-extension/README.md)
- [How to use ACA](/developer-docs/content-apps/how-to-use-aca.md)
