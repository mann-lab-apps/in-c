const products=window.ddiroriIconReview.products.map(p=>[p.id,p.name]);
const $=id=>document.getElementById(id);
const icon=(direction,palette,id,size)=>`generated/png/${direction}/${palette}/${id}-${size}.png`;
const palettes=Object.fromEntries(window.ddiroriIconReview.palettes.map(p=>[p.key,[p.name,p.brand.primary]]));
function render(){
 const palette=$('palette').value,size=Number($('size').value),mask=$('mask').value;
 $('comparison').className=`stage ${mask} ${$('background').value} ${$('gray').checked?'gray':''} ${$('names').checked?'':'hide-names'}`;
 $('comparison').innerHTML=[['old','기존','현재 자산'],['a','A · 열린 면','추천 · 큰 면과 열린 틈'],['b','B · 이어지는 선','대안 · 선과 연결']].map(([dir,title,desc])=>`<div class="direction"><div class="dir-text"><h3>${title}</h3>${desc}</div>${products.map(([id,name])=>{
 const adaptive=mask==='adaptive'&&dir==='a'&&id!=='studio'&&palette!=='mono';
 let src=dir==='old'?`../assets/icon-${id}.svg`:icon(dir,palette,id,size);
 if(adaptive)src=`generated/platform/${palette}/${id}/android/adaptive-foreground.svg`;
 return `<div class="app"><span class="frame" style="width:${size}px;height:${size}px;${adaptive?'background:'+palettes[palette][1]+';':''}"><img ${mask==='adaptive'&&!adaptive?'style="width:100%;height:100%;left:0;top:0"':''} src="${src}" alt="${name} ${title}"></span><span class="app-label">${name}</span></div>`;
 }).join('')}</div>`).join('');
 $('hero').innerHTML=products.map(([id,name])=>`<img src="${icon('a',palette,id,128)}" alt="${name} 추천안">`).join('');
 $('sizes').innerHTML=[16,24,32,48,64].map(n=>`<div class="size-col"><div class="size-icons">${products.map(([id,name])=>`<img width="${n}" height="${n}" src="${icon('a','mono',id,n)}" alt="${name} ${n}px">`).join('')}</div>${n}px</div>`).join('');
 $('dock-studio').src=`generated/platform/${palette==='mono'?'violet':palette}/studio/desktop/icon.iconset/icon_128x128.png`;
}
$('palettes').innerHTML=Object.entries(palettes).map(([key,[name,hex]])=>`<div><h3>${name}</h3><code>${hex} / #202020</code><div class="palette-set">${products.map(([id,label])=>`<img src="${icon('a',key,id,64)}" alt="${name} ${label}">`).join('')}</div></div>`).join('');
for(const id of ['palette','size','mask','background','names','gray'])$(id).addEventListener('change',render);
let timer;
$('memory').addEventListener('click',()=>{clearTimeout(timer);$('names').checked=true;render();$('status').textContent='3초 동안 형태를 살펴보세요.';timer=setTimeout(()=>{$('names').checked=false;render();$('status').textContent='이름을 가렸습니다. 듣기·편집·악보 보기의 아이콘을 골라 보세요.';},3000);});
fetch('reference-sources.json').then(r=>r.json()).then(refs=>{$('references').innerHTML=refs.map(r=>`<a href="${r.trackViewUrl}" target="_blank" rel="noreferrer"><img src="references/${r.trackId}.jpg" alt="${r.trackName}">${r.trackName.split(' - ')[0]}</a>`).join('');}).catch(()=>{$('references').textContent='참고 이미지 출처는 references.md에서 확인할 수 있습니다.';});
render();
