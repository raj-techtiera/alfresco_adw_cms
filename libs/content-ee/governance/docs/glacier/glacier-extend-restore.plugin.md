---
Title: Glacier Extend Restore Action
Added: v2.0.0
Status: Active
---

# [Glacier Extend Restore Record](../../assets/governance-glacier.plugin.json)

Displays the `Extend Restore` action. We can able to extend the restore of a Item(Node/Record) using Glacier plugin.

![Context Menu after installation](../docassets/images/extend-restore-contextmenu.png)

![Toolbar menu after installation](../docassets/images/extend-restore-tool-bar.png)

## Basic Usage

Add the reference in `app.extensions.json`:

```json
  "$references": [
    "governance-glacier.plugin.json"
  ],
```

## Details

This component is an extension applied to ACA application that will show the `Extend Restore` action in the context menu and in the toolbar.
