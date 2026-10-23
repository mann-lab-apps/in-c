"""Build outlined brand masters from approved geometry and the bundled OFL font.
Usage: python tools/build.py (fonttools + brotli); then node tools/render.mjs.
No previous exploration is used as production geometry.
"""
from pathlib import Path
import json, re, hashlib, shutil, os, subprocess
from xml.sax.saxutils import escape
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
OUT = ROOT/'assets'
OUT.mkdir(exist_ok=True)
TOOLS = Path(os.environ.get('DDIRORI_BRAND_TOOLS', '/tmp/ddirori-brand-tools'))
TOOLS.mkdir(parents=True, exist_ok=True)
PALETTE=json.loads((REPO/'docs/brand/ddirori-design-system/palette-pilot.json').read_text())
BLUE=PALETTE['brand']['primary']; ON_BRAND=PALETTE['brand']['onPrimary']; INK=PALETTE['light']['ink']; SKY=PALETTE['light']['sky']; PEACH=PALETTE['light']['peach']
# Cubic paths are shared with native Flutter, avoiding an SVG runtime dependency.
WIG='M 70 69 C 81 30 111 28 128 45 C 148 27 178 31 187 69 C 222 70 236 100 219 123 C 245 141 244 168 222 181 C 240 209 210 231 184 212 C 155 242 101 242 72 212 C 45 232 15 211 34 182 C 12 169 12 140 37 124 C 20 97 35 72 70 69 Z'
FACE='M 63 151 C 63 104 91 80 128 80 C 165 80 193 104 193 151 C 193 194 166 230 128 230 C 90 230 63 194 63 151 Z'
PRODUCTS=[
 {'id':'play','ko':'띠로리 플레이','en':'Ddirori Play','role':'로컬 음원·디스커버리','path':'M 80 55 C 77 53 72 56 72 61 L 72 195 C 72 200 77 203 81 200 L 196 136 C 203 132 203 124 196 120 Z'},
 {'id':'score','ko':'띠로리 스코어','en':'Ddirori Score','role':'악보 열람·연습','path':'M 51 58 L 108 66 Q 128 70 128 84 Q 128 70 148 66 L 205 58 L 205 190 L 148 198 Q 128 202 128 212 Q 128 202 108 198 L 51 190 Z','cutouts':['M 123 84 L 133 84 L 133 194 L 123 194 Z','M 68 102 L 106 108 L 106 118 L 68 112 Z','M 150 108 L 188 102 L 188 112 L 150 118 Z','M 68 133 L 106 139 L 106 149 L 68 143 Z','M 150 139 L 188 133 L 188 143 L 150 149 Z']},
 {'id':'studio','ko':'띠로리 스튜디오','en':'Ddirori Studio','role':'사보·악보 편집','path':'M 57 170 L 165 62 Q 174 53 183 62 L 197 76 Q 206 85 197 94 L 89 202 L 49 210 Z','cutouts':['M 152 76 L 162 66 L 193 97 L 183 107 Z','M 62 179 L 81 198 L 58 202 Z']},
 {'id':'talk','ko':'띠로리 톡','en':'Ddirori Talk','role':'커뮤니티','path':'M 54 55 L 202 55 Q 216 55 216 73 L 216 166 Q 216 184 198 184 L 107 184 L 61 215 L 66 184 L 54 184 Q 40 184 40 168 L 40 73 Q 40 55 54 55 Z','cutouts':['M 75 107 L 94 107 L 94 129 L 75 129 Z','M 118 124 L 137 124 L 137 146 L 118 146 Z','M 161 107 L 180 107 L 180 129 L 161 129 Z']},
 {'id':'stage','ko':'띠로리 스테이지','en':'Ddirori Stage','role':'공연 발견·홍보','path':'M 51 198 L 51 115 C 51 20 205 20 205 115 L 205 198 L 181 198 L 181 115 C 181 54 75 54 75 115 L 75 198 Z M 40 209 L 216 209 L 216 225 L 40 225 Z'},
 {'id':'click','ko':'띠로리 클릭','en':'Ddirori Click','role':'메트로놈','path':'M 112 42 L 144 42 L 211 210 L 45 210 Z','cutouts':['M 120 75 L 136 75 L 176 188 L 80 188 Z'],'extra':'M 121 174 L 156 88 L 171 94 L 136 180 Z'},
 {'id':'chime','ko':'띠로리 차임','en':'Ddirori Chime','role':'기준음·드론','path':'M 65 45 L 89 45 L 89 117 Q 89 151 128 151 Q 167 151 167 117 L 167 45 L 191 45 L 191 117 Q 191 168 140 175 L 140 219 L 116 219 L 116 175 Q 65 168 65 117 Z'},
]

