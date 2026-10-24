"""Inspect generated candidates; never overwrite approved visual baselines."""
import json,hashlib,xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
generated=root/'generated'
family=json.loads((root/'family.json').read_text())
manifest=json.loads((generated/'manifest.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert manifest['motifSourceSha256']==sha(root/family['motifSource'])
assert manifest['familySha256']==sha(root/'family.json')
for item in manifest['files']:
 assert sha(generated/item['file'])==item['sha256'],item['file']
ns={'s':'http://www.w3.org/2000/svg'}
source=ET.parse(root/family['motifSource']).getroot()
source_rhythm=source.find('.//s:g[@data-rhythm]',ns)
containment=[]
for p in family['products']:
 id=p['id']
 doc=ET.parse(generated/f'blue/{id}.svg').getroot()
 rhythm=doc.find('.//s:g[@data-rhythm]',ns)
 # The complete original geometry is embedded, apart from its monochrome ink.
 original=ET.tostring(source_rhythm).replace(b'currentColor',b'#000')
 assert ET.tostring(rhythm)==original,id
 assert len(rhythm.findall('.//s:g[@data-role="shared-beams"]/s:rect',ns))==3
 assert rhythm.find('.//s:rect[@data-role="partial-fourth-beam"]',ns) is not None
 assert rhythm.find('.//s:circle[@data-role="augmentation-dot"]',ns) is not None
 carrier=Image.open(generated/f'diagnostics/{id}-carrier.png').convert('RGBA').getchannel('A')
 motif=Image.open(generated/f'diagnostics/{id}-motif.png').convert('RGBA').getchannel('A')
 # Every meaningful motif pixel lies inside the solid carrier, with a 3px inset.
 for y in range(256):
  for x in range(256):
   if motif.getpixel((x,y))>=128:
    assert all(0<=x+dx<256 and 0<=y+dy<256 and carrier.getpixel((x+dx,y+dy))>=128 for dx,dy in [(0,0),(3,0),(-3,0),(0,3),(0,-3)]),(id,x,y)
 containment.append({'product':id,'motifBounds':motif.getbbox(),'carrierBounds':carrier.getbbox(),'minimumCheckedInsetPx':3})
 for theme in ['blue','mono','transparent']:
  for size in [16,24,32,48,64,128,256,512]:
   im=Image.open(generated/f'{theme}/{id}-{size}.png').convert('RGBA')
   assert im.size==(size,size)
   if theme!='transparent': assert im.getchannel('A').getextrema()==(255,255)
result={'status':'passed','fileHashes':len(manifest['files']),'pngSizeChecks':72,'sourceMotif':'unchanged embedded geometry in all three icons','containment':containment,'limitations':['No native packaging or launcher replacement','No user recognition study','At 16–32px beams and dot are not reliably readable']}
(root/'evidence/verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
