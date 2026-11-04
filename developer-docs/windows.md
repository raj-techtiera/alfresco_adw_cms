# Microsoft Windows

Learn how to get started with Microsoft Windows.

## Prerequisites

- [Windows 10 or later](https://www.microsoft.com/en-us/software-download/windows10ISO)
- [Microsoft Visual C++ 2015 Redistributable (x64)](https://aka.ms/vs/17/release/vc_redist.x64.exe)

## Install NodeJS on Windows

Follow the next guide to setup NVM, Node.js, VS Code and Git:  
<https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows>

Configure NVM to use Node 18

```sh
nvm install 18
nvm use 18
```

## Clone Repository

```sh
git clone https://github.com/Alfresco/alfresco-content-app.git
cd alfresco-content-app
```

If you are using source code distribution, unpack the project and navigate to the project folder.

## Setup

In the project root folder, create an `.env` file with the `BASE_URL` property pointing to your ACS backend.

```yaml
BASE_URL="https://your.acs.backend.com"
```

> This property is used for the proxy server to redirect all traffic during development process.

In the VS Code Terminal (powershell), install the Nx CLI:

```sh
npm install -g @nrwl/cli
```

## Build and Run

In the VS Code Terminal (powershell), run the following:

```sh
npm install

# Running Alfresco Digital Workspace
npm start content-ee

# Running Alfresco Control Center
npm start admin-cc
```

The application is served and opened at `http://localhost:4200` by default.

## Production Builds

```shell
# Building Alfresco Digital Workspace
npm run build content-ee -- --configuration=production

# Building Alfresco Control Center
npm run build admin-cc -- --configuration=production
```

The build output is located at the `dist/<project-name>/` folder.
