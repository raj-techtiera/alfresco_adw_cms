/**
 * Copies app.config.dev.json or app.config.prod.json to app.config.json
 * based on BUILD_ENV (default: 'dev').
 * Substitutes ${LOGO_URL} from repo `.env` into application.logo.
 *
 * Run before serve (dev) or before production build (BUILD_ENV=production).
 */
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const arg = process.argv[2];
const env = (arg || process.env.BUILD_ENV || 'dev').toLowerCase();
const validEnv = env === 'production' || env === 'prod' ? 'prod' : 'dev';
const srcDir = path.join(__dirname, '..', 'apps', 'content-ee', 'src');
const source = path.join(srcDir, `app.config.${validEnv}.json`);
const dest = path.join(srcDir, 'app.config.json');

if (!fs.existsSync(source)) {
  console.error(`prepare-app-config: ${source} not found`);
  process.exit(1);
}

const logoUrl = (
  process.env.LOGO_URL ||
  process.env.NG_APP_LOGO_IMAGE_URL ||
  process.env.NG_APP_LOGO_URL
).trim();
const content = fs.readFileSync(source, 'utf8').replace(/\$\{LOGO_URL\}/g, logoUrl);
fs.writeFileSync(dest, content);

console.log(
  `prepare-app-config: copied app.config.${validEnv}.json -> app.config.json ` +
    `(BUILD_ENV=${process.env.BUILD_ENV || 'dev'}, LOGO_URL=${logoUrl})`
);
