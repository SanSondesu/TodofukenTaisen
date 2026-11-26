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


 /* 巻物パネルの再調整：横長カード感をなくし、上部に一本の巻軸を明確に配置 */
 const scrollCorrection=document.createElement("style");
 scrollCorrection.textContent=`
 #yearly-overlay .yearly-dialog,
 #intro>.dialog{
   width:min(620px,calc(100vw - 28px))!important;
   height:min(88dvh,900px)!important;
   max-height:calc(100dvh - 28px)!important;
   overflow-y:auto!important;
   overflow-x:hidden!important;
   position:relative!important;
   padding:42px 28px 28px!important;
   border:1px solid #a98a59!important;
   border-top:0!important;
   border-bottom:5px solid #a98a59!important;
   border-radius:2px!important;
   background:
     repeating-linear-gradient(0deg,#80633a0a 0 1px,transparent 1px 5px),
     linear-gradient(90deg,#e5d2ac 0%,#f8efd9 5%,#f2e6ca 50%,#f8efd9 95%,#e4d0a8 100%)!important;
   box-shadow:inset 0 0 0 4px #fff8e5a0,inset 0 0 25px #8b6b3b20,0 16px 40px #1c140c66!important;
 }
 #yearly-overlay .yearly-dialog:before,
 #intro>.dialog:before{
   content:""!important;
   position:sticky!important;
   display:block!important;
   top:0!important;
   z-index:10!important;
   height:25px!important;
   margin:-42px -28px 24px!important;
   border:1px solid #4c241d!important;
   border-radius:13px!important;
   background:
    radial-gradient(ellipse at 2% 50%,#f0d28e 0 2px,#713025 3px 7px,transparent 8px),
    radial-gradient(ellipse at 98% 50%,#f0d28e 0 2px,#713025 3px 7px,transparent 8px),
    linear-gradient(180deg,#d49a61 0%,#a34d35 20%,#6c2d25 48%,#3c1c19 54%,#8a3b2c 82%,#c27c4b 100%)!important;
   box-shadow:inset 0 2px 2px #ffe8b588,inset 0 -3px 4px #1b0d0b99,0 4px 8px #38221666!important;
 }
 #yearly-overlay .yearly-dialog:after,
 #intro>.dialog:after{
   content:""!important;position:absolute!important;pointer-events:none!important;
   z-index:0!important;left:8px!important;right:8px!important;top:34px!important;bottom:8px!important;
   border:1px solid #b99c6c66!important;
 }
 #yearly-overlay .yearly-dialog>*,
 #intro>.dialog>*{position:relative;z-index:1}
 /* 巻物の開閉は控えめに。本文を大きく伸縮させない */
 #yearly-overlay:not(.hidden) .yearly-dialog,
 #intro:not(.hidden)>.dialog{animation:scroll-gentle-in .2s ease-out both!important}
 #yearly-overlay.leaving .yearly-dialog,
 #intro.leaving>.dialog{animation:scroll-gentle-out .16s ease-in both!important}
 @keyframes scroll-gentle-in{from{opacity:.75;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}
 @keyframes scroll-gentle-out{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-2px)}}
 @media(max-width:560px){
  #yearly-overlay .yearly-dialog,#intro>.dialog{
   width:calc(100vw - 20px)!important;height:min(88dvh,900px)!important;
   max-height:calc(100dvh - 20px)!important;padding:35px 19px 23px!important;
  }
  #yearly-overlay .yearly-dialog:before,#intro>.dialog:before{margin:-35px -19px 20px!important;height:22px!important}
 }
 @media(prefers-reduced-motion:reduce){
  #yearly-overlay:not(.hidden) .yearly-dialog,#intro:not(.hidden)>.dialog,
  #yearly-overlay.leaving .yearly-dialog,#intro.leaving>.dialog{animation:none!important}
 }
 `;
 document.head.append(scrollCorrection);


 /* Final scroll treatment: actual vertical parchment sheet with one clear top roller */
 const finalScrollStyle=document.createElement("style");
 finalScrollStyle.textContent=`
 #yearly-overlay .yearly-dialog{
  box-sizing:border-box!important;position:relative!important;isolation:isolate!important;
  width:min(620px,calc(100vw - 30px))!important;
  max-height:88dvh!important;min-height:min(68dvh,620px)!important;
  overflow-y:auto!important;overflow-x:hidden!important;
  margin:18px auto!important;padding:48px 30px 32px!important;
  border:1px solid #b49a6a!important;border-top:0!important;border-bottom:5px solid #9e8150!important;
  border-radius:3px!important;
  background:repeating-linear-gradient(0deg,#81643c0b 0 1px,transparent 1px 5px),linear-gradient(90deg,#e3d0aa 0%,#f8efd9 5%,#f4e9d0 50%,#f8efd9 95%,#e3d0aa 100%)!important;
  box-shadow:inset 0 0 0 5px #fff8e5a6,inset 0 0 28px #80603924,0 15px 38px #1c140c70!important;
 }
 #yearly-overlay .yearly-dialog:before{
  content:""!important;position:absolute!important;display:block!important;
  left:-2px!important;right:-2px!important;top:-1px!important;height:29px!important;
  z-index:8!important;margin:0!important;border:1px solid #49241d!important;border-radius:16px!important;
  background:
   radial-gradient(ellipse at 1.5% 50%,#e7c77f 0 2px,#6d3025 3px 8px,#2b1715 9px,transparent 10px),
   radial-gradient(ellipse at 98.5% 50%,#e7c77f 0 2px,#6d3025 3px 8px,#2b1715 9px,transparent 10px),
   linear-gradient(180deg,#d49a63 0%,#a64e35 18%,#7c3026 43%,#421e1a 55%,#853728 82%,#c27b4a 100%)!important;
  box-shadow:inset 0 2px 3px #ffe7b588,inset 0 -4px 5px #1a0d0caa,0 4px 8px #24150f77!important;
 }
 #yearly-overlay .yearly-dialog:after{
  content:""!important;position:absolute!important;pointer-events:none!important;z-index:0!important;
  left:9px!important;right:9px!important;top:36px!important;bottom:9px!important;
  border:1px solid #b99b6a77!important;box-shadow:inset 0 0 0 1px #fff8e2aa!important;
 }
 #yearly-overlay .yearly-dialog>*{position:relative;z-index:1}
 #yearly-overlay .yearly-dialog .scroll-cord{
  position:absolute;z-index:9;right:35px;top:12px;width:1px;height:25px;
  border-radius:1px;background:#493026;opacity:.82;
  box-shadow:1px 0 0 #d5b77d;pointer-events:none;
 }
 #yearly-overlay .yearly-dialog .scroll-cord:before{
  content:"";position:absolute;left:-3px;top:-1px;width:6px;height:6px;
  border:1px solid #9a7444;border-radius:50%;background:#6f3529;
  box-shadow:0 0 0 1px #e0c58c66;
 }
 #yearly-overlay .yearly-dialog .scroll-cord:after{
  content:"";position:absolute;left:-2px;bottom:-4px;width:4px;height:5px;
  background:#704034;border-radius:0 0 2px 2px;
  box-shadow:1px 0 0 #c3a16c;
 }
 #yearly-overlay:not(.hidden) .yearly-dialog{animation:chronicle-gentle-open .18s ease-out both!important;transform-origin:top center}
 #yearly-overlay.leaving .yearly-dialog{animation:chronicle-gentle-close .15s ease-in both!important;transform-origin:top center}
 @keyframes chronicle-gentle-open{from{opacity:.8;transform:translateY(-2px)}to{opacity:1;transform:translateY(0)}}
 @keyframes chronicle-gentle-close{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-2px)}}
 @media(max-width:560px){
  #yearly-overlay .yearly-dialog{width:calc(100vw - 20px)!important;max-height:86dvh!important;min-height:70dvh!important;padding:42px 19px 25px!important}
  #yearly-overlay .yearly-dialog .scroll-cord{right:23px}
 }
 @media(prefers-reduced-motion:reduce){#yearly-overlay:not(.hidden) .yearly-dialog,#yearly-overlay.leaving .yearly-dialog{animation:none!important}}
 /* Four-season map atmosphere; overlays never intercept map input */
 .map{isolation:isolate}
 .map:before,.map:after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;opacity:0;transition:opacity 1.1s ease}
 .map:before{mix-blend-mode:screen}
 .map:after{mix-blend-mode:multiply}
 .map[data-season="春"].season-active:before{
  opacity:.72;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='132' height='124' viewBox='0 0 132 124'%3E%3Cg fill='%23f5b5c8' fill-opacity='.9' stroke='%23fff0f2' stroke-opacity='.55' stroke-width='1'%3E%3Cellipse cx='28' cy='27' rx='4' ry='7' transform='rotate(-28 28 27)'/%3E%3Cellipse cx='36' cy='31' rx='4' ry='7' transform='rotate(42 36 31)'/%3E%3Cellipse cx='31' cy='39' rx='4' ry='7' transform='rotate(155 31 39)'/%3E%3Cellipse cx='21' cy='36' rx='4' ry='7' transform='rotate(225 21 36)'/%3E%3Cellipse cx='20' cy='27' rx='4' ry='7' transform='rotate(300 20 27)'/%3E%3Ccircle cx='28' cy='33' r='2' fill='%23f3d68d'/%3E%3Cellipse cx='91' cy='86' rx='3.5' ry='6' transform='rotate(25 91 86)'/%3E%3Cellipse cx='99' cy='91' rx='3.5' ry='6' transform='rotate(95 99 91)'/%3E%3Cellipse cx='91' cy='98' rx='3.5' ry='6' transform='rotate(175 91 98)'/%3E%3Cellipse cx='83' cy='91' rx='3.5' ry='6' transform='rotate(250 83 91)'/%3E%3Cellipse cx='85' cy='83' rx='3.5' ry='6' transform='rotate(320 85 83)'/%3E%3Ccircle cx='91' cy='91' r='1.8' fill='%23f3d68d'/%3E%3C/g%3E%3C/svg%3E");
  background-size:132px 124px;
  animation:season-petal-drift 18s linear infinite;
 }
 .map[data-season="春"].season-active:after{opacity:.22;background:linear-gradient(135deg,#f5c9d1,#fff0d8 45%,#a9c78c)}
 .map[data-season="夏"].season-active:before{
  opacity:0!important;background:none!important;animation:none!important;
 }
 .map[data-season="夏"].season-active:after{opacity:.24;background:linear-gradient(145deg,#8dc7d0,#fff3bd 48%,#559b6b);animation:summer-glow 8s ease-in-out infinite alternate}
 .map[data-season="秋"].season-active:before{
  opacity:.72;
  background-image:
   url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='148' height='136' viewBox='0 0 148 136'%3E%3Cg fill='%23c65c35' fill-opacity='.9' stroke='%23f2bd79' stroke-opacity='.55' stroke-width='1'%3E%3Cpath d='M28 18l5 8 8-5-2 10 9 3-9 5 2 10-9-5-7 8-1-11-10-3 9-6-2-10 8 5z'/%3E%3Cpath d='M105 82l4 7 8-4-2 9 8 3-8 5 1 9-8-5-6 7-1-9-9-3 8-5-1-9 7 4z' fill='%23b64a30'/%3E%3C/g%3E%3C/svg%3E"),
   url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='148' height='136' viewBox='0 0 148 136'%3E%3Cg fill='%23e4b94f' fill-opacity='.92' stroke='%23f8e2a1' stroke-opacity='.5' stroke-width='1'%3E%3Cpath d='M28 26Q17 17 13 28Q12 38 27 43Q21 55 31 59Q42 56 37 44Q52 39 47 29Q42 20 34 27Q33 17 28 26Z'/%3E%3Cpath d='M100 88Q88 78 84 89Q83 100 98 104Q92 117 102 121Q113 117 108 105Q123 100 118 90Q113 81 105 88Q104 78 100 88Z'/%3E%3C/g%3E%3C/svg%3E");
  background-size:148px 136px,148px 136px;
  background-position:0 -30px,60px -80px;
  animation:season-leaf-drift 20s linear infinite;
 }
 .map[data-season="秋"].season-active:after{opacity:.28;background:linear-gradient(135deg,#c4773c,#e8c16c 48%,#a84a32)}
 .map[data-season="冬"].season-active:before{
  opacity:.68;background:
   radial-gradient(circle at 12% 16%,#fff 0 1.5px,transparent 2.5px),
   radial-gradient(circle at 65% 37%,#fff 0 2px,transparent 3px),
   radial-gradient(circle at 38% 76%,#fff 0 1px,transparent 2px),
   radial-gradient(ellipse at 50% 0%,#c9e0ec88,transparent 55%);
  background-size:61px 73px,97px 89px,127px 113px,auto;
  animation:season-snow-fall 12s linear infinite;
 }
 .map[data-season="冬"].season-active:after{opacity:.3;background:linear-gradient(145deg,#d5e6ee,#eaf0e9 52%,#c1d8e5)}
 .map .prefecture.winter-snow path,.map .prefecture.winter-snow polygon{
  fill:color-mix(in srgb,var(--faction-fill,#d8c9a9) 70%,#f7fbff 30%)!important;
  stroke:#f8fbff!important;stroke-opacity:.82!important;
 }
 .map .prefecture.winter-mountain path,.map .prefecture.winter-mountain polygon{
  filter:drop-shadow(0 0 1px #f7fbff99);
 }
 @keyframes season-petal-drift{from{background-position:0 -40px,0 0,0 -20px,20px -50px,-10px -70px}to{background-position:0 80px,0 0,90px 150px,-70px 120px,80px 90px}}
 @keyframes season-leaf-drift{from{background-position:0 -50px,10px -30px,-20px -80px,0 0}to{background-position:50px 120px,-40px 140px,70px 110px,0 0}}
 @keyframes season-snow-fall{from{background-position:0 -80px,20px -100px,-30px -60px,0 0}to{background-position:35px 100px,-25px 130px,20px 120px,0 0}}
 @keyframes summer-glow{from{opacity:.16}to{opacity:.34}}
 @media(prefers-reduced-motion:reduce){.map:before,.map:after{animation:none!important;transition:none!important}}
 @media(max-width:560px){.map:before,.map:after{opacity:.75}}
 `;
 document.head.append(finalScrollStyle);
 const chronicleDialog=document.querySelector("#yearly-overlay .yearly-dialog");
 if(chronicleDialog&&!chronicleDialog.querySelector(".scroll-cord")){
  const cord=document.createElement("span");cord.className="scroll-cord";cord.setAttribute("aria-hidden","true");chronicleDialog.append(cord);
 }


 /* 海面：添付された2枚目の青緑色の青海波を基調にした和紙テクスチャ */
 const seaTextureStyle=document.createElement("style");
 seaTextureStyle.textContent=`
 .map{
  background-color:#4b9bad!important;
  background-image:url("./assets/IMG_1999.webp")!important;
  background-position:center center!important;
  background-size:480px 340px!important;
  background-repeat:repeat!important;
 }
 .map svg{background:transparent!important}
 /* 季節の色は海模様を消さず、海面全体に薄く重ねる */
 .map[data-season="春"]{background-color:#579eaa!important}
 .map[data-season="夏"]{background-color:#398fa8!important}
 .map[data-season="秋"]{background-color:#568f9a!important}
 .map[data-season="冬"]{background-color:#739eae!important}
 `;
 document.head.append(seaTextureStyle);

})();
