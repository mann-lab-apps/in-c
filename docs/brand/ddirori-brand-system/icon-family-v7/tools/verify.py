"""Candidate geometry, musical structure and mask containment checks."""
import json,hashlib,xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];out=root/'generated'
f=json.loads((root/'family.json').read_text());manifest=json.loads((out/'manifest.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert manifest['motifSourceSha256']==sha(root/f['motifSource'])
assert manifest['familySha256']==sha(root/'family.json')
for name,h in manifest['motifCandidates'].items():assert sha(root/name)==h
for item in manifest['files']:assert sha(out/item['file'])==item['sha256'],item['file']
old=json.loads((root/'../icon-family-v6/family.json').read_text())
for a,b in zip(f['products'],old['products']):
 for key in ['body','details','motifTransform','bodyTransform']:assert a[key]==b[key]
ns={'s':'http://www.w3.org/2000/svg'}
a=ET.parse(root/'motifs/precise.svg').getroot()
heads=a.findall('.//s:ellipse',ns);assert len(heads)==3
assert heads[0].get('cy')==heads[2].get('cy') and float(heads[1].get('cy'))>float(heads[0].get('cy'))
beams=a.findall('.//s:g[@data-role="shared-beams"]/s:rect',ns)
short=a.find('.//s:rect[@data-role="partial-fourth-beam"]',ns)
assert len(beams)==3 and float(short.get('y'))<min(float(b.get('y')) for b in beams)
assert short.get('width')=='58' and all(b.get('width')=='111' for b in beams)
assert a.find('.//s:path[@data-role="stems"]',ns).get('d')=='M49 80V202M102 102V202M155 80V202'
assert a.find('.//s:circle[@data-role="augmentation-dot"]',ns) is not None
b=ET.parse(root/'motifs/gesture.svg').getroot();assert len(b.findall('.//s:ellipse',ns))==3
assert not b.findall('.//s:path',ns) and not b.findall('.//s:rect',ns)
assert b.find('.//s:circle[@data-role="terminal-dot"]',ns) is not None
metrics=[]
for d in f['directions']:
 for p in f['products']:
  key=d['id']+'-'+p['id']
  carrier=Image.open(out/f'diagnostics/{key}-carrier.png').convert('RGBA').getchannel('A')
  motif=Image.open(out/f'diagnostics/{key}-motif.png').convert('RGBA').getchannel('A')
  for y in range(256):
   for x in range(256):
    if motif.getpixel((x,y))>=128:
     assert all(0<=x+dx<256 and 0<=y+dy<256 and carrier.getpixel((x+dx,y+dy))>=128 for dx,dy in [(0,0),(3,0),(-3,0),(0,3),(0,-3)]),(key,x,y)
  metrics.append({'candidate':key,'motifBounds':motif.getbbox(),'checkedInsetPx':3})
  for theme in ['blue','mono','transparent']:
   doc=ET.parse(out/f"{d['id']}/{theme}/{p['id']}.svg").getroot()
   assert not doc.findall('.//s:image',ns)
   for size in [16,24,32,48,64,128,256,512]:
    im=Image.open(out/f"{d['id']}/{theme}/{p['id']}-{size}.png").convert('RGBA');assert im.size==(size,size)
    if theme!='transparent':assert im.getchannel('A').getextrema()==(255,255)
result={'status':'passed','files':len(manifest['files']),'pngSizeChecks':144,'sameV6CarrierGeometry':True,'precise':'3 full lower beams; 1 partial upper beam; 3 stems ending at last beam; high-low-high heads and augmentation dot','gesture':'3 ellipses plus terminal dot; no stems or beams; not musical notation','containment':metrics,'limitations':['Not a user recognition test','No native installation or export','1st option still loses beam readability at 16–32px']}
(root/'evidence/verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print('Asset checks passed')
