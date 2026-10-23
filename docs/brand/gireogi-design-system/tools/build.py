"""Build proposal-only vector assets and platform-neutral tokens. Python stdlib only."""
from pathlib import Path
import json
import hashlib

ROOT = Path(__file__).resolve().parents[1]
A = ROOT / 'assets'
A.mkdir(exist_ok=True)
INK, CREAM, APRICOT = '#223C3B', '#FFF6E8', '#F5B878'
PRODUCTS = {'play': ('Play', APRICOT, '날개'), 'note': ('Note', '#B7D0D7', '겹깃'),
            'studio': ('Studio', '#C1D0B4', '깃대'), 'talk': ('Talk', '#EAB6B4', '마주 보는 부리'),
            'stage': ('Stage', '#CEC2DE', '펼친 날개')}

# Original geometry; wing contour is reused, not a tracing of a reference brand.
WING = 'M40 149 C80 148 103 106 178 106 C174 144 135 181 84 181 C62 181 49 169 40 149Z'
FEATHER = 'M111 188 L97 210 L93 183 L119 61 C123 42 144 36 158 46 C168 54 168 66 161 81Z'
HEAD = 'M61 161 C64 140 65 111 76 89 C88 65 116 57 137 69 C157 80 156 105 139 116 C125 125 108 122 100 137 L95 165Z'
BEAK = 'M149 84 L181 101 L148 107Z'

def group(body, transform=''):
    return f'<g transform="{transform}">{body}</g>'

def path(d):
    return f'<path d="{d}"/>'

def shape(key):
    if key == 'parent':
        return (path('M142 151 C148 126 145 87 160 64 C173 43 200 45 205 63 C211 82 191 87 178 89 C162 100 163 124 166 147 C171 179 143 201 108 202 C72 204 43 187 29 164 L53 153 C77 182 135 183 142 151Z')
                + path(WING)
                + '<path class="cut" d="M66 164 C93 163 114 146 143 137 C128 165 92 186 66 164Z"/>'
                + '<path class="beak" d="M206 64 L233 77 Q234 82 208 83 L202 82Z"/>'
                + '<circle class="cut" cx="193" cy="62" r="3.5"/>')
    if key == 'play':
        return group(path(WING), 'translate(7 -3) rotate(-12 128 128)')
    if key == 'note':
        return (group(path(WING), 'translate(5 -19) scale(.93 .83)')
                + group(path(WING), 'translate(5 36) scale(.93 .83)'))
    if key == 'studio':
        return group(path(FEATHER), 'rotate(25 128 128)')
    if key == 'talk':
        h = path(HEAD) + path(BEAK)
        return group(h, 'translate(7 -10) scale(.82)') + group(h, 'translate(249 266) rotate(180) scale(.82)')
    if key == 'stage':
        left = group(path(WING), 'translate(86 130) rotate(65) scale(.85 .95) translate(-128 -128)')
        return group(left + group(left, 'translate(256 0) scale(-1 1)'), 'translate(128 128) scale(.82) translate(-128 -128)')
    raise ValueError(key)

def symbol(key, family='a', mono=False, inverse=False):
    fg, cut = (CREAM, INK) if inverse else (INK, CREAM)
    if family == 'b':
        style = f'fill="none" stroke="{fg}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"'
    else:
        style = f'fill="{fg}"'
    beak = fg if mono else APRICOT
    return f'<g {style}>{shape(key)}</g><style>.cut{{fill:{cut};stroke:none}}.beak{{fill:{beak};stroke:none}}</style>'

def svg(body, width=256, height=256, label=''):
    font_style = '<style>@font-face{font-family:Pretendard;src:url("fonts/PretendardVariable.woff2") format("woff2");font-weight:100 900}</style>' if '<text' in body else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{label}">{font_style}{body}</svg>'

for key in ['parent', *PRODUCTS]:
    for family in ['a', 'b']:
        (A / f'{key}-{family}.svg').write_text(svg(symbol(key, family), label=f'{key} {family} proposal'), encoding='utf8')
    for inverse in [False, True]:
        suffix = 'inverse' if inverse else 'mono'
        (A / f'{key}-{suffix}.svg').write_text(svg(symbol(key, mono=True, inverse=inverse), label=f'{key} {suffix}'), encoding='utf8')
    bg = PRODUCTS[key][1] if key != 'parent' else CREAM
    body = f'<rect width="256" height="256" rx="56" fill="{bg}"/>' + symbol(key)
    (A / f'{key}-tile.svg').write_text(svg(body, label=f'gireogi {key} concept tile'), encoding='utf8')

