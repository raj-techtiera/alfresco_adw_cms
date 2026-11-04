import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const files = [
    join(root, 'node_modules/@mlightcad/cad-simple-viewer/dist/cad-simple-viewer.js'),
    join(root, 'node_modules/@mlightcad/cad-simple-viewer/dist/cad-simple-viewer.umd.cjs'),
    join(root, 'node_modules/@mlightcad/three-renderer/dist/index.js')
];

const replacements = [
    ['"three/examples/jsm/libs/stats.module"', '"three/examples/jsm/libs/stats.module.js"'],
    ["'three/examples/jsm/libs/stats.module'", "'three/examples/jsm/libs/stats.module.js'"],
    ['"three/examples/jsm/controls/OrbitControls"', '"three/examples/jsm/controls/OrbitControls.js"'],
    ["'three/examples/jsm/controls/OrbitControls'", "'three/examples/jsm/controls/OrbitControls.js'"]
];

for (const file of files) {
    if (!existsSync(file)) {
        continue;
    }
    let source = readFileSync(file, 'utf8');
    let changed = false;
    for (const [from, to] of replacements) {
        if (source.includes(from)) {
            source = source.split(from).join(to);
            changed = true;
        }
    }
    if (changed) {
        writeFileSync(file, source);
    }
}
