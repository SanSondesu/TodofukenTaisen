"use strict";
const $=id=>document.getElementById(id),num=n=>Math.round(n).toLocaleString("ja-JP");
const SAVE_KEY="todofukenTaisenSaveV3";
const state={selected:14,player:null,started:false,status:"setup",turn:1,regions:{},logs:[],specialEnabled:false,busy:false,zoom:1,panX:0,panY:0,alliances:[],allianceProposals:[],allianceExitRequests:[]};
PREFS.forEach((p,i)=>{const [name,region,pop,ag,ind,svc]=p,id=i+1;state.regions[id]={id,name,region,population:pop*10,agriculture:ag,industry:ind,service:svc,economy:Math.round(pop*1.5+ag*.35+ind*.55+svc*.65),troops:Math.round(90+pop*5+ind*2),owner:id,stability:70};});
function neighbors(id,includeSpecial=true){const out=[...(LAND[id]||[])];if(includeSpecial)for(const e of SPECIAL)if(e.enabled){if(e.a===id)out.push(e.b);if(e.b===id)out.push(e.a);}return [...new Set(out)];}
function isAllied(a,b){return a!==b&&state.alliances.some(x=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a));}
function alliedSupport(owner,targetId){return neighbors(targetId).reduce((sum,id)=>{const r=state.regions[id];return r&&isAllied(owner,r.owner)?sum+strength(r)*.18:sum;},0);}
function battleChance(from,target){const atk=strength(from)+alliedSupport(from.owner,target.id),def=strength(target)+alliedSupport(target.owner,target.id);return Math.max(.18,Math.min(.82,.5+(atk-def)/(atk+def)*.85));}
function alliancePower(owner){return Object.values(state.regions).filter(r=>r.owner===owner).reduce((sum,r)=>sum+strength(r),0);}
function sharesThreat(a,b){const threatsA=new Set(Object.values(state.regions).filter(r=>r.owner===a).flatMap(r=>neighbors(r.id).map(id=>state.regions[id]?.owner).filter(o=>o&&o!==a&&!isAllied(a,o))));return Object.values(state.regions).some(r=>r.owner===b&&neighbors(r.id).some(id=>threatsA.has(state.regions[id]?.owner)));}
function submitAllianceProposal(){const target=state.regions[state.selected];if(state.alliances.some(a=>a.a===state.player||a.b===state.player)){log("すでに連合を結んでいます。先に連合を解消してください。");return;}if(!state.started||state.status!=="active"||!target||target.owner===state.player||isAllied(state.player,target.owner)){log("連合を申し込める相手国を選択してください。");return;}if(state.allianceProposals.some(p=>p.from===state.player&&p.to===target.owner)){log("その国には、すでに連合申出書を提出しています。");return;}state.allianceProposals.push({from:state.player,to:target.owner,turn:state.turn});log(state.regions[state.player].name+"国が"+target.name+"国へ連合申出書を提出した。相手国の返答を待つ。");render();}
function respondAllianceProposal(accept){const p=state.allianceProposals.find(x=>x.to===state.player&&x.from!==state.player);if(!p)return;if(accept&&state.alliances.some(a=>a.a===state.player||a.b===state.player)){log("すでに連合を結んでいるため、新たな連合は受諾できません。");return;}state.allianceProposals=state.allianceProposals.filter(x=>x!==p);if(accept){state.alliances.push({a:p.from,b:p.to,formedTurn:state.turn,exitTurn:null});log(state.regions[p.from].name+"国との連合が成立した。相互不可侵と共同戦線を開始する。");}else log(state.regions[p.from].name+"国からの連合申出を拒否した。");render();}
function requestAllianceExit(){const a=state.alliances.find(x=>(x.a===state.player||x.b===state.player)&&!x.exitTurn);if(!a)return;a.exitTurn=state.turn+1;log("連合解消を通告した。猶予期間終了後に連合が解消される。");render();}
function evaluateAllianceProposal(p){const sender=alliancePower(p.from),receiver=alliancePower(p.to),common=sharesThreat(p.from,p.to),border=Object.values(state.regions).some(r=>r.owner===p.to&&neighbors(r.id).some(id=>state.regions[id]?.owner===p.from));let chance=.27+(common ? 0.3 : 0)+(border ? 0.12 : 0)+(sender>receiver*1.15 ? 0.1 : 0)+(sender<receiver*.55 ? -0.12 : 0);return Math.max(.08,Math.min(.88,chance));}
function processAllianceDiplomacy(){for(const p of [...state.allianceProposals]){if(p.to===state.player)continue;if(isAllied(p.from,p.to)||!Object.values(state.regions).some(r=>r.owner===p.to)){state.allianceProposals=state.allianceProposals.filter(x=>x!==p);continue;}const chance=evaluateAllianceProposal(p);state.allianceProposals=state.allianceProposals.filter(x=>x!==p);if(Math.random()<chance){state.alliances.push({a:p.from,b:p.to,formedTurn:state.turn,exitTurn:null});log(state.regions[p.to].name+"国が"+state.regions[p.from].name+"国の連合申出を受諾。連合が成立した。");}else log(state.regions[p.to].name+"国は"+state.regions[p.from].name+"国の連合申出を拒否した。");}
 const active=new Set(state.alliances.flatMap(x=>[x.a,x.b])),playerEnemies=new Set(Object.values(state.regions).filter(r=>r.owner===state.player).flatMap(r=>neighbors(r.id).map(id=>state.regions[id]?.owner).filter(o=>o&&o!==state.player&&!isAllied(state.player,o))));for(const owner of new Set(Object.values(state.regions).map(r=>r.owner))){if(owner===state.player||active.has(owner)||active.has(state.player)||state.allianceProposals.some(p=>p.from===owner||p.to===owner)||!Object.values(state.regions).some(r=>r.owner===owner))continue;const common=Object.values(state.regions).some(r=>r.owner===owner&&neighbors(r.id).some(id=>playerEnemies.has(state.regions[id]?.owner)));if(common&&Math.random()<.045){state.allianceProposals.push({from:owner,to:state.player,turn:state.turn});log(state.regions[owner].name+"国から連合申出書が届いた。受諾するか、拒否するかを選んでください。");break;}}}