wordmark = (f'<g transform="translate(0 -8) scale(.52)">{symbol("parent")}</g>'
            f'<text x="138" y="71" fill="{INK}" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-size="62" font-weight="800" letter-spacing="-2">기러기</text>'
            f'<text x="140" y="108" fill="{INK}" font-family="Pretendard, sans-serif" font-size="23" font-weight="650" letter-spacing="1">gireogi</text>')
(A / 'wordmark.svg').write_text(svg(wordmark, 345, 126, '기러기 gireogi editable text wordmark'))

# Tokens use explicit mode and density axes; aliases resolved by verify.mjs.
def token(value, kind='color'): return {'$type': kind, '$value': value}
primitive = {'color': {n: token(v) for n, v in {'ink': INK, 'cream': CREAM, 'apricot': APRICOT,
    'sky': '#B7D0D7', 'sage': '#C1D0B4', 'rose': '#EAB6B4', 'lilac': '#CEC2DE',
    'white': '#FFFFFF', 'night': '#142725', 'nightSurface': '#203936', 'nightRaised': '#2B4541',
    'soft': '#596C68', 'darkSoft': '#B4C6C0', 'line': '#CBD3CE', 'darkLine': '#4F6963',
    'controlLine': '#74817C', 'darkControlLine': '#90AAA0',
    'blue': '#255C99', 'blueLight': '#B4D6FF', 'blueTint': '#E4EEF7', 'blueShade': '#253E52',
    'amber': '#935000', 'amberLight': '#FFD096', 'red': '#A33135', 'redLight': '#FFB4B4',
    'success': '#216143', 'successLight': '#A6DFBA'}.items()},
    'space': {str(v): token(v, 'dimension') for v in [0, 2, 4, 8, 12, 16, 24, 32, 48, 64]},
    'radius': {n: token(v, 'dimension') for n, v in {'control': 8, 'panel': 12, 'card': 16, 'pill': 999}.items()},
    'font': {'ui': token('Pretendard, Apple SD Gothic Neo, Noto Sans KR, system-ui, sans-serif', 'fontFamily'),
             'size': {n: token(v, 'dimension') for n,v in {'caption':12,'label':13,'body':14,'touchBody':16,'title':20,'heading':28,'display':56}.items()},
             'weight': {n: token(v, 'number') for n,v in {'regular':400,'medium':500,'strong':650,'wordmark':800}.items()}},
    'motion': {'quick':token(120,'duration'),'normal':token(180,'duration'),'slow':token(240,'duration'),
               'easing':token('cubic-bezier(0.2, 0, 0, 1)','cubicBezier'),'reduced':token(0,'duration'),
               'brandFlight':token(1800,'duration')},
    'shadow': {'panel':token('0 8px 24px rgb(20 39 37 / 10%)','shadow')}}

light = dict(background='cream',surface='white',raised='white',text='ink',muted='soft',border='line',
             controlBorder='controlLine',action='ink',onAction='cream',focus='blue',selection='blue',
             selectionFill='blueTint',playback='success',input='amber',error='red',success='success')
dark = dict(background='night',surface='nightSurface',raised='nightRaised',text='cream',muted='darkSoft',border='darkLine',
            controlBorder='darkControlLine',action='apricot',onAction='ink',focus='blueLight',selection='blueLight',
            selectionFill='blueShade',playback='successLight',input='amberLight',error='redLight',success='successLight')
semantic = {mode: {k:token('{primitive.color.'+v+'}') for k,v in values.items()} for mode,values in [('light',light),('dark',dark)]}
for mode in semantic:
    semantic[mode]['scorePaper']=token('{primitive.color.white}')
    semantic[mode]['scoreInk']=token('{primitive.color.ink}')
    # The score remains white in both themes, so its state colors are invariant.
    for k,v in [('scoreSelection','blue'),('scoreInput','amber'),('scorePlayback','success'),('scoreError','red')]:
        semantic[mode][k]=token('{primitive.color.'+v+'}')

