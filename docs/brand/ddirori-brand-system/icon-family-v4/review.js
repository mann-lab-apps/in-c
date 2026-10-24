const products=window.ddiroriIconReview.products,$=id=>document.getElementById(id);
function render(){
 const p=$('palette').value,size=Number($('size').value);
 $('hero').innerHTML=products.map(({id,english})=>`<div class="hero-item"><img src="generated/png/a/${p}/${id}-256.png" alt="${english} 최신 후보"><span>${english}</span></div>`).join('');
 $('comparison').className=`stage ${$('mask').value} ${$('background').value} ${$('names').checked?'':'hide-names'} ${$('gray').checked?'gray':''}`;
 $('comparison').innerHTML=[['latest','최신 · 기능 중심','듣기 · 쓰기 · 악보 보기'],['previous','직전 · 음형 중심','이전 후보 보존']].map(([dir,title,desc])=>`<div class="direction"><div class="dir-text"><h3>${title}</h3>${desc}</div>${products.map(({id,name})=>`<div class="app"><span class="frame" style="width:${size}px;height:${size}px"><img src="${dir==='latest'?'generated':'../icon-family-v3/generated'}/png/a/${p}/${id}-${size}.png" alt="${name} ${title}"></span><span class="app-label">${name}</span></div>`).join('')}</div>`).join('');
}
$('sizes').innerHTML=[16,24,32,48,64].map(n=>`<div class="size-col"><div class="size-icons">${products.map(({id,name})=>`<img width="${n}" height="${n}" src="generated/png/a/mono/${id}-${n}.png" alt="${name} ${n}px">`).join('')}</div>${n}px</div>`).join('');
for(const id of ['palette','size','mask','background','names','gray'])$(id).addEventListener('change',render);
render();
