"use strict";
const $=id=>document.getElementById(id),num=n=>Math.round(n).toLocaleString("ja-JP");
const SAVE_KEY="todofukenTaisenSaveV4";
const LEGACY_SAVE_KEYS=["todofukenTaisenSaveV3","todofukenTaisenSaveV2"];
const SEASONS=["春","夏","秋","冬"];
const state={selected:14,player:null,started:false,status:"setup",turn:1,year:1,seasonIndex:0,yearStartPower:{},annualCaptures:{},yearlyHistory:[],regions:{},logs:[],specialEnabled:false,busy:false,zoom:1,panX:0,panY:0,alliances:[],allianceProposals:[],allianceExitRequests:[],stats:{wins:0,losses:0,captures:0}};
PREFS.forEach((p,i)=>{const [name,region,pop,ag,ind,svc]=p,id=i+1;state.regions[id]={id,name,region,population:pop*10,agriculture:ag,industry:ind,service:svc,economy:Math.round(pop*1.5+ag*.35+ind*.55+svc*.65),troops:Math.round(90+pop*5+ind*2),owner:id,stability:70};});
function neighbors(id,includeSpecial=true){const out=[...(LAND[id]||[])];if(includeSpecial)for(const e of SPECIAL)if(e.enabled){if(e.a===id)out.push(e.b);if(e.b===id)out.push(e.a);}return [...new Set(out)];}
function isAllied(a,b){return a!==b&&state.alliances.some(x=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a));}
function alliedSupport(owner,targetId){return neighbors(targetId).reduce((sum,id)=>{const r=state.regions[id];return r&&isAllied(owner,r.owner)?sum+strength(r)*.18:sum;},0);}
const SNOW_REGIONS=new Set([1,2,3,4,5,6,7,15,16,17,18,20,21]);
const MOUNTAIN_REGIONS=new Set([9,10,19,20,21,25,26,29,30,31,32,36,38,39,43,44,45]);
const STORM_REGIONS=new Set([22,24,30,35,36,37,38,39,40,42,43,44,45,46,47]);
const ISLAND_REGIONS=new Set([1,12,14,23,24,28,30,35,36,37,38,40,41,42,46,47]);
function seasonName(){return SEASONS[state.seasonIndex]||"春";}
function seasonalEffect(r){
 const id=r.id,season=state.seasonIndex;
 const effect={attack:0,defense:0,reason:""};
 if(season===3&&SNOW_REGIONS.has(id)){effect.attack-=.12;effect.defense+=.16;effect.reason="積雪・寒冷";}
 if(season===3&&MOUNTAIN_REGIONS.has(id)){effect.attack-=.05;effect.defense+=.07;effect.reason=effect.reason||"山間部の積雪";}
 if((season===1||season===2)&&STORM_REGIONS.has(id)){effect.attack-=.07;effect.defense+=.025;effect.reason=effect.reason||"台風・荒天期";}
 if(season===0&&MOUNTAIN_REGIONS.has(id)){effect.defense+=.025;effect.reason=effect.reason||"雪解け期の山岳地形";}
 return effect;
}
function regionalTraits(r){
 const id=r.id;
 const mountain=MOUNTAIN_REGIONS.has(id),island=ISLAND_REGIONS.has(id);
 const industrial=Math.min(12,Math.round((r.industry||0)*.09));
 const attack=Math.max(40,Math.min(85,50+industrial+(id===13||id===14||id===23||id===27||id===40?5:0)));
 const defense=Math.max(40,Math.min(88,50+(mountain?17:0)+(island?7:0)+(SNOW_REGIONS.has(id)?4:0)));
 return {attack,defense};
}
function battleFactors(r){
 const trait=regionalTraits(r),season=seasonalEffect(r);
 return {attack:1+(trait.attack-50)/300+season.attack,defense:1+(trait.defense-50)/300+season.defense,trait,season};
}
function battleChance(from,target){
 const af=battleFactors(from),df=battleFactors(target);
 const atk=strength(from)*af.attack+alliedSupport(from.owner,target.id);
 const def=strength(target)*df.defense+alliedSupport(target.owner,target.id);
 return Math.max(.12,Math.min(.88,.5+(atk-def)/(atk+def)*.85));
}
function battleFailureLog(from,target){
 const a=seasonalEffect(from),d=seasonalEffect(target);
 const templates=[];
 if(a.attack<0)templates.push(
  from.name+"軍は"+(a.reason||"季節の悪条件")+"により進軍が遅れ、"+target.name+"の防衛線を突破できなかった。",
  (a.reason||"季節の影響")+"で補給と進軍に遅れが生じ、"+from.name+"軍は"+target.name+"攻略を断念した。",
  target.name+"への進攻は"+(a.reason||"季節による進軍難")+"に阻まれ、兵を退くこととなった。"
 );
 if(d.defense>0)templates.push(
  target.name+"は"+(d.reason||"地形・季節の条件")+"を生かして防衛。"+from.name+"軍の侵攻を退けた。",
  (d.reason||"季節の条件")+"が守備側に有利に働き、"+target.name+"の防衛線は崩れなかった。",
  target.name+"軍は"+(d.reason||"地域の自然条件")+"を味方につけ、敵軍を撃退した。"
 );
 if(!templates.length)templates.push(
  from.name+"軍は"+target.name+"軍の抵抗を突破できず、撤退した。",
  target.name+"の防衛は堅く、"+from.name+"の侵攻作戦は失敗に終わった。",
  "激しい戦闘の末、"+from.name+"軍は攻略を断念。双方に損害が出た。"
 );
 return templates[Math.floor(Math.random()*templates.length)];
}
function nationalPower(owner){return Object.values(state.regions).filter(r=>r.owner===owner).reduce((sum,r)=>sum+strength(r),0);}
function resetAnnualRecord(){
 state.annualCaptures=Object.fromEntries(Array.from({length:47},(_,i)=>[i+1,0]));
 state.yearStartPower=Object.fromEntries(Array.from({length:47},(_,i)=>[i+1,nationalPower(i+1)]));
}
function recordCapture(owner){state.annualCaptures=state.annualCaptures||{};state.annualCaptures[owner]=(state.annualCaptures[owner]||0)+1;}
function finalizeYear(){
 const rows=[];
 for(let owner=1;owner<=47;owner++){
  const territories=Object.values(state.regions).filter(r=>r.owner===owner).length;
  const captures=Number(state.annualCaptures?.[owner]||0);
  const growth=nationalPower(owner)-Number(state.yearStartPower?.[owner]||0);
  if(territories||captures)rows.push({owner,name:state.regions[owner].name,captures,growth:Math.round(growth),territories});
 }
 const captureRanking=[...rows].sort((a,b)=>b.captures-a.captures||b.territories-a.territories||a.owner-b.owner);
 const growthRanking=[...rows].sort((a,b)=>b.growth-a.growth||b.territories-a.territories||a.owner-b.owner);
 const report={year:state.year,captureRanking:captureRanking.slice(0,10),growthRanking:growthRanking.slice(0,10)};
 state.yearlyHistory=Array.isArray(state.yearlyHistory)?state.yearlyHistory:[];
 state.yearlyHistory.push(report);state.yearlyHistory=state.yearlyHistory.slice(-20);
 return report;
}
function showYearlyRanking(report){
 const overlay=$("yearly-overlay");if(!overlay||!report)return;
 const renderList=(id,rows,key,suffix)=>{const el=$(id);el.replaceChildren();if(!rows.length){el.textContent="該当する国はありません。";return;}rows.forEach((r,i)=>{const p=document.createElement("p");p.className="ranking-row";const rank=document.createElement("b");rank.textContent=(i+1)+"位";const name=document.createElement("span");name.textContent=r.name;const value=document.createElement("strong");value.textContent=num(r[key])+suffix;p.append(rank,name,value);el.append(p);});};
 $("yearly-title").textContent="第"+report.year+"年・年間戦績";
 renderList("ranking-captures",report.captureRanking,"captures","県");
 renderList("ranking-growth",report.growthRanking,"growth"," pt");
 overlay.classList.remove("hidden");
}