def svg(body, box='0 0 256 256', label='', color=INK):
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}" role="img" aria-label="{escape(label)}" style="color:{color}">{body}</svg>\n'
def write(name,body): (OUT/name).write_text(body)
def bach(expression='surprised',mono=False):
 stroke='currentColor'; face='none' if mono else PEACH; wig='none' if mono else '#FFFFFF'
 mouth={'surprised':'<ellipse cx="128" cy="179" rx="7.5" ry="10"/>','calm':'<path d="M118 181 Q128 188 138 181" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>','happy':'<path d="M115 176 Q128 199 141 176 Z"/>'}[expression]
 return f'<g stroke="{stroke}" stroke-width="8" stroke-linejoin="round"><path d="{WIG}" fill="{wig}"/><path d="{FACE}" fill="{face}" stroke="none"/></g><g fill="currentColor"><circle cx="101" cy="151" r="8"/><circle cx="155" cy="151" r="8"/>{mouth}</g>'
def product(p,fg=ON_BRAND,bg=BLUE):
 if bg is None:
  d=p['path']+' '+' '.join(p.get('cutouts',[]))
  return f'<path d="{d}" fill="{fg}" fill-rule="evenodd"/>'+ (f'<path d="{p["extra"]}" fill="{fg}"/>' if 'extra' in p else '')
 body=f'<path d="{p["path"]}" fill="{fg}"/>'
 for c in p.get('cutouts',[]): body+=f'<path d="{c}" fill="{bg}"/>'
 if 'extra'in p: body+=f'<path d="{p["extra"]}" fill="{fg}"/>'
 return body

source=REPO/'docs/brand/ddirori-visuals/round-4'
for name in ['motif.svg','motif-small.svg']:
 s=(source/name).read_text();write(name,s.replace('style="color:#000000"',f'style="color:{INK}"'))
motif=re.sub(r'^.*?<svg[^>]*>|</svg>\s*$','',(source/'motif.svg').read_text())
for expression in ['surprised','calm','happy']:
 write(f'bach-{expression}.svg',svg(bach(expression),label=f'띠로리 바흐 {expression}'))
 write(f'bach-{expression}-mono.svg',svg(bach(expression,True),label=f'띠로리 바흐 {expression} 단색'))
write('icon-master.svg',svg(f'<rect width="256" height="256" fill="{BLUE}"/><g fill="{ON_BRAND}" style="color:{ON_BRAND}">{motif}</g>',label='띠로리'))
write('icon-bach.svg',svg(f'<rect width="256" height="256" fill="{BLUE}"/><g transform="translate(15 10) scale(.88)" style="color:{INK}">{bach()}</g>',label='띠로리 바흐 아이콘 비교안'))
for p in PRODUCTS:
 write(f'icon-{p["id"]}.svg',svg(f'<rect width="256" height="256" fill="{BLUE}"/>{product(p)}',label=p['ko']))
 write(f'glyph-{p["id"]}.svg',svg(product(p,INK,None),label=p['ko']))

# Outlined logotypes preserve exact Korean/Latin glyphs without a font dependency.
fontpath=REPO/'docs/brand/ddirori-visuals/fonts/PretendardVariable.woff2'
f=TTFont(fontpath)
if 'fvar'in f: f=instantiateVariableFont(f,{'wght':750},inplace=False)
glyphs=f.getGlyphSet(); cmap=f.getBestCmap(); upm=f['head'].unitsPerEm

def lettering(text,size=76):
 scale=size/upm;x=0;paths=[]
 for ch in text:
  name=cmap[ord(ch)];pen=SVGPathPen(glyphs)
  tp=TransformPen(pen,(scale,0,0,-scale,x,80))
  glyphs[name].draw(tp)
  paths.append(f'<path d="{pen.getCommands()}"/>')
  x+=glyphs[name].width*scale
 return ''.join(paths),x
for lang,text in [('ko','띠로리'),('en','Ddirori')]:
 body,width=lettering(text)
 for variant,color in [('ink',INK),('white','#FFFFFF'),('blue',PALETTE['light']['primary'])]:
  write(f'wordmark-{lang}-{variant}.svg',svg(f'<g fill="currentColor">{body}</g>',f'0 0 {width:.2f} 100',text,color))
  for layout in ['horizontal','stacked']:
   if layout=='horizontal':
    lock=f'<g transform="translate(0 0) scale(.43)" fill="currentColor">{motif}</g><g transform="translate(125 7)" fill="currentColor">{body}</g>';box=f'0 0 {width+137:.2f} 115'
   else:
    w=max(width,150);lock=f'<g transform="translate({(w-128)/2:.2f} 0) scale(.5)" fill="currentColor">{motif}</g><g transform="translate({(w-width)/2:.2f} 132)" fill="currentColor">{body}</g>';box=f'0 0 {w:.2f} 240'
   write(f'lockup-{lang}-{layout}-{variant}.svg',svg(lock,box,text,color))
# Shared geometry used by Flutter native painter and browser gallery.
(ROOT/'family.json').write_text(json.dumps({'wig':WIG,'face':FACE,'products':PRODUCTS},ensure_ascii=False,indent=2)+'\n')
# Generate native paths from the same SVG commands.
def dart_path(d):
 tokens=re.findall(r'[MLCQZ]|-?\d+(?:\.\d+)?',d);i=0;calls=[];n={'M':2,'L':2,'C':6,'Q':4,'Z':0}
 names={'M':'moveTo','L':'lineTo','C':'cubicTo','Q':'quadraticBezierTo','Z':'close'}
 while i<len(tokens):
  cmd=tokens[i];i+=1;args=tokens[i:i+n[cmd]];i+=n[cmd]
  calls.append('..'+names[cmd]+'('+', '.join(args)+')')
 return 'Path()'+''.join(calls)
dart="// Generated by docs/brand/ddirori-brand-system/tools/build.py.\nimport 'dart:ui';\n\nabstract final class DdiroriFamilyGeometry {\n"
dart+=f'  static Path get wig => {dart_path(WIG)};\n  static Path get face => {dart_path(FACE)};\n'
for p in PRODUCTS:
 dart+=f'  static Path get {p["id"]} => {dart_path(p["path"])};\n'
 dart+=f'  static List<Path> get {p["id"]}Cuts => ['+','.join(dart_path(c) for c in p.get('cutouts',[]))+'];\n'
 if 'extra'in p: dart+=f'  static Path get {p["id"]}Extra => {dart_path(p["extra"])};\n'
dart+='}\n'
(REPO/'packages/ddirori_ui/lib/src/generated/ddirori_family_geometry.dart').write_text(dart)
# Editable layout templates use image links to outlined masters, plus editable text.
write('banner-template.svg',svg(f'<rect width="1600" height="600" fill="{BLUE}"/><g transform="translate(1100 40) scale(1.65)" style="color:{INK}">{bach()}</g><g transform="translate(70 75) scale(.95)" fill="{ON_BRAND}">{lettering("띠로리")[0]}</g><text x="70" y="310" fill="{ON_BRAND}" font-family="Pretendard, sans-serif" font-size="54" font-weight="700">음악, 다음 시도로.</text><text x="73" y="370" fill="{ON_BRAND}" font-family="Pretendard, sans-serif" font-size="24">듣고 연주하고 만드는 사람들의 음악 도구</text><g fill="{SKY}"><rect x="75" y="460" width="90" height="26" rx="13"/><rect x="185" y="486" width="90" height="26" rx="13"/><rect x="295" y="460" width="270" height="26" rx="13"/></g>','0 0 1600 600','띠로리 배너 템플릿'))
write('store-template.svg',svg(f'<rect width="1320" height="2868" fill="{BLUE}"/><text x="100" y="220" fill="{ON_BRAND}" font-family="Pretendard, sans-serif" font-size="54" font-weight="700">띠로리 스코어</text><text x="100" y="370" fill="{ON_BRAND}" font-family="Pretendard, sans-serif" font-size="92" font-weight="750">다음 연주를 준비하세요</text><rect x="90" y="530" width="1140" height="2150" rx="56" fill="#F7FBFE"/><text x="660" y="1560" text-anchor="middle" fill="{INK}" font-family="Pretendard, sans-serif" font-size="40">검증한 실제 앱 캡처로 교체</text>','0 0 1320 2868','스토어 이미지 편집 템플릿 — 제출용 아님'))
shutil.copy(REPO/'docs/brand/ddirori-design-system/assets/loader.svg',OUT/'loader.svg')
shutil.copy(REPO/'docs/brand/ddirori-visuals/fonts/LICENSE.txt',OUT/'FONT-LICENSE.txt')
# Temporary TTF supports offline native test captures and raster template rendering.
capture_font=TTFont(fontpath);capture_font.flavor=None;capture_font.save(TOOLS/'Pretendard.ttf')
subprocess.run(['dart','format',str(REPO/'packages/ddirori_ui/lib/src/generated/ddirori_family_geometry.dart')],check=True,stdout=subprocess.DEVNULL)
print('Built',len(list(OUT.glob('*.svg'))),'SVG masters and native family geometry')