function processAllianceExits(){for(const a of state.alliances.filter(x=>x.exitTurn&&x.exitTurn<=state.turn)){state.alliances=state.alliances.filter(x=>x!==a);log(state.regions[a.a].name+"国と"+state.regions[a.b].name+"国の連合が解消された。");}}
function attackPlan(){if(!state.started||state.status!=="active")return null;const target=state.regions[state.selected];if(!target||target.owner===state.player||isAllied(state.player,target.owner))return null;const sources=Object.values(state.regions).filter(r=>r.owner===state.player&&neighbors(r.id).includes(target.id)&&r.troops>1);if(!sources.length)return null;sources.sort((a,b)=>strength(b)-strength(a));const from=sources[0],cost=Math.max(1,Math.ceil(from.troops*.18));return {from,target,cost,chance:battleChance(from,target)};}
function reachableOwned(fromId){const seen=new Set([fromId]),queue=[fromId];while(queue.length){const id=queue.shift();for(const next of neighbors(id)){const r=state.regions[next];if(r&&r.owner===state.player&&!seen.has(next)){seen.add(next);queue.push(next);}}}return [...seen].map(id=>state.regions[id]).filter(Boolean).sort((a,b)=>a.id-b.id);}
function validateWorld(){const ids=Object.keys(state.regions).map(Number).sort((a,b)=>a-b);if(ids.length!==47||ids.some((id,i)=>id!==i+1))throw Error("47 prefectures missing");for(const [id,list] of Object.entries(LAND)){for(const n of list){if(!LAND[n]||!LAND[n].includes(+id))throw Error("land adjacency mismatch "+id+"-"+n);}}for(const e of SPECIAL){if(!state.regions[e.a]||!state.regions[e.b]||e.a===e.b)throw Error("invalid special route");}return true;}
function log(s){state.logs.unshift(s);state.logs=state.logs.slice(0,35);$("log").innerHTML=state.logs.map(x=>"<p>"+x.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))+"</p>").join("");}
function strength(r){return r.troops+Math.sqrt(r.economy)*2+r.industry*.7+r.agriculture*.25;}
function render(){const r=state.regions[state.selected],plan=attackPlan();$("pref-name").textContent=r.name;$("pref-region").textContent=r.region+"地方・"+(r.owner===state.player&&state.started?"自国":state.started?"他国":"勢力選択");for(const k of ["population","economy","agriculture","industry","service","troops"])$(k).textContent=num(r[k]);$("power").textContent=num(strength(r));$("territory-bonus").textContent=state.started?("+"+num(territoryBonus(state.player))):"—";$("turn").textContent="第 "+state.turn+" ターン";$("phase").textContent=state.status==="won"?"天下統一":state.status==="lost"?"滅亡":state.started?"群雄割拠":"天下分け目の時代";$("nation").textContent=state.started?state.regions[state.player].name+"国":"勢力未選択";$("start").disabled=state.started;$("setup").classList.toggle("hidden",state.started);$("game").classList.toggle("hidden",!state.started);$("attack").classList.toggle("hidden",!plan);$("attack").disabled=state.busy||!plan;$("end").disabled=state.busy||state.status!=="active";$("transfer-button").disabled=state.busy||state.status!=="active";populateTransferControls();renderAlliancePanel();$("help").textContent=state.status==="won"?"全国統一を達成しました。おめでとうございます。":state.status==="lost"?"自国は滅亡しました。最初からで新しい戦いを始められます。":state.started?(plan?(plan.from.name+"から"+plan.target.name+"へ進攻します。成功率の目安："+Math.round(plan.chance*100)+"%。派遣："+num(plan.cost)+"兵力。"):"攻撃したい敵の都道府県を地図から選択してください。攻撃可能なら攻撃元・成功率・派遣兵力を表示します。"):"地図からあなたの国を選びましょう。";document.querySelectorAll(".prefecture").forEach(el=>{const id=+(el.dataset.code||el.getAttribute("data-code"));el.classList.toggle("selected",id===state.selected);el.classList.toggle("setup-selected",!state.started&&id===state.selected);el.classList.toggle("player",state.started&&state.regions[id]?.owner===state.player);el.classList.toggle("enemy",state.started&&state.regions[id]?.owner!==state.player);el.classList.toggle("conquered",state.started&&state.regions[id]?.owner!==id);el.classList.toggle("border-with-conquered",state.started&&state.regions[id]?.owner===state.player&&neighbors(id).some(n=>state.regions[n].owner!==state.player));if(state.started&&state.regions[id])el.style.setProperty("--faction-fill",factionColor(state.regions[id].owner));else el.style.removeProperty("--faction-fill");});$("map-status").textContent=state.started?"各国の領土は勢力ごとの色で表示。征服地は同じ色を少し暗く表示。":"地図上の都道府県を選択してください。";}
function renderAlliancePanel(){const panel=$("alliance-panel");if(!panel)return;const target=state.regions[state.selected],active=state.alliances.find(a=>a.a===state.player||a.b===state.player),incoming=state.allianceProposals.find(p=>p.to===state.player&&p.from!==state.player);panel.classList.toggle("hidden",!state.started);if(!state.started)return;$("alliance-status").textContent=active?"連合国："+state.regions[active.a===state.player?active.b:active.a].name+"（"+(active.exitTurn?"解消予定・第"+active.exitTurn+"ターン":"締結中")+"）":"現在、連合国はありません。";$("alliance-propose").disabled=!target||target.owner===state.player||isAllied(state.player,target.owner)||state.allianceProposals.some(p=>p.from===state.player&&p.to===target.owner);$("alliance-propose").textContent=target&&target.owner!==state.player?target.name+"国へ連合を申し込む":"連合申出";$("alliance-incoming").classList.toggle("hidden",!incoming);if(incoming)$("alliance-incoming-text").textContent=state.regions[incoming.from].name+"国から連合申出書が届いています。";$("alliance-accept").disabled=!!active;$("alliance-leave").classList.toggle("hidden",!active||!!active.exitTurn);}
function populateTransferControls(){
 const panel=$("transfer-panel"),fromSelect=$("transfer-from"),toSelect=$("transfer-to");
 if(!state.started||state.status!=="active"){panel.classList.add("hidden");return;}
 const owned=Object.values(state.regions).filter(r=>r.owner===state.player).sort((a,b)=>a.id-b.id);
 panel.classList.toggle("hidden",owned.length<2);if(owned.length<2)return;
 const oldFrom=+fromSelect.value,oldTo=+toSelect.value;
 fromSelect.innerHTML=owned.map(r=>'<option value="'+r.id+'">'+r.name+'（兵力 '+num(r.troops)+'）</option>').join("");
 fromSelect.value=owned.some(r=>r.id===oldFrom)?String(oldFrom):String(owned[0].id);
 const reachable=reachableOwned(+fromSelect.value);
 toSelect.innerHTML=reachable.filter(r=>r.id!==+fromSelect.value).map(r=>'<option value="'+r.id+'">'+r.name+'（兵力 '+num(r.troops)+'）</option>').join("");
 toSelect.disabled=reachable.length<2;
 if(reachable.some(r=>r.id===oldTo&&r.id!==+fromSelect.value))toSelect.value=String(oldTo);
}
async function transferTroops(){
 if(state.busy||!state.started||state.status!=="active")return;
 const from=state.regions[+$("transfer-from").value],to=state.regions[+$("transfer-to").value],amount=Math.floor(Number($("transfer-amount").value));
 if(!from||!to||from.id===to.id||from.owner!==state.player||to.owner!==state.player){log("移送元と移送先には、異なる自国領を指定してください。");return;}
 if(!reachableOwned(from.id).some(r=>r.id===to.id)){log("移送先へは自国領をつないだ陸路・橋・航路がありません。");return;}
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
function select(id){if(state.regions[id]&&!state.busy&&state.status!=="won"&&state.status!=="lost"){state.selected=id;render();}}
$("transfer-from").addEventListener("change",populateTransferControls);
async function animateMarch(fromId,toId,count){
 const a=document.querySelector('.prefecture[data-code="'+fromId+'"]'),b=document.querySelector('.prefecture[data-code="'+toId+'"]');
 if(!a||!b){await new Promise(r=>setTimeout(r,220));return;}
 const x=a.getBoundingClientRect(),y=b.getBoundingClientRect(),sx=x.left+x.width/2,sy=x.top+x.height/2,ex=y.left+y.width/2,ey=y.top+y.height/2;
 const token=document.createElement("div"),label=num(count),diameter=Math.max(29,Math.min(43,19+label.length*6));token.textContent=label;token.setAttribute("aria-label","派遣兵力 "+label);
 Object.assign(token.style,{position:"fixed",left:sx+"px",top:sy+"px",transform:"translate(-50%,-50%)",zIndex:"30",pointerEvents:"none",transition:"transform 620ms cubic-bezier(.2,.75,.25,1),opacity 620ms",width:diameter+"px",height:diameter+"px",borderRadius:"50%",display:"grid",placeItems:"center",font:"bold "+(label.length>4?9:10)+"px sans-serif",whiteSpace:"nowrap",color:"#382f24",background:"radial-gradient(circle at 35% 30%,#fff8df,#d8bd83)",border:"1.5px solid #8c7041",boxShadow:"0 2px 6px #34251644"});
 document.body.append(token);token.getBoundingClientRect();requestAnimationFrame(()=>{token.style.transform="translate(calc(-50% + "+(ex-sx)+"px),calc(-50% + "+(ey-sy)+"px))";});await new Promise(r=>setTimeout(r,660));token.remove();
}
async function loadMap(){
 const url="https://raw.githubusercontent.com/geolonia/japanese-prefectures/master/map-full.svg";let lastError=null;
 for(let attempt=1;attempt<=3;attempt++){try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);let res;
  try{res=await fetch(url,{signal:controller.signal,cache:attempt===1?"default":"reload"});}finally{clearTimeout(timer);}
  if(!res.ok)throw Error("地図取得失敗（HTTP "+res.status+"）");
  const doc=new DOMParser().parseFromString(await res.text(),"image/svg+xml"),svg=doc.querySelector("svg");if(!svg||doc.querySelector("parsererror"))throw Error("SVG形式が不正");
  const nodes=[...svg.querySelectorAll(".prefecture")],ids=nodes.map(el=>+(el.dataset.code||el.getAttribute("data-code")));
  if(nodes.length!==47||new Set(ids).size!==47||ids.some(id=>!state.regions[id]))throw Error("地図の県コードが47県と一致しない");
  svg.removeAttribute("width");svg.removeAttribute("height");svg.setAttribute("preserveAspectRatio","xMidYMid meet");
  const map=$("map"),controls=map.querySelector(".map-controls");map.querySelectorAll("svg").forEach(old=>old.remove());map.insertBefore(document.importNode(svg,true),controls?controls.nextSibling:null);
  setZoom(state.zoom);nodes.forEach(source=>{const id=+(source.dataset.code||source.getAttribute("data-code")),el=map.querySelector('.prefecture[data-code="'+id+'"]');if(!el)return;el.tabIndex=0;el.setAttribute("role","button");el.setAttribute("aria-label",state.regions[id].name);el.addEventListener("click",()=>select(id));el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select(id);}});});
  render();return;
 }catch(e){lastError=e;if(attempt<3)await new Promise(r=>setTimeout(r,500*attempt));}}
 const fallback=document.createElement("div");fallback.className="fallback";fallback.textContent="日本地図を読み込めませんでした。通信環境を確認して、ページを再読み込みしてください。（"+(lastError?.message||"不明なエラー")+"）";const map=$("map"),controls=map.querySelector(".map-controls");map.querySelectorAll("svg,.fallback").forEach(el=>el.remove());map.insertBefore(fallback,controls?controls.nextSibling:null);
}
function begin(){if(state.started)return;state.started=true;state.status="active";state.player=state.selected;state.regions[state.player].owner=state.player;log(state.regions[state.player].name+"を選び、天下統一への歩みを始めた。");render();}
async function attack(){
 if(state.busy)return;const plan=attackPlan();if(!plan){log("選択した県から進攻できる隣接国がありません。自国領または隣接する敵国を選んでください。");return;}
 const {from,target}=plan;if(from.owner!==state.player||target.owner===state.player)return;
 const chance=battleChance(from,target),roll=Math.random(),cost=plan.cost;
 state.busy=true;render();await animateMarch(from.id,target.id,cost);from.troops=Math.max(0,from.troops-cost);
 const outcome=resolveBattle(from,target,roll,cost);if(outcome.won)log(from.name+"から進攻し、"+target.name+"を制圧！ "+target.name+"は"+state.regions[state.player].name+"国に編入された（旧所属："+state.regions[outcome.previousOwner].name+"国）。");else log(from.name+"からの"+target.name+"への進攻は失敗。兵力を消耗した。");
 state.selected=target.id;state.busy=false;render();
}
function resolveBattle(from,target,roll=Math.random(),dispatch=Math.max(1,Math.ceil(from.troops*.18))){
 const chance=battleChance(from,target),previousOwner=target.owner;from.troops=Math.max(0,from.troops-dispatch);
 if(roll<chance){const defendersLost=Math.ceil(target.troops*.55);target.owner=from.owner;target.troops=Math.max(20,Math.floor(target.troops*.35));target.stability=55;return {won:true,chance,previousOwner,defendersLost};}
 from.troops=Math.max(0,from.troops-Math.ceil(dispatch*.65));target.troops=Math.max(0,target.troops-Math.ceil(target.troops*.12));return {won:false,chance,previousOwner};
}
function growth(r){
 const ag=Math.max(0,r.agriculture)/100,ind=Math.max(0,r.industry)/100,svc=Math.max(0,r.service)/100,wealth=Math.max(0,r.economy)/100,stability=Math.max(.25,r.stability/100),population=Math.max(0,r.population);
 const food=Math.max(.15,ag*1.5+svc*.18);
 const populationRate=Math.min(.0045,.00075+food*.0012+ind*.00025+svc*.00035+wealth*.00015);
 const economyRate=Math.min(.009,.0012+ind*.0018+svc*.0018+ag*.0011+Math.min(1,population/10000)*.00035);
 r.population+=Math.max(2,Math.floor(population*populationRate));
 r.economy+=Math.max(2,Math.floor(r.economy*economyRate));
 r.agriculture=Math.min(160,r.agriculture+Math.max(.012,ag*.045+wealth*.008+svc*.002+Math.random()*.01));
 r.industry=Math.min(160,r.industry+Math.max(.012,ind*.042+wealth*.012+svc*.004+Math.random()*.01));
 r.service=Math.min(160,r.service+Math.max(.012,svc*.045+wealth*.008+ind*.003+Math.random()*.01));
 r.troops+=Math.max(3,Math.floor((r.economy*.018+r.industry*.3+r.population*.0025)*stability));
 r.stability=Math.min(100,r.stability+.7+svc*.008);
}
function allianceAid(owner){
 const partners=state.alliances.map(a=>a.a===owner?a.b:a.b===owner?a.a:null).filter(Boolean);
 const regions=Object.values(state.regions).filter(r=>partners.includes(r.owner));
 if(!regions.length)return {troops:0,economy:0};
 const totalTroops=regions.reduce((sum,r)=>sum+r.troops,0),totalEconomy=regions.reduce((sum,r)=>sum+r.economy,0);
 return {troops:Math.min(25,Math.max(3,Math.floor(totalTroops*.006))),economy:Math.min(12,Math.max(1,Math.floor(totalEconomy*.004)))};
}
function applyAllianceAid(owner){
 const aid=allianceAid(owner);if(!aid.troops&&!aid.economy)return;
 const owned=Object.values(state.regions).filter(r=>r.owner===owner);if(!owned.length)return;
 const target=owned.find(r=>r.id===owner)||owned.sort((a,b)=>a.troops-b.troops)[0];
 target.troops+=aid.troops;target.economy+=aid.economy;
 log(state.regions[owner].name+"国は連合国から支援を受けた（兵力 +"+aid.troops+"・経済力 +"+aid.economy+"）。");
}
async function aiTurn(){
 processAllianceDiplomacy();
 const nations=[...new Set(Object.values(state.regions).map(r=>r.owner).filter(owner=>owner!==state.player))];
 for(const owner of nations){
  const owned=Object.values(state.regions).filter(r=>r.owner===owner);if(!owned.length)continue;owned.forEach(growth);applyAllianceAid(owner);const bonus=awardTerritoryBonus(owner);if(bonus)log(state.regions[owner].name+"国に領土ボーナス +"+bonus+"兵力（"+owned.length+"県を支配）。");
  const sources=owned.filter(a=>neighbors(a.id).some(n=>state.regions[n].owner!==owner));if(!sources.length)continue;
  const a=sources.sort((x,y)=>strength(y)-strength(x))[0];
  const borders=neighbors(a.id).map(id=>state.regions[id]).filter(r=>r.owner!==owner&&!isAllied(owner,r.owner));
  if(!borders.length||a.troops<100)continue;
  const target=borders.sort((x,y)=>{const vx=x.economy*.12+x.population*.015+x.industry*.22+x.agriculture*.08+x.service*.06,vy=y.economy*.12+y.population*.015+y.industry*.22+y.agriculture*.08+y.service*.06;return (strength(x)-vx*.025)-(strength(y)-vy*.025);})[0],ratio=strength(a)/(strength(target)+1);
  if(ratio<=1.08||Math.random()>=Math.min(.38,.10+(ratio-1.08)*.16))continue;
  const dispatch=Math.max(1,Math.ceil(a.troops*.16));await animateMarch(a.id,target.id,dispatch);
  const outcome=resolveBattle(a,target,Math.random(),dispatch);
  if(outcome.won)log(state.regions[owner].name+"国が"+target.name+"を制圧。"+target.name+"は"+state.regions[owner].name+"国に編入（旧所属："+state.regions[outcome.previousOwner].name+"国）。");
  else log(state.regions[owner].name+"国の"+target.name+"への進攻は失敗。双方が兵力を消耗。");
 }
}
async function endTurn(){if(state.busy||!state.started||state.status!=="active")return;state.busy=true;render();Object.values(state.regions).filter(r=>r.owner===state.player).forEach(growth);applyAllianceAid(state.player);const bonus=awardTerritoryBonus(state.player);if(bonus)log(state.regions[state.player].name+"国に領土ボーナス +"+bonus+"兵力（"+Object.values(state.regions).filter(r=>r.owner===state.player).length+"県を支配）。");await aiTurn();state.turn++;processAllianceExits();const mine=Object.values(state.regions).filter(r=>r.owner===state.player).length;if(mine===47){state.status="won";log("全国統一を達成！天下統一です。");}else if(mine===0){state.status="lost";log("自国の領土がなくなった。自国は滅亡した。");}else log("第"+state.turn+"ターン。自国領は"+mine+"県。各国の産業・人口・経済に応じて成長とAI判断が行われた。");state.busy=false;render();}
function runSelfTests(){
 const failures=[],check=(ok,label)=>{if(!ok)failures.push(label);};
 check(PREFS.length===47,"県データ47件");check(Object.keys(LAND).length===47,"陸上隣接47県");
 for(let id=1;id<=47;id++){check(Array.isArray(LAND[id]),"陸上隣接配列 "+id);for(const n of LAND[id])check((LAND[n]||[]).includes(id),"隣接相互性 "+id+"-"+n);}
 for(const e of SPECIAL)check(state.regions[e.a]&&state.regions[e.b]&&e.a!==e.b,"特別接続 "+e.a+"-"+e.b);
 const oldPlayer=state.player,owners=Object.fromEntries(Object.entries(state.regions).map(([id,r])=>[id,r.owner]));
 try{
  state.player=1;for(const r of Object.values(state.regions))r.owner=r.id;state.regions[1].owner=1;state.regions[2].owner=1;state.regions[3].owner=1;
  const route=reachableOwned(1).map(r=>r.id);check(route.includes(2)&&route.includes(3),"自国領経由の移送経路");check(!route.includes(4),"敵領を越える移送禁止");
 }catch(e){failures.push("移送経路検査 "+e.message);}
 finally{state.player=oldPlayer;for(const [id,owner] of Object.entries(owners))state.regions[id].owner=owner;}
 const oldAlliances=state.alliances,oldOwner3=state.regions[3].owner;
 try{state.alliances=[{a:1,b:2,formedTurn:1,exitTurn:null}];state.regions[3].owner=2;check(isAllied(1,2)&&!isAllied(1,3),"連合関係判定");check(alliedSupport(1,4)>0,"隣接連合国の戦闘支援");const aid=allianceAid(1);check(aid.troops>=3&&aid.troops<=25&&aid.economy>=1&&aid.economy<=12,"連合国の毎ターン支援量");}
 catch(e){failures.push("連合検査 "+e.message);}
 finally{state.alliances=oldAlliances;state.regions[3].owner=oldOwner3;}
 const attacker={owner:1,troops:100,economy:100,industry:60,agriculture:50,service:50},defender={owner:2,troops:80,economy:80,industry:50,agriculture:50,service:50};
 const win=resolveBattle({...attacker},defender,0,10);check(win.won&&defender.owner===1,"戦闘成功時の領土移転");
 const attacker2={...attacker},defender2={...defender,owner:2};const loss=resolveBattle(attacker2,defender2,1,10);check(!loss.won&&defender2.owner===2,"戦闘失敗時の領土維持");
 try{validateSave({version:3,selected:state.selected,player:state.player,started:state.started,status:state.status,turn:state.turn,regions:state.regions});check(true,"セーブ形式検査");}catch(e){failures.push("有効なセーブ検査 "+e.message);}
 if(failures.length)log("開発者検査で問題："+failures.slice(0,8).join(" / "));else log("内部検査完了：47県・隣接・移送経路・戦闘結果・セーブ形式を確認。");
 return failures;
}
function save(){try{const snapshot={version:3,selected:state.selected,player:state.player,started:state.started,status:state.status,turn:state.turn,regions:state.regions,logs:state.logs,specialEnabled:state.specialEnabled,alliances:state.alliances,allianceProposals:state.allianceProposals};localStorage.setItem(SAVE_KEY,JSON.stringify(snapshot));log("進行状況を保存した。");}catch(e){log("保存できませんでした。端末の空き容量やブラウザ設定を確認してください。");}}
function validateSave(s){if(!s||!s.regions||Object.keys(s.regions).length!==47)throw Error("県データ数が不正");for(let id=1;id<=47;id++){const r=s.regions[id];if(!r||r.id!==id||r.name!==PREFS[id-1][0]||!Number.isInteger(r.owner)||r.owner<1||r.owner>47)throw Error("県データが不正");for(const k of ["population","economy","agriculture","industry","service","troops","stability"])if(!Number.isFinite(r[k])||r[k]<0||r[k]>100000000)throw Error("数値データが不正");}if(!Number.isInteger(s.turn)||s.turn<1||!Number.isInteger(s.selected)||s.selected<1||s.selected>47)throw Error("進行情報が不正");if(s.started&&(!Number.isInteger(s.player)||s.player<1||s.player>47))throw Error("プレイヤー情報が不正");if(!["setup","active","won","lost",undefined].includes(s.status))throw Error("ゲーム状態が不正");for(const a of (s.alliances||[]))if(!Number.isInteger(a.a)||!Number.isInteger(a.b)||a.a<1||a.a>47||a.b<1||a.b>47||a.a===a.b)throw Error("連合データが不正");for(const p of (s.allianceProposals||[]))if(!Number.isInteger(p.from)||!Number.isInteger(p.to)||p.from<1||p.from>47||p.to<1||p.to>47||p.from===p.to)throw Error("連合申出データが不正");}
function load(){try{let raw=localStorage.getItem(SAVE_KEY),s;if(!raw){raw=localStorage.getItem("todofukenTaisenSaveV2");if(!raw)return false;s=JSON.parse(raw);validateSave(s);s.status=s.started?"active":"setup";log("旧バージョンのセーブを引き継ぎました。次回保存時に新形式へ更新します。");}else{s=JSON.parse(raw);if(s.version!==3)throw Error("非対応バージョン");validateSave(s);}Object.assign(state,s,{busy:false,alliances:s.alliances||[],allianceProposals:s.allianceProposals||[]});if(!state.status)state.status=state.started?"active":"setup";return true;}catch(e){log("セーブデータが破損または非対応のため読み込めませんでした。既存データは自動削除していません。");return false;}}
$("alliance-propose").onclick=submitAllianceProposal;$("alliance-accept").onclick=()=>respondAllianceProposal(true);$("alliance-reject").onclick=()=>respondAllianceProposal(false);$("alliance-leave").onclick=requestAllianceExit;
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
let pinch=null,singleTouch=null;
function touchDistance(t){const dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;return Math.hypot(dx,dy);}
mapViewport.addEventListener("touchstart",e=>{if(e.touches.length===1){singleTouch={id:e.touches[0].identifier,x:e.touches[0].clientX,y:e.touches[0].clientY,startX:state.panX,startY:state.panY,moved:false};}else if(e.touches.length===2){singleTouch=null;e.preventDefault();const rect=mapViewport.getBoundingClientRect(),midX=(e.touches[0].clientX+e.touches[1].clientX)/2,midY=(e.touches[0].clientY+e.touches[1].clientY)/2;pinch={distance:touchDistance(e.touches),zoom:state.zoom,panX:state.panX,panY:state.panY,x:midX-rect.left-rect.width/2,y:midY-rect.top-rect.height/2};}},{passive:false});
mapViewport.addEventListener("touchmove",e=>{if(!pinch||e.touches.length!==2)return;e.preventDefault();const rect=mapViewport.getBoundingClientRect(),ratio=touchDistance(e.touches)/Math.max(1,pinch.distance),next=Math.max(1,Math.min(2.8,pinch.zoom*ratio)),scale=next/pinch.zoom;const midX=(e.touches[0].clientX+e.touches[1].clientX)/2,midY=(e.touches[0].clientY+e.touches[1].clientY)/2,x=midX-rect.left-rect.width/2,y=midY-rect.top-rect.height/2;state.zoom=next;state.panX=x-(pinch.x-pinch.panX)*scale;state.panY=y-(pinch.y-pinch.panY)*scale;applyMapTransform();$("zoom-label").textContent=Math.round(state.zoom*100)+"%";},{passive:false});
mapViewport.addEventListener("touchmove",e=>{if(pinch||!singleTouch||state.zoom<=1.001||e.touches.length!==1)return;const t=[...e.touches].find(t=>t.identifier===singleTouch.id);if(!t)return;const dx=t.clientX-singleTouch.x,dy=t.clientY-singleTouch.y;if(Math.abs(dx)+Math.abs(dy)>5)singleTouch.moved=true;if(singleTouch.moved){e.preventDefault();state.panX=singleTouch.startX+dx;state.panY=singleTouch.startY+dy;applyMapTransform();}},{passive:false});
mapViewport.addEventListener("touchend",e=>{if(e.touches.length<2)pinch=null;if(singleTouch&&![...e.changedTouches].some(t=>t.identifier===singleTouch.id))return;if(singleTouch){if(singleTouch.moved){suppressMapClick=true;setTimeout(()=>{suppressMapClick=false;},450);}singleTouch=null;}},{passive:true});mapViewport.addEventListener("touchcancel",()=>{pinch=null;singleTouch=null;},{passive:true});
window.addEventListener("resize",applyMapTransform);$("begin").onclick=()=>$("intro").classList.add("hidden");$("start").onclick=begin;$("attack").onclick=attack;$("end").onclick=endTurn;$("save").onclick=save;$("reset").onclick=()=>{if(confirm("最初からやり直しますか？")){localStorage.removeItem(SAVE_KEY);localStorage.removeItem("todofukenTaisenSaveV2");location.reload();}};
if(load()){log("保存データを読み込んだ。");if(state.started)$("intro").classList.add("hidden");}
try{validateWorld();}catch(e){log("内部データ検証エラー："+e.message);}
runSelfTests();render();loadMap();