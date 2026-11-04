# ADW Dashboard Extension

Provides additional features to Alfresco Digital Workspace:

- Dashboard page
  - Personal files widget
  - My Libraries widget
  - My Tasks widget
  - AI Bot widget
  - Notification widget

## Enabling the plugin

In the `apps/content-ee/src/app.config.json`, update the `plugins` section:

```json
{
  "plugins": {
    "dashboard": true
  }
}
```

## Components

| Name                                                      | Description                     | 
|-----------------------------------------------------------|---------------------------------| 
| [DashboardHomeComponent](./docs/dashboard-home.component) | Home page for the ADW Dashboard |
