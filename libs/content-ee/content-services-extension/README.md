# ADW Content Services Extension

Provides additional features to the Alfresco Content Application and Digital Workspace:

- Library Management
  - Join Library Notifications
  - Library Members
  - Library Groups
  - Pending Requests

## Enabling the plugin

In the `apps/content-ee/src/app.config.json`, update the `plugins` section:

```json
{
  "plugins": {
    "contentService": true
  }
}
```

## Components

| Name                                                                       | Description                           | 
|----------------------------------------------------------------------------|---------------------------------------| 
| [LibraryNotificationsComponent](./docs/library-notifications.component.md) | Manage requests for joining a library |
