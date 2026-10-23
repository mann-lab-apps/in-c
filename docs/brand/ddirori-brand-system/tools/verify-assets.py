from pathlib import Path
import json,re,hashlib,plistlib
import xml.etree.ElementTree as ET
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];REPO=ROOT.parents[2];A=ROOT/'assets'
checks=[]
def check(name,condition):
 if not condition: raise AssertionError(name)
 checks.append(name)
ns={'s':'http://www.w3.org/2000/svg'}
for name in ['motif.svg','motif-small.svg']:
 a=ET.parse(A/name).getroot();b=ET.parse(REPO/'docs/brand/ddirori-visuals/round-4'/name).getroot()
 check(name+' identical approved geometry',[(x.tag,dict(x.attrib))for x in a.iter() if x is not a]==[(x.tag,dict(x.attrib))for x in b.iter() if x is not b])
 check(name+' 3 heads + augmentation dot',len(a.findall('.//s:ellipse',ns))==3 and len(a.findall('.//s:circle',ns))==1)
 beams=a.findall('.//s:g[@data-role="shared-beams"]/s:rect',ns);partial=a.find('.//s:rect[@data-role="partial-fourth-beam"]',ns)
 check(name+' three full beams and short upper fourth',len(beams)==3 and float(partial.attrib['width'])<float(beams[0].attrib['width']) and float(partial.attrib['y'])<float(beams[0].attrib['y']))
for p in list(A.glob('wordmark-*.svg'))+list(A.glob('lockup-*.svg')):
 root=ET.parse(p).getroot();check(p.name+' outlined',not root.findall('.//s:text',ns) and len(root.findall('.//s:path',ns))>0)
for app in ['in_c_sheet','classical_local_library']:
 folder=REPO/'apps'/app
 plist=plistlib.loads((folder/'ios/Runner/Info.plist').read_bytes());expected='띠로리 스코어'if app=='in_c_sheet'else'띠로리 플레이'
 check(app+' local display name',plist['CFBundleDisplayName']==expected)
 icons=folder/'ios/Runner/Assets.xcassets/AppIcon.appiconset';contents=json.loads((icons/'Contents.json').read_text())
 for image in contents['images']:
  if 'filename'not in image:continue
  size=round(float(image['size'].split('x')[0])*float(image['scale'].replace('x','')));im=Image.open(icons/image['filename'])
  check(app+'/'+image['filename']+' size and no alpha',im.size==(size,size)and im.mode=='RGB')
 application=ET.parse(folder/'android/app/src/main/AndroidManifest.xml').getroot().find('application');android='http://schemas.android.com/apk/res/android'
 check(app+' current round icon reference',application.attrib.get('{'+android+'}roundIcon','@mipmap/ic_launcher')=='@mipmap/ic_launcher')
 res=folder/'android/app/src/main/res'
 for suffix,size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:check(app+' android '+suffix,Image.open(res/('mipmap-'+suffix)/'ic_launcher.png').size==(size,size))
 ET.parse(res/'mipmap-anydpi-v26/ic_launcher.xml');ET.parse(res/'drawable/ddirori_launcher_foreground.xml');check(app+' adaptive XML parsed',True)
manifest=json.loads((A/'manifest.json').read_text())
for item in manifest['files']:
 data=(A/item['file']).read_bytes();check('hash '+item['file'],hashlib.sha256(data).hexdigest()==item['sha256'])
# Shapes must retain visible foreground at the smallest supported size. Distinctness
# is a design review, not a numerical proxy for user recognition.
for p in A.glob('icon-*.svg'):check(p.name+' valid SVG',ET.parse(p).getroot().tag.endswith('svg'))
report={'scope':'Deterministic local assets and platform file validation; not trademark, store acceptance or device accessibility','checks':checks,'status':'passed'}
(ROOT/'evidence/asset-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(len(checks),'asset checks passed')