tokens = {'$description':'Gireogi proposal v1. Units: logical px/dp for dimension, ms for duration. Not installed in product.',
    'primitive':primitive,'semantic':semantic,
    'density':{'comfortable':{'controlHeight':token(48,'dimension'),'rowHeight':token(64,'dimension'),'gap':token(12,'dimension')},
               'compact':{'controlHeight':token(32,'dimension'),'rowHeight':token(36,'dimension'),'gap':token(8,'dimension')}},
    'product':{key:{'accent':token(color),'symbol':token(f'{key}-a.svg','asset')} for key,(_,color,_) in PRODUCTS.items()},
    'component':{'button':{'background':token('{semantic.$mode.action}'),'foreground':token('{semantic.$mode.onAction}'),
                            'height':token('{density.$density.controlHeight}','dimension'),'radius':token('{primitive.radius.control}','dimension')},
                 'input':{'border':token('{semantic.$mode.controlBorder}'),'error':token('{semantic.$mode.error}')},
                 'panel':{'background':token('{semantic.$mode.surface}'),'radius':token('{primitive.radius.panel}','dimension')}}}
(ROOT / 'tokens.json').write_text(json.dumps(tokens, ensure_ascii=False, indent=2)+'\n')

# CSS is generated from tokens, never independently copied into product styles.
def ref(value, mode='light', density='comfortable'):
    while isinstance(value, str) and value.startswith('{'):
        keys=value[1:-1].replace('$mode',mode).replace('$density',density).split('.')
        item=tokens
        for k in keys: item=item[k]
        value=item['$value']
    return value

css=[]
css.append(':root { --g-brand-flight-duration: '+str(tokens['primitive']['motion']['brandFlight']['$value'])+'ms; }\n')
for mode in semantic:
    css.append(f'[data-theme="{mode}"]'+' {\n'+''.join(f'  --g-{k}: {ref(v["$value"],mode)};\n' for k,v in semantic[mode].items())+'}\n')
for density,values in tokens['density'].items():
    css.append(f'[data-density="{density}"]'+' {\n'+''.join(f'  --g-{k}: {v["$value"]}px;\n' for k,v in values.items())+'}\n')
(ROOT / 'preview/tokens.css').write_text('\n'.join(css))

def text(x,y,s,size=16,fill=INK,weight=500):
    return f'<text x="{x}" y="{y}" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-size="{size}" font-weight="{weight}" fill="{fill}">{s}</text>'

def flight_shape(pose='rise'):
    """A long neck and swept wings: an illustration, not a launcher glyph."""
    body = path('M86 167 L65 183 L96 178 C125 176 143 155 161 137 L208 116 C218 113 230 117 236 110 C246 100 239 89 229 89 C219 88 215 96 207 99 L164 114 C137 124 119 151 100 157Z')
    beak = path('M238 98 L252 104 L239 108Z')
    if pose == 'rise':
        top = path('M108 157 C100 130 80 92 59 56 C98 66 133 96 148 128 L137 151Z')
        bottom = path('M131 153 C128 181 109 204 78 220 C89 191 92 170 104 156Z')
    else:
        top = path('M109 154 C80 135 49 127 20 122 C54 102 104 106 145 133 L136 153Z')
        bottom = path('M131 153 C132 175 116 199 91 212 C97 187 94 168 104 156Z')
    return bottom + body + top + beak

FLOCK = [(550, 5, 165, 'rise'), (390, 70, 151, 'glide'), (590, 160, 151, 'glide'),
         (235, 135, 137, 'rise'), (550, 310, 137, 'rise'),
         (75, 210, 123, 'glide'), (500, 455, 123, 'glide')]

def flock(color=INK):
    return ''.join(group(f'<g fill="{color}">{flight_shape(pose)}</g>',
                         f'translate({x} {y}) scale({size/256}) rotate(-12 128 128)')
                   for x,y,size,pose in FLOCK)

for mode,color in [('light',INK),('dark',CREAM)]:
    (A/f'flock-{mode}.svg').write_text(svg(flock(color),900,600,'간격을 두고 같은 방향으로 날아가는 일곱 기러기'))
for pose in ['rise','glide']:
    (A/f'flight-{pose}.svg').write_text(svg(f'<g fill="{INK}">{flight_shape(pose)}</g>',label=f'비행 일러스트 {pose}'))

