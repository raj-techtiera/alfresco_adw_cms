---
Title: Move Record Plugin
Added: v2.0.0
Status: Active
---

# [Move Record](../../src/lib/record/effects/move-record.effect.ts)

Displays the `Move` action.

![Example after installation](../docassets/images/move-record-context-menu.png)

![Example after installation](../docassets/images/move-record-toolbar.png)

## Basic Usage

Add the reference in `app.extensions.json`:

```json
  "$references": [
    "governance.plugin.json"
  ],
```

## Details

This component is an extension applied to ACA application that will show the `Move` action in the context menu and in the toolbar when the node selected is a record.
