---
Title: Record Icon Component
Added: v2.0.0
Status: Active
---

# [Record Icon Component](../../src/lib/record/components/record-icon/record-icon.component.ts 'Defined in record-icon.component.ts')

Displays the record icon when the node is a record.

![Example after installation](../docassets/images/CustomRecordIcon.png)

## Basic Usage

Add the reference in `app.extensions.json`:

```json
  "$references": [
    ...
    "record-icon.plugin.json"
  ],
```

```ts
  const context = {
      row : {
        node : { ... }
      }
  };
```

```html
<aga-record-icon [context]="context"> </aga-record-icon>
```

## Class members

### Properties

| Name    | Type  | Default value | Description |
| ------- | ----- | ------------- | ----------- |
| context | `any` |               |             |

## Details

This component is an extension applied to ACA application that will show the record icon when a node is a record.
