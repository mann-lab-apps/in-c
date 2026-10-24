const data=window.ddiroriIconReview,products=data.products;
const $=id=>document.getElementById(id);
const palettes=Object.fromEntries(data.palettes.map(p=>[p.key,p]));
const split={play:'blue',studio:'violet',score:'teal'};
const color=(key,id)=>key==='split'?split[id]:key;
const icon=(dir,p,id,n)=>`generated/png/${dir}/${p}/${id}-${n}.png`;
function render(){
 const selected=$('palette').value,n=Number($('size').value),mask=$('mask').value;
 $('comparison').className=`stage ${mask} ${$('background').value} ${$('gray').checked?'gray':''} ${$('names').checked?'':'hide-names'} ${$('safe').checked?'safe':''}`;
 $('comparison').innerHTML=[['a','A · 마지막 음','추천 · 머리를 기능으로'],['b','B · 이어지는 기둥','대안 · 원형 머리 유지'],['v2','직전 후보','기능 도형 중심'],['old','기존 운영 자산','설치 변경 없음']].map(([dir,title,desc])=>`<div class="direction"><div class="dir-text"><h3>${title}</h3>${desc}</div>${products.map(({id,name})=>{
  const p=color(selected,id),adaptive=mask==='adaptive'&&['a','b'].includes(dir);
  let src=dir==='old'?`../assets/icon-${id}.svg`:dir==='v2'?`../icon-family-v2/generated/png/a/${p}/${id}-${n}.png`:icon(dir,p,id,n);
  if(adaptive)src=`generated/adaptive/${dir}/${p}/${id}.svg`;
  const bg=p==='mono'?'#FFFFFF':palettes[p].brand.primary;
  return `<div class="app"><span class="frame" style="width:${n}px;height:${n}px;${adaptive?'background:'+bg+';':''}"><img ${mask==='adaptive'&&!adaptive?'style="width:100%;height:100%;left:0;top:0"':''} src="${src}" alt="${name} ${title}"></span><span class="app-label">${name}</span></div>`;
 }).join('')}</div>`).join('');
 $('hero').innerHTML=products.map(({id,english})=>`<div class="hero-item"><img src="${icon('a',color(selected==='mono'?'blue':selected,id),id,128)}" alt="${english} 최신 추천안"><span>${english}</span></div>`).join('');
 $('dock-studio').src=`generated/platform/${color(selected==='mono'?'blue':selected,'studio')}/studio/desktop/icon.iconset/icon_128x128.png`;
}
$('sizes').innerHTML=[16,24,32,48,64,128].map(n=>`<div class="size-col"><div class="size-icons">${products.map(({id,name})=>`<img width="${n}" height="${n}" src="${icon('a','mono',id,n)}" alt="${name} ${n}px">`).join('')}</div>${n}px</div>`).join('');
const descriptions={play:'세 번째 음표 머리가 오른쪽을 향한 재생 버튼입니다. 별도 삼각형을 붙이지 않았습니다.',studio:'세 번째 머리는 펜촉, 그 기둥은 펜의 자루를 함께 표현합니다. 나머지 두 머리와 빔은 유지합니다.',score:'세 번째 머리를 접힌 악보 페이지로 바꿉니다. 주변의 음형이 음악 문서라는 맥락을 제공합니다.'};
$('construction').innerHTML=products.map(({id,english})=>`<div><img src="generated/masters/a/${id}-regular.svg" alt="${english} 결합 구조"><h3>${english}</h3><p>${descriptions[id]}</p></div>`).join('');
$('palettes').innerHTML=data.palettes.map(p=>`<div><h3>${p.name}</h3><code>${p.brand.primary} / ${p.brand.onPrimary}</code><div class="palette-set">${products.map(({id,name})=>`<img src="${icon('a',p.key,id,64)}" alt="${p.name} ${name}">`).join('')}</div></div>`).join('');
$('split-palette').innerHTML=products.map(({id,name})=>`<div class="palette-set"><img src="${icon('a',split[id],id,64)}" alt="${name} 앱별 색"></div>`).join('');
for(const id of ['palette','size','mask','background','names','gray','safe'])$(id).addEventListener('change',render);
let timer;
$('memory').addEventListener('click',()=>{clearTimeout(timer);$('names').checked=true;render();$('status').textContent='3초 동안 형태를 살펴보세요.';timer=setTimeout(()=>{$('names').checked=false;render();$('status').textContent='이름을 가렸습니다. 듣기·편집·악보 보기의 아이콘을 골라 보세요.';},3000);});
fetch('../icon-family-v2/reference-sources.json').then(r=>r.json()).then(refs=>{$('references').innerHTML=refs.map(r=>`<a href="${r.trackViewUrl}" target="_blank" rel="noreferrer"><img src="../icon-family-v2/references/${r.trackId}.jpg" alt="${r.trackName}">${r.trackName.split(' - ')[0]}</a>`).join('');}).catch(()=>{$('references').textContent='공식 출처는 references.md에서 확인할 수 있습니다.';});
render();
