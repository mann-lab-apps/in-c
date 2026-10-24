"""Validate rhythm, actual raster geometry and preservation of pre-existing work."""
from pathlib import Path
from PIL import Image
from collections import deque
import json,hashlib,xml.etree.ElementTree as ET,subprocess,math
root=Path(__file__).resolve().parents[1];repo=root.parents[3];out=root/'generated'
f=json.loads((root/'family.json').read_text());manifest=json.loads((out/'manifest.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for name,h in manifest['sources'].items():assert sha(root/name)==h,name
for item in manifest['files']:assert sha(out/item['file'])==item['sha256'],item['file']
assert (root/f['motifSource']).read_bytes()==(root/f['previousMotif']).read_bytes(),'shared master changed'
ns={'s':'http://www.w3.org/2000/svg'};source=ET.parse(root/f['motifSource']).getroot();rhythm=source.find('.//s:g[@data-rhythm]',ns)
heads=rhythm.findall('s:ellipse',ns);assert len(heads)==3
head_y=[float(h.get('cy')) for h in heads];assert head_y[0]==head_y[2]<head_y[1]
shared=rhythm.findall('s:g[@data-role="shared-beams"]/s:rect',ns);partial=rhythm.find('s:rect[@data-role="partial-fourth-beam"]',ns)
assert len(shared)==3 and float(partial.get('y'))<min(float(b.get('y')) for b in shared)
assert all(float(b.get('x'))==49 and float(b.get('width'))==111 for b in shared)
assert float(partial.get('x'))==49 and float(partial.get('width'))==58
stems=rhythm.find('s:path[@data-role="stems"]',ns);assert stems.get('d')=='M49 80V202M102 102V202M155 80V202'
assert max(float(b.get('y'))+float(b.get('height')) for b in shared)==202
assert rhythm.find('s:circle[@data-role="augmentation-dot"]',ns) is not None
# At 256px every opaque connected region must belong to the intended positive shape.
# Cut-out beams deliberately enclose five black counters; they are not stray fragments.
def components(alpha):
 pixels={(x,y) for y in range(256) for x in range(256) if alpha.getpixel((x,y))>=128};areas=[]
 while pixels:
  q=deque([pixels.pop()]);n=0
  while q:
   x,y=q.popleft();n+=1
   for v in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
    if v in pixels:pixels.remove(v);q.append(v)
  areas.append(n)
 return sorted(areas,reverse=True)
metrics=[];png_checks=0
for p in f['products']+f['alternatives']:
 id=p['id'];motif=Image.open(out/f'diagnostics/{id}-motif.png').convert('RGBA').getchannel('A')
 if not p.get('standalone'):
  carrier=Image.open(out/f'diagnostics/{id}-carrier.png').convert('RGBA').getchannel('A')
  offsets=[(dx,dy) for dx in range(-3,4) for dy in range(-3,4) if dx*dx+dy*dy<=9]
  for y in range(256):
   for x in range(256):
    if motif.getpixel((x,y))>=128:
     assert all(0<=x+dx<256 and 0<=y+dy<256 and carrier.getpixel((x+dx,y+dy))>=128 for dx,dy in offsets),(id,'motif escapes/inset',x,y)
 glyph=Image.open(out/f'transparent/{id}-256.png').convert('RGBA').getchannel('A')
 coords=[(x,y) for y in range(256) for x in range(256) if glyph.getpixel((x,y))>=128]
 radius=max(math.hypot(x+.5-128,y+.5-128) for x,y in coords)
 assert radius<124,(id,'circle margin')
 areas=components(glyph);expected=2 if p.get('standalone') else 7 if id=='score' else 6
 assert len(areas)==expected,(id,'unintended components',areas)
 assert min(areas)>50,(id,'small fragment',areas)
 metrics.append({'id':id,'bounds':glyph.getbbox(),'inkFraction':round(len(coords)/65536,4),'centroid':[round(sum(v[k] for v in coords)/len(coords),2) for k in [0,1]],'motifBounds':motif.getbbox(),'opaqueComponentAreas':areas,'circleMaxRadius':round(radius,2)})
 for theme in ['blue','mono','transparent']:
  doc=ET.parse(out/f'{theme}/{id}.svg').getroot();assert not doc.findall('.//s:image',ns)
  for e in doc.iter():
   for k,v in e.attrib.items():
    if k.endswith('href'):assert v.startswith('#')
  embedded=doc.find('.//s:g[@data-rhythm]',ns)
  assert embedded is not None and len(embedded.findall('s:ellipse',ns))==3
  for size in [16,24,32,48,64,128,256,512]:
   im=Image.open(out/f'{theme}/{id}-{size}.png').convert('RGBA');assert im.size==(size,size)
   if theme!='transparent':assert im.getchannel('A').getextrema()==(255,255)
   else:assert im.getchannel('A').getextrema()==(0,255)
   png_checks+=1
baseline=json.loads((root/'evidence/baseline.json').read_text());changed=[]
for name,h in baseline['files'].items():
 p=repo/name
 if not p.is_file() or sha(p)!=h:changed.append(name)
allowed=['docs/brand/ddirori-brand-system/README.md','docs/brand/ddirori-brand-system/visual-identity.md','docs/brand/ddirori-design-system/system-review.md']
assert set(changed)<=set(allowed),('unexpected pre-existing changes',changed)
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo).decode().strip()==baseline['head']
assert subprocess.check_output(['git','worktree','list','--porcelain'],cwd=repo).decode()==baseline['worktrees']
result={'status':'passed','files':len(manifest['files']),'pngChecks':png_checks,'sharedMotif':'byte-identical to v7 precise.svg; 64/64/dotted32 structure verified','containment':'all app motif pixels have at least 3px checked radial inset at 256px','metrics':metrics,'preservation':{'compared':len(baseline['files']),'changed':changed,'headAndWorktrees':'unchanged'},'limitations':['No user recognition testing','No native packaging, installation, screen reader or remote CI','Small internal beams and dot still merge at 16–32px']}
(root/'evidence/verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':'passed','metrics':metrics},ensure_ascii=False))
