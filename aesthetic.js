/* 戦国絵巻・演出レイヤー */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const historic={
  4:"独眼竜の地・陸奥",15:"越後の龍",17:"加賀百万石",19:"甲斐の虎",
  21:"美濃の要衝",14:"相模の獅子",26:"天下の台所",27:"尾張の覇気",
  28:"近江の水運",31:"出雲の神話",33:"備前の鉄",40:"筑前の要地"
 };
 const regionTitles={
  "北海道":"北海の守り","東北":"奥州の雄","関東":"坂東の覇者",
  "中部":"山河の要衝","近畿":"畿内の威勢","中国":"西国の要",
  "四国":"瀬戸内の堅城","九州":"西海の雄"
 };
 function ownedCount(owner){return Object.values(state.regions).filter(r=>r.owner===owner).length;}
 function epithet(r){
  const owner=r.owner, count=ownedCount(owner), base=historic[r.id];
  if(base && r.id===owner && count>=1)return base;
  const home=state.regions[owner]||r;
  const regional=regionTitles[home.region]||"国境の守り";
  if(count>=15)return "天下に号令する"+(home.region==="関東"?"東国":"諸国")+"の覇者";
  if(count>=8)return regional+"・大大名";
  if(count>=4)return regional+"・有力大名";
  if(count>=2)return regional+"・若き領主";
  return base||regional+"・一国の主";
 }
 function applySeason(){
  const season=SEASONS[state.seasonIndex]||"春";
  document.body.dataset.season=season;
  const label=$("season-ornament");
  if(label)label.textContent=({春:"花霞",夏:"青嵐",秋:"錦秋",冬:"雪景"})[season];
 }
 function addMapDecor(){
  const map=$("map");if(!map)return;
  if(!$("map-compass")){const c=document.createElement("div");c.id="map-compass";c.setAttribute("aria-label","方位・北");c.innerHTML="<b>北</b>";map.append(c);}
  if(!$("map-legend")){const l=document.createElement("div");l.id="map-legend";l.innerHTML='<span></span>国境 <span></span>征服地';map.append(l);}
  const controls=map.querySelector(".map-controls");
  if(controls&&!$("season-ornament")){const s=document.createElement("span");s.id="season-ornament";s.className="map-zoom-label";s.style.cssText="min-width:34px;border-left:1px solid #c4b18a;padding-left:5px";controls.insertBefore(s,controls.firstChild); }
 }
 const baseRender=window.render;
 if(typeof baseRender==="function"){
  window.render=function(){
   baseRender();
   applySeason();
   const r=state.regions[state.selected],badge=$("pref-epithet");
   if(r&&badge)badge.textContent=epithet(r);
   addMapDecor();
  };
 }
 const baseConquest=window.showConquest;
 if(typeof baseConquest==="function"){
  window.showConquest=function(name){
   baseConquest(name);
   const kicker=document.querySelector(".conquest-kicker"),title=$("conquest-title");
   if(kicker)kicker.textContent="領土拡大・戦勝の記";
   if(title)title.textContent=name+"、制圧";
  };
 }
 function showGrandEvent(kickerText,titleText,detail){
  const overlay=$("conquest-overlay"),title=$("conquest-title"),kicker=document.querySelector(".conquest-kicker");
  if(!overlay||!title||!kicker)return;
  clearTimeout(window.__grandEventTimer);clearTimeout(window.__grandEventFade);
  kicker.textContent=kickerText;title.textContent=titleText;
  overlay.classList.remove("hidden","leaving");
  overlay.setAttribute("aria-label",titleText+(detail?"。"+detail:""));
  const scroll=$("conquest-scroll");if(scroll){scroll.style.animation="none";void scroll.offsetWidth;scroll.style.animation="";}
  window.__grandEventTimer=setTimeout(()=>{overlay.classList.add("leaving");window.__grandEventFade=setTimeout(()=>{overlay.classList.add("hidden");overlay.classList.remove("leaving");},360);},3200);
 }
 const baseEndTurn=window.endTurn;
 if(typeof baseEndTurn==="function"){
  window.endTurn=async function(){
   const beforeYear=state.year,beforeSeason=state.seasonIndex;
   await baseEndTurn();
   if(state.year!==beforeYear){
    showGrandEvent("年の改まり・戦国年代記","第"+(state.year-1)+"年、終幕","新たな年が始まり、諸国の勢力図が動き出す");
   }else if(state.seasonIndex!==beforeSeason){
    applySeason();
   }
  };
 }
 const baseRespond=window.respondAllianceProposal;
 if(typeof baseRespond==="function"){
  window.respondAllianceProposal=function(accept){
   const before=state.alliances.length;
   baseRespond(accept);
   if(accept&&state.alliances.length>before){
    const a=state.alliances[state.alliances.length-1];
    showGrandEvent("盟約成立・両家の誓い",state.regions[a.a].name+"・"+state.regions[a.b].name+" 同盟","二つの国が盟約を結んだ");
   }
  };
 }
 const baseVictory=window.showVictory;
 if(typeof baseVictory==="function"){
  window.showVictory=function(){baseVictory();document.body.dataset.season=SEASONS[state.seasonIndex]||"春";};
 }
 addMapDecor();applySeason();
 if(typeof baseRender==="function")window.render();
})();
