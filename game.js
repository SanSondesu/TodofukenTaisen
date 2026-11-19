"use strict";
const PREFS=[
["北海道","北海道",52,72,48,72],["青森県","東北",12,62,25,30],["岩手県","東北",12,78,25,28],["宮城県","東北",22,55,42,48],["秋田県","東北",9,82,22,25],["山形県","東北",10,78,28,30],["福島県","東北",18,72,38,40],
["茨城県","関東",28,68,60,55],["栃木県","関東",19,72,55,48],["群馬県","関東",19,65,58,50],["埼玉県","関東",73,35,70,78],["千葉県","関東",63,62,65,72],["東京都","関東",140,8,68,100],["神奈川県","関東",92,12,88,95],
["新潟県","中部",21,78,42,40],["富山県","中部",10,48,68,45],["石川県","中部",11,42,62,48],["福井県","中部",8,52,55,38],["山梨県","中部",8,60,38,35],["長野県","中部",20,72,50,45],["岐阜県","中部",19,58,62,45],["静岡県","中部",36,42,82,65],["愛知県","中部",75,22,100,92],
["三重県","近畿",17,58,65,48],["滋賀県","近畿",14,48,60,48],["京都府","近畿",25,24,65,82],["大阪府","近畿",88,8,82,100],["兵庫県","近畿",53,35,75,78],["奈良県","近畿",13,52,38,42],["和歌山県","近畿",9,62,35,35],
["鳥取県","中国",5,58,28,28],["島根県","中国",7,65,25,28],["岡山県","中国",19,42,58,52],["広島県","中国",27,28,68,65],["山口県","中国",13,38,55,50],
["徳島県","四国",7,52,38,38],["香川県","四国",9,42,42,45],["愛媛県","四国",13,55,48,45],["高知県","四国",7,72,32,32],
["福岡県","九州",51,28,78,90],["佐賀県","九州",8,52,42,38],["長崎県","九州",13,55,45,45],["熊本県","九州",17,62,52,48],["大分県","九州",11,48,48,42],["宮崎県","九州",10,72,42,38],["鹿児島県","九州",15,68,48,48],["沖縄県","沖縄",14,38,35,58]
];
// 陸上で県境を共有する組だけを登録。海峡・橋・航路は別ルール。
const LAND={
1:[],2:[3,5],3:[2,4,5],4:[3,5,6,7],5:[2,3,4,6],6:[4,5,7,15],7:[4,6,8,9,10,15],
8:[7,9,11,12],9:[7,8,10,11],10:[7,9,11,15,20],11:[8,9,10,12,13,19,20],12:[8,11,13],13:[11,12,14,19],14:[13,19,22],
15:[6,7,10,16,20],16:[15,17,20,21],17:[16,18,21],18:[17,21,25,26],19:[11,13,14,20,22],20:[10,11,15,16,19,21,22,23],21:[16,17,18,20,23,24,25],22:[14,19,20,23],23:[20,21,22,24],
24:[21,23,25,26,29,30],25:[18,21,24,26],26:[18,24,25,27,28,29],27:[26,28,29,30],28:[26,27,31,33],29:[24,26,27,30],30:[24,27,29],
31:[28,32,33,34],32:[31,34,35],33:[28,31,34],34:[31,32,33,35],35:[32,34],
36:[37,39],37:[36,38],38:[37,39],39:[36,38],
40:[41,43,44],41:[40,42],42:[41],43:[40,44,45,46],44:[40,43,45],45:[43,44,46],46:[43,45],47:[]
};
// 海峡・橋梁・航路による接続。陸上で県境を共有する関係とは別管理。
const SPECIAL=[
{a:1,b:2,label:"津軽海峡航路",enabled:false},
{a:12,b:14,label:"東京湾を横断する航路",enabled:false},
{a:28,b:36,label:"明石海峡・大鳴門橋",enabled:false},
{a:28,b:37,label:"瀬戸内海航路",enabled:false},
{a:30,b:36,label:"紀伊水道航路",enabled:false},
{a:33,b:37,label:"瀬戸大橋",enabled:false},
{a:34,b:38,label:"しまなみ海道",enabled:false},
{a:35,b:38,label:"瀬戸内海航路",enabled:false},
{a:35,b:40,label:"関門海峡（橋・トンネル）",enabled:false},
{a:35,b:44,label:"周防灘航路",enabled:false},
{a:38,b:44,label:"豊予海峡航路",enabled:false},
{a:40,b:42,label:"有明海方面の海上接続",enabled:false},
{a:42,b:43,label:"有明海航路",enabled:false},
{a:46,b:47,label:"鹿児島・沖縄間の海上航路",enabled:false}
];
const $=id=>document.getElementById(id),num=n=>Math.round(n).toLocaleString("ja-JP");
const state={selected:14,player:null,started:false,turn:1,regions:{},logs:[],specialEnabled:false,busy:false,zoom:1,panX:0,panY:0};
PREFS.forEach((p,i)=>{const [name,region,pop,ag,ind,svc]=p,id=i+1;state.regions[id]={id,name,region,population:pop*10,agriculture:ag,industry:ind,service:svc,economy:Math.round(pop*1.5+ag*.35+ind*.55+svc*.65),troops:Math.round(90+pop*5+ind*2),owner:id,stability:70};});
function neighbors(id,includeSpecial=false){const out=[...(LAND[id]||[])];if(includeSpecial&&state.specialEnabled)for(const e of SPECIAL)if(e.enabled){if(e.a===id)out.push(e.b);if(e.b===id)out.push(e.a);}return [...new Set(out)];}
function log(s){state.logs.unshift(s);state.logs=state.logs.slice(0,35);$("log").innerHTML=state.logs.map(x=>"<p>"+x.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))+"</p>").join("");}
function strength(r){return r.troops+Math.sqrt(r.economy)*2+r.industry*.7+r.agriculture*.25;}
function render(){const r=state.regions[state.selected];$("pref-name").textContent=r.name;$("pref-region").textContent=r.region+"地方・"+(r.owner===state.player&&state.started?"自国":state.started?"他国":"勢力選択");for(const k of ["population","economy","agriculture","industry","service","troops"])$(k).textContent=num(r[k]);$("power").textContent=num(strength(r));$("territory-bonus").textContent=state.started?("+"+num(territoryBonus(state.player))):"—";$("turn").textContent="第 "+state.turn+" ターン";$("phase").textContent=state.started?"群雄割拠":"天下分け目の時代";$("nation").textContent=state.started?state.regions[state.player].name+"国":"勢力未選択";$("start").disabled=state.started;$("setup").classList.toggle("hidden",state.started);$("game").classList.toggle("hidden",!state.started);$("attack").disabled=state.busy||!state.started||r.owner!==state.player||!neighbors(r.id).some(n=>state.regions[n].owner!==state.player);$("end").disabled=state.busy;populateTransferControls();$("help").textContent=state.started?(r.owner===state.player?"自国です。陸上で県境を接する他国に進攻できます。":"他国の情報です。自国に隣接している場合のみ進攻できます。"):"地図からあなたの国を選びましょう。";document.querySelectorAll(".prefecture").forEach(el=>{const id=+(el.dataset.code||el.getAttribute("data-code"));el.classList.toggle("selected",id===state.selected&&!state.started);el.classList.toggle("player",state.started&&state.regions[id]?.owner===state.player);el.classList.toggle("enemy",state.started&&state.regions[id]?.owner!==state.player);el.classList.toggle("conquered",state.started&&state.regions[id]?.owner!==id);el.classList.toggle("border-with-conquered",state.started&&state.regions[id]?.owner===state.player&&neighbors(id).some(n=>state.regions[n].owner!==state.player));if(state.started&&state.regions[id])el.style.setProperty("--faction-fill",factionColor(state.regions[id].owner));else el.style.removeProperty("--faction-fill");});$("map-status").textContent=state.started?"自国領は緑、選択中の県は赤茶色で表示。":"地図上の都道府県を選択してください。";}
function populateTransferControls(){
 const panel=$("transfer-panel"),fromSelect=$("transfer-from"),toSelect=$("transfer-to");
 if(!state.started){panel.classList.add("hidden");return;}
 const owned=Object.values(state.regions).filter(r=>r.owner===state.player).sort((a,b)=>a.id-b.id);
 panel.classList.toggle("hidden",owned.length<2);
 if(owned.length<2)return;
 const oldFrom=+fromSelect.value,oldTo=+toSelect.value;
 const options=owned.map(r=>`<option value="${r.id}">${r.name}（兵力 ${num(r.troops)}）</option>`).join("");
 fromSelect.innerHTML=options;toSelect.innerHTML=options;
 fromSelect.value=owned.some(r=>r.id===oldFrom)?String(oldFrom):String(owned[0].id);
 toSelect.value=owned.some(r=>r.id===oldTo)&&oldTo!==+fromSelect.value?String(oldTo):String((owned.find(r=>r.id!==+fromSelect.value)||owned[1]).id);
}
async function transferTroops(){
 if(state.busy||!state.started)return;
 const from=state.regions[+$("transfer-from").value],to=state.regions[+$("transfer-to").value],amount=Math.floor(Number($("transfer-amount").value));
 if(!from||!to||from.id===to.id||from.owner!==state.player||to.owner!==state.player){log("移送元と移送先には、異なる自国領を指定してください。");return;}
 if(!Number.isFinite(amount)||amount<1||amount>from.troops-1){log("移送兵力は1以上、送り元に1兵力を残せる範囲で指定してください。");return;}
 state.busy=true;render();await animateMarch(from.id,to.id,amount);from.troops-=amount;to.troops+=amount;state.selected=to.id;log(from.name+"から"+to.name+"へ"+num(amount)+"兵力を移送した。");state.busy=false;render();
}
function applyMapTransform(){
 const map=$("map"),maxX=Math.max(0,(map.clientWidth*(state.zoom-1))/2),maxY=Math.max(0,(map.clientHeight*(state.zoom-1))/2);
 state.panX=Math.max(-maxX,Math.min(maxX,state.panX));state.panY=Math.max(-maxY,Math.min(maxY,state.panY));
 map.style.setProperty("--map-zoom",state.zoom);map.style.setProperty("--map-pan-x",state.panX+"px");map.style.setProperty("--map-pan-y",state.panY+"px");
 map.classList.toggle("is-zoomed",state.zoom>1.001);
}
function setZoom(value){
 const old=state.zoom;state.zoom=Math.max(1,Math.min(2.8,Math.round(value*10)/10));
 if(state.zoom===1){state.panX=0;state.panY=0;}
 else if(state.zoom>old){state.panX*=state.zoom/old;state.panY*=state.zoom/old;}
 applyMapTransform();$("zoom-label").textContent=Math.round(state.zoom*100)+"%";
}
function territoryBonus(owner){const count=Object.values(state.regions).filter(r=>r.owner===owner).length;return Math.floor(count/5)*10;}
function awardTerritoryBonus(owner){
 const bonus=territoryBonus(owner);if(!bonus)return 0;
 const owned=Object.values(state.regions).filter(r=>r.owner===owner).sort((a,b)=>a.id-b.id);
 const each=Math.floor(bonus/owned.length),extra=bonus%owned.length;
 owned.forEach((r,i)=>{r.troops+=each+(i<extra?1:0);});
 return bonus;
}
function factionColor(owner){const hue=((owner*137.508)%360+360)%360;return "hsl("+hue+" 27% 76%)";}
function select(id){if(state.regions[id]&&!state.busy){state.selected=id;render();}}
async function animateMarch(fromId,toId,count){
 const a=document.querySelector('.prefecture[data-code="'+fromId+'"]'),b=document.querySelector('.prefecture[data-code="'+toId+'"]');
 if(!a||!b){await new Promise(r=>setTimeout(r,220));return;}
 const x=a.getBoundingClientRect(),y=b.getBoundingClientRect(),sx=x.left+x.width/2,sy=x.top+x.height/2,ex=y.left+y.width/2,ey=y.top+y.height/2;
 const token=document.createElement("div"),label=num(count),diameter=Math.max(29,Math.min(43,19+label.length*6));token.textContent=label;token.setAttribute("aria-label","派遣兵力 "+label);
 Object.assign(token.style,{position:"fixed",left:sx+"px",top:sy+"px",transform:"translate(-50%,-50%)",zIndex:"30",pointerEvents:"none",transition:"transform 620ms cubic-bezier(.2,.75,.25,1),opacity 620ms",width:diameter+"px",height:diameter+"px",borderRadius:"50%",display:"grid",placeItems:"center",font:"bold "+(label.length>4?9:10)+"px sans-serif",whiteSpace:"nowrap",color:"#382f24",background:"radial-gradient(circle at 35% 30%,#fff8df,#d8bd83)",border:"1.5px solid #8c7041",boxShadow:"0 2px 6px #34251644"});
 document.body.append(token);token.getBoundingClientRect();requestAnimationFrame(()=>{token.style.transform="translate(calc(-50% + "+(ex-sx)+"px),calc(-50% + "+(ey-sy)+"px))";});await new Promise(r=>setTimeout(r,660));token.remove();
}
async function loadMap(){try{const res=await fetch("https://raw.githubusercontent.com/geolonia/japanese-prefectures/master/map-full.svg");if(!res.ok)throw Error("map fetch failed");const doc=new DOMParser().parseFromString(await res.text(),"image/svg+xml"),svg=doc.querySelector("svg");if(!svg||doc.querySelector("parsererror"))throw Error("invalid svg");svg.removeAttribute("width");svg.removeAttribute("height");svg.setAttribute("preserveAspectRatio","xMidYMid meet");
 const map=$("map"),controls=map.querySelector(".map-controls");map.querySelectorAll("svg").forEach(old=>old.remove());map.insertBefore(document.importNode(svg,true),controls?controls.nextSibling:null);setZoom(state.zoom);const nodes=map.querySelectorAll(".prefecture");nodes.forEach(el=>{const id=+(el.dataset.code||el.getAttribute("data-code"));if(!state.regions[id])return;el.tabIndex=0;el.setAttribute("role","button");el.setAttribute("aria-label",state.regions[id].name);el.addEventListener("click",()=>select(id));el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select(id);}});});if(nodes.length!==47)log("注意：地図SVGから認識できた県グループは"+nodes.length+"件です（期待値47）。地図コードの再検証が必要です。");render();}catch(e){$("map").innerHTML='<div class="fallback">地図を読み込めませんでした。通信環境を確認して再読み込みしてください。</div>';}}
