# Integrating ACA Plugins

The following article demonstrates how to integrate an ACA extension into the ADW using "Folder Rules" as an example.

## Project Mapping

In the `tsconfig.base.json` file, provide the mapping to the corresponding project:

```json
{
    "compilerOptions": {
        "paths": {
            "@alfresco/aca-content/folder-rules": [
                "apps/content-ce/projects/aca-content/folder-rules/src/public-api"
            ]
        }
    }
}
```

Update `tsconfig.adf.json` file with additional mappings:

```json
{
    "compilerOptions": {
        "paths": {
            "@alfresco/aca-content/folder-rules": [
                "apps/content-ce/projects/aca-content/folder-rules/src/public-api"
            ]
        }
    }
}
```

## Assets

Update `angular.json` and provide i18n assets and plugin configuration file:

```json
{
    "projects": {
        "content-ce": {
            "targets": {
                "build": {
                    "options": {
                        "assets": [
                            {
                                "input": "apps/content-ce/projects/aca-content/folder-rules/assets",
                                "output": "/assets/plugins",
                                "glob": "folder-rules.plugin.json"
                            },
                            {
                                "input": "apps/content-ce/projects/aca-content/folder-rules/assets/i18n",
                                "output": "/assets/folder-rules/i18n",
                                "glob": "**/*"
                            }
                        ]
                    }
                }
            }
        }
    }
}
```

Update `apps/content-ee/project.json` and provide i18n assets and plugin configuration file:

```json
{
    "targets": {
        "build": {
            "options": {
                "assets": [
                    {
                        "input": "apps/content-ce/projects/aca-content/folder-rules/assets",
                        "output": "/assets/plugins",
                        "glob": "folder-rules.plugin.json"
                    },
                    {
                        "input": "apps/content-ce/projects/aca-content/folder-rules/assets/i18n",
                        "output": "/assets/folder-rules/i18n",
                        "glob": "**/*"
                    }
                ]
            }
        }
    }
}
```

Update `libs/content-ee/content-services-extension/src/lib/content-services-extension.module.ts` and include the corresponding module:

```ts
import { AcaFolderRulesModule } from '@alfresco/aca-content/folder-rules';

@NgModule({
    imports: [
        AcaFolderRulesModule
    ]
})
export class ContentServicesExtensionModule {}
```

## Application Configuration

If the plugin depends on additional application configuration entries, like Folder Rules plugin does, update the 
`libs/content-ee/content-services-extension/src/app.config-extension.json.tpl`:

```json
{
    "plugins": {
        "folderRules": true
    }
}
```

## Monorepo Integration

Update `angular.json` and add a new library project mapping:

```json
{
    "projects": {
        "content-ce-folder-rules": {
            "root": "apps/content-ce/projects/aca-content/folder-rules",
            "sourceRoot": "apps/content-ce/projects/aca-content/folder-rules/src",
            "projectType": "library",
            "prefix": "lib",
            "targets": {}
        }
    }
}
```

Update `nx.json` and add a project mapping:

```json
{
    "projects": {
        "content-ce-folder-rules": {
            "tags": [
                "scope:content-ce-folder-rules",
                "type:feature"
            ]
        }
    }
}
```

Update `.eslintrc.json` and add the following boundary rules:

```json
{
    "overrides": [
        "rules": {
            "@nrwl/nx/enforce-module-boundaries": {
                "error",
                {
                    "depConstraints": [
                        {
                            "sourceTag": "scope:content-ee-apa",
                            "onlyDependOnLibsWithTags": [
                                "scope:content-ce-folder-rules"
                            ]
                        },
                        {
                            "sourceTag": "scope:content-ee",
                            "onlyDependOnLibsWithTags": [
                                "scope:content-ce-folder-rules"
                            ]
                        },
                        {
                            "sourceTag": "scope:content-ee-content-services-extension",
                            "onlyDependOnLibsWithTags": [
                                "scope:content-ce-folder-rules"
                            ]
                        }
                    ]
                }
            }
        }
    ]
}
```