flock_board=f'<rect width="1440" height="1024" fill="{CREAM}"/>'
flock_board+=text(64,68,'GIREOGI / TOGETHER IN FLIGHT',16,weight=650)
flock_board+=text(64,152,'각자의 날갯짓이,',52,weight=800)+text(64,218,'함께 가는 방향으로.',52,weight=800)
flock_board+=text(66,277,'서로의 시도에 응답하며 함께 나아가는 음악의 공간.',21)
flock_board+=group(flock(), 'translate(510 30) scale(.96)')
flock_board+=text(64,470,'01  간격',17,weight=650)+text(64,502,'붙여 놓기보다, 서로 움직일 자리를 남긴다.',17)
flock_board+=text(64,560,'02  응답',17,weight=650)+text(64,592,'날갯짓은 조금씩 다르고, 흐름은 이어진다.',17)
flock_board+=text(64,650,'03  지속',17,weight=650)+text(64,682,'경로가 굽어도 함께 향하는 느낌을 유지한다.',17)
flock_board+=f'<rect x="0" y="760" width="1440" height="264" fill="{INK}"/>'
flock_board+=text(64,823,'SMALL MARK / LARGE SCENE',14,CREAM,650)
flock_board+=group(symbol('parent',inverse=True), 'translate(58 840) scale(.5)')
flock_board+=text(210,904,'기러기',34,CREAM,800)+text(210,941,'작게는 한 표식, 넓게는 서로 이어지는 무리.',17,CREAM)
flock_board+=group(flock(CREAM), 'translate(930 760) scale(.43)')
(A/'flock-board.svg').write_text(svg(flock_board,1440,1024,'기러기 떼 비행을 중심으로 한 브랜드 그래픽'))

board=f'<rect width="1440" height="1024" fill="{CREAM}"/>'
board+=text(64,68,'GIREOGI / DESIGN SYSTEM PROPOSAL 01',16,weight=650)
board+=text(64,153,'함께, 다음 음악으로.',58,weight=800)
board+=text(66,198,'형태는 함께 쓰고, 각자의 작업은 선명하게.',23)
board+=group(flock(), 'translate(980 0) scale(.43)')
board+=text(64,292,'01   THE FAMILY',14,weight=650)
for i,(key,(name,color,part)) in enumerate(PRODUCTS.items()):
    x=64+i*267
    board+=f'<rect x="{x}" y="320" width="244" height="244" rx="46" fill="{color}"/>'
    board+=f'<g transform="translate({x} 320) scale(.953125)">{symbol(key)}</g>'
    board+=text(x,605,'기러기 '+name,24,weight=650)+text(x,636,part,16,fill='#596C68')
board+=text(64,724,'02   ONE LANGUAGE, DIFFERENT TOOLS',14,weight=650)
for i,(color,label) in enumerate([(INK,'Ink'),(CREAM,'Cream'),(APRICOT,'Apricot'),('#B7D0D7','Sky'),('#C1D0B4','Sage'),('#EAB6B4','Rose'),('#CEC2DE','Lilac')]):
    x=64+i*190
    board+=f'<rect x="{x}" y="754" width="172" height="96" rx="16" fill="{color}" stroke="{INK}" stroke-opacity=".15"/>'
    board+=text(x,880,label,16,weight=650)+text(x,908,color,14)
board+=text(64,980,'WORKING IDENTITY · 제품명·상표 미확정 · 앱에 미적용',14,fill='#596C68')
(A/'family-board.svg').write_text(svg(board,1440,1024,'기러기 제품군 디자인 제안'))

compare=f'<rect width="1440" height="920" fill="{CREAM}"/>'+text(64,75,'같은 기러기에서, 두 가지 문법.',42,weight=800)
for row,family in enumerate(['a','b']):
    y=130+row*345
    compare+=text(64,y,'A  면과 여백 / 추천' if family=='a' else 'B  윤곽과 선 / 비교안',22,weight=650)
    for i,key in enumerate(PRODUCTS):
        x=64+i*267
        compare+=f'<g transform="translate({x} {y+15}) scale(.84)">{symbol(key,family)}</g>'
        compare+=text(x,y+265,PRODUCTS[key][0],18)
compare+=text(64,872,'A는 실루엣 차이가 더 크고, B는 작은 크기에서 내부 선이 좁아진다. 이름 없이 역할을 맞히는 사용자 검증은 별도다.',16)
(A/'icon-comparison.svg').write_text(svg(compare,1440,920,'두 아이콘 계열 비교'))

