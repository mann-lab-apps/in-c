from pathlib import Path
from PIL import Image
import sys,json,math,struct
root=Path(sys.argv[1]);temp=Path(sys.argv[2]);count=0
for p in root.rglob('*.png'):
 im=Image.open(p);im.load();count+=1
 assert im.width==im.height,p
 if '/platform/' in str(p) and 'icon.iconset' not in str(p):
  assert im.mode==('RGBA' if p.name=='google-play-512.png' else 'RGB'),p
  assert im.info.get('srgb')==0,p
  if p.name=='google-play-512.png':assert im.getextrema()[3]==(255,255) and p.stat().st_size<=1024*1024,p
for d in ['a']:
 for palette in ['mono','violet','blue','teal']:
  for product in ['play','studio','score']:
   for size in [16,24,32,48,64,128,256,1024]:
    im=Image.open(root/f'png/{d}/{palette}/{product}-{size}.png')
    assert im.size==(size,size)
    assert im.convert('RGBA').getextrema()[3]==(255,255)
for folder in root.glob('platform/*/studio/desktop'):
 ico=Image.open(folder/'icon.ico');assert ico.ico.sizes()=={(n,n) for n in [16,24,32,48,64,128,256]}
 for size in ico.ico.sizes():ico.ico.getimage(size).load()
 icns=Image.open(folder/'icon.icns');icns.load();assert icns.size==(1024,1024)
for folder in root.glob('platform/*/*/ios/AppIcon.appiconset'):
 for e in json.loads((folder/'Contents.json').read_text())['images']:
  if 'filename' in e:
   im=Image.open(folder/e['filename']);n=round(float(e['size'].split('x')[0])*float(e['scale'].strip('x')));assert im.size==(n,n)
metrics=[]
for p in sorted(temp.glob('*-glyph.png')):
 im=Image.open(p).convert('RGBA');points=[(x,y) for y in range(256) for x in range(256) if im.getpixel((x,y))[3]>=128]
 xs=[p[0] for p in points];ys=[p[1] for p in points]
 assert min(xs)>24 and min(ys)>24 and max(xs)<232 and max(ys)<232,p
 metrics.append({'glyph':p.stem,'bounds':[min(xs),min(ys),max(xs),max(ys)],'inkFraction':round(len(points)/65536,4),'centroid':[round(sum(xs)/len(xs),2),round(sum(ys)/len(ys),2)]})
safe=[]
for p in temp.glob('adaptive-*.png'):
 im=Image.open(p).convert('RGBA');r=max(math.hypot(x+.5-54,y+.5-54) for y in range(108) for x in range(108) if im.getpixel((x,y))[3]>=128)
 assert r<=33,(p,r)
 safe.append({'glyph':p.stem,'furthestOpaquePixelRadius':round(r,3),'safeRadius':33})
print(json.dumps({'pngCount':count,'metrics':metrics,'adaptive':safe,'containerValidation':'PNG-backed ICNS/ICO frames decoded; not OS install validation'}))
