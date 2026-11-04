# Extending Alfresco Digital Workspace

Project structure is based on the [Nx Workspace](https://nx.dev/angular) dev tools for monorepos.

Check the official [Nx Tutorial](https://nx.dev/latest/angular/tutorial/01-create-application) to find out more about Nx and underlying CLI commands.

## Creating new extension library

Generate a new "my-extension" library scaffold using the following command:

```bash
nx g @nrwl/angular:lib my-extension
```

> See [Nx Tutorial / Create Libs](https://nx.dev/latest/angular/tutorial/08-create-libs) for more details.

### Compiling with the application

Check the `tsconfig.json` file in the root of the repository includes a new mapping to your library:

```json
{
    "paths": {
        "@my-company/my-extension": ["libs/my-extension/src/index.ts"]
    }
}
```

> You can use any name as long as it is mapped to the `index.ts` file.

Update the `apps/content-ee/src/app/extensions.module.ts` file to import and use your extension library module:

```ts
// other imports here
import { MyExtensionModule } from '@my-company/my-extension';

@NgModule({
    imports: [
        // other modules here
        MyExtensionModule,
    ],
})
export class AppExtensionsModule {}
```

### Adding configuration and components

Refer to the ACA [Extending](https://alfresco-content-app.netlify.app/#/extending/) resource for more details on how to extend ADW (that is based on ACA).

As an example, you may want to add a configuration to have a first control of the extension. To do that, edit the `libs/my-extension/src/lib/my-extension.module.ts` file changing what is described below.

```ts
// add the following import to the page.
import { provideExtensionConfig } from '@alfresco/adf-extensions';

// add providers as described below.
@NgModule({
  imports: [CommonModule],
  providers: [
    provideExtensionConfig(['my-extension.json'])
  ]
})
export class MyExtensionModule {}
```

Create the `libs/my-extension/assets` folder and add the `my-extension.json` file with the following content.

```json
{
  "$version": "1.0.0",
  "$id": "my.extension",
  "$name": "my adf extension",
  "$description": "my adf extension",
  "$license": "Apache-2.0",
  "actions": [],
  "features": {},
  "routes": [],
  "rules": []
}
```

> The configuration does not do anything, but it is a ready-to-be-used extension.

Then edit the `angular.json` file in the root of the project as described below. Add the content below to the `projects/content-ee/architect/build/options/assets` array.

```json
{
  "input": "libs/my-extension/assets",
  "output": "/assets/plugins/",
  "glob": "my-extension.json"
},
```

### Running unit tests

Use the following command to run unit tests:

```bash
nx test my-extension
```

### Running the application

Use the next command to compile and run the application that includes your extension:

```bash
npm start
```
