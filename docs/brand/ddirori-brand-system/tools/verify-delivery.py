from pathlib import Path
import json,re,shutil,hashlib,os
from datetime import datetime,timezone
import yaml
ROOT=Path(__file__).resolve().parents[1];REPO=ROOT.parents[2];TOOLS=Path(os.environ.get('DDIRORI_BRAND_TOOLS','/tmp/ddirori-brand-tools'));E=ROOT/'evidence';LOGS=E/'logs';LOGS.mkdir(exist_ok=True)
logs={}
for name in ['ui-tests','ui-analyze','score-tests','score-analyze','play-tests','play-analyze','web-build','web-tests','clef-metadata','play-metadata','system-artifacts']:
 source=TOOLS/(name+'.log');source=source if source.exists() else LOGS/source.name;content=source.read_text();
 if source.resolve()!=(LOGS/source.name).resolve():shutil.copy(source,LOGS/source.name)
 logs[name]=content
counts={}
for name in ['ui','score','play']:
 match=re.search(r'\+(\d+): All tests passed!',logs[name+'-tests']);assert match,name+' tests failed';counts[name]=int(match.group(1));assert 'No issues found!'in logs[name+'-analyze'],name+' analyze'
match=re.search(r'Tests\s+(\d+) passed',logs['web-tests']);assert match;counts['web']=int(match.group(1));assert 'built in'in logs['web-build']
for name in ['clef','play']:assert 'fastlane.tools finished successfully'in logs[name+'-metadata']
assert '30 contrast pairs'in logs['system-artifacts']
assets=json.loads((E/'asset-validation.json').read_text());browser=json.loads((E/'browser-validation.json').read_text());assert assets['status']==browser['status']=='passed'
# Validate repository links in the new working documentation, not outside URLs.
link_count=0
for file in ROOT.glob('*.md'):
 for link in re.findall(r'\]\(([^)]+)\)',file.read_text()):
  if re.match(r'(?:https?:|#)',link):continue
  p=(file.parent/link.split('#')[0]).resolve();assert p.exists()or p==E/'summary.json',str(file)+': '+link;link_count+=1
metadata=[]
for name in ['clef','classical-local-library']:
 p=REPO/'deployment/apps'/name/'ios-metadata.yaml';m=yaml.safe_load(p.read_text());assert m['source']['state']=='pending' and m['content']['reviewed']is False;metadata.append({'app':name,'sourceState':'pending','contentReviewed':False})
summary={'date':datetime.now(timezone.utc).isoformat(),'scope':'Local brand assets and two product pilots. No remote publication or physical-device certification.','tests':counts,'totalTests':sum(counts.values()),'analyze':'three Flutter targets: no issues','webBuild':'passed','assetChecks':len(assets['checks']),'browserChecks':len(browser['checks']),'contrastPairs':30,'documentationLinks':link_count,'metadata':metadata,'widgetCaptures':len(list(E.glob('score-*.png')))+len(list(E.glob('play-*.png'))),'remaining':['User naming and icon recognition','Installed launcher masks and physical device VoiceOver','Exact release checkpoint/version reconciliation and screenshot pipeline','Trademark/domain/store/handle clearance before release']}
(E/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
# A baseline hash diff aids review; concurrent workspace edits may also appear.
baseline=json.loads((TOOLS/'baseline.json').read_text()) if (TOOLS/'baseline.json').exists() else {};changed=[]
for name,digest in baseline.items():
 p=REPO/name
 if not p.exists()or hashlib.sha256(p.read_bytes()).hexdigest()!=digest:changed.append(name)
(E/'scope-review.json').write_text(json.dumps({'note':'Files differing from read-time baseline in inspected paths; may include concurrent user work. Existing changes were not reset.','changedSinceBaseline':changed},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False,indent=2))
