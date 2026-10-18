/* CMD BOT ARK — nonintrusive perimeter illumination.
 * Uses event delegation so every dynamically loaded page keeps its own handlers. */
(()=>{"use strict";
 let last=null;
 const navSelector='#nav a[data-page],#nav a[href^="#"]';
 const targets='button,.btn,a[role="button"],.guild-bubble,#nav a';
 document.addEventListener('click',event=>{
  const control=event.target?.closest?.(targets);
  if(!control||control.matches(':disabled,[aria-disabled="true"]'))return;
  if(last&&last!==control&&!last.matches(navSelector))last.classList.remove('ark-3d-lit');
  control.classList.remove('ark-3d-lit');
  // Force a fresh outline flash even on repeated clicks.
  void control.offsetWidth;
  control.classList.add('ark-3d-lit');
  last=control;
  if(!control.matches(navSelector)){
   window.setTimeout(()=>{if(control.isConnected)control.classList.remove('ark-3d-lit')},1300);
  }
 },{capture:true});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&last){last.classList.remove('ark-3d-lit');last=null}
 });
})();
