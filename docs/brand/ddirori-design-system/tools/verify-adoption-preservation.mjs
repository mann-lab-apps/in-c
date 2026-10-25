// Audit this adoption task against its own baseline; do not rewrite history.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const base='docs/brand/ddirori-design-system/';
const out=path.join(root,base,'evidence/adoption-pilot');
const baseline=JSON.parse(fs.readFileSync(path.join(out,'baseline.json'),'utf8'));
const allowed=new Set([
 'apps/in_c_sheet/lib/main.dart',
 'deployment/apps/clef/ios-metadata.yaml',
 'deployment/apps/classical-local-library/ios-metadata.yaml',
 'packages/ddirori_web/src/index.tsx','packages/ddirori_web/src/basic.tsx','packages/ddirori_web/src/styles.css',
 'packages/ddirori_ui/lib/src/components.dart','packages/ddirori_ui/lib/src/basic.dart',
 ...['README.md','adoption.md','basic-set.md','components.md','system-review.md','validation.md',
 'evidence/specifications/api.json','specifications/README.md','specifications/api-flutter.md','specifications/api-react.md',
 'specifications/audit.md','specifications/component-rules.md','specifications/decisions.md','specifications/registry.json',
 'specifications/services/score.md','specifications/verification.md','specifications/work-packages.md',
 'tools/verify-basic-set.mjs','tools/verify-palettes.mjs','tools/verify-specifications.mjs',
 ...['01','04','08','09','10','19','21','27'].map(n=>`specifications/components/c${n}.md`)].map(p=>base+p)
]);
function hash(p){return fs.existsSync(path.join(root,p))?crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex'):null;}
const changed=Object.entries(baseline.hashes).flatMap(([file,before])=>{const after=hash(file);return before===after?[]:[{file,before,after,allowed:allowed.has(file)}];});
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const unexpected=changed.filter(c=>!c.allowed);
const current=git('ls-files','--cached','--others','--exclude-standard').split('\n');
const report={recordedAt:new Date().toISOString(),baseline:'baseline.json',compared:Object.keys(baseline.hashes).length,
 unchanged:Object.keys(baseline.hashes).length-changed.length,changed,unexpected,
 added:current.filter(p=>!Object.hasOwn(baseline.hashes,p)),
 headUnchanged:git('rev-parse','HEAD')===baseline.head,branchUnchanged:git('branch','--show-current')===baseline.branch,
 scope:'Baseline files outside the explicit UI/documentation/metadata allowlist must remain byte-identical. Existing dirty files inside the allowlist were edited by scoped patches. Other worktrees are not mutated or claimed clean.',
 worktrees:git('worktree','list','--porcelain'),status:unexpected.length?'failed':'passed'};
fs.writeFileSync(path.join(out,'preservation.json'),JSON.stringify(report,null,2)+'\n');
console.log(`${report.compared} baseline files: ${report.unchanged} unchanged, ${changed.length} scoped changes, ${unexpected.length} unexpected`);
if(unexpected.length||!report.headUnchanged||!report.branchUnchanged)process.exitCode=1;
