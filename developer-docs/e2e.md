# End-to-End Testing

You might need to update the local distribution of the Playwright

```bash
npx playwright install
```

### Option 1

Launch the corresponding application from the Nx Console interface, or command line:

```bash
nx serve admin-cc
```

Then run the e2e project from the Nx Console interface, or command line:

```bash
nx e2e admin-cc-security-e2e
```

### Option 2

Run the `e2e` target with the `production` flag, to automatically run the suite with the default web server

```bash
nx run admin-cc-content-identity-e2e:e2e --configuration=production
```
