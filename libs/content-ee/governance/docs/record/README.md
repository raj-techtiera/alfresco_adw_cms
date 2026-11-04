---
Title: Record Extensions
Github only: true
---

# Record Extensions

Contains governance record components extensions for ACA application.
See the library's
[README file](../../../../README.md)
for more information about installing and using the source code.

<!--record start-->

## Components

| Name                                              | Description                                           | Source link                                                                    |
| ------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Record Name component](record-name.component.md) | This will customize the ACA document list name column | [Source](../../src/lib/record/components/record-name/record-name.component.ts) |

## Plugins

| Name                                                     | Description                                                             | Source link                                                     |
| -------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| [Governance Core Rules](governance-core-rules.plugin.md) | Enable the rules for the plugins                                        | [Source](../../assets/governance.plugin.json)                   |
| [Delete Record](delete-record.plugin.md)                 | Allows the use to delete the record                                     | [Source](../../src/lib/record/effects/delete-record.effect.ts)  |
| [Declare Record](declare-record.action.md)               | This will show the `Declare Record` option for context menu and toolbar | [Source](../../src/lib/record/effects/declare-record.effect.ts) |
| [Record Properties](record-properties.plugin.md)         | This will show the selected record _properties_ in the info drawer      | [Source](../../assets/governance.plugin.json)                   |
| [Move Record](move-record.plugin.md)                     | This will show the `Move Record` option for context menu and toolbar    | [Source](../../src/lib/record/effects/move-record.effect.ts)    |

<!--record end-->
