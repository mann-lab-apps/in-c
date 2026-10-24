// Dependency-free CI gate: source drift, modified exports and reviewed raster drift.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base=fileURLToPath(new URL('../',import.meta.url));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'generated/manifest.json')));
const family=JSON.parse(fs.readFileSync(path.join(base,'family.json')));
for(const [key,file]of Object.entries({'family.json':'family.json','palette-candidates.json':family.paletteSource,'build.mjs':'tools/build.mjs','containers.py':'tools/containers.py'}))assert.equal(sha(path.resolve(base,file)),manifest.sources[key],`Stale source: ${key}; rebuild candidates and review`);
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const actual=walk(path.join(base,'generated')).map(p=>path.relative(path.join(base,'generated'),p)).filter(p=>p!=='manifest.json').sort();
assert.deepEqual(actual,manifest.files.map(f=>f.file).sort(),'Missing or untracked generated asset');
for(const f of manifest.files)assert.equal(sha(path.join(base,'generated',f.file)),f.sha256,`Changed export ${f.file}`);
const reviewed=JSON.parse(fs.readFileSync(path.join(base,'evidence/reviewed-raster-baseline.json')));
for(const f of reviewed.files)assert.equal(sha(path.join(base,'generated',f.file)),f.sha256,`Visual review required: ${f.file}; do not automatically refresh baseline`);
console.log(`${manifest.files.length} export hashes + source links + ${reviewed.files.length} reviewed rasters passed`);