small=f'<rect width="1200" height="680" fill="{CREAM}"/>'+text(48,60,'SMALL / MONO / REVERSE',28,weight=800)
for j,(key,(name,color,part)) in enumerate(PRODUCTS.items()):
    y=115+j*103
    small+=text(48,y+37,name,18,weight=650)
    for i,size in enumerate([32,48,64]):
        x=200+i*155
        small+=f'<g transform="translate({x} {y}) scale({size/256})">{symbol(key,mono=True)}</g>'
        small+=text(x+size+12,y+23,str(size),13)
    small+=f'<rect x="730" y="{y-6}" width="100" height="82" rx="16" fill="{INK}"/>'
    small+=f'<g transform="translate(748 {y+3}) scale(.25)">{symbol(key,mono=True,inverse=True)}</g>'
    small+=f'<rect x="926" y="{y-6}" width="82" height="82" rx="41" fill="{color}"/>'
    small+=f'<g transform="translate(935 {y+3}) scale(.25)">{symbol(key)}</g>'
(A/'small-icons.svg').write_text(svg(small,1200,680,'작은 크기 단색 역상 원형 마스크'))

derive=f'<rect width="1440" height="860" fill="{CREAM}"/>'+text(64,80,'하나의 형태에서 시작하는 다섯 역할',40,weight=800)
derive+=text(64,122,'원형 → 부분 → 재구성. 형태의 출처는 공유하고, 방향과 반복으로 기능을 구분한다.',20,fill='#596C68')
derive+=f'<g transform="translate(62 195) scale(1.5)">{symbol("parent")}</g>'
derive+=text(70,612,'원형 / 기러기',24,weight=650)
for i,(key,(name,color,part)) in enumerate(PRODUCTS.items()):
    x=490+i*175
    derive+=text(x,220,part,16,weight=650)
    # All five outputs are shown; arrows explain extraction/repetition rather than anatomical exactness.
    derive+=f'<g transform="translate({x-12} 265) scale(.6)">{symbol(key)}</g>'
    derive+=text(x,470,'↓',26)
    derive+=f'<rect x="{x-6}" y="510" width="144" height="144" rx="30" fill="{color}"/>'
    derive+=f'<g transform="translate({x-6} 510) scale(.5625)">{symbol(key)}</g>'
    derive+=text(x,695,name,20,weight=650)
derive+=text(64,792,'날개 윤곽은 Play에 1회, Note에 2회, Stage에 회전·대칭으로 재사용한다. Studio는 깃, Talk는 머리·부리를 확장한다.',16)
(A/'derivation-board.svg').write_text(svg(derive,1440,860,'기러기 원형에서 앱 아이콘으로의 형태 파생'))

typo=f'<rect width="1200" height="860" fill="{CREAM}"/>'+text(64,72,'TYPE / HANGUL + LATIN',18,weight=650)
typo+=text(64,174,'기러기',80,weight=800)+text(350,174,'gireogi',65,weight=650)
typo+=text(64,254,'한글은 먼저 읽히고, 영문은 같은 무게로 이어집니다.',24)
for y,size,weight,label,sample in [(355,56,750,'Display / 56','함께, 다음 음악으로.'),(450,28,750,'Heading / 28','작은 출발 · Small departure'),(530,20,650,'Title / 20','나의 악보함 / My library'),(602,16,400,'Touch body / 16','악보를 펼치고, 오늘의 연습을 이어가세요.'),(670,14,400,'Body / 14','선택한 마디에서 음표 입력을 시작합니다.'),(730,12,500,'Caption / 12','1 / 12쪽   ·   80 BPM   ·   Cmd/Ctrl + S')]:
    typo+=text(64,y,label,13,fill='#596C68')+text(290,y,sample,size,weight=weight)
typo+=text(64,812,'Pretendard v1.3.9 / SIL OFL 1.1 · 음악 기호 글꼴과 UI 글꼴은 분리 · 숫자는 tabular-nums',14)
(A/'typography.svg').write_text(svg(typo,1200,860,'한국어 영문 타이포그래피 표본'))

manifest=[]
for asset in sorted(A.rglob('*')):
    if asset.is_file() and asset.name not in ['manifest.json', 'PROVENANCE.md']:
        payload=asset.read_bytes()
        manifest.append({'path':str(asset.relative_to(ROOT)), 'bytes':len(payload),
                         'sha256':hashlib.sha256(payload).hexdigest()})
(A/'manifest.json').write_text(json.dumps({'scope':'Proposal assets, not production packaging',
                                         'files':manifest},ensure_ascii=False,indent=2)+'\n')
print('Built tokens, CSS and',len(list(A.glob('*.svg'))),'SVG assets')
