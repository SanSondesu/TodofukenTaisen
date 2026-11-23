/* 戦国絵巻・演出レイヤー */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const historic={
  1:"北辰の大地",2:"津軽海峡の北門",3:"南部の山河",4:"杜の都と仙台湾",5:"秋田杉と雪国",6:"出羽三山の霊峰",7:"会津磐梯の山嶺",
  8:"常陸の沃野",9:"日光連山の社寺",10:"上州三山の要害",11:"武蔵野の平原",12:"房総の黒潮",13:"江戸城下の中枢",14:"箱根と相模湾",
  15:"越後の米蔵",16:"立山連峰の雪嶺",17:"加賀百万石の雅",18:"越前和紙と若狭の海",19:"甲斐の山岳",20:"信濃の高嶺",21:"飛騨美濃の山城",
  22:"富士を望む駿河湾",23:"尾張三河のものづくり",24:"伊勢神宮と熊野古道",25:"琵琶湖の水運",26:"千年の都",27:"天下の台所",28:"摂津播磨を結ぶ港",29:"大和の古都",30:"紀伊山地と熊野",
  31:"鳥取砂丘と山陰の海",32:"出雲神話の国",33:"晴れの国・吉備",34:"安芸の瀬戸と厳島",35:"三つの海を抱く西国の門",
  36:"阿波踊りと吉野川",37:"讃岐のため池と島影",38:"伊予の柑橘と石鎚",39:"土佐の黒潮と山嶺",
  40:"筑前博多の交易港",41:"佐賀平野と有明の干潟",42:"西海の島々と異国港",43:"阿蘇の火の国",44:"別府湯けむりと豊後水道",45:"日向灘と神話の里",46:"桜島と薩摩の海",47:"琉球の珊瑚島"
 };
 function ownedCount(owner){return Object.values(state.regions).filter(r=>r.owner===owner).length;}
 function ownedCount(owner){return Object.values(state.regions).filter(r=>r.owner===owner).length;}
 function epithet(r){
  const owner=r.owner,count=ownedCount(owner),home=state.regions[owner]||r;
  const base=historic[home.id]||"諸国の一角";
  if(count>=15)return base+"・天下に号令する覇者";
  if(count>=8)return base+"・大大名";
  if(count>=4)return base+"・有力大名";
  if(count>=2)return base+"・若き領主";
  return base+"・一国の主";
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
   if(title)title.textContent=name+" 制圧";
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
    showGrandEvent("年の改まり・戦国年代記","第"+(state.year-1)+"年 終幕","新たな年が始まり、諸国の勢力図が動き出す");
   }else if(state.seasonIndex!==beforeSeason){
    applySeason();
   }
  };
  const endButton=$("end");if(endButton)endButton.onclick=window.endTurn;
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

 function closeWithScroll(id,overlayId){
  const button=$(id),overlay=$(overlayId);if(!button||!overlay)return;
  button.onclick=()=>{overlay.classList.add("leaving");setTimeout(()=>{overlay.classList.add("hidden");overlay.classList.remove("leaving");},330);};
 }
 closeWithScroll("yearly-close","yearly-overlay");
 closeWithScroll("victory-close","victory-overlay");
 closeWithScroll("begin","intro");
 addMapDecor();applySeason();
 if(typeof baseRender==="function")window.render();
})();