function alliancePower(owner){return Object.values(state.regions).filter(r=>r.owner===owner).reduce((sum,r)=>sum+strength(r),0);}
function sharesThreat(a,b){const threatsA=new Set(Object.values(state.regions).filter(r=>r.owner===a).flatMap(r=>neighbors(r.id).map(id=>state.regions[id]?.owner).filter(o=>o&&o!==a&&!isAllied(a,o))));return Object.values(state.regions).some(r=>r.owner===b&&neighbors(r.id).some(id=>threatsA.has(state.regions[id]?.owner)));}
function submitAllianceProposal(){const target=state.regions[state.selected];if(state.alliances.some(a=>a.a===state.player||a.b===state.player)){log("すでに連合を結んでいます。先に連合を解消してください。");return;}if(!state.started||state.status!=="active"||!target||target.owner===state.player||isAllied(state.player,target.owner)){log("連合を申し込める相手国を選択してください。");return;}if(state.allianceProposals.some(p=>p.from===state.player&&p.to===target.owner)){log("その国には、すでに連合申出書を提出しています。");return;}state.allianceProposals.push({from:state.player,to:target.owner,turn:state.turn});log(state.regions[state.player].name+"国が"+target.name+"国へ連合申出書を提出した。相手国の返答を待つ。");render();}
function respondAllianceProposal(accept){const p=state.allianceProposals.find(x=>x.to===state.player&&x.from!==state.player);if(!p)return;if(accept&&state.alliances.some(a=>a.a===state.player||a.b===state.player)){log("すでに連合を結んでいるため、新たな連合は受諾できません。");return;}state.allianceProposals=state.allianceProposals.filter(x=>x!==p);if(accept){state.alliances.push({a:p.from,b:p.to,formedTurn:state.turn,exitTurn:null});log(state.regions[p.from].name+"国との連合が成立した。相互不可侵と共同戦線を開始する。");}else log(state.regions[p.from].name+"国からの連合申出を拒否した。");render();}
function requestAllianceExit(){const a=state.alliances.find(x=>(x.a===state.player||x.b===state.player)&&!x.exitTurn);if(!a)return;a.exitTurn=state.turn+1;log("連合解消を通告した。猶予期間終了後に連合が解消される。");render();}
function evaluateAllianceProposal(p){const sender=alliancePower(p.from),receiver=alliancePower(p.to),common=sharesThreat(p.from,p.to),border=Object.values(state.regions).some(r=>r.owner===p.to&&neighbors(r.id).some(id=>state.regions[id]?.owner===p.from));let chance=.27+(common ? 0.3 : 0)+(border ? 0.12 : 0)+(sender>receiver*1.15 ? 0.1 : 0)+(sender<receiver*.55 ? -0.12 : 0);return Math.max(.08,Math.min(.88,chance));}
function processAllianceDiplomacy(){for(const p of [...state.allianceProposals]){if(p.to===state.player)continue;if(isAllied(p.from,p.to)||!Object.values(state.regions).some(r=>r.owner===p.to)){state.allianceProposals=state.allianceProposals.filter(x=>x!==p);continue;}const chance=evaluateAllianceProposal(p);state.allianceProposals=state.allianceProposals.filter(x=>x!==p);if(Math.random()<chance){state.alliances.push({a:p.from,b:p.to,formedTurn:state.turn,exitTurn:null});log(state.regions[p.to].name+"国が"+state.regions[p.from].name+"国の連合申出を受諾。連合が成立した。");}else log(state.regions[p.to].name+"国は"+state.regions[p.from].name+"国の連合申出を拒否した。");}
 const active=new Set(state.alliances.flatMap(x=>[x.a,x.b])),playerEnemies=new Set(Object.values(state.regions).filter(r=>r.owner===state.player).flatMap(r=>neighbors(r.id).map(id=>state.regions[id]?.owner).filter(o=>o&&o!==state.player&&!isAllied(state.player,o))));for(const owner of new Set(Object.values(state.regions).map(r=>r.owner))){if(owner===state.player||active.has(owner)||active.has(state.player)||state.allianceProposals.some(p=>p.from===owner||p.to===owner)||!Object.values(state.regions).some(r=>r.owner===owner))continue;const common=Object.values(state.regions).some(r=>r.owner===owner&&neighbors(r.id).some(id=>playerEnemies.has(state.regions[id]?.owner)));if(common&&Math.random()<.045){state.allianceProposals.push({from:owner,to:state.player,turn:state.turn});log(state.regions[owner].name+"国から連合申出書が届いた。受諾するか、拒否するかを選んでください。");break;}}}
