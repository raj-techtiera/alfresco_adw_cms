---
Title: Glacier Store Action
Added: v2.0.0
Status: Active
---

# [Glacier Store Record](../../assets/governance-glacier.plugin.json)

Displays the `Store` action. We can able to store the Item(Node/Record) using Glacier plugin.

![Context Menu after installation](../docassets/images/glacier-store.png)

![Toolbar menu after installation](../docassets/images/glacier-store-toolbar.png)

## Basic Usage

Add the reference in `app.extensions.json`:

```json
  "$references": [
    ...
    "governance-glacier.plugin.json"
  ],
```

## Details

This component is an extension applied to ACA application that will show the `Store` action in the context menu and in the toolbar.
