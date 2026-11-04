# Release

## Release Commits

To perform the release commit, ensure you have a clean repository and run the following command:

```shell
npm run release
```

The process is interactive, and you will be guided through a series of questions:

```text
? The new version for package.json@7.9.0 7.10.0
? The new version of admin-cc (7.9.0) 7.10.0
? The new version of content-ee (4.0.0-A.3) 4.0.0
? Update ADF libraries? Yes
? New version of the ADF libraries (can also be alpha|beta|latest) alpha
? Update JS-API version? Yes
? New version of JS-API (can also be alpha|beta|latest) alpha
? Update ACA libs? Yes
? New version of the ACA libraries (can also be alpha|beta|latest) alpha
? Generate git commit? (y/N)
```

Please provide the answers according to the release plan.

After successful release bump the version and release version in package.json manually.

## Release Artifacts

| Project    |       Docker       |            Build .zip            |        Build .war         |         Sourcecode .zip          |                Npm                |
|:-----------|:------------------:|:--------------------------------:|:-------------------------:|:--------------------------------:|:---------------------------------:|
| Content EE | :white_check_mark: | :white_check_mark: *(S3, Nexus)* | :white_check_mark: *(S3)* | :white_check_mark: *(S3, Nexus)* | :white_check_mark: *(extensions)* |
| Admin CC   | :white_check_mark: | :white_check_mark: *(S3, Nexus)* |            :x:            |               :x:                |                :x:                |
