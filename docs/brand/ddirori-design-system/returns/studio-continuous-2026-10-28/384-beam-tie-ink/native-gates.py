from pathlib import Path
import json,subprocess,hashlib,os,time,tempfile
r=Path.cwd();cp=r/'docs/brand/ddirori-design-system/returns/studio-continuous-2026-10-28/384-beam-tie-ink';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();files=subprocess.check_output(['rg','--files','src','scripts','packages/ddirori_web'],text=True).splitlines();files+=['package.json','package-lock.json','vitest.config.ts','electron.vite.config.ts','tsconfig.json'];files+= [str(p.relative_to(r))for folder in ['continuous-379-source','continuous-382-source','continuous-384-source']for p in(r/'out/ddirori'/folder).glob('*')if p.is_file()]
def source():return [{'path':p,'sha256':sha(r/p)}for p in sorted(set(files))]
def artifacts():return [{'path':str(p.relative_to(r)),'sha256':sha(p)}for p in sorted((r/'out/renderer/assets').glob('*'))if p.is_file()]+[{'path':p,'sha256':sha(r/p)}for p in ['out/renderer/index.html','out/main/index.js','out/preload/index.js']]
before=source();art=artifacts();(cp/'native-lock-before.json').write_text(json.dumps({'files':before,'artifacts':art},indent=2)+'\n');rows=[]
jobs=[('beams','verify-studio-warning-workflow.cjs',['--audit-multivoice-tie-beams','--require-multivoice-clearance'],'continuous-384-source'),('stems','verify-studio-warning-workflow.cjs',['--audit-multivoice-tie-stems','--require-multivoice-clearance'],'continuous-382-source'),('glyphs','verify-studio-warning-workflow.cjs',['--audit-multivoice-tie-ink','--require-multivoice-clearance'],'continuous-379-source'),('profile','verify-notation-snapshots.cjs',['--profile=studio-r3'],None),('fixed','verify-notation-snapshots.cjs',['--fixed-canvas'],None)]
for name,script,args,fixture in jobs:
 out=r/('out/ddirori/continuous-384-owned-'+name);assert not out.exists();log=cp/('owned-'+name+'.log');assert not log.exists();env=os.environ.copy();env.pop('ELECTRON_RUN_AS_NODE',None);env.update(TMPDIR=tempfile.mkdtemp(prefix='studio-384-'),DDIRORI_OBJECT_FILTER_QA_OUT=str(out),DDIRORI_SNAPSHOT_QA_OUT=str(out))
 if fixture:env['DDIRORI_MEASURE_MARKING_QA_DIR']=str(r/'out/ddirori'/fixture)
 print('START',name,flush=True);t=time.monotonic()
 with log.open('w')as f:
  try:code=subprocess.run(['./node_modules/.bin/electron','scripts/'+script,*args],cwd=r,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=180).returncode
  except subprocess.TimeoutExpired:code=124
 rows.append({'name':name,'exit':code,'seconds':round(time.monotonic()-t,2),'output':str(out)});(cp/'native-exits.json').write_text(json.dumps(rows,indent=2)+'\n');print(rows[-1],flush=True)
 if code:break
end=source();record={'files':end,'artifacts':artifacts(),'sourcesStable':before==end,'artifactsStable':artifacts()==art};(cp/'native-lock-after.json').write_text(json.dumps(record,indent=2)+'\n');assert before==end and artifacts()==art;assert len(rows)==len(jobs)and all(v['exit']==0 for v in rows)