function processAllianceExits(){for(const a of state.alliances.filter(x=>x.exitTurn&&x.exitTurn<=state.turn)){state.alliances=state.alliances.filter(x=>x!==a);log(state.regions[a.a].name+"国と"+state.regions[a.b].name+"国の連合が解消された。");}}
function dispatchFor(from){return Math.max(1,Math.ceil(from.troops*.18));}
function attackPlan(){if(!state.started||state.status!=="active")return null;const target=state.regions[state.selected];if(!target||target.owner===state.player||isAllied(state.player,target.owner))return null;const sources=Object.values(state.regions).filter(r=>r.owner===state.player&&neighbors(r.id).includes(target.id)&&r.troops>1);if(!sources.length)return null;sources.sort((a,b)=>strength(b)-strength(a));const from=sources[0],cost=dispatchFor(from);return {from,target,cost,chance:battleChance(from,target)};}
function reachableOwned(fromId){const seen=new Set([fromId]),queue=[fromId];while(queue.length){const id=queue.shift();for(const next of neighbors(id)){const r=state.regions[next];if(r&&r.owner===state.player&&!seen.has(next)){seen.add(next);queue.push(next);}}}return [...seen].map(id=>state.regions[id]).filter(Boolean).sort((a,b)=>a.id-b.id);}
function validateWorld(){const ids=Object.keys(state.regions).map(Number).sort((a,b)=>a-b);if(ids.length!==47||ids.some((id,i)=>id!==i+1))throw Error("47 prefectures missing");for(const [id,list] of Object.entries(LAND)){if(!state.regions[id]||!Array.isArray(list))throw Error("invalid land adjacency "+id);if(new Set(list).size!==list.length)throw Error("duplicate land adjacency "+id);for(const n of list){if(+id===n||!LAND[n]||!LAND[n].includes(+id))throw Error("land adjacency mismatch "+id+"-"+n);}}for(const e of SPECIAL){if(!state.regions[e.a]||!state.regions[e.b]||e.a===e.b)throw Error("invalid special route");}return true;}
function log(s){state.logs.unshift(s);state.logs=state.logs.slice(0,35);$("log").innerHTML=state.logs.map(x=>"<p>"+x.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))+"</p>").join("");}
function strength(r){return r.troops+Math.sqrt(r.economy)*2+r.industry*.7+r.agriculture*.25;}
function render(){const r=state.regions[state.selected],plan=attackPlan(),nameEl=$("pref-name");nameEl.replaceChildren(document.createTextNode(r.name));const status=document.createElement("span");status.className="pref-status";status.textContent=r.owner!==r.id?(state.regions[r.owner]?.name||"不明")+"領":r.name.endsWith("都")?"本都":r.name.endsWith("道")?"本道":r.name.endsWith("府")?"本府":"本県";nameEl.appendChild(status);$("pref-region").textContent=r.region+"地方・"+(r.owner===state.player&&state.started?"自国":state.started?"他国":"勢力選択");for(const k of ["population","economy","agriculture","industry","service","troops"])$(k).textContent=num(r[k]);$("power").textContent=num(strength(r));const traits=regionalTraits(r),seasonal=seasonalEffect(r);$("attack-rating").textContent=num(traits.attack)+" / 100";$("defense-rating").textContent=num(Math.min(100,traits.defense+Math.round(seasonal.defense*100)))+" / 100";$("territory-bonus").textContent=state.started?("+"+num(territoryBonus(state.player))):"—";$("turn").textContent="第 "+state.year+" 年・"+seasonName()+"（第 "+state.turn+" ターン）";$("phase").textContent=state.status==="won"?"天下統一":state.status==="lost"?"滅亡":state.started?"群雄割拠":"天下分け目の時代";$("nation").textContent=state.started?state.regions[state.player].name+"国":"勢力未選択";$("start").disabled=state.started;$("setup").classList.toggle("hidden",state.started);$("game").classList.toggle("hidden",!state.started);$("attack").classList.toggle("hidden",!plan);$("attack").disabled=state.busy||!plan;$("end").disabled=state.busy||state.status!=="active";$("transfer-button").disabled=state.busy||state.status!=="active";populateTransferControls();renderAlliancePanel();$("help").textContent=state.status==="won"?"全国統一を達成しました。おめでとうございます。":state.status==="lost"?"自国は滅亡しました。最初からで新しい戦いを始められます。":state.started?(plan?(plan.from.name+"から"+plan.target.name+"へ進攻します。成功率の目安："+Math.round(plan.chance*100)+"%。派遣："+num(plan.cost)+"兵力。"):"攻撃したい敵の都道府県を地図から選択してください。攻撃可能なら攻撃元・成功率・派遣兵力を表示します。"):"地図からあなたの国を選びましょう。";document.querySelectorAll(".prefecture").forEach(el=>{const id=+(el.dataset.code||el.getAttribute("data-code"));el.classList.toggle("selected",id===state.selected);el.classList.toggle("setup-selected",!state.started&&id===state.selected);el.classList.toggle("player",state.started&&state.regions[id]?.owner===state.player);el.classList.toggle("enemy",state.started&&state.regions[id]?.owner!==state.player);el.classList.toggle("conquered",state.started&&state.regions[id]?.owner!==id);el.classList.toggle("border-with-conquered",state.started&&state.regions[id]?.owner===state.player&&neighbors(id).some(n=>state.regions[n].owner!==state.player));if(state.started&&state.regions[id])el.style.setProperty("--faction-fill",factionColor(state.regions[id].owner));else el.style.removeProperty("--faction-fill");});$("map-status").textContent=state.started?"各国の領土は勢力ごとの色で表示。征服地は同じ色を少し暗く表示。":"地図上の都道府県を選択してください。";}
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
function territoryBonus(owner){const count=Object.values(state.regions).filter(r=>r.owner===owner).length;return Math.min(24,Math.floor(count/5)*3);}
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
function begin(){if(state.started)return;state.started=true;state.status="active";state.player=state.selected;state.year=1;state.seasonIndex=0;state.turn=1;resetAnnualRecord();state.regions[state.player].owner=state.player;log(state.regions[state.player].name+"を選び、天下統一への歩みを始めた。春の陣が始まる。");render();}
let conquestAudioContext=null,conquestSoundBufferPromise=null;
function prepareConquestAudio(){
 try{
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  if(!conquestAudioContext)conquestAudioContext=new AC();
  if(conquestAudioContext.state==="suspended")conquestAudioContext.resume().catch(()=>{});
  if(!conquestSoundBufferPromise){
   conquestSoundBufferPromise=fetch("./assets/conquest-victory.mp3")
    .then(response=>{if(!response.ok)throw Error("勝利音声を読み込めません（HTTP "+response.status+"）");return response.arrayBuffer();})
    .then(data=>conquestAudioContext.decodeAudioData(data))
    .catch(error=>{console.warn("征服勝利音の読み込みに失敗:",error);conquestSoundBufferPromise=null;return null;});
  }
  return conquestAudioContext;
 }catch(e){console.warn("音声機能を初期化できません:",e);return null;}
}
async function playConquestSound(){
 const ctx=prepareConquestAudio();if(!ctx)return 0;
 try{
  const buffer=await conquestSoundBufferPromise;if(!buffer)return 0;
  const source=ctx.createBufferSource();source.buffer=buffer;source.connect(ctx.destination);
  if(ctx.state==="suspended")await ctx.resume();
  const playDuration=Math.min(buffer.duration,3.05);
  source.start(ctx.currentTime+.02,0,playDuration);
  return playDuration;
 }catch(e){console.warn("征服勝利音を再生できません:",e);return 0;}
}
async function attack(){
 if(state.busy)return;prepareConquestAudio();const plan=attackPlan();if(!plan){log("選択した県から進攻できる隣接国がありません。自国領または隣接する敵国を選んでください。");return;}
 const {from,target}=plan;if(from.owner!==state.player||target.owner===state.player)return;
 const chance=battleChance(from,target),roll=Math.random(),cost=plan.cost;
 state.busy=true;render();await animateMarch(from.id,target.id,cost);
 const outcome=resolveBattle(from,target,roll,cost);state.stats=state.stats||{wins:0,losses:0,captures:0};if(outcome.won){state.stats.wins++;state.stats.captures++;}else state.stats.losses++;if(outcome.won){recordCapture(state.player);log(from.name+"から進攻し、"+target.name+"を制圧！ "+target.name+"は"+state.regions[state.player].name+"国に編入された（旧所属："+state.regions[outcome.previousOwner].name+"国）。");}else log(battleFailureLog(from,target));
 state.selected=target.id;state.busy=false;render();if(outcome.won)showConquest(target.name);
}
function resolveBattle(from,target,roll=Math.random(),dispatch=dispatchFor(from)){
 const chance=battleChance(from,target),previousOwner=target.owner,attackerBefore=from.troops,defenderBefore=target.troops;
 dispatch=Math.max(1,Math.min(attackerBefore,Math.floor(dispatch)));
 // 派遣兵力はこの関数内で一度だけ消費する。失敗時の追加損耗も全勢力共通。
 from.troops=Math.max(0,attackerBefore-dispatch);
 if(roll<chance){
  target.owner=from.owner;target.troops=Math.max(20,Math.floor(defenderBefore*.35));target.stability=55;
  return {won:true,chance,previousOwner,dispatch,attackerLost:attackerBefore-from.troops,defendersLost:Math.max(0,defenderBefore-target.troops)};
 }
 const extraLoss=Math.min(from.troops,Math.ceil(dispatch*.65));
 from.troops-=extraLoss;
 target.troops=Math.max(0,defenderBefore-Math.ceil(defenderBefore*.12));
 return {won:false,chance,previousOwner,dispatch,attackerLost:attackerBefore-from.troops,defendersLost:defenderBefore-target.troops};
}
function growth(r){
 const ag=Math.max(0,r.agriculture)/100,ind=Math.max(0,r.industry)/100,svc=Math.max(0,r.service)/100,wealth=Math.max(0,r.economy)/100,stability=Math.max(.25,r.stability/100),population=Math.max(0,r.population);
 const food=Math.max(.15,ag*1.5+svc*.18);
 const populationRate=Math.min(.0045,.00075+food*.0012+ind*.00025+svc*.00035+wealth*.00015);
 const economyRate=Math.min(.009,.0012+ind*.0018+svc*.0018+ag*.0011+Math.min(1,population/10000)*.00035);
 const seasonalEconomy=state.seasonIndex===2?1.08:state.seasonIndex===0?1.03:state.seasonIndex===3&&SNOW_REGIONS.has(r.id)?.94:1;
 const agricultureSeason=state.seasonIndex===0?1.2:state.seasonIndex===1?1.12:state.seasonIndex===2?1.3:.78;
 r.population+=Math.max(2,Math.floor(population*populationRate));
 r.economy+=Math.max(2,Math.floor(r.economy*economyRate*seasonalEconomy));
 r.agriculture=Math.min(160,r.agriculture+Math.max(.04,(ag*.008+wealth*.002+svc*.001+Math.random()*.004)*agricultureSeason));
 r.industry=Math.min(160,r.industry+Math.max(.04,ind*.008+wealth*.003+svc*.0015+Math.random()*.004));
 r.service=Math.min(160,r.service+Math.max(.04,svc*.008+wealth*.002+ind*.0015+Math.random()*.004));
 r.troops+=Math.max(1,Math.floor((r.economy*.006+r.industry*.10+r.population*.0005)*stability));
 r.stability=Math.min(100,r.stability+.7+svc*.008);
}
function allianceAid(owner){
 const partners=state.alliances.map(a=>a.a===owner?a.b:a.b===owner?a.a:null).filter(Boolean);
 const regions=Object.values(state.regions).filter(r=>partners.includes(r.owner));
 if(!regions.length)return {troops:0,economy:0};
 const totalTroops=regions.reduce((sum,r)=>sum+r.troops,0),totalEconomy=regions.reduce((sum,r)=>sum+r.economy,0);
 return {troops:Math.min(12,Math.max(2,Math.floor(totalTroops*.003))),economy:Math.min(6,Math.max(1,Math.floor(totalEconomy*.002)))};
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
  const options=owned.filter(a=>a.troops>=45).flatMap(a=>neighbors(a.id)
   .map(id=>state.regions[id]).filter(r=>r&&r.owner!==owner&&!isAllied(owner,r.owner))
   .map(target=>{const ratio=strength(a)/(strength(target)+1),value=target.economy*.12+target.population*.015+target.industry*.22+target.agriculture*.08+target.service*.06;return {a,target,ratio,score:ratio+value*.00018};}));
  if(!options.length)continue;
  options.sort((x,y)=>y.score-x.score);
  const {a,target,ratio}=options[0];
  if(ratio<=1.12||Math.random()>=Math.min(.32,.07+(ratio-1.12)*.14))continue;
  const dispatch=dispatchFor(a);await animateMarch(a.id,target.id,dispatch);
  const outcome=resolveBattle(a,target,Math.random(),dispatch);
  if(outcome.won){recordCapture(owner);log(state.regions[owner].name+"国が"+target.name+"を制圧。"+target.name+"は"+state.regions[owner].name+"国に編入（旧所属："+state.regions[outcome.previousOwner].name+"国）。");}
  else log(battleFailureLog(a,target));
 }
}
function showConquest(name){const overlay=$("conquest-overlay"),title=$("conquest-title");if(!overlay||!title)return;clearTimeout(showConquest.timer);clearTimeout(showConquest.fadeTimer);title.textContent="征服完了";overlay.classList.remove("hidden","leaving");overlay.setAttribute("aria-label",name+"を制圧。征服完了");const scroll=$("conquest-scroll");scroll.style.animation="none";void scroll.offsetWidth;scroll.style.animation="";const hide=ms=>{clearTimeout(showConquest.timer);showConquest.timer=setTimeout(()=>{overlay.classList.add("leaving");showConquest.fadeTimer=setTimeout(()=>{overlay.classList.add("hidden");overlay.classList.remove("leaving");},360);},ms);};hide(3000);playConquestSound().then(duration=>{if(duration>0&&overlay.classList.contains("hidden")===false)hide(Math.max(0,duration*1000-360));}).catch(error=>console.warn("征服演出の音声処理に失敗:",error));}
function showVictory(){const overlay=$("victory-overlay");if(!overlay)return;const stats=state.stats||{wins:0,losses:0,captures:0},total=stats.wins+stats.losses,rate=total?Math.round(stats.wins/total*100):0;$("victory-turn").textContent="第 "+state.turn+" ターンで全国統一";$("record-territories").textContent=Object.values(state.regions).filter(r=>r.owner===state.player).length+" / 47";$("record-wins").textContent=num(stats.wins)+"回";$("record-losses").textContent=num(stats.losses)+"回";$("record-rate").textContent=total?rate+"%":"戦闘なし";overlay.classList.remove("hidden");}
async function endTurn(){
 if(state.busy||!state.started||state.status!=="active")return;
 state.busy=true;render();
 Object.values(state.regions).filter(r=>r.owner===state.player).forEach(growth);
 applyAllianceAid(state.player);
 const bonus=awardTerritoryBonus(state.player);
 if(bonus)log(state.regions[state.player].name+"国に領土ボーナス +"+bonus+"兵力（"+Object.values(state.regions).filter(r=>r.owner===state.player).length+"県を支配）。");
 await aiTurn();state.turn++;processAllianceExits();
 const mine=Object.values(state.regions).filter(r=>r.owner===state.player).length;
 let yearlyReport=null;
 if(state.seasonIndex===3){
  yearlyReport=finalizeYear();state.year++;state.seasonIndex=0;
  const topCapture=yearlyReport.captureRanking[0],topGrowth=yearlyReport.growthRanking[0];
  log("第"+yearlyReport.year+"年が終了。年間征服数1位："+(topCapture?topCapture.name+"（"+topCapture.captures+"県）":"該当なし")+"。国力成長1位："+(topGrowth?topGrowth.name+"（+"+num(topGrowth.growth)+"）":"該当なし")+"。");
  resetAnnualRecord();
 }else{
  state.seasonIndex++;
  log("季節が移り、第"+state.year+"年 "+seasonName()+"を迎えた。");
 }
 if(mine===47){state.status="won";log("全国統一を達成！天下統一です。");}
 else if(mine===0){state.status="lost";log("自国の領土がなくなった。自国は滅亡した。");}
 else log("第"+state.year+"年 "+seasonName()+"。自国領は"+mine+"県。季節ごとの経済・農業・戦闘補正が適用されている。");
 state.busy=false;render();
 if(yearlyReport)showYearlyRanking(yearlyReport);
 if(state.status==="won")showVictory();
}
function runSelfTests(){
 const failures=[],check=(ok,label)=>{if(!ok)failures.push(label);};
 check(PREFS.length===47,"県データ47件");check(Object.keys(LAND).length===47,"陸上隣接47県");const landPairCount=Object.entries(LAND).reduce((sum,[id,list])=>sum+list.filter(n=>n>+id).length,0);check(landPairCount===86,"地理的な陸上隣接86組");
 for(let id=1;id<=47;id++){check(Array.isArray(LAND[id]),"陸上隣接配列 "+id);for(const n of LAND[id])check((LAND[n]||[]).includes(id),"隣接相互性 "+id+"-"+n);}
 for(const e of SPECIAL)check(state.regions[e.a]&&state.regions[e.b]&&e.a!==e.b,"特別接続 "+e.a+"-"+e.b);check(neighbors(46).includes(47)&&neighbors(47).includes(46),"鹿児島・沖縄の航路接続");check(LAND[31].includes(34)&&LAND[34].includes(31),"鳥取・広島の短い県境");check(LAND[21].includes(18)&&LAND[18].includes(21),"岐阜・福井の県境");check(LAND[36].includes(38)&&LAND[38].includes(36),"徳島・愛媛の県境");check(!LAND[12].includes(14)&&neighbors(12).includes(14),"千葉・神奈川は陸上でなく特別航路");check(!LAND[42].includes(43)&&neighbors(42).includes(43),"長崎・熊本は陸上でなく特別航路");
 const oldPlayer=state.player,owners=Object.fromEntries(Object.entries(state.regions).map(([id,r])=>[id,r.owner]));
 try{
  state.player=1;for(const r of Object.values(state.regions))r.owner=r.id;state.regions[1].owner=1;state.regions[2].owner=1;state.regions[3].owner=1;
  const route=reachableOwned(1).map(r=>r.id);check(route.includes(2)&&route.includes(3),"自国領経由の移送経路");check(!route.includes(4),"敵領を越える移送禁止");
 }catch(e){failures.push("移送経路検査 "+e.message);}
 finally{state.player=oldPlayer;for(const [id,owner] of Object.entries(owners))state.regions[id].owner=owner;}
 const oldAlliances=state.alliances,oldOwner3=state.regions[3].owner;
 try{state.alliances=[{a:1,b:2,formedTurn:1,exitTurn:null}];state.regions[3].owner=2;check(isAllied(1,2)&&!isAllied(1,3),"連合関係判定");check(alliedSupport(1,4)>0,"隣接連合国の戦闘支援");const aid=allianceAid(1);check(aid.troops>=2&&aid.troops<=12&&aid.economy>=1&&aid.economy<=6,"連合国の毎ターン支援量");}
 catch(e){failures.push("連合検査 "+e.message);}
 finally{state.alliances=oldAlliances;state.regions[3].owner=oldOwner3;}
 const originalOwners={...owners};
 try{
  Object.values(state.regions).forEach(r=>r.owner=2);
  for(let id=1;id<=4;id++)state.regions[id].owner=1;
  check(territoryBonus(1)===0,"4県以下は領土ボーナスなし");
  state.regions[5].owner=1;check(territoryBonus(1)===3,"5県で領土ボーナス+3");
  Object.values(state.regions).forEach(r=>r.owner=1);check(territoryBonus(1)===24,"47県でも領土ボーナス上限24");
 }catch(e){failures.push("領土ボーナス検査 "+e.message);}
 finally{for(const [id,owner] of Object.entries(originalOwners))state.regions[id].owner=owner;}
 const growthSample={population:500,economy:150,agriculture:60,industry:55,service:50,troops:200,stability:70};
 const growthBefore={...growthSample};growth(growthSample);
 check(growthSample.troops-growthBefore.troops>=1&&growthSample.troops-growthBefore.troops<=10,"兵力成長の過剰増加防止");
 const attacker={owner:1,troops:100,economy:100,industry:60,agriculture:50,service:50},defender={owner:2,troops:80,economy:80,industry:50,agriculture:50,service:50};
 const winAttacker={...attacker},winDefender={...defender},win=resolveBattle(winAttacker,winDefender,0,18);
 check(win.won&&winDefender.owner===1,"戦闘成功時の領土移転");
 check(winAttacker.troops===82&&win.attackerLost===18,"成功時の派遣兵力は一度だけ消費");
 check(winDefender.troops===28&&win.defendersLost===52,"成功時の防衛側損耗の整合性");
 const lossAttacker={...attacker},lossDefender={...defender},loss=resolveBattle(lossAttacker,lossDefender,1,18);
 check(!loss.won&&lossDefender.owner===2,"戦闘失敗時の領土維持");
 check(lossAttacker.troops===70&&loss.attackerLost===30,"失敗時の兵力消費は派遣分＋追加損耗のみ");
 check(lossDefender.troops===70&&loss.defendersLost===10,"失敗時の防衛側損耗の整合性");
 check(dispatchFor(attacker)===dispatchFor({...attacker}),"プレイヤー・AI共通の派遣兵力算出");
 try{validateSave({version:4,selected:state.selected,player:state.player,started:state.started,status:state.status,turn:state.turn,year:state.year,seasonIndex:state.seasonIndex,regions:state.regions});check(true,"セーブ形式検査");}catch(e){failures.push("有効なセーブ検査 "+e.message);}
 if(failures.length)log("開発者検査で問題："+failures.slice(0,8).join(" / "));else log("内部検査完了：47県・隣接・移送経路・戦闘結果・セーブ形式を確認。");
 return failures;
}
function save(){try{const snapshot={version:4,selected:state.selected,player:state.player,started:state.started,status:state.status,turn:state.turn,year:state.year,seasonIndex:state.seasonIndex,yearStartPower:state.yearStartPower,annualCaptures:state.annualCaptures,yearlyHistory:state.yearlyHistory,regions:state.regions,logs:state.logs,specialEnabled:state.specialEnabled,alliances:state.alliances,allianceProposals:state.allianceProposals,stats:state.stats||{wins:0,losses:0,captures:0}};localStorage.setItem(SAVE_KEY,JSON.stringify(snapshot));log("進行状況を保存した（"+state.year+"年 "+seasonName()+"）。");}catch(e){log("保存できませんでした。端末の空き容量やブラウザ設定を確認してください。");}}
function validateSave(s){if(!s||!s.regions||Object.keys(s.regions).length!==47)throw Error("県データ数が不正");for(let id=1;id<=47;id++){const r=s.regions[id];if(!r||r.id!==id||r.name!==PREFS[id-1][0]||!Number.isInteger(r.owner)||r.owner<1||r.owner>47)throw Error("県データが不正");for(const k of ["population","economy","agriculture","industry","service","troops","stability"])if(!Number.isFinite(r[k])||r[k]<0||r[k]>100000000)throw Error("数値データが不正");}if(!Number.isInteger(s.turn)||s.turn<1||!Number.isInteger(s.selected)||s.selected<1||s.selected>47)throw Error("進行情報が不正");if(s.year!==undefined&&(!Number.isInteger(s.year)||s.year<1))throw Error("年情報が不正");if(s.seasonIndex!==undefined&&(!Number.isInteger(s.seasonIndex)||s.seasonIndex<0||s.seasonIndex>3))throw Error("季節情報が不正");if(s.started&&(!Number.isInteger(s.player)||s.player<1||s.player>47))throw Error("プレイヤー情報が不正");if(!["setup","active","won","lost",undefined].includes(s.status))throw Error("ゲーム状態が不正");for(const a of (s.alliances||[]))if(!Number.isInteger(a.a)||!Number.isInteger(a.b)||a.a<1||a.a>47||a.b<1||a.b>47||a.a===a.b)throw Error("連合データが不正");for(const p of (s.allianceProposals||[]))if(!Number.isInteger(p.from)||!Number.isInteger(p.to)||p.from<1||p.from>47||p.to<1||p.to>47||p.from===p.to)throw Error("連合申出データが不正");}
function load(){try{
 let raw=localStorage.getItem(SAVE_KEY),s,legacy=false;
 if(!raw){for(const key of LEGACY_SAVE_KEYS){raw=localStorage.getItem(key);if(raw){legacy=true;break;}}}
 if(!raw)return false;
 s=JSON.parse(raw);if(![2,3,4].includes(s.version||2))throw Error("非対応バージョン");
 validateSave(s);if(!s.status)s.status=s.started?"active":"setup";
 Object.assign(state,s,{busy:false,alliances:s.alliances||[],allianceProposals:s.allianceProposals||[],stats:s.stats||{wins:0,losses:0,captures:0}});
 state.year=Number.isInteger(state.year)&&state.year>0?state.year:1;
 state.seasonIndex=Number.isInteger(state.seasonIndex)&&state.seasonIndex>=0&&state.seasonIndex<4?state.seasonIndex:0;
 state.yearlyHistory=Array.isArray(state.yearlyHistory)?state.yearlyHistory:[];
 state.annualCaptures=state.annualCaptures&&typeof state.annualCaptures==="object"?state.annualCaptures:{};
 state.yearStartPower=state.yearStartPower&&typeof state.yearStartPower==="object"?state.yearStartPower:{};
 if(!Object.keys(state.yearStartPower).length)resetAnnualRecord();
 if(legacy)log("旧バージョンのセーブを引き継ぎました。季節・年間記録を追加し、新形式で保存できます。");
 return true;
 }catch(e){log("セーブデータが破損または非対応のため読み込めませんでした。既存データは自動削除していません。");return false;}}
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
window.addEventListener("resize",applyMapTransform);$("victory-close").onclick=()=>$("victory-overlay").classList.add("hidden");$("yearly-close").onclick=()=>$("yearly-overlay").classList.add("hidden");$("victory-reset").onclick=()=>$("reset").click();$("begin").onclick=()=>$("intro").classList.add("hidden");$("start").onclick=begin;$("attack").onclick=attack;$("end").onclick=endTurn;$("save").onclick=save;$("reset").onclick=()=>{if(confirm("最初からやり直しますか？")){localStorage.removeItem(SAVE_KEY);LEGACY_SAVE_KEYS.forEach(key=>localStorage.removeItem(key));location.reload();}};
if(load()){log("保存データを読み込んだ。");if(state.started)$("intro").classList.add("hidden");}
try{validateWorld();}catch(e){log("内部データ検証エラー："+e.message);}
runSelfTests();render();if(state.status==="won")showVictory();loadMap();