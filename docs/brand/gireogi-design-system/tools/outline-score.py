"""Outline VexFlow fixture text for self-contained SVG. Requires fonttools+brotli."""
from pathlib import Path
import base64,io,re,xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parents[2]
fonts={}
for name,file in [('Bravura','bravura'),('Academico','academico')]:
    text=(REPO/'node_modules/vexflow/build/esm/src/fonts'/f'{file}.js').read_text()
    payload=re.search(r'base64,([^\']+)',text).group(1)
    font=TTFont(io.BytesIO(base64.b64decode(payload)))
    fonts[name]=(font,font.getGlyphSet(),font.getBestCmap())

NS='{http://www.w3.org/2000/svg}'
ET.register_namespace('',NS[1:-1])
tree=ET.parse('/tmp/gireogi-practice-score-text.svg')
def walk(parent,inherited=None):
    attrs=dict(inherited or {});attrs.update(parent.attrib)
    for element in list(parent):
        if element.tag==NS+'text':
            at=dict(attrs);at.update(element.attrib)
            family=at.get('font-family','Academico').split(',')[0].strip('"\' ')
            name='Bravura' if 'Bravura' in family else 'Academico'
            font,glyphs,cmap=fonts[name]
            size=float(at.get('font-size','12').replace('px','').replace('pt',''))
            scale=size/font['head'].unitsPerEm
            x,y=float(at.get('x',0)),float(at.get('y',0))
            g=ET.Element(NS+'g',{k:v for k,v in element.attrib.items() if k not in ['x','y','font-size','font-family']})
            label=''.join(element.itertext());g.set('aria-label',label)
            for char in label:
                glyphname=cmap.get(ord(char))
                if glyphname is None:
                    raise ValueError(f'Missing glyph {char!r} in {name}')
                pen=SVGPathPen(glyphs);glyphs[glyphname].draw(pen)
                ET.SubElement(g,NS+'path',{'d':pen.getCommands(),'transform':f'translate({x} {y}) scale({scale} {-scale})'})
                x+=font['hmtx'].metrics[glyphname][0]*scale
            parent.insert(list(parent).index(element),g);parent.remove(element)
        else:walk(element,attrs)
walk(tree.getroot())
tree.write(ROOT/'assets/practice-score.svg',encoding='unicode',xml_declaration=False)
print('Wrote self-contained outlined score fixture')
