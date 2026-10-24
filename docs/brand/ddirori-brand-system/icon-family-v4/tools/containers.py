"""Package existing rendered pixels; no artwork or palette edits."""
from pathlib import Path
import sys,struct
from PIL import Image
from PIL.PngImagePlugin import PngInfo
root=Path(sys.argv[1])
for p in root.glob('platform/**/*.png'):
    if 'icon.iconset' in str(p):continue
    im=Image.open(p)
    if im.mode=='RGBA':
        assert im.getextrema()[3]==(255,255),p
        info=PngInfo();info.add(b'sRGB',b'\x00')
        im.convert('RGBA' if p.name=='google-play-512.png' else 'RGB').save(p,pnginfo=info)
for folder in root.glob('platform/*/studio/desktop'):
    # ICNS entries are PNG data at native sizes; no resizing conversion.
    frames={'icp4':'16x16','icp5':'32x32','icp6':'32x32@2x','ic07':'128x128','ic08':'128x128@2x','ic09':'512x512','ic10':'512x512@2x','ic11':'16x16@2x','ic12':'32x32@2x','ic13':'128x128@2x','ic14':'512x512'}
    chunks=[]
    for key,name in frames.items():
        p=folder/'icon.iconset'/('icon_'+name+'.png')
        data=p.read_bytes();chunks.append(key.encode()+struct.pack('>I',len(data)+8)+data)
    body=b''.join(chunks);(folder/'icon.icns').write_bytes(b'icns'+struct.pack('>I',len(body)+8)+body)
    sizes=[16,24,32,48,64,128,256];payload=[];entries=[];offset=6+16*len(sizes)
    for size in sizes:
        data=(root/'png'/'a'/folder.parent.parent.name/f'studio-{size}.png').read_bytes()
        entries.append(struct.pack('<BBBBHHII',size%256,size%256,0,0,1,32,len(data),offset));payload.append(data);offset+=len(data)
    (folder/'icon.ico').write_bytes(struct.pack('<HHH',0,1,len(sizes))+b''.join(entries)+b''.join(payload))