function begin(){state.started=true;state.player=state.selected;state.regions[state.player].owner=state.player;log(state.regions[state.player].name+"を選び、天下統一への歩みを始めた。");render();}
async function attack(){
 if(state.busy)return;const from=state.regions[state.player],targets=neighbors(from.id).map(id=>state.regions[id]).filter(r=>r.owner!==state.player);
 if(!targets.length){log("陸上で接する進攻可能な国はありません。");return;}
 const target=targets.find(r=>r.id===state.selected)||targets.sort((a,b)=>strength(a)-strength(b))[0];if(target.owner===state.player)return;
 const atk=strength(from),def=strength(target),chance=Math.max(.18,Math.min(.82,.5+(atk-def)/(atk+def)*.85)),roll=Math.random(),cost=Math.max(1,Math.ceil(from.troops*.18));
 state.busy=true;render();await animateMarch(from.id,target.id,cost);from.troops=Math.max(0,from.troops-cost);
 if(roll<chance){const old=target.name,loss=Math.ceil(target.troops*.55),previous=target.owner;target.owner=state.player;target.troops=Math.max(20,Math.floor(target.troops*.35));target.stability=55;log(old+"を制圧！ "+old+"は"+state.regions[state.player].name+"国に編入された（旧所属："+state.regions[previous].name+"国／損耗 "+loss+"）。");}
 else{from.troops=Math.max(0,from.troops-Math.ceil(cost*.65));target.troops=Math.max(0,target.troops-Math.ceil(target.troops*.12));log(state.regions[state.player].name+"国の"+target.name+"への進攻は失敗。兵力を消耗した。");}
 state.selected=target.id;state.busy=false;render();
}
function growth(r){const ag=r.agriculture/100,ind=r.industry/100,svc=r.service/100,wealth=r.economy/100;const food=Math.max(.1,ag*1.3+svc*.2);r.population+=Math.max(1,r.population*(.00035+food*.00035));r.economy+=Math.max(1,r.economy*(.001+ind*.0012+svc*.0015+ag*.0004));r.agriculture+=Math.max(0,ag*.025+Math.random()*.012);r.industry+=Math.max(0,ind*.02+wealth*.002+Math.random()*.012);r.service+=Math.max(0,svc*.022+wealth*.002+Math.random()*.012);r.troops+=Math.max(1,Math.floor((r.economy*.012+r.industry*.12+r.population*.001)/Math.max(1,1+(100-r.stability)/50)));r.stability=Math.min(100,r.stability+.6);}
async function aiTurn(){
 const nations=[...new Set(Object.values(state.regions).map(r=>r.owner).filter(owner=>owner!==state.player))];
 for(const owner of nations){
  const owned=Object.values(state.regions).filter(r=>r.owner===owner);if(!owned.length)continue;owned.forEach(growth);const bonus=awardTerritoryBonus(owner);if(bonus)log(state.regions[owner].name+"国に領土ボーナス +"+bonus+"兵力（"+owned.length+"県を支配）。");
  const sources=owned.filter(a=>neighbors(a.id).some(n=>state.regions[n].owner!==owner));if(!sources.length)continue;
  const a=sources.sort((x,y)=>strength(y)-strength(x))[0];
  const borders=neighbors(a.id).map(id=>state.regions[id]).filter(r=>r.owner!==owner);
  if(!borders.length||a.troops<100)continue;
  const target=borders.sort((x,y)=>strength(x)-strength(y))[0],ratio=strength(a)/(strength(target)+1);
  if(ratio<=1.12||Math.random()>=Math.min(.42,.12+(ratio-1.2)*.18))continue;
  const p=Math.max(.12,Math.min(.78,.5+(strength(a)-strength(target))/(strength(a)+strength(target))*.8)),won=Math.random()<p,dispatch=Math.max(1,Math.ceil(a.troops*.16));
  await animateMarch(a.id,target.id,dispatch);a.troops=Math.max(0,a.troops-dispatch);
  if(won){const oldOwner=target.owner,oldName=target.name,loss=Math.ceil(target.troops*.55);target.owner=owner;target.troops=Math.max(15,Math.floor(target.troops*.3));target.stability=50;log(state.regions[owner].name+"国が"+oldName+"を制圧。"+oldName+"は"+state.regions[owner].name+"国に編入（旧所属："+state.regions[oldOwner].name+"国／損耗 "+loss+"）。");}
  else{target.troops=Math.max(0,target.troops-Math.ceil(target.troops*.12));log(state.regions[owner].name+"国の"+target.name+"への進攻は失敗。双方が兵力を消耗。");}
 }
}
async function endTurn(){if(state.busy)return;state.busy=true;render();Object.values(state.regions).filter(r=>r.owner===state.player).forEach(growth);const bonus=awardTerritoryBonus(state.player);if(bonus)log(state.regions[state.player].name+"国に領土ボーナス +"+bonus+"兵力（"+Object.values(state.regions).filter(r=>r.owner===state.player).length+"県を支配）。");await aiTurn();state.turn++;const mine=Object.values(state.regions).filter(r=>r.owner===state.player).length;log("第"+state.turn+"ターン。自国領は"+mine+"県。各国の産業・人口・経済に応じて成長とAI判断が行われた。");if(mine===47)log("全国統一を達成！");if(mine===0)log("自国の領土がなくなった。自国は滅亡した。");state.busy=false;render();}
function save(){localStorage.setItem("todofukenTaisenSaveV2",JSON.stringify(state));log("進行状況を保存した。");}
function load(){try{const raw=localStorage.getItem("todofukenTaisenSaveV2");if(!raw)return false;const s=JSON.parse(raw);if(!s.regions||Object.keys(s.regions).length!==47)throw Error("invalid save");Object.assign(state,s);return true;}catch(e){log("セーブデータを読み込めませんでした。");return false;}}
$("zoom-reset").onclick=()=>{state.panX=0;state.panY=0;setZoom(1);};$("transfer-button").onclick=transferTroops;
const mapViewport=$("map");let drag=null,suppressMapClick=false;
mapViewport.addEventListener("pointerdown",e=>{
 if(e.pointerType==="touch"||state.zoom<=1.001||e.target.closest(".map-controls"))return;
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:state.panX,startY:state.panY,moved:false};
 mapViewport.setPointerCapture(e.pointerId);mapViewport.classList.add("is-dragging");
});
mapViewport.addEventListener("pointermove",e=>{
 if(!drag||drag.id!==e.pointerId)return;
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;
 if(drag.moved){state.panX=drag.startX+dx;state.panY=drag.startY+dy;applyMapTransform();}
});
function finishMapDrag(e){
 if(!drag||drag.id!==e.pointerId)return;
 suppressMapClick=drag.moved;drag=null;mapViewport.classList.remove("is-dragging");
 if(suppressMapClick)setTimeout(()=>{suppressMapClick=false;},0);
}
mapViewport.addEventListener("pointerup",finishMapDrag);mapViewport.addEventListener("pointercancel",finishMapDrag);
mapViewport.addEventListener("click",e=>{if(suppressMapClick){e.stopPropagation();e.preventDefault();suppressMapClick=false;}},true);
let pinch=null;
function touchDistance(t){const dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;return Math.hypot(dx,dy);}
mapViewport.addEventListener("touchstart",e=>{if(e.touches.length===2){e.preventDefault();const rect=mapViewport.getBoundingClientRect(),midX=(e.touches[0].clientX+e.touches[1].clientX)/2,midY=(e.touches[0].clientY+e.touches[1].clientY)/2;pinch={distance:touchDistance(e.touches),zoom:state.zoom,panX:state.panX,panY:state.panY,x:midX-rect.left-rect.width/2,y:midY-rect.top-rect.height/2};}},{passive:false});
mapViewport.addEventListener("touchmove",e=>{if(!pinch||e.touches.length!==2)return;e.preventDefault();const rect=mapViewport.getBoundingClientRect(),ratio=touchDistance(e.touches)/Math.max(1,pinch.distance),next=Math.max(1,Math.min(2.8,pinch.zoom*ratio)),scale=next/pinch.zoom;const midX=(e.touches[0].clientX+e.touches[1].clientX)/2,midY=(e.touches[0].clientY+e.touches[1].clientY)/2,x=midX-rect.left-rect.width/2,y=midY-rect.top-rect.height/2;state.zoom=next;state.panX=x-(pinch.x-pinch.panX)*scale;state.panY=y-(pinch.y-pinch.panY)*scale;applyMapTransform();$("zoom-label").textContent=Math.round(state.zoom*100)+"%";},{passive:false});
mapViewport.addEventListener("touchend",e=>{if(e.touches.length<2)pinch=null;},{passive:true});mapViewport.addEventListener("touchcancel",()=>{pinch=null;},{passive:true});
window.addEventListener("resize",applyMapTransform);$("begin").onclick=()=>$("intro").classList.add("hidden");$("start").onclick=begin;$("attack").onclick=attack;$("end").onclick=endTurn;$("save").onclick=save;$("reset").onclick=()=>{if(confirm("最初からやり直しますか？")){localStorage.removeItem("todofukenTaisenSaveV2");location.reload();}};
if(load()){log("保存データを読み込んだ。");if(state.started)$("intro").classList.add("hidden");}
render();loadMap();