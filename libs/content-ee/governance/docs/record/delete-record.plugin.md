---
Title: Delete Record Plugin
Added: v2.0.0
Status: Active
---

# [Delete Record](../../src/lib/record/effects/delete-record.effect.ts)

Displays the `Delete` action.

![Context menu after installation](../docassets/images/delete-context-menu.png)

![Toolbar menu after installation](../docassets/images/delete-tool-bar-menu.png)

![viewer menu after installation](../docassets/images/delete-viewer-menu.png)

## Basic Usage

Add the reference in `app.extensions.json`:

```json
  "$references": [
    "governance.plugin.json"
  ],
```

## Details

This component is an extension applied to ACA application that will show the `Delete` action in the context menu and in the toolbar when the node selected is a record.
