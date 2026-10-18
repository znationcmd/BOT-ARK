/* Real BOT ARK interactive CSS 3D; no camera, microphone, or gaze tracking. */
(()=>{"use strict";
 const fine=window.matchMedia("(hover: hover) and (pointer: fine)");
 const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
 const S=".hero,.panel,.card,.stat-card,.metric-card,.tile,.server-card,.quest-card,.pass-card,.season-card";
 const root=document.documentElement;
 let current=null,raf=0,axis=null,mobileEnabled=false,latestTilt=null;
 const bound=(n,min,max)=>Math.max(min,Math.min(max,n));
 const transform=(card,x,y,px=50,py=50)=>{
  card.style.setProperty("--ark-card-x",x.toFixed(2)+"deg");
  card.style.setProperty("--ark-card-y",y.toFixed(2)+"deg");
  card.style.setProperty("--ark-shine-x",px.toFixed(1)+"%");
  card.style.setProperty("--ark-shine-y",py.toFixed(1)+"%");
 };
 function resetCard(card){
  if(!card)return;
  card.classList.remove("ark-tilt-pointing");
  for(const x of ["--ark-card-x","--ark-card-y","--ark-shine-x","--ark-shine-y"])card.style.removeProperty(x);
 }
 function attachSurfaces(){
  if(reduced.matches)return;
  document.querySelectorAll("#main "+S.split(",").join(",#main ")).forEach(el=>{
   // Outer surfaces only: nested transforms can obscure form elements.
   if(el.parentElement?.closest?.("#main "+S.split(",").join(",#main ")))return;
   el.classList.add("ark-tilt-surface");
  });
 }
 function updateMouse(e){
  if(reduced.matches||mobileEnabled||!fine.matches)return;
  const el=e.target?.closest?.(S);
  const card=el?.closest?.("#main")?el:null;
  if(current!==card){resetCard(current);current=card}
  if(!card)return;
  const rect=card.getBoundingClientRect();
  const u=bound((e.clientX-rect.left)/Math.max(1,rect.width),0,1);
  const v=bound((e.clientY-rect.top)/Math.max(1,rect.height),0,1);
  axis={card,x:(.5-v)*11,y:(u-.5)*13,px:u*100,py:v*100,mouseX:e.clientX,mouseY:e.clientY};
  if(raf)return;
  raf=requestAnimationFrame(()=>{
   raf=0;
   if(!axis||!axis.card.isConnected)return;
   const a=axis;
   a.card.classList.add("ark-tilt-pointing");
   transform(a.card,a.x,a.y,a.px,a.py);
   root.style.setProperty("--ark-float-x",((a.mouseX/window.innerWidth-.5)*-11).toFixed(1)+"px");
   root.style.setProperty("--ark-float-y",((a.mouseY/window.innerHeight-.5)*-8).toFixed(1)+"px");
  });
 }
 document.addEventListener("pointermove",updateMouse,{passive:true});
 document.addEventListener("pointerout",e=>{
  if(current&&!current.contains(e.relatedTarget)){resetCard(current);current=null}
 },{passive:true});
 const btn=document.createElement("button");
 btn.type="button";btn.className="ark-motion-toggle";
 btn.setAttribute("aria-pressed","false");
 btn.textContent="3D · inclinaison";
 btn.title="Activer la perspective 3D avec l'inclinaison du téléphone";
 const showButton=()=>{
  if(!document.querySelector(".ark-motion-toggle")){
   const parent=document.querySelector(".topbar .top-right")||document.querySelector(".draft-mobile-header .draft-header-actions")||document.body;
   parent?.prepend(btn);
  }
 };
 const updateButton=()=>{btn.setAttribute("aria-pressed",String(mobileEnabled));btn.textContent=mobileEnabled?"3D · activée":"3D · inclinaison"};
 const onTilt=e=>{
  if(!mobileEnabled||reduced.matches||document.hidden)return;
  if(!Number.isFinite(e.beta)||!Number.isFinite(e.gamma))return;
  latestTilt={x:bound((e.beta-38)*.09,-3.8,3.8),y:bound(e.gamma*.095,-4,4)};
  if(raf)return;
  raf=requestAnimationFrame(()=>{
   raf=0;
   if(!latestTilt)return;
   const {x,y}=latestTilt;
   root.style.setProperty("--ark-view-x",x.toFixed(2)+"deg");
   root.style.setProperty("--ark-view-y",y.toFixed(2)+"deg");
   root.style.setProperty("--ark-float-x",(-y*1.8).toFixed(1)+"px");
   root.style.setProperty("--ark-float-y",(x*1.5).toFixed(1)+"px");
  });
 };
 const resetGlobal=()=>{
  for(const name of ["--ark-view-x","--ark-view-y","--ark-float-x","--ark-float-y"])root.style.removeProperty(name);
 };
 btn.addEventListener("click",async()=>{
  if(mobileEnabled){
   mobileEnabled=false;
   window.removeEventListener("deviceorientation",onTilt);
   resetGlobal();updateButton();return;
  }
  if(reduced.matches){btn.textContent="3D désactivée par les préférences d’accessibilité";return}
  if(typeof window.DeviceOrientationEvent==="undefined"){
   btn.textContent="Capteur non disponible · souris 3D active";
   return;
  }
  try{
   if(typeof DeviceOrientationEvent.requestPermission==="function"){
    const permission=await DeviceOrientationEvent.requestPermission();
    if(permission!=="granted"){btn.textContent="Autorisation capteur refusée";return}
   }
   resetCard(current);current=null;
   mobileEnabled=true;
   window.addEventListener("deviceorientation",onTilt,{passive:true});
   updateButton();
  }catch{
   btn.textContent="Capteur indisponible";
  }
 });
 const boot=()=>{
  showButton();attachSurfaces();
  const main=document.querySelector("#main");
  if(main){
   let pending=false;
   new MutationObserver(()=>{
    if(pending)return;pending=true;
    requestAnimationFrame(()=>{pending=false;attachSurfaces()});
   }).observe(main,{childList:true,subtree:false});
  }
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
 reduced.addEventListener?.("change",()=>{
  if(reduced.matches){
   if(mobileEnabled){mobileEnabled=false;window.removeEventListener("deviceorientation",onTilt)}
   resetGlobal();resetCard(current);current=null;updateButton();
  }
 });
})();
