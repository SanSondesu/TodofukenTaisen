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

 const scrollFinish=document.createElement("style");
 scrollFinish.textContent=`
 .yearly-dialog,#intro>.dialog{position:relative;isolation:isolate;width:min(720px,calc(100vw - 28px));max-height:calc(100dvh - 28px);overflow-y:auto;overscroll-behavior:contain;padding:22px 30px 30px;border:1px solid #a98b5c;border-top:0;border-bottom:5px solid #a98b5c;border-radius:2px;background:repeating-linear-gradient(0deg,#80633a0a 0 1px,transparent 1px 5px),linear-gradient(90deg,#e7d7b5,#f8efd9 4%,#f3e8cc 50%,#f8efd9 96%,#e5d2ad);box-shadow:inset 0 0 0 4px #fff8e5a0,inset 0 0 26px #8b6b3b20,0 18px 44px #1c140c66;scrollbar-color:#b59a6b #eadfc7}
 .yearly-dialog:before,#intro>.dialog:before{content:"";position:sticky;top:0;z-index:4;display:block;height:23px;margin:-13px -18px 20px;border:1px solid #542b20;border-radius:12px;background:radial-gradient(ellipse at 2.5% 50%,#e7c986 0 2px,#7b3929 3px 7px,transparent 8px),radial-gradient(ellipse at 97.5% 50%,#e7c986 0 2px,#7b3929 3px 7px,transparent 8px),linear-gradient(180deg,#d28b58,#9c4b32 18%,#6e2c23 48%,#3d1e19 53%,#8b3b2a 82%,#c17b4b);box-shadow:inset 0 2px 2px #ffe5ae88,inset 0 -3px 4px #1b0d0b99,0 4px 8px #38221655}
 .yearly-dialog:after,#intro>.dialog:after{content:"";position:absolute;z-index:-1;left:7px;right:7px;top:30px;bottom:7px;border:1px solid #b99c6c66;pointer-events:none}
 .overlay:not(.hidden) .yearly-dialog,#intro:not(.hidden)>.dialog{animation:scroll-panel-open .58s cubic-bezier(.18,.72,.22,1) both;transform-origin:top center}
 .overlay.leaving .yearly-dialog,#intro.leaving>.dialog{animation:scroll-panel-close .34s ease-in both;transform-origin:top center}
 @keyframes scroll-panel-open{0%{opacity:0;transform:translateY(-8px) scaleY(.78)}72%{opacity:1;transform:translateY(1px) scaleY(1.012)}100%{opacity:1;transform:translateY(0) scaleY(1)}}
 @keyframes scroll-panel-close{0%{opacity:1;transform:translateY(0) scaleY(1)}100%{opacity:0;transform:translateY(-4px) scaleY(.88)}}
 .conquest-left-roll,.conquest-right-roll{width:34px;border:1px solid #4c241c;border-radius:17px;background:radial-gradient(ellipse at 50% 5%,#f0c98588 0 2px,transparent 3px),radial-gradient(ellipse at 50% 95%,#160b0a99 0 3px,transparent 4px),linear-gradient(90deg,#271411,#633023 12%,#a64c32 27%,#c17a4c 43%,#7b3025 57%,#a34a30 73%,#54241e 89%,#211210);box-shadow:inset 3px 0 4px #f3ca8755,inset -4px 0 7px #160a0a99,0 5px 12px #0007}
 .conquest-left-roll:before,.conquest-right-roll:before{left:3px;right:3px;top:8px;bottom:8px;border-top:2px solid #e2c17d;border-bottom:2px solid #e2c17d;box-shadow:0 1px 0 #fff0c477,inset 0 1px 0 #fff0c477}
 .conquest-left-roll:after,.conquest-right-roll:after{width:18px;height:18px;border:2px solid #d8b66e;border-radius:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,#f1d99d 0 2px,#9a5935 3px 5px,#4a211b 6px 100%);box-shadow:0 0 0 2px #52271e,0 0 0 3px #c59c59,0 2px 5px #180d0d99}
 .conquest-tassel{right:8px;top:39%;width:3px;height:65px;border-radius:2px;background:repeating-linear-gradient(180deg,#e0bd78 0 5px,#8b3025 5px 9px,#4a201b 9px 12px);transform:rotate(-3deg);transform-origin:top center;box-shadow:1px 2px 3px #0007}
 .conquest-tassel:before{content:"";position:absolute;left:-5px;top:-5px;width:11px;height:9px;border:1px solid #e1bd76;border-radius:50%;background:radial-gradient(circle at 35% 30%,#e8c984,#813326 65%,#351815);box-shadow:0 1px 3px #0008}
 .conquest-tassel:after{top:58px;left:-7px;width:17px;height:24px;background:repeating-linear-gradient(90deg,#76251f 0 2px,#d5aa61 2px 3px,#9b3928 3px 5px);clip-path:polygon(8% 0,92% 0,100% 100%,72% 76%,51% 100%,28% 76%,0 100%)}
 @media(max-width:560px){.yearly-dialog,#intro>.dialog{width:calc(100vw - 20px);max-height:calc(100dvh - 24px);padding:18px 19px 23px}.yearly-dialog:before,#intro>.dialog:before{margin:-10px -10px 17px;height:20px}.conquest-left-roll,.conquest-right-roll{width:30px}.conquest-left-roll:after,.conquest-right-roll:after{width:15px;height:15px}.conquest-tassel{right:6px}}
 @media(prefers-reduced-motion:reduce){.overlay:not(.hidden) .yearly-dialog,#intro:not(.hidden)>.dialog,.overlay.leaving .yearly-dialog,#intro.leaving>.dialog{animation:none!important}}
 `;
 document.head.append(scrollFinish);

})();
