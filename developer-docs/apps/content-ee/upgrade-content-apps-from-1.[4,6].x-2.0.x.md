# Upgrading your ADW/APA (content) application and extensions from 1.4.x / 1.6.x to 2.0.x

- *Please note, that in this document, we are using the **plugin** and the **extension** words interchangeably. Although the official name is **extension**, both are referring the same concept.*
- *By **custom extensions** we refer to every extension which is created by third party and are not part of the out of the box (Alfresco) extensions.*

With ADW `2.0.x`, project structure is based on the Nx Workspace [Nx Workspace](https://nx.dev/angular)
and, as a consequence, this version introduces several incompatibilities regarding existing `1.x.x` extensions. This guide provides the necessary steps to migrate the your custom extensions to `2.0.x` version and takes as an example a local extension generated following [redistributable-libraries](https://alfresco-content-app.netlify.app/#/extending/redistributable-libraries) tutorial.

## 1. Moving your custom extensions into the right folder

Prior to `2.0.x`, third party extensions were created in the [projects](https://github.com/Alfresco/alfresco-digital-workspace-app/tree/v1.4.1/projects) folder and to adhere the new structure, these must be moved into [libs](https://github.com/Alfresco/alfresco-digital-workspace-app/tree/develop/libs). As a best practice, we recommend to group your custom extensions under a subfolder, like `libs/my-company`. Out of the box (Alfresco) extensions are hosted under `libs/content-ee`.

```bash
# The folder libs/my-company must be created beforehand
cp -R \
alfresco-digital-workspace-app.1.x/projects/my-extension \
alfresco-digital-workspace-app.2.0.x/libs/my-company
```

## 2. Updating your extension

#### Registering your extension definition (json) file(s)

To proceed, we need to understand the difference between **extension definition(s)** and **extension entry module**:
- **extension entry module**: The Angular Module class, which wraps your custom extension
- **extension definition(s)**: The json file(s) where your custom extension can be tweaked, setting different flags, adding menu items, routes, visibility rules, etc...

To register the extension definition file for your extension, do the following:

- Prior to `2.0.x`, for `1.4.x` we needed to list the extension definitions inside the `plugins.json` of [/src](https://github.com/Alfresco/alfresco-digital-workspace-app/blob/v1.4.1/src/plugins.json) folder. For `1.6.x`, extension definitions can be found in [apps/adw/src/app-extensions](https://github.com/Alfresco/alfresco-digital-workspace-app/blob/1.6.0/apps/adw/src/app-extensions/plugins.json).
- With `2.0.x` every extension can register their own extension definitions in compilation time (multiple ones, hence the array) in the extension entry module. The end result is exactly the same as adding these extension definition files to the ex-`$references` property of the above mentioned `plugins.json`.

Open the entry module of your extension (let's call it: `my-extension.module.ts`) and add `provideExtensionConfig` service to register the extension definition.

```ts
// alfresco-digital-workspace-app.2.0.x/libs/my-company/my-extension/src/lib/my-extension.module.ts:

import { provideExtensionConfig } from '@alfresco/adf-extensions';

@NgModule({
    ...
    providers: [provideExtensionConfig([/* list of extension definition file names */])],
    ...
})
class MyExtensionModule { ... }
```

The `provideExtensionConfig` function takes one parameter, which is an array of extension definition file names (strings). **Note, that you need to specify only the names of the files, not the relative/full path!**

The example extension entry module should look like:

```ts
// alfresco-digital-workspace-app.2.0.x/libs/my-company/my-extension/src/lib/my-extension.module.ts:

import { NgModule } from '@angular/core';
import { MyExtensionComponent } from './my-extension.component';
import { ExtensionService, provideExtensionConfig } from '@alfresco/adf-extensions';

@NgModule({
  declarations: [MyExtensionComponent],
  providers: [provideExtensionConfig(['my-extension.json'])],
  exports: [MyExtensionComponent],
})
export class MyExtensionModule {
  constructor(extensions: ExtensionService) {
    extensions.setComponents({
      'my-extension.main.component': MyExtensionComponent,
    });
  }
}
```

`my-extension.json` file need to be served, just as before. About the how, follow reading, or jump to see [this](#serving-the-extensions-configuration-json-file).

For more information about this, please refer to the updated Alfresco Content App documentation.

#### Adding the extension entry module to the application

Next, we need to register the **extension entry module**. In `1.4.x` this was done in [projects adw app](https://github.com/Alfresco/alfresco-digital-workspace-app/blob/1.4.1/projects/adw/src/app/extensions.module.ts) and for `1.6.x` in [apps adw app](https://github.com/Alfresco/alfresco-digital-workspace-app/blob/1.6.0/apps/adw/src/app/extensions.module.ts) . In the 2.0.x project structure, we have multiple distributions of the original application (content-ee, content-ee-apa). You need to register your custom extension to either of those app. We are going to use [content-ee](https://github.com/Alfresco/alfresco-digital-workspace-app/blob/develop/apps/content-ee/src/app/extensions.module.ts) app for this example, but you can use either content-ee-apa app, or both. At the end, the different distributions only differ in their set of extensions.

```ts
// apps/content-ee/src/app/extensions.module.ts:

import { NgModule } from '@angular/core';
...
import { MyExtensionModule } from '@my-company/my-extension';

@NgModule({
    imports: [
        ...
        MyExtensionModule
    ]
})
export class AppExtensionsModule {}
```

## 3. Updating project with the extension

Open `angular.json` from `1.x.x` project and copy 'my-extension' entry from the json schema and paste it to `2.0.x` json schema.

#### Copying angular.json's library definition

```json
// angular.json:

"$schema": "./node_modules/@angular/cli/lib/config/schema.json",
    "version": 1,
    "projects": {
        ...
        "my-extension": {
            ...
        }
    }
```

#### Updating the path of angular.json's library definition

At this step, we need also to update path to the new folder structure, changing `projects` to `libs/my-company` as `root` path and also the `sourceRoot`.

```json
// Before:

"my-extension": {
    "root": "projects/my-extension",
    "sourceRoot": "projects/my-extension/src",
    "projectType": "library",
    "prefix": "lib",
    ...
}
```

```json
// After:

"my-extension": {
    "root": "libs/my-company/my-extension",
    "sourceRoot": "libs/my-company/my-extension/src",
    "projectType": "library",
    "prefix": "lib",
    ...
}
```

#### Serving the extension's configuration json file

Also, we need to append the plugin assets reference to the `assets` entries, changing the path to reflect the new structure.  For our example, we used `content-ee` as the app to use the extension, so we need to update the build assets as follow:

```json
...,
"content-ee": {
    ...,
    "architect": {
        build: {
            ...,
            "options": {
                ...,
                "assets": [
                    ...,
                    {
                        "glob": "**/*.json",
                        "input": "libs/my-company/my-extension/assets",
                        "output": "./assets/plugins"
                    }
                ]
            }
        }
    }
}
...
```

#### Aligning nx.json

Next, we need to sync `nx.json` with `angular.json` for our extension:

```json
//nx.json
{
    ...,
    "projects": {
        ...
        "my-extension": {}
    }
}
```

> See [nx schema](https://github.com/nrwl/nx/blob/master/packages/express/src/schematics/application/schema.json) for more details.

#### Adding extension path alias to tsconfig.base.json

Finally, we need to update `tsconfig.base.json` to reference the extension.

```json
{
    ...
    "paths": {
        ...,
        "@my-company/my-extension": [ "libs/my-company/my-extension/src/public-api" ]
    }
}
```

> Instead of **public-api.ts** in the extension, you might have used different barrel file name, like **index.ts**. Whichever is true, the only important thing here is to refer to the entry barrel file of the extension.

## 2.0.x changes

With `2.0.x`, extensions are dynamically registered and no longer are required to be specified in the references list. To disable a default extension, its reference should be specified in `"$ignoreReferenceList"` list.

```json
{
    "$schema": "../../extension.schema.json",
    ...
    "$references": [],
    // disabling content-services-extension.json
    "$ignoreReferenceList": ["content-services-extension.json"],
}
```

For backward compatibility with 1.4.x, custom extensions can still be declared in `$references` list but all the other default extensions must be declared as well! Note that if you define the `$references` on your own, it will be considered as an override and not as a merge. Only those extension definitions are going to be loaded, which are defined inside the `$references`. **Because of this, it is recommended to rather use the compilation time extension definition registering described above, and leaving the `$references` array empty or not defined at all.**

### List of extensions and changes

| 1.[4,6].x | 2.0.x |
| ------ | ------ |
| - | <strong>content-services-extension.json</strong> |
| - | <strong>process-services-extension.json</strong> |
| record-icon.extension.json | record-icon.extension.json |
| record-admin-delete.extension.json | record-admin-delete.extension.json |
| app.debug.json | app.debug.json |
| app.metadata.json | app.metadata.json |
| app.card-view.json | app.card-view.json |
| aos.plugin.json | aos.plugin.json |
| app.actions-order.json | app.actions-order.json |
| <strong>governance-core-rules.plugin.json</strong> | <strong>governance-core.extension.json<strong/> |
| <strong>app.header.json</strong> | <strong>moved in app.extension.json</strong> |
| <strong>ai-extension.json</strong> | <strong>ai-view-extension.json</strong> |
| <strong> <br>glacier-store.plugin.json <br>glacier-restore.plugin.json <br>glacier-extend-restore.plugin.json</strong> | <strong>glacier.extension.json</strong> |

All customizations made to the any 1.[4,6].x extensions should be moved into corresponding 2.0.x extensions JSON files.

## Start / build of an application

For starting and building any of the applications, please refer to the updated [README.md of 2.0.x](https://github.com/Alfresco/alfresco-digital-workspace-app#building).

### See Also

- [List of libraries](https://github.com/Alfresco/alfresco-digital-workspace-app#libraries)
- [Applications and distributions](https://github.com/Alfresco/alfresco-digital-workspace-app#applications-and-distributions)
