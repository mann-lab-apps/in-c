const data=window.ddiroriIconReview,products=data.products,$=id=>document.getElementById(id);
const split={play:'blue',studio:'violet',score:'teal'},palettes=Object.fromEntries(data.palettes.map(p=>[p.key,p]));
const paletteFor=(p,id)=>p==='split'?split[id]:p;
function render(){
 const p=$('palette').value,size=Number($('size').value),mask=$('mask').value;
 $('hero').innerHTML=products.map(({id,english})=>`<div class="hero-item"><img src="generated/png/a/${paletteFor(p,id)}/${id}-256.png" alt="${english} 최신 추천안"><span>${english}</span></div>`).join('');
 $('comparison').className=`stage ${mask} ${$('background').value} ${$('names').checked?'':'hide-names'} ${$('gray').checked?'gray':''}`;
 $('comparison').innerHTML=[['a','A · 추천','연필 안의 음악'],['b','B · Studio 탐색','연필이 된 음표'],['previous','이전 후보 04','음표·연필 병렬 배치']].map(([dir,title,desc])=>`<div class="direction"><div class="dir-text"><h3>${title}</h3>${desc}</div>${products.map(({id,name})=>{
  const key=paletteFor(p,id),adaptive=mask==='adaptive'&&dir!=='previous';
  const src=adaptive?`generated/adaptive/${dir}/${key}/${id}.svg`:dir==='previous'?`../icon-family-v4/generated/png/a/${key}/${id}-${size}.png`:`generated/png/${dir}/${key}/${id}-${size}.png`;
  const bg=key==='mono'?'#fff':palettes[key].brand.primary;
  return `<div class="app"><span class="frame" style="width:${size}px;height:${size}px;${adaptive?'background:'+bg+';':''}"><img ${mask==='adaptive'&&!adaptive?'style="width:100%;height:100%;left:0;top:0"':''} src="${src}" alt="${name} ${title}"></span><span class="app-label">${name}</span></div>`;
 }).join('')}</div>`).join('');
}
$('sizes').innerHTML=[16,24,32,48,64,128].map(n=>`<div class="size-col"><div class="size-icons">${products.map(({id,name})=>`<img width="${n}" height="${n}" src="generated/png/a/mono/${id}-${n}.png" alt="${name} ${n}px">`).join('')}</div>${n}px</div>`).join('');
const rules={play:'지름 166 유지. 홈 7→14로 확대. 재생 여백의 모서리는 둥글게.',studio:'폭 92의 연필을 35° 기울이고 아래로 4 이동. 내부 음표는 수직 유지.',score:'기존 외곽을 0.96배 보정. 둥근 줄 두 개와 넓힌 음표 여백.'};
$('guides').innerHTML=products.map(({id,english})=>`<div><img src="generated/construction/${id}.svg" alt="${english} 구조와 작업 범위"><h3>${english}</h3><p>${rules[id]}</p></div>`).join('');
$('color-pair').innerHTML=[['blue','공통 블루 · 추천'],['split','앱별 색 · 비교']].map(([key,title])=>`<div><h3>${title}</h3><div class="palette-set">${products.map(({id,name})=>`<img src="generated/png/a/${paletteFor(key,id)}/${id}-128.png" alt="${title} ${name}">`).join('')}</div></div>`).join('');
fetch('evidence/verification.json').then(r=>r.json()).then(r=>{$('metrics').innerHTML=products.map(({id,english})=>{const m=r.pixels.metrics.find(m=>m.glyph===`a-${id}-regular-glyph`);return `<tr><th>${english}</th><td>${m.bounds.join(', ')}</td><td>${(m.inkFraction*100).toFixed(1)}%</td><td>${m.centroid.join(', ')}</td></tr>`;}).join('');}).catch(()=>{$('metrics').innerHTML='<tr><td colspan="4">검사 기록을 생성한 뒤 측정값을 확인할 수 있습니다.</td></tr>';});
for(const id of ['palette','size','mask','background','names','gray'])$(id).addEventListener('change',render);
render();
