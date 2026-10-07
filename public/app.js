'use strict';
const $=q=>document.querySelector(q),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const L=ArkI18n;let language=localStorage.getItem('bot-ark-language')||'fr';if(!L.languages.includes(language))language='fr';
const tr=k=>L.t(language,k);let me={loggedIn:false,role:null,guilds:[],bot:{}},state={},selectedGuild='',page='home',demo=false,ticketView=null,installPrompt=null,worker=null,aiReady=false,aiBusy=false,validatorFile=null,validatorResult=null;
const moduleLabels={
 messages:'Messages',welcome:'Arrivées et départs',autoroles:'Rôles automatiques',levels:'Niveaux',tempvoice:'Salons vocaux temporaires',infinity:"Route de l’Infini",suggestions:'Suggestions',secureroles:'Rôles sécurisés',moderation:'Modération',automod:'Auto-Modération',reports:'Signalements',snippets:'Snippets',social:'Notifications sociales',recurring:'Messages récurrents',statschannels:'Salons de statistiques',birthdays:'Anniversaires',customcommands:'Commandes personnalisées',wordreactions:'Réactions de mots',starboard:'Starboards',reactionroles:'Rôles-Réactions',giveaways:'Lots & Giveaways',polls:'Sondages',verification:'Vérification',embeds:'Embeds',counters:'Compteurs',invitations:'Invitations',reputation:'Réputation'
};
const moduleKeys=new Set(Object.keys(moduleLabels));
const nav=[['home','◈'],['settings','⚙'],['messages','▤'],['welcome','▣'],['autoroles','▧'],['verification','✓'],['levels','↗'],['invitations','↗'],['reputation','★'],['rp','♜'],['tempvoice','🔊'],['infinity','∞'],['suggestions','💡'],['secureroles','🛡'],['moderation','⚒'],['automod','◈'],['reports','⚑'],['logs','◷'],['tickets','🎫'],['giveaways','🎁'],['polls','☑'],['embeds','▤'],['snippets','▤'],['social','🔊'],['recurring','◷'],['statschannels','⌁'],['counters','⌁'],['birthdays','🎂'],['customcommands','✧'],['wordreactions','☺'],['starboard','★'],['reactionroles','☷'],['premium','★'],['topservers','🏆'],['interpol','⛨'],['partners','🤝'],['maps','⌖'],['recipes','⚗'],['shop','◆'],['lottery','🎟'],['minigames','🎮'],['quests','✧'],['pass','◇'],['players','♙'],['seasons','◷'],['validator','🧰'],['assistant','✦'],['guide','?']];
const navGroups=[
 ['PARAMÈTRES',['settings','messages']],
 ['ACCUEIL DES MEMBRES',['welcome','autoroles','verification']],
 ['ENGAGEMENT',['levels','invitations','reputation','rp','tempvoice','infinity','suggestions','quests','pass','seasons']],
 ['SÉCURITÉ',['secureroles','moderation','automod','reports','logs','interpol']],
 ['COMMUNICATION',['tickets','giveaways','polls','embeds','snippets','social','recurring','statschannels','counters']],
 ['COMMUNAUTÉ',['birthdays','customcommands','wordreactions','starboard','reactionroles','shop','lottery','minigames']],
 ['ARK',['maps','recipes','players','validator']],
 ['RÉSEAU',['premium','topservers','partners','assistant','guide']]
];
const labelFor=key=>moduleLabels[key]||tr(key);
const ARK_MAPS=[
{name:'The Island',type:'official'},{name:'Scorched Earth',type:'official'},{name:'The Center',type:'official'},{name:'Aberration',type:'official'},{name:'Extinction',type:'official'},{name:'Astraeos',type:'official'},{name:'Ragnarok',type:'official'},{name:'Valguero',type:'official'},{name:'Crystal Isles',type:'official'},{name:'Fjordur',type:'official'},{name:'Genesis: Part 1',type:'official'},{name:'Genesis: Part 2',type:'official'},{name:'Lost Colony',type:'official'},{name:'Club ARK',type:'official'},
{name:'Althemia Magic Ground',type:'mod'},{name:'Amissa',type:'mod'},{name:'Appalachia',type:'mod'},{name:'Arkis',type:'mod'},{name:'Arkopolis Free',type:'mod'},{name:'ASurviveTheNight (Survive the Night)',type:'mod'},{name:'Atlantis',type:'mod'},{name:'Bjarnheim',type:'mod'},{name:'Dark Abyss Dome',type:'mod'},{name:"Dark's Event Map",type:'mod'},{name:'Dragon Topía',type:'mod'},{name:'Dragon Triangle',type:'mod'},{name:'Eden Premium',type:'mod'},{name:'EliteArk Arena',type:'mod'},{name:'EliteArk: Deadzone',type:'mod'},{name:'Enclave: Survival Skyward',type:'mod'},{name:'Epiphany',type:'mod'},{name:'ExtinctionOverGrowth',type:'mod'},{name:'FLASH WARZONE',type:'mod'},{name:'Forglar Part I',type:'mod'},{name:'Forglar Part II',type:'mod'},{name:'Svartalfheim Premium',type:'mod'},{name:'The Island Reforged',type:'mod'},{name:'Scorched Earth Reborn',type:'mod'},{name:'LostCity',type:'mod'},{name:'Islands Of Epoch',type:'mod'},{name:'Temptress Lagoon: Enchanted',type:'mod'},{name:'Arkageddon Map Event [Crossplay]',type:'mod'},{name:'Thaloria',type:'mod'},{name:'ARK Ice Age',type:'mod'},{name:'SmokeZone',type:'mod'}
];
const ARK_RECIPES=[
{name:'Narcotic',cat:'Composants',ingredients:'Narcoberry ×5 · Spoiled Meat ×1'},
{name:'Stimulant',cat:'Composants',ingredients:'Stimberry ×5 · Sparkpowder ×2'},
{name:'Medical Brew',cat:'Boissons',ingredients:'Tintoberry ×20 · Narcotic ×2 · Water'},
{name:'Energy Brew',cat:'Boissons',ingredients:'Azulberry ×20 · Stimulant ×2 · Water'},
{name:'Lesser Antidote',cat:'Boissons',ingredients:'Rare Flower ×10 · Rare Mushroom ×10 · Leech Blood / Horn ×3 · Narcotic ×1'},
{name:'Beer Liquid',cat:'Boissons',ingredients:'Thatch ×40 · Berries ×50 · Water'},
{name:'Calien Soup',cat:'Cuisine',ingredients:'Citronal ×5 · Tintoberry ×20 · Amarberry ×20 · Mejoberry ×10 · Stimulant ×2 · Water'},
{name:'Enduro Stew',cat:'Cuisine',ingredients:'Cooked Meat ×9 · Rockarrot ×5 · Savoroot ×5 · Mejoberry ×10 · Stimulant ×2 · Water'},
{name:'Focal Chili',cat:'Cuisine',ingredients:'Cooked Meat ×9 · Citronal ×5 · Amarberry ×20 · Azulberry ×20 · Tintoberry ×20 · Mejoberry ×10 · Water'},
{name:'Fria Curry',cat:'Cuisine',ingredients:'Longrass ×5 · Rockarrot ×5 · Azulberry ×20 · Mejoberry ×10 · Narcotic ×2 · Water'},
{name:'Lazarus Chowder',cat:'Cuisine',ingredients:'Cooked Meat ×9 · Savoroot ×5 · Longrass ×5 · Mejoberry ×10 · Narcotic ×2 · Water'},
{name:'Battle Tartare',cat:'Cuisine',ingredients:'Raw Prime Meat ×3 · Mejoberry ×20 · Stimulant ×8 · Rare Flower ×2 · Citronal ×1 · Water'},
{name:'Shadow Steak Saute',cat:'Cuisine',ingredients:'Cooked Prime Meat ×3 · Mejoberry ×20 · Narcotic ×8 · Rare Mushroom ×2 · Savoroot ×1 · Rockarrot ×1 · Water'},
{name:'Mindwipe Tonic',cat:'Cuisine',ingredients:'Cooked Prime Meat ×24 · Mejoberry ×200 · Narcotic ×72 · Stimulant ×72 · Rare Mushroom ×20 · Rare Flower ×20 · Water'},
{name:'Sweet Vegetable Cake',cat:'Cuisine',ingredients:'Sap ×4 · Rockarrot ×2 · Longrass ×2 · Savoroot ×2 · Stimulant ×4 · Fiber ×25 · Giant Bee Honey ×2 · Water'},
{name:'Basic Kibble',cat:'Kibble',ingredients:'Extra Small Egg ×1 · Cooked Meat ×1 · Amarberry ×10 · Mejoberry ×5 · Tintoberry ×10 · Fiber ×5 · Water'},
{name:'Simple Kibble',cat:'Kibble',ingredients:'Small Egg ×1 · Cooked Fish Meat ×1 · Rockarrot ×2 · Mejoberry ×5 · Fiber ×5 · Water'},
{name:'Regular Kibble',cat:'Kibble',ingredients:'Medium Egg ×1 · Cooked Meat Jerky ×1 · Longrass ×2 · Savoroot ×2 · Fiber ×5 · Water'},
{name:'Superior Kibble',cat:'Kibble',ingredients:'Large Egg ×1 · Prime Meat Jerky ×1 · Citronal ×2 · Sap ×1 · Rare Mushroom ×2 · Fiber ×5 · Water'},
{name:'Exceptional Kibble',cat:'Kibble',ingredients:'Extra Large Egg ×1 · Focal Chili ×1 · Rare Flower ×1 · Mejoberry ×10 · Fiber ×5 · Water'},
{name:'Extraordinary Kibble',cat:'Kibble',ingredients:'Special Egg ×1 · Giant Bee Honey ×1 · Lazarus Chowder ×1 · Mejoberry ×10 · Fiber ×5 · Water'},
{name:'Sparkpowder',cat:'Fabrication',ingredients:'Flint ×2 · Stone ×1'},
{name:'Gunpowder',cat:'Fabrication',ingredients:'Sparkpowder ×1 · Charcoal ×1'},
{name:'Cementing Paste',cat:'Fabrication',ingredients:'Stone ×4 · Chitin/Keratin ×8'},
{name:'Gasoline',cat:'Fabrication',ingredients:'Hide ×5 · Oil ×6'},
{name:'Metal Ingot',cat:'Fonderie',ingredients:'Metal ×2'},
{name:'Scrap Metal Ingot',cat:'Fonderie',ingredients:'Scrap Metal ×2'},
{name:'Polymer',cat:'Fabrication',ingredients:'Obsidian ×2 · Cementing Paste ×2'},
{name:'Electronics',cat:'Fabrication',ingredients:'Silica Pearls ×3 · Metal Ingot ×1'},
{name:'Propellant',cat:'Fabrication',ingredients:'Sulfur ×1 · Cactus Sap ×1 · Oil ×1'},
{name:'Clay',cat:'Fabrication',ingredients:'Sand ×2 · Cactus Sap ×1'},
{name:'Preserving Salt',cat:'Fabrication',ingredients:'Salt ×2 · Sulfur ×1'},
{name:'Absorbent Substrate',cat:'Fabrication',ingredients:'Black Pearl ×8 · Sap ×8 · Oil ×8'},
{name:'Cooked Meat',cat:'Cuisson',ingredients:'Raw Meat ×1'},
{name:'Cooked Prime Meat',cat:'Cuisson',ingredients:'Raw Prime Meat ×1'},
{name:'Cooked Fish Meat',cat:'Cuisson',ingredients:'Raw Fish Meat ×1'},
{name:'Cooked Prime Fish Meat',cat:'Cuisson',ingredients:'Raw Prime Fish Meat ×1'},
{name:'Cooked Lamb Chop',cat:'Cuisson',ingredients:'Raw Mutton ×1'},
{name:'Meat Jerky',cat:'Conservation',ingredients:'Cooked Meat ×1 · Oil ×1 · Sparkpowder ×3'},
{name:'Prime Meat Jerky',cat:'Conservation',ingredients:'Cooked Prime Meat ×1 · Oil ×1 · Sparkpowder ×3'},
{name:'Wyvern Milk preservation',cat:'Conservation',ingredients:'Preserving Bin / suitable storage'},
{name:'Medical Brew (custom stack)',cat:'Serveur',ingredients:'Recette serveur configurable'},
{name:'Custom Recipe',cat:'Personnalisée',ingredients:'Créée par le joueur avec une Note dans une marmite'}
];
const adminPages=['players','seasons','logs','validator','settings'];const isStaff=()=>demo||me.role==='owner'||me.role==='admin';
const localeFor={fr:'fr-FR',en:'en-GB',us:'en-US',de:'de-DE',es:'es-ES',it:'it-IT',ru:'ru-RU',ko:'ko-KR',ja:'ja-JP',zh:'zh-CN'};const num=n=>new Intl.NumberFormat(localeFor[language]||'en-US').format(n||0),date=d=>d?new Intl.DateTimeFormat(localeFor[language]||'en-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date(d)):'—';
const button=(label,action,id='',kind='ghost small',write=false)=>`<button type="button" class="${kind}" data-action="${action}" data-id="${esc(id)}" ${demo&&write?'disabled':''}>${esc(tr(label))}</button>`;
const pill=(key,style='')=>`<span class="pill ${style}">${esc(tr(key))}</span>`;
const head=(key,buttons='')=>`<div class="page-head"><div><div class="eyebrow">ARK: SURVIVAL ASCENDED</div><h1>${esc(tr(key))}</h1></div><div class="head-actions">${buttons}</div></div>`;
const empty=()=>`<div class="empty">${esc(tr('empty'))}</div>`;
const panel=(title,content,actions='')=>`<section class="panel"><div class="panel-head"><h2>${esc(tr(title))}</h2>${actions}</div>${content}</section>`;
const progress=(value,goal)=>`<div class="progress"><span style="width:${Math.max(0,Math.min(100,100*(value||0)/Math.max(1,goal)))}%"></span></div>`;
function toast(text,error=false){$('#toast').textContent=text;$('#toast').className=error?'error':'';$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,5000)}
async function api(url,body,method=body?'POST':'GET'){
 if(demo)throw Error('demoNotice');if(!navigator.onLine)throw Error('offline');
 const separator=url.includes('?')?'&':'?';const response=await fetch(url+(selectedGuild?separator+'guild='+encodeURIComponent(selectedGuild):''),{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,credentials:'same-origin'});
 const data=await response.json();if(!response.ok){if(response.status===401&&!url.includes('login')){me.loggedIn=false;render()}throw Error(data.error||'error')}return data;
}
function demoState(){const seasons={fr:'Saison 01 · L’éveil de l’île',en:'Season 01 · Island awakening',de:'Saison 01 · Erwachen der Insel',es:'Temporada 01 · El despertar de la isla',it:'Stagione 01 · Il risveglio dell’isola',ru:'Сезон 01 · Пробуждение острова'};const names={fr:['Apprivoise ton premier Raptor','Explore les ruines anciennes','Relève le défi des boss'],en:['Tame your first Raptor','Explore ancient ruins','Take on the boss challenge'],de:['Zähme deinen ersten Raptor','Erkunde alte Ruinen','Bestehe die Boss-Herausforderung'],es:['Domestica tu primer Raptor','Explora ruinas antiguas','Supera el desafío de jefes'],it:['Addomestica il primo Raptor','Esplora le rovine antiche','Affronta la sfida dei boss'],ru:['Приручи первого раптора','Исследуй древние руины','Пройди испытание боссов']};const now=Date.now();const season={id:1,name:seasons[language]||seasons.en,starts_at:new Date(now-86400000*8).toISOString(),ends_at:new Date(now+86400000*22).toISOString(),xp_per_tier:100,status:'published'};const quests=(names[language]||names.en).map((title,i)=>({id:i+1,title,description:['Raptor','The Island','Broodmother'][i],kind:['tame','explore','boss'][i],period:['daily','weekly','season'][i],xp:[150,250,500][i],goal:[3,5,1][i],progress:[1,3,0][i],completed:false,season_id:1,enabled:true}));const rewards=Array.from({length:12},(_,i)=>({id:i+1,tier:Math.floor(i/2)+1,title:[tr('role')+' · Survivor',tr('premium')+' · Explorer'][i%2],description:tr(i%2?'manual':'role'),premium:Boolean(i%2),unlocked:i<8,claim_status:i<2?'delivered':null,kind:i%2?'manual':'role'}));return {season,seasons:[season],quests,allQuests:quests,rewards,pass:{season,xp:420,tier:4,premium:false,rewards},leaderboard:[{name:'Astrid',xp:1850},{name:'Derek',xp:1420},{name:'Ragnar',xp:1180},{name:'Freya',xp:960}],tickets:[{id:12,title:tr('newTicket'),user_id:'Derek',status:'open',created_at:new Date(now-3600000).toISOString()}],stats:{members:128,tickets:3,pending:5},claims:[],members:[{user_id:'10000000000001',name:'Derek',platform:'Xbox',game_id:'ARK-EXAMPLE',verified:true,premium:false}],audit:[],logs:[],rewardClaims:[]}}
async function refresh(){if(demo){state=demoState();render();return}me=await api('/api/me');if(me.loggedIn&&!me.discordLinked&&me.discordAccountUrl&&!sessionStorage.getItem('bot-ark-discord-link-tried')){sessionStorage.setItem('bot-ark-discord-link-tried','1');location.href=me.discordAccountUrl;return}if(me.loggedIn){if(!selectedGuild)selectedGuild=me.guildId||me.guilds.find(g=>g.installed!==false)?.id||me.guilds[0]?.id||'';const selected=me.guilds.find(g=>String(g.id)===String(selectedGuild));if(selected?.installed!==false&&selectedGuild)state=await api('/api/state');else state={};}render()}
function navigation(){
 const allowed=new Map(nav.filter(([key])=>!adminPages.includes(key)||isStaff()).map(x=>[x[0],x]));
 const navHtml=navGroups.map(([title,items])=>{
  const rows=items.filter(k=>allowed.has(k)).map(k=>{const [,icon]=allowed.get(k);return `<a href="#${k}" data-module="${esc((labelFor(k)+' '+k).toLowerCase())}" class="${page===k?'active':''}"><span class="nav-icon" aria-hidden="true">${icon}</span><span>${esc(labelFor(k))}</span></a>`}).join('');
  return rows?`<section class="draft-nav-group" data-group><h3>${title}</h3>${rows}</section>`:'';
 }).join('');
 $('#nav').innerHTML=navHtml;
 $('#install').textContent='↓ '+tr('install');
 $('#account').textContent=demo?tr('login'):me.loggedIn?tr('logout'):tr('login');
 $('#language').value=language;$('#page-title').textContent=labelFor(page);
 document.documentElement.lang=language;document.title=`BOT ARK · ${labelFor(page)}`;
 const select=$('#guild-select');select.hidden=!me.loggedIn||!me.guilds.length;
 if(!select.hidden){select.innerHTML=me.guilds.filter(g=>g.installed!==false).map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');select.value=selectedGuild}
 renderGuildRail();
 bindModuleSearch();
}
function inviteBotUrl(guildId=''){const base=me.bot?.inviteUrl||'';if(!base)return '#';try{const u=new URL(base);if(guildId){u.searchParams.set('guild_id',guildId);u.searchParams.set('disable_guild_select','true')}else u.searchParams.set('disable_guild_select','false');return u.toString()}catch{return base}}
async function installGuildFlow(id){const url=inviteBotUrl(id);if(!url||url==='#')return;const popup=window.open('about:blank','bot-ark-install');if(!popup){location.href=url;return}try{popup.opener=null;popup.location.href=url}catch{}const started=Date.now();const timer=setInterval(async()=>{if(Date.now()-started>120000){clearInterval(timer);return}try{const next=await api('/api/me'),ready=(next.guilds||[]).find(g=>String(g.id)===String(id)&&g.installed!==false);if(!ready)return;clearInterval(timer);selectedGuild=id;await api('/api/guild/select',{id});try{popup.location.href=location.origin+'/?installedGuild='+encodeURIComponent(id)+'#home'}catch{}location.hash='home';await refresh()}catch{}},1500)}
function initials(name){return String(name||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'?'}
function ensureGuildVisualStyles(){if(document.getElementById('guild-visual-styles'))return;const s=document.createElement('style');s.id='guild-visual-styles';s.textContent='.guild-bubble.not-installed{opacity:.46;filter:grayscale(.72);border-style:dashed}.guild-bubble.not-installed:after{content:"+";position:absolute;right:0;bottom:0;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:#252a2e;border:1px solid #111;color:#fff;font-size:17px;line-height:1;filter:none}.guild-bubble.not-installed:hover{opacity:.78;filter:grayscale(.35)}.server-context-icon.not-installed{opacity:.52;filter:grayscale(.72)}.guild-muted{opacity:.62}';document.head.appendChild(s)}
function renderGuildRail(){ensureGuildVisualStyles();
 const rail=$('#guild-rail'),context=$('#server-context'),strip=$('#mobile-guild-strip');if(!rail||!context)return;
 if(!me.loggedIn||!me.guilds?.length){
  rail.innerHTML='';context.innerHTML=`<strong>BOT ARK</strong><small>Discord non sélectionné</small>${me.bot?.inviteUrl?`<a class="smallbtn" href="${esc(inviteBotUrl())}" target="_blank" rel="noopener">＋ ${esc(tr('inviteBot'))}</a>`:''}`;
  if(strip){strip.innerHTML='';strip.hidden=true}
  return;
 }
 const bubbles=me.guilds.map(g=>{const installed=g.installed!==false;return `<button type="button" class="guild-bubble ${installed?'':'not-installed'} ${g.id===selectedGuild&&installed?'active':''}" data-guild="${esc(g.id)}" data-installed="${installed?'1':'0'}" title="${esc(g.name)}${installed?'':' · Bot non installé'}">${g.icon?`<img src="${esc(g.icon)}" alt="">`:`<span>${esc(initials(g.name))}</span>`}</button>`}).join('');
 rail.innerHTML=bubbles;
 if(strip){strip.hidden=false;strip.innerHTML=`<strong>DISCORD</strong><div class="mobile-guild-scroll">${bubbles}</div>`}
 const current=me.guilds.find(g=>g.id===selectedGuild)||me.guilds[0];
 {const installed=current.installed!==false;context.innerHTML=`<div class="server-context-icon ${installed?'':'not-installed'}">${current.icon?`<img src="${esc(current.icon)}" alt="">`:`<span>${esc(initials(current.name))}</span>`}</div><div class="${installed?'':'guild-muted'}"><strong>${esc(current.name)}</strong><small>${installed?'Bot installé':'Bot non installé'} · ${num(current.memberCount||0)} membre(s)</small></div>${installed?`<a class="smallbtn" href="${esc(inviteBotUrl())}" target="_blank" rel="noopener">＋ ${esc(tr('inviteBot'))}</a>`:`<button class="smallbtn" type="button" onclick="installGuildFlow('${esc(current.id)}')">＋ ${esc(tr('inviteBot'))}</button>`}`;}
 const bind=root=>root?.querySelectorAll('[data-guild]').forEach(b=>b.onclick=async()=>{const id=b.dataset.guild;if(b.dataset.installed==='0'){await installGuildFlow(id);return}if(id===selectedGuild)return;selectedGuild=id;await api('/api/guild/select',{id});await refresh();});
 bind(rail);bind(strip);
}
function bindModuleSearch(){
 const input=$('#module-search');if(!input)return;input.value='';
 input.oninput=()=>{const q=input.value.trim().toLowerCase();document.querySelectorAll('#nav [data-module]').forEach(a=>a.hidden=!!q&&!a.dataset.module.includes(q));document.querySelectorAll('#nav [data-group]').forEach(g=>g.hidden=![...g.querySelectorAll('[data-module]')].some(a=>!a.hidden));};
}
function loginView(){
 const publicTools=[
  ['maps','⌖','Cartes ARK','Cartes officielles et moddés · groupes et repères','cartes exploration'],
  ['recipes','⚗','Recettes','Kibble, composants, cuisine et fabrication','recettes survie'],
  ['quests','✧','Quêtes','Défis communautaires et progression','quetes saison'],
  ['pass','◇','Season Pass','Récompenses et niveaux saisonniers','saison rewards'],
  ['assistant','✦','IA ARK','Aide dinos, ressources, cartes et serveur','ia aide'],
  ['guide','?','Guide & PWA','Installation mobile, PC et configuration','guide pwa']
 ];
 const cards=publicTools.map(([key,icon,title,desc,tags])=>`<button class="portal-card" type="button" data-action="demo-nav" data-id="${key}" data-search="${esc((title+' '+desc+' '+tags).toLowerCase())}" data-tags="${esc(tags)}"><span class="portal-card-icon">${icon}</span><span><strong>${esc(title)}</strong><small>${esc(desc)}</small></span><span class="portal-arrow">›</span></button>`).join('');
 return `<section class="modmap-home modmap-public">
   <div class="portal-center">
    <div class="modmap-kicker">ARK: SURVIVAL ASCENDED</div>
    <img class="modmap-logo" src="/icon-512.png?v=11" alt="BOT ARK">
    <h1 class="modmap-title"><span>◢</span> BOT ARK <span>◤</span></h1>
    <p class="modmap-subtitle">VALHALLA EXTINCTION · Dashboard communautaire ARK</p>
    <div class="system-pill"><span></span>SYSTÈME ACTIF</div>
   </div>
   <div class="modmap-toolbar">
    <label class="portal-tags"><span>🏷️</span><select id="portal-tag" aria-label="Tags"><option value="">Tous les tags</option><option value="cartes">Cartes</option><option value="survie">Survie</option><option value="saison">Saison</option><option value="ia">IA</option><option value="guide">Guide</option></select></label>
    <label class="portal-search"><span>⌕</span><input id="portal-search" autocomplete="off" placeholder="Rechercher un outil…"></label>
   </div>
   <div id="portal-grid" class="portal-grid">${cards}</div>
   <div id="portal-empty" class="portal-empty" hidden>Aucun outil trouvé.</div>
   <div class="portal-connect">
    <div><div class="eyebrow">ACCÈS SERVEUR</div><h2>Connecte ton serveur Discord</h2><p>Pour gérer les joueurs, tickets, quêtes, saisons, économie et paramètres du bot.</p></div>
    <div class="portal-login-form">
      <a class="primary" href="/auth/discord-account" style="display:flex;align-items:center;justify-content:center;text-decoration:none">◈ Connexion avec Discord</a>
      <form id="login-form" class="portal-login-form">
        <input name="username" autocomplete="username" placeholder="${esc(tr('username'))}" required>
        <input name="password" type="password" autocomplete="current-password" placeholder="${esc(tr('password'))}" required>
        <div class="form-error" id="login-error" role="alert"></div>
        <button class="ghost">Connexion propriétaire CMD</button>
      </form>
    </div>
    <div class="portal-connect-actions">
      <button type="button" class="ghost" data-action="demo">Aperçu du Dashboard</button>
      <a class="portal-discord" href="https://discord.gg/53EKbkKvyn" target="_blank" rel="noopener">Rejoindre Discord ↗</a>
    </div>
   </div>
 </section>`;
}
function questCard(q){return `<article class="quest-card"><div class="card-top"><span class="quest-icon" aria-hidden="true">${({tame:'♜',kill:'✦',boss:'♛',craft:'⚒',build:'⌂',explore:'◈',connect:'◉'})[q.kind]||'✧'}</span>${pill(q.period)}</div><h3>${esc(q.title)}</h3><p>${esc(q.description||tr(q.kind))}</p><div class="card-bottom"><div class="progress-info"><span>${esc(tr('progress'))}</span><span>${num(q.progress)} / ${num(q.goal)}</span></div>${progress(q.progress,q.goal)}<div class="card-actions"><span class="xp-tag">+${num(q.xp)} XP</span>${q.completed?pill('completed','teal'):button('submitProof','claim-quest',q.id,'ghost small',true)}</div></div></article>`}
function homeView(){
 const p=state.pass||{tier:0,xp:0},stats=state.stats||{};
 const tools=[
  ['maps','⌖','Cartes ARK','Cartes officielles et moddés, groupes et repères','cartes exploration'],
  ['recipes','⚗','Recettes','Kibble, composants, cuisine et fabrication','recettes survie'],
  ['shop','◆','Shop','Boutique RP et packs communautaires','shop rp'],
  ['rp','♜','Économie RP','Banque, métiers, factions et monnaie','rp economie'],
  ['quests','✧','Quêtes','Défis quotidiens, hebdo et saisonniers','quetes saison'],
  ['pass','◇','Season Pass','Niveaux, XP et récompenses','saison rewards'],
  ['tickets','▣','Tickets','Support joueurs et suivi des demandes','support tickets'],
  ['validator','🧰','Validateur fichiers','JSON, XML et INI · analyse, correction et téléchargement','fichiers json xml ini'],
  ['assistant','✦','IA ARK','Assistant dinos, ressources, cartes et serveur','ia aide'],
  ['guide','?','Guide & PWA','Installation mobile, PC et configuration','guide pwa']
 ];
 const cards=tools.map(([key,icon,title,desc,tags])=>`<button class="portal-card" type="button" data-action="navigate" data-id="${key}" data-search="${esc((title+' '+desc+' '+tags).toLowerCase())}" data-tags="${esc(tags)}"><span class="portal-card-icon">${icon}</span><span><strong>${esc(title)}</strong><small>${esc(desc)}</small></span><span class="portal-arrow">›</span></button>`).join('');
 return `<section class="modmap-home">
   <div class="portal-center">
    <div class="modmap-kicker">ARK: SURVIVAL ASCENDED</div>
    <img class="modmap-logo" src="/icon-512.png?v=11" alt="BOT ARK">
    <h1 class="modmap-title"><span>◢</span> BOT ARK <span>◤</span></h1>
    <p class="modmap-subtitle">VALHALLA EXTINCTION · ${esc(state.season?.name||tr('noSeason'))}</p>
    <div class="system-pill"><span></span>${me.bot?.ready?'BOT DISCORD CONNECTÉ':'SYSTÈME ACTIF'}</div>
   </div>
   <div class="modmap-toolbar">
    <label class="portal-tags"><span>🏷️</span><select id="portal-tag" aria-label="Tags"><option value="">Tous les tags</option><option value="cartes">Cartes</option><option value="survie">Survie</option><option value="rp">RP</option><option value="saison">Saison</option><option value="support">Support</option><option value="ia">IA</option></select></label>
    <label class="portal-search"><span>⌕</span><input id="portal-search" autocomplete="off" placeholder="Rechercher un outil…"></label>
   </div>
   <div id="portal-grid" class="portal-grid">${cards}</div>
   <div id="portal-empty" class="portal-empty" hidden>Aucun outil trouvé.</div>
   <div class="portal-stats">
     <div><span>Niveau</span><strong>${num(p.tier)}</strong><small>${num(p.xp)} XP</small></div>
     <div><span>Membres</span><strong>${num(stats.members)}</strong><small>communauté</small></div>
     <div><span>Tickets</span><strong>${num(stats.tickets)}</strong><small>ouverts</small></div>
     <div><span>Quêtes</span><strong>${num(stats.pending)}</strong><small>en attente</small></div>
   </div>
 </section>`;
}
function recipesView(){const cats=['Toutes',...new Set(ARK_RECIPES.map(r=>r.cat))];const card=r=>`<article class="quest-card ark-recipe-card" data-cat="${esc(r.cat)}" data-search="${esc((r.name+' '+r.cat+' '+r.ingredients).toLowerCase())}"><span class="quest-icon">⚗</span><span class="pill teal">${esc(r.cat)}</span><h3>${esc(r.name)}</h3><p>${esc(r.ingredients)}</p></article>`;return head('recipes')+`<section class="panel"><div class="panel-head"><div><h2>Catalogue des recettes ARK</h2><p class="muted">${ARK_RECIPES.length} recettes et composants intégrés, avec recherche et catégories.</p></div></div><div class="tabs">${cats.map((x,i)=>`<button class="${i===0?'primary':'ghost'} small ark-recipe-filter" data-recipe-filter="${esc(x)}">${esc(x)}</button>`).join('')}</div><div class="reference-search"><input id="ark-recipe-search" placeholder="Rechercher une recette, un ingrédient…" autocomplete="off"></div><div id="ark-recipe-grid" class="grid section-gap">${ARK_RECIPES.map(card).join('')}</div><div id="ark-recipe-empty" class="empty" hidden>Aucune recette trouvée.</div></section>`}
function shopView(){const items=[['Starter Survivor',500],['Kit Construction',1200],['Kit Exploration',1800],['Dino Starter',2500],['Pack Tribe',5000]];return head('shop')+'<section class="panel"><p class="muted">Boutique RP par serveur · livraison automatique uniquement quand une intégration serveur compatible est configurée.</p><div class="grid">'+items.map(x=>'<article class="reward-card"><span class="reward-symbol">◆</span><h3>'+esc(x[0])+'</h3><p class="xp-tag">'+num(x[1])+' crédits</p><button class="primary small" disabled>Configurer la livraison</button></article>').join('')+'</div></section>'}
function rpView(){return head('rp')+'<div class="grid two">'+panel('bank','<div class="stat"><div class="stat-label">Solde RP</div><strong>0 <span class="suffix">crédits</span></strong></div>')+panel('rp','<div class="list-row"><div><b>Banque & économie</b><br><span class="muted">Comptes joueurs, transactions et salaires.</span></div></div><div class="list-row"><div><b>Métiers & factions</b><br><span class="muted">Tribus, entreprises, police/admin et rôles personnalisés.</span></div></div><div class="list-row"><div><b>Shop</b><br><span class="muted">Achats reliés à la monnaie RP.</span></div></div>')+'</div>'}
function leaderboard(){return (state.leaderboard||[]).slice(0,10).map((r,n)=>`<div class="list-row"><div class="row-left"><span class="rank">${n+1}</span><span class="row-name">${esc(r.name)}</span></div><span class="xp-tag">${num(r.xp)} XP</span></div>`).join('')||empty()}
function questsView(){let html=head('quests',isStaff()?button('newQuest','new-quest','','primary',true):'');html+=`<div class="grid">${(state.quests||[]).map(questCard).join('')||`<section class="panel">${empty()}</section>`}</div>`;if(isStaff())html+=`<div class="section-gap">${panel('pending',table([tr('players'),tr('quests'),tr('proof'),tr('pending')],(state.claims||[]).filter(c=>c.status==='pending').map(c=>[esc(c.name||c.user_id),esc(c.title),`<div class="proof-text">${esc(c.proof)}</div>`,`<div class="buttons">${button('approve','approve-claim',c.id,'primary small',true)}${button('reject','reject-claim',c.id,'ghost small',true)}</div>`])))}</div><div class="section-gap">${panel('quests',table([tr('title'),tr('season'),tr('period'),tr('xp'),tr('edit')],(state.allQuests||[]).map(q=>[esc(q.title),'#'+q.season_id,esc(tr(q.period)),num(q.xp),button(q.enabled?'close':'publish','toggle-quest',q.id,'ghost small',true)])))}</div>`;return html}
function passView(){const p=state.pass||{xp:0,tier:0,rewards:[]};const goal=p.season?.xp_per_tier||100;return head('pass',isStaff()?button('newReward','new-reward','','primary',true):'')+`<section class="panel pass-summary"><div class="tier-circle"><strong>${num(p.tier)}</strong><span>${esc(tr('tier'))}</span></div><div class="pass-content"><div class="card-top"><h2>${esc(p.season?.name||tr('noSeason'))}</h2>${pill(p.premium?'premium':'free',p.premium?'copper':'teal')}</div><div class="progress-info"><span>${num(p.xp)} XP</span><span>${num(goal-(p.xp%goal))} XP · ${esc(tr('tier'))} ${num(p.tier+1)}</span></div>${progress(p.xp%goal,goal)}</div></section><div class="grid">${(p.rewards||[]).map(r=>`<article class="reward-card ${r.premium?'premium':''} ${!r.unlocked?'locked':''}">${pill(r.premium?'premium':'free',r.premium?'copper':'teal')}<span class="reward-symbol" aria-hidden="true">${r.premium?'♛':'◇'}</span><h3>${esc(r.title)}</h3><p class="muted">${esc(tr('tier'))} ${num(r.tier)} · ${esc(r.description||tr(r.kind))}</p>${r.claim_status?pill(r.claim_status):r.unlocked?button('claim','claim-reward',r.id,'primary small',true):pill('locked')}</article>`).join('')||`<div class="panel">${empty()}</div>`}</div>${isStaff()?`<div class="section-gap">${panel('pending',table([tr('players'),tr('newReward'),tr('pending'),tr('edit')],(state.rewardClaims||[]).map(c=>[esc(c.name||c.user_id),esc(c.title),pill(c.status),c.status==='pending'?button('delivered','deliver-reward',c.id,'primary small',true):''])))}</div>`:''}`}
function table(headers,rows){if(!rows.length)return empty();return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function ticketsView(){return head('tickets',button('newTicket','new-ticket','','primary',true))+panel('tickets',table([tr('subject'),tr('players'),tr('progress'),tr('starts'),tr('view')],(state.tickets||[]).map(r=>[esc('#'+r.id+' '+r.title),esc(r.user_id),pill(r.status,r.status==='open'?'teal':''),esc(date(r.created_at)),button('view','view-ticket',r.id)])))}
function playersView(){return head('players')+panel('players',table([tr('name'),tr('platform'),tr('gameId'),tr('verified'),tr('pass'),tr('edit')],(state.members||[]).map(m=>[esc(m.name),esc(m.platform),esc(m.game_id||'—'),m.verified?pill('verified','teal'):pill('pending'),pill(m.premium?'premium':'free',m.premium?'copper':''),button('edit','edit-member',m.user_id,'ghost small',true)])))}
function seasonsView(){return head('seasons',button('newSeason','new-season','','primary',true))+panel('seasons',table([tr('title'),tr('starts'),tr('ends'),tr('xpPerTier'),tr('progress'),tr('edit')],(state.seasons||[]).map(s=>[esc(s.name),esc(date(s.starts_at)),esc(date(s.ends_at)),num(s.xp_per_tier),pill(s.status,s.status==='published'?'teal':''),`<div class="buttons">${s.status==='draft'?button('publish','publish-season',s.id,'primary small',true):''}${s.status!=='archived'?button('archive','archive-season',s.id,'ghost small',true):''}</div>`])))}
function mapMedia(m){
 const files={
  'The Island':'The Island Topographic Map.jpg',
  'Scorched Earth':'Scorched Earth Topographic Map.jpg',
  'The Center':'The Center Topographic Map.jpg',
  'Aberration':'Aberration Map.jpg',
  'Extinction':'Extinction Topographic Map.jpg',
  'Ragnarok':'Ragnarok Topographic Map.jpg',
  'Valguero':'Valguero Topographic Map.jpg',
  'Crystal Isles':'Crystal Isles Topographic Map.jpg',
  'Fjordur':'Fjordur Topographic Map.jpg',
  'Genesis: Part 1':'Genesis Part 1 Topographic Map.jpg',
  'Genesis: Part 2':'Genesis Part 2 Map.jpg',
  'Lost Colony':'Lost Colony Map ASA.jpg'
 };
 const pages={
  'The Island':'The_Island','Scorched Earth':'Scorched_Earth','The Center':'The_Center','Aberration':'Aberration',
  'Extinction':'Extinction','Ragnarok':'Ragnarok','Valguero':'Valguero','Crystal Isles':'Crystal_Isles','Fjordur':'Fjordur',
  'Genesis: Part 1':'Genesis:_Part_1','Genesis: Part 2':'Genesis:_Part_2','Lost Colony':'Lost_Colony','Astraeos':'Astraeos','Club ARK':'Club_ARK'
 };
 const file=files[m.name];
 return {
  image:file?'https://ark.wiki.gg/wiki/Special:Redirect/file/'+encodeURIComponent(file):'/background.webp',
  source:pages[m.name]?'https://ark.wiki.gg/wiki/'+pages[m.name]:null,
  isMap:Boolean(file)
 };
}
function mapDetails(m){
 const official={
  'The Island':{desc:'Carte emblématique d’ARK avec plages, jungles, montagnes, neige, grottes et boss.',dinos:['Rex','Raptor','Argentavis','Spino','Megalodon'],resources:['Métal','Cristal','Obsidienne','Huile','Silice'],poi:['Grottes','Montagnes','Obélisques','Île des herbivores']},
  'Scorched Earth':{desc:'Carte désertique extrême avec chaleur, tempêtes, oasis et zones Wyvern.',dinos:['Wyvern','Mantis','Morellatops','Thorny Dragon'],resources:['Soufre','Sel','Sable','Cristal','Métal'],poi:['Oasis','Dunes','Tranchées Wyvern','Obélisques']},
  'Aberration':{desc:'Monde souterrain irradié avec progression verticale et biomes vert, bleu et rouge.',dinos:['Rock Drake','Reaper','Ravager','Basilisk'],resources:['Gemmes','Gaz','Métal','Cristal','Élément'],poi:['Zone verte','Zone bleue','Zone rouge','Surface']},
  'Extinction':{desc:'Terre dévastée mêlant ville futuriste, biomes protégés et zones corrompues.',dinos:['Managarmr','Gacha','Snow Owl','Velonasaur'],resources:['Élément','Poussière d’élément','Métal','Cristal'],poi:['Sanctuaire','Désert','Neige','Forêt','Wasteland']},
  'The Center':{desc:'Grande carte multi-biomes avec îles, falaises, grottes et vastes zones marines.',dinos:['Créatures classiques ARK','Créatures marines'],resources:['Métal','Cristal','Obsidienne','Huile'],poi:['Îles','Grottes','Falaises','Océan']},
  'Ragnarok':{desc:'Très grande carte mêlant désert, neige, hauts plateaux, jungle et zones volcaniques.',dinos:['Wyvern','Griffin','Créatures classiques ARK'],resources:['Métal','Cristal','Obsidienne','Huile'],poi:['Désert','Volcan','Château','Tranchées Wyvern']},
  'Valguero':{desc:'Carte multi-biomes avec vallée, montagnes, zone aberrante et vaste réseau souterrain.',dinos:['Deinonychus','Créatures classiques ARK'],resources:['Métal','Cristal','Obsidienne','Huile'],poi:['White Cliffs','Zone aberrante','Grottes','Lacs']},
  'Crystal Isles':{desc:'Carte fantastique composée de biomes colorés, îles flottantes et zones cristallines.',dinos:['Crystal Wyvern','Tropeognathus','Créatures classiques ARK'],resources:['Cristal','Métal','Obsidienne','Huile'],poi:['Îles flottantes','Désert','Zone tropicale','Eldritch Isle']},
  'Fjordur':{desc:'Carte nordique avec plusieurs royaumes, grandes grottes et nombreux boss.',dinos:['Desmodus','Andrewsarchus','Fjordhawk'],resources:['Métal','Cristal','Obsidienne','Huile'],poi:['Midgard','Asgard','Vanaheim','Jotunheim']},
  'Genesis: Part 1':{desc:'Ensemble de biomes à missions avec progression via HLN-A.',dinos:['Magmasaur','Bloodstalker','Ferox'],resources:['Métal','Cristal','Élément','Mutagel selon zone'],poi:['Bog','Arctic','Ocean','Volcanic','Lunar']},
  'Genesis: Part 2':{desc:'Immense vaisseau colonial composé de zones Eden, Rockwell et espace.',dinos:['Shadowmane','Maewing','Noglin','Astrodelphis'],resources:['Élément','Mutagel','Métal','Cristal'],poi:['Eden','Rockwell','Space','Tek structures']},
  'Astraeos':{desc:'Carte inspirée de la Grèce antique avec îles, ruines, temples et reliefs méditerranéens.',dinos:['Créatures ASA','Créatures propres à la carte selon version'],resources:['Métal','Cristal','Obsidienne','Huile'],poi:['Ruines','Îles','Temples','Montagnes']},
  'Club ARK':{desc:'Carte/expérience événementielle officielle orientée activités et événements.',dinos:['Selon événement'],resources:['Selon activité'],poi:['Zones événementielles','Activités Club ARK']}
 };
 return official[m.name]||{
  desc:'Carte mod / communautaire ARK: Survival Ascended. Les contenus précis peuvent évoluer selon la version publiée du mod.',
  dinos:['Créatures selon la version du mod'],
  resources:['Ressources selon la version du mod'],
  poi:['Points d’intérêt selon la version du mod']
 };
}
function mapDetailView(index){
 const m=ARK_MAPS[Number(index)];if(!m)return;
 const d=mapDetails(m),media=mapMedia(m),chips=arr=>arr.map(x=>'<span class="pill">'+esc(x)+'</span>').join('');
 openModal('maps',`
  <div class="eyebrow">${m.type==='official'?'CARTE OFFICIELLE / DLC':'CARTE MOD / COMMUNAUTAIRE'}</div>
  <h2 style="margin:8px 0 12px">${esc(m.name)}</h2>
  <p class="muted">${esc(d.desc)}</p>
  <figure class="ark-map-viewer ${media.isMap?'':'fallback'}">
   <img src="${esc(media.image)}" alt="Carte ${esc(m.name)}" loading="eager" onerror="this.onerror=null;this.src='/background.webp';this.closest('figure')?.classList.add('fallback')">
   <figcaption>${media.isMap?'Aperçu cartographique':'Aperçu visuel — carte communautaire ou source cartographique indisponible'}</figcaption>
  </figure>
  <div class="grid two section-gap">
   <section class="guide-card"><h3>🦖 Dinos & créatures</h3><div class="map-detail-chips">${chips(d.dinos)}</div></section>
   <section class="guide-card"><h3>⛏ Ressources</h3><div class="map-detail-chips">${chips(d.resources)}</div></section>
   <section class="guide-card"><h3>⌖ Points d’intérêt</h3><div class="map-detail-chips">${chips(d.poi)}</div></section>
   <section class="guide-card"><h3>ℹ Infos</h3><p class="muted">Type : ${m.type==='official'?'Officielle / DLC':'Mod / communautaire'}<br>Jeu : ARK: Survival Ascended<br>Catalogue BOT ARK : actif</p></section>
  </div>
  <div class="notice teal section-gap">Les cartes officielles utilisent un aperçu de l’ARK Official Community Wiki. Pour les cartes mod, un visuel de secours s’affiche tant qu’aucune source cartographique stable n’est disponible.</div>
  <div class="form-actions">${media.source?`<a class="ghost" href="${esc(media.source)}" target="_blank" rel="noopener noreferrer">Carte / source détaillée ↗</a>`:''}<button type="button" class="ghost" data-action="modal-close">Fermer</button></div>
 `);
}
function mapsView(){const card=(m,i)=>{const media=mapMedia(m);return `<article class="reward-card ark-map-card" data-kind="${m.type}" data-search="${esc(m.name.toLowerCase())}" data-action="map-detail" data-id="${i}" role="button" tabindex="0" aria-label="Ouvrir la carte ${esc(m.name)}"><img class="ark-map-thumb ${media.isMap?'':'fallback'}" src="${esc(media.image)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='/background.webp';this.classList.add('fallback')"><h3>${esc(m.name)}</h3><span class="pill ${m.type==='official'?'teal':''}">${m.type==='official'?'OFFICIELLE / DLC':'MOD / COMMUNAUTAIRE'}</span><p class="muted">${esc(mapDetails(m).desc)}</p><span class="xp-tag">Voir la carte et la fiche →</span></article>`};return head('maps')+`<section class="panel"><div class="panel-head"><div><h2>Toutes les cartes ARK</h2><p class="muted">${ARK_MAPS.length} cartes intégrées au catalogue. Les cartes officielles affichent un aperçu cartographique ; les cartes communautaires gardent un fallback propre si aucune source stable n’est disponible.</p></div></div><div class="tabs"><button class="primary small ark-map-filter" data-map-filter="all">Toutes</button><button class="ghost small ark-map-filter" data-map-filter="official">Officielles</button><button class="ghost small ark-map-filter" data-map-filter="mod">Mods</button></div><div class="reference-search"><input id="ark-map-search" placeholder="Rechercher une carte ARK…" autocomplete="off"></div><div id="ark-map-grid" class="grid section-gap">${ARK_MAPS.map((m,i)=>card(m,i)).join('')}</div><div id="ark-map-empty" class="empty" hidden>Aucune carte trouvée.</div></section>`}

function encyclopediaView(){return head('encyclopedia')+`<div class="grid three"><article class="guide-card"><h2>Dinos</h2><p>Créatures, apprivoisement et informations.</p></article><article class="guide-card"><h2>Ressources</h2><p>Matériaux et emplacements.</p></article><article class="guide-card"><h2>Recettes</h2><p>Craft, cuisine, kibble et consommables.</p></article></div>`}
async function shopView(){const e=demo?{balance:1000,shop:[],orders:[]}:await api('/api/economy');return head('shop',isStaff()?'<button class="primary" data-action="shop-item-add">+ Ajouter un article</button>':'')+`<div class="notice teal">Solde : <strong>${num(e.balance)} crédits</strong></div><div class="grid section-gap">${(e.shop||[]).map(x=>`<article class="reward-card"><span class="reward-symbol">◆</span><h3>${esc(x.name)}</h3><p class="muted">${esc(x.description||'')}</p><p class="xp-tag">${num(x.price)} crédits</p><button class="primary small" data-action="shop-buy" data-id="${esc(x.id)}">Acheter</button></article>`).join('')||empty()}</div><section class="panel section-gap"><h2>Mes commandes</h2>${(e.orders||[]).map(o=>`<div class="list-row"><div><b>${esc(o.name||('Commande #'+o.id))}</b><br><span class="muted">${num(o.price)} crédits · ${esc(o.status)}</span></div></div>`).join('')||empty()}</section>`}
async function rpView(){const e=demo?{balance:1000,profile:{job:'Survivant',faction:'',bio:''},transactions:[]}:await api('/api/economy'),p=e.profile||{};return head('rp')+`<div class="grid two"><section class="panel"><div class="stat"><div class="stat-label">Solde RP</div><strong>${num(e.balance)} <span class="suffix">crédits</span></strong></div><div class="form-actions section-gap"><button class="primary small" data-action="rp-transfer">Payer un joueur</button>${isStaff()?'<button class="ghost small" data-action="rp-credit">Ajouter des crédits</button>':''}</div></section><section class="panel"><h2>Profil RP</h2><p><b>Métier :</b> ${esc(p.job||'Survivant')}</p><p><b>Faction :</b> ${esc(p.faction||'—')}</p><p class="muted">${esc(p.bio||'Aucune description RP.')}</p><button class="primary small" data-action="rp-profile-edit">Modifier mon profil</button></section></div><section class="panel section-gap"><h2>Transactions</h2>${(e.transactions||[]).map(x=>`<div class="log-line"><span class="muted">${esc(date(x.created_at))} · ${esc(x.kind)}</span>\n<strong>${Number(x.amount)>=0?'+':''}${num(x.amount)} crédits</strong></div>`).join('')||empty()}</section>`}
async function lotteryView(){const e=demo?{balance:1000,lottery:{drawKey:'demo',pot:0,tickets:0,mine:0}}:await api('/api/economy'),l=e.lottery||{};return head('lottery')+`<div class="grid two"><article class="guide-card"><h2>🎟 Loterie ARK</h2><p>1 ticket = 100 crédits RP.</p><p>Mes tickets : <b>${num(l.mine)}</b></p><button class="primary" data-action="lottery-ticket">Acheter un ticket</button></article><article class="guide-card"><h2>Cagnotte</h2><p><strong>${num(l.pot)} crédits</strong></p><p class="muted">${num(l.tickets)} ticket(s) aujourd’hui · tirage ${esc(l.drawKey||'')}</p>${isStaff()?'<button class="ghost" data-action="lottery-draw">Effectuer le tirage</button>':''}</article></div>`}
async function minigamesView(){const e=demo?{games:[]}:await api('/api/economy');const stat=g=>(e.games||[]).find(x=>x.game===g);return head('minigames')+`<div class="grid two"><article class="guide-card"><h2>🦖 Dino Quiz</h2><p>Question ARK · 50 crédits si bonne réponse.</p><p class="muted">Meilleur score : ${num(stat('dinoquiz')?.best||0)}</p><button class="primary" data-action="minigame-start" data-id="dinoquiz">Jouer</button></article><article class="guide-card"><h2>🎯 Défi Survivant</h2><p>Question survie ARK · 50 crédits si bonne réponse.</p><p class="muted">Meilleur score : ${num(stat('survivor')?.best||0)}</p><button class="primary" data-action="minigame-start" data-id="survivor">Jouer</button></article></div>`}
function interpolView(){return head('interpol')+`<section class="panel"><div class="eyebrow">VALHALLA EXTINCTION NETWORK</div><h2>⛨ INTERPOL</h2><p class="muted">Centre commun de modération et de liaison entre EXTINCTION ++ RSS, DAYZ GATE et BOT ARK.</p><div class="notice teal">INTERPOL CONNECTÉ · Réseau Valhalla Extinction</div></section><div class="grid three section-gap"><article class="guide-card"><h2>EXTINCTION ++ RSS</h2><span class="pill teal">CONNECTÉ</span></article><article class="guide-card"><h2>DAYZ GATE</h2><span class="pill teal">CONNECTÉ</span></article><article class="guide-card"><h2>BOT ARK</h2><span class="pill teal">CONNECTÉ</span></article></div>`}
function partnersView(){return head('partners')+`
<section class="panel"><div class="eyebrow">VALHALLA EXTINCTION NETWORK</div><h2>INTERPOL</h2><p class="muted">Passerelle commune entre les services Valhalla Extinction.</p></section>
<div class="grid three section-gap">
<article class="guide-card"><h2>EXTINCTION ++ RSS</h2><p>Actualités, RSS, Discord et services communautaires.</p><span class="pill teal">PARTENAIRE OFFICIEL</span></article>
<article class="guide-card"><h2>DAYZ GATE</h2><p>Whitelist, serveurs, cartes, mods et outils DayZ.</p><span class="pill teal">PARTENAIRE OFFICIEL</span></article>
<article class="guide-card"><h2>BOT ARK</h2><p>ARK ASA, saisons, quêtes, tickets, économie et outils serveur.</p><span class="pill teal">PARTENAIRE OFFICIEL</span></article>
</div>`}
function auditLabel(a){const map={'season.created':'newSeason','season.published':'publish','season.archived':'archive','quest.created':'newQuest','quest.completed':'completed','reward.created':'newReward','reward.claimed':'claim','reward.delivered':'delivered','claim.reviewed':'approve','member.updated':'players','ticket.opened':'newTicket','ticket.closed':'closed','settings.updated':'settings','events.imported':'importEvents','webhook.rotated':'webhook','reward.delivery_pending':'pending','ticket.channel_pending':'pending','ticket.mirror_pending':'pending'};return tr(map[a]||'recent')}
function arkActivityLabel(e){return({connect:'🟢 Connexion',disconnect:'🔴 Déconnexion',death:'☠️ Mort',build:'🏗️ Construction'})[e.event_type]||e.event_type}
function arkActivityDetails(e){const p=[e.actor_name&&('Tueur / acteur : '+e.actor_name),e.cause&&('Cause : '+e.cause),e.weapon&&('Arme : '+e.weapon),e.object_name&&('Objet : '+e.object_name),Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.z)&&('Position : '+e.x+', '+e.y+', '+e.z)].filter(Boolean);return p.join(' · ')||'Position / détail non fourni par le log ARK.'}
function logsView(){const activity=(state.activity||[]).map(e=>`<div class="log-line"><span class="muted">${esc(date(e.occurred_at))} · ARK · ${esc(arkActivityLabel(e))}</span>\n<strong>${esc(e.player_name||'Joueur inconnu')}</strong> · ${esc(arkActivityDetails(e))}</div>`).join('')||empty();return head('logs',button('poll','poll','','ghost',true)+button('importLogs','import-logs','','ghost',true)+button('importEvents','import-events','','primary',true))+`<div class="notice teal">Logs ARK uniquement : connexions, déconnexions, morts et constructions. La position est affichée uniquement quand le log ARK la fournit.</div><div class="stack">${panel('Activité ARK',`<div class="log-scroll">${activity}</div>`)}${panel('logs',`<div class="log-scroll">${(state.logs||[]).map(r=>`<div class="log-line"><span class="muted">${esc(date(r.created_at))} · ${esc(r.source)}</span>\n${esc(r.line)}</div>`).join('')||empty()}</div>`)}${panel('recent',table([tr('starts'),tr('players'),tr('description')],(state.audit||[]).map(r=>[esc(date(r.created_at)),esc(r.actor),esc(auditLabel(r.action))])))}</div>`}
function field(key,name,type='text',value='',options=null,wide=false){if(type==='checkbox')return `<label class="check"><input name="${name}" type="checkbox" ${value?'checked':''}>${esc(tr(key))}</label>`;return `<label class="field ${wide?'wide':''}">${esc(tr(key))}${options?`<select name="${name}">${options.map(o=>`<option value="${esc(o.value)}" ${String(value)===String(o.value)?'selected':''}>${esc(o.label)}</option>`).join('')}</select>`:type==='textarea'?`<textarea name="${name}" ${demo?'disabled':''}>${esc(value)}</textarea>`:`<input name="${name}" type="${type}" value="${esc(value)}" ${type==='password'?'autocomplete="off"':''} ${demo?'disabled':''}>`}</label>`}
function setupDiscord(){return `<section class="panel"><div class="setting-header"><img src="/icon-192.png" alt="BOT ARK"><div><h2>${esc(tr('setupDiscord'))}</h2><span class="pill ${me.bot.ready?'teal':'copper'}">${esc(tr(me.bot.ready?'botOnline':'botOffline'))}</span></div></div><form id="discord-form"><div class="form-grid">${field('clientId','clientId')}${field('botToken','token','password')}</div><div class="form-actions"><button class="primary" ${demo?'disabled':''}>${esc(tr('connectBot'))}</button></div></form>${me.bot.inviteUrl?`<div class="section-gap"><a class="pill teal" href="${esc(me.bot.inviteUrl)}" target="_blank" rel="noopener">${esc(tr('inviteBot'))}</a></div>`:''}</section>`}
function validatorView(){
 return head('validator')+`<section class="panel"><div class="panel-head"><div><h2>Validateur & correcteur ARK</h2><p class="muted">JSON, XML et INI · 5 Mo maximum.</p></div></div>
 <p class="notice">Le bot corrige uniquement les erreurs sûres : BOM, fins de ligne, commentaires/virgules finales JSON, esperluettes XML non échappées et mise en forme INI. Il n’invente jamais une valeur ARK.</p>
 <div class="form-grid section-gap"><label class="field wide">Fichier<input id="ark-validator-file" type="file" accept=".json,.xml,.ini,application/json,application/xml,text/xml,text/plain"></label></div>
 <div class="form-actions"><button id="ark-validator-run" class="primary">Analyser et corriger</button></div>
 <div id="ark-validator-output" class="section-gap"></div></section>`;
}
async function moduleView(key){
 const payload=demo?{module:{key,label:moduleLabels[key],enabled:true,config:{}},records:[]} : await api('/api/modules/'+encodeURIComponent(key));
 const mod=payload.module||{key,label:moduleLabels[key],enabled:true,config:{}};
 const channels=demo?[]:await api('/api/discord/channels').catch(()=>[]);
 const textChannels=channels.filter(ch=>ch.type===0||ch.type===5);
 const voiceChannels=channels.filter(ch=>ch.type===2);
 const categories=channels.filter(ch=>ch.type===4);
 const opts=['<option value="">— Aucun salon —</option>'].concat(textChannels.map(ch=>'<option value="'+esc(ch.id)+'" '+(String(mod.config?.channelId||'')===String(ch.id)?'selected':'')+'># '+esc(ch.name)+'</option>')).join('');
 const cfg=JSON.stringify(mod.config||{},null,2);
 const notes={
  welcome:'Variables disponibles : {user} et {server}. Pour les rôles automatiques, ajoute roleIds dans la configuration avancée.',
  autoroles:'Ajoute les IDs de rôles dans roleIds. Ils peuvent aussi être utilisés avec Arrivées et départs.',
  levels:'Les messages peuvent attribuer des niveaux/XP. Le salon choisi reçoit les annonces configurées.',
  tempvoice:'Utilise hubChannelId pour le salon vocal créateur et categoryId pour la catégorie. Les salons vides sont supprimés automatiquement.',
  suggestions:'La commande /suggestion publie ici.',
  secureroles:'Journalise ici les changements de rôles sécurisés.',
  moderation:'Salon de journalisation des actions de modération.',
  automod:'Ajoute blockedWords: ["mot1","mot2"] pour supprimer automatiquement les messages concernés.',
  reports:'La commande /signalement publie ici.',
  snippets:'Ajoute items: [{"name":"regles","content":"..."}]. /snippet envoie le contenu dans ce salon.',
  social:'Salon cible des notifications sociales configurées.',
  recurring:'Ajoute items: [{"message":"...","intervalMinutes":60,"channelId":"..."}] pour les messages automatiques.',
  statschannels:'Permet de préparer les salons statistiques et compteurs.',
  birthdays:'La commande /anniversaire enregistre la date et le bot souhaite automatiquement l’anniversaire dans ce salon.',
  customcommands:'Ajoute prefix et commands: [{"name":"site","response":"..."}].',
  wordreactions:'Ajoute rules: [{"word":"gg","emoji":"🔥"}].',
  starboard:'Configure emoji et minStars. Les messages qui atteignent le seuil sont publiés ici.',
  reactionroles:'Stocke ici les réglages de messages/rôles-réactions.',
  messages:'Salon d’annonces générales du module.',
  infinity:"Module d’engagement communautaire avec salon dédié.",
  logs:'Ce salon reçoit les journaux configurés.',giveaways:'Configure ici les lots, le salon cible, la durée et les conditions de participation.',polls:'Configure les sondages et leur salon de publication.',verification:'Configure le salon et le rôle attribué après vérification.',embeds:'Prépare et publie des messages embeds dans le salon choisi.',counters:'Configure les compteurs et salons de statistiques.',invitations:'Suit les invitations et permet les récompenses liées aux invitations.',reputation:'Configure le système de réputation et son salon.'
 };
 return head(mod.label||moduleLabels[key])+`<div class="grid two"><section class="panel"><div class="panel-head"><h2>${esc(mod.label||moduleLabels[key])}</h2><span class="pill ${mod.enabled?'teal':''}">${mod.enabled?'ACTIF':'INACTIF'}</span></div><form id="module-config-form" data-key="${esc(key)}"><div class="form-grid"><label class="field"><span>État</span><select name="enabled"><option value="true" ${mod.enabled?'selected':''}>Activé</option><option value="false" ${!mod.enabled?'selected':''}>Désactivé</option></select></label><label class="field"><span>Salon Discord choisi par le propriétaire</span><select name="channelId">${opts}</select></label><label class="field wide"><span>Configuration avancée JSON</span><textarea name="configJson" rows="14">${esc(cfg)}</textarea></label></div><div class="form-actions"><button class="primary" type="submit">Enregistrer le module</button></div></form><p class="notice section-gap">${esc(notes[key]||'Le propriétaire choisit le salon et les options de ce module.')}</p>${key==='tempvoice'?`<div class="notice"><b>Vocaux disponibles :</b> ${voiceChannels.map(x=>esc(x.name)+' ('+esc(x.id)+')').join(' · ')||'aucun'}<br><b>Catégories :</b> ${categories.map(x=>esc(x.name)+' ('+esc(x.id)+')').join(' · ')||'aucune'}</div>`:''}</section><section class="panel"><h2>Historique</h2><div class="stack">${(payload.records||[]).slice(0,50).map(r=>`<div class="log-line"><span class="muted">${esc(date(r.created_at))}</span><br><code>${esc(JSON.stringify(r.data||{}))}</code></div>`).join('')||empty()}</div></section></div>`;
}

async function settingsView(){let config={language,staff_role_id:'',ticket_category_id:'',audit_channel_id:'',nitrado_service_id:'',nitrado_log_path:''};if(selectedGuild&&!demo)config={...config,...await api('/api/settings')};return head('settings')+`<div class="stack">${me.role==='owner'||demo?setupDiscord()+panel('community',`<form id="guild-form"><div class="form-grid">${field('guildId','id')}${field('name','name')}</div><div class="form-actions"><button class="primary" ${demo?'disabled':''}>${esc(tr('addGuild'))}</button></div></form>`):''}${selectedGuild||demo?panel('settings',`<form id="settings-form"><div class="form-grid">${field('language','language','text',config.language,L.languages.map(l=>({value:l,label:({fr:'Français',en:'English',us:'🇺🇸 English (US)',de:'Deutsch',es:'Español',it:'Italiano',ru:'Русский',ko:'🇰🇷 한국어',ja:'🇯🇵 日本語',zh:'🇨🇳 中文'})[l]})))}${field('staffRole','staff_role_id','text',config.staff_role_id)}${field('ticketCategory','ticket_category_id','text',config.ticket_category_id)}${field('auditChannel','audit_channel_id','text',config.audit_channel_id)}</div><div class="section-gap"><h3>${esc(tr('nitrado'))}</h3></div><div class="form-grid section-gap">${field('nitradoToken','nitrado_token','password')}${field('serviceId','nitrado_service_id','text',config.nitrado_service_id)}${field('logPath','nitrado_log_path','text',config.nitrado_log_path,null,true)}</div><div class="form-actions"><button class="primary" ${demo?'disabled':''}>${esc(tr('save'))}</button></div></form>`)+panel('webhook',`<p class="muted">${esc(tr('logNotice'))}</p><div class="section-gap">${button('newSecret','webhook','','ghost',true)}</div>`):''}</div>`}


async function premiumView(){
 const publicData=await fetch('/api/premium/plans',{cache:'no-store'}).then(r=>r.json()).catch(()=>({plans:{},paypalUrl:'https://www.paypal.me/ZnationCmdofficiel'}));
 let own=null,admin=null;
 if(me.loggedIn&&!demo){own=await api('/api/premium').catch(()=>null);if(me.role==='owner')admin=await api('/api/premium/admin').catch(()=>null);}
 const plans=publicData.plans||{};
 const card=(product,title,desc)=>{
   const p=plans[product]||{},sub=own?.[product==='multiserver'?'multiserver':'battlepass'];
   const ownerFree=Boolean(own?.complimentary&&me.role==='owner');
   return `<section class="panel"><div class="panel-head"><h2>${esc(title)}</h2>${sub?'<span class="pill teal">ACTIF</span>':''}</div><p>${esc(desc)}</p><p class="muted">${product==='multiserver'?(own?.unlimitedServers?'Serveurs ARK illimités pour le propriétaire.':'Jusqu’à 20 serveurs ARK enregistrés.'):'Débloque les récompenses Premium du Pass de combat.'}</p>${ownerFree?'<div class="notice teal section-gap"><strong>Offert propriétaire · à vie</strong></div>':`<div class="grid two section-gap"><div class="reward-card"><strong>2,99 € / mois</strong><p class="muted">30 jours</p>${me.loggedIn?'<button class="primary small" data-action="premium-buy" data-id="'+product+':monthly">Choisir</button>':'<a class="primary small" href="#home">Se connecter</a>'}</div><div class="reward-card"><strong>25 € / an</strong><p class="muted">365 jours</p>${me.loggedIn?'<button class="primary small" data-action="premium-buy" data-id="'+product+':yearly">Choisir</button>':'<a class="primary small" href="#home">Se connecter</a>'}</div></div>`}${sub&&!ownerFree?'<p class="notice teal section-gap">Actif jusqu’au '+esc(date(sub.expires_at))+'</p>':''}</section>`;
 };
 const servers=own?.servers||[];
 const serverPanel=me.loggedIn&&selectedGuild?`<section class="panel"><div class="panel-head"><h2>Serveurs ARK Premium</h2><button class="primary small" data-action="premium-server-add">+ Ajouter</button></div><p class="muted">${own?.unlimitedServers?'Serveurs : illimités pour le propriétaire.':'Limite actuelle : '+(own?.maxServers||1)+' serveur(s).'}</p><div class="stack">${servers.map(s=>`<div class="log-line"><strong>${esc(s.label)}</strong> · Nitrado #${esc(s.service_id)} <button class="ghost small" data-action="premium-server-remove" data-id="${s.id}">Supprimer</button></div>`).join('')||empty()}</div></section>`:'';
 const activation=me.loggedIn&&!own?.complimentary?`<section class="panel"><div class="panel-head"><h2>Code d’activation</h2><button class="primary small" data-action="premium-redeem">Activer un code</button></div><p class="muted">Après validation de ton paiement, un code unique de 30 ou 365 jours peut être généré.</p></section>`:'';
 const pending=admin?.requests?.filter(x=>x.status==='pending')||[];
 const ownerPanel=me.role==='owner'&&admin?`<section class="panel"><div class="panel-head"><h2>Validation Premium</h2></div><div class="notice">PayPal.me ne confirme pas automatiquement le paiement au bot. Vérifie le paiement avec la référence, puis génère le code.</div><div class="stack section-gap">${pending.map(r=>`<div class="log-line"><strong>${esc(r.reference)}</strong> · ${esc(r.product)} · ${esc(r.billing)} · ${(Number(r.amount_cents)/100).toFixed(2)} € · utilisateur ${esc(r.user_id)} <button class="primary small" data-action="premium-approve" data-id="${esc(r.id)}">Paiement vérifié → code</button></div>`).join('')||empty()}</div><div class="form-actions section-gap"><button class="ghost small" data-action="premium-gen" data-id="multiserver:monthly">Code Multi 1 mois</button><button class="ghost small" data-action="premium-gen" data-id="multiserver:yearly">Code Multi 1 an</button><button class="ghost small" data-action="premium-gen" data-id="battlepass:monthly">Code Pass 1 mois</button><button class="ghost small" data-action="premium-gen" data-id="battlepass:yearly">Code Pass 1 an</button></div></section>`:'';
 return head('Premium')+`<div class="notice teal"><strong>Premium Valhalla</strong> · ${own?.complimentary&&me.role==='owner'?'Ton compte propriétaire bénéficie du Premium gratuitement à vie.':'Paiement via PayPal. Multi-serveur : jusqu’à 20 serveurs. Les codes sont générés après validation du paiement.'}</div><div class="grid two section-gap">${card('multiserver','Premium Multi-serveur','Gère plusieurs serveurs ARK depuis le même compte.')}${card('battlepass','Pass de combat Premium','Active les récompenses Premium du Season Pass.')}</div>${own?.complimentary&&me.role==='owner'?'':`<div class="form-actions section-gap"><a class="primary" href="${esc(publicData.paypalUrl||'https://www.paypal.me/ZnationCmdofficiel')}" target="_blank" rel="noopener noreferrer">Payer avec PayPal ↗</a></div>`}<div class="stack section-gap">${activation}${serverPanel}${ownerPanel}</div>`;
}

async function topServersView(){
 let rows=[];try{const r=await fetch('/api/top-servers',{cache:'no-store'});rows=await r.json();}catch{}
 const cards=rows.map((s,i)=>`<article class="reward-card"><div class="eyebrow">#${i+1} · ${esc(s.game)}</div><h3>${esc(s.name)}</h3><p class="muted">${esc(s.description||s.address||'Serveur communautaire')}</p><div class="map-detail-chips"><span class="pill teal">🏆 ${num(s.votes_24h)} votes / 24h</span><span class="pill">${num(s.votes)} votes total</span><span class="pill">${esc(s.source_bot||'Réseau Valhalla')}</span></div><div class="form-actions section-gap"><button class="primary small" data-action="top-vote" data-id="${esc(s.id)}">Voter</button>${s.discord_url?`<a class="ghost small" href="${esc(s.discord_url)}" target="_blank" rel="noopener noreferrer">Discord ↗</a>`:''}${s.website?`<a class="ghost small" href="${esc(s.website)}" target="_blank" rel="noopener noreferrer">Site ↗</a>`:''}</div></article>`).join('');
 const add=me.loggedIn&&me.role==='owner'?'<button class="primary" data-action="top-server-add">+ Ajouter un serveur</button>':'';
 return head('Top Serveurs',add)+`<div class="notice teal">Classement commun à BOT ARK, DAYZ GATE et EXTINCTION ++ RSS. Un vote par connexion réseau/appareil et par serveur chaque jour.</div><div class="grid section-gap">${cards||'<div class="empty">Aucun serveur inscrit pour le moment.</div>'}</div>`;
}

function guideView(){return head('guide')+`<div class="grid two">${[['install','installIos','installAndroid','installPc','installMac'],['seasons','guideSeasons'],['quests','guideQuests'],['pass','guidePass'],['tickets','guideTickets'],['logs','guideLogs']].map(([title,...paragraphs])=>`<section class="guide-card"><h2>${esc(tr(title))}</h2>${paragraphs.map(p=>`<p>${esc(tr(p))}</p>`).join('')}${title==='install'?'<div class="section-gap">'+button('install','install','','primary')+'</div>':''}</section>`).join('')}</div>`}
let aiMessages=[];function assistantView(){return head('assistant')+`<div class="ai-layout"><div class="notice teal">${esc(tr('aiIntro'))}</div><section class="panel"><p class="muted">${esc(tr('aiDownload'))}</p><div class="section-gap">${button(aiReady?'aiReady':'aiStart','ai-start','','primary')} <span id="ai-status" class="muted"></span></div><div id="conversation" class="conversation section-gap">${aiMessages.map(m=>`<div class="bubble ${m.role}">${esc(m.content)}</div>`).join('')}</div><form id="ai-form" class="ai-input"><input name="question" aria-label="${esc(tr('aiQuestion'))}" placeholder="${esc(tr('aiQuestion'))}" required maxlength="1000"><button class="primary" ${aiBusy||!aiReady?'disabled':''}>${esc(tr('send'))}</button></form></section></div>`}
async function render(){navigation();$('#offline').textContent=tr('offline');$('#offline').hidden=navigator.onLine;let html='';if(!me.loggedIn&&!demo&&!['guide','assistant','topservers','premium'].includes(page))html=loginView();else if(me.loggedIn&&!selectedGuild&&!['settings','guide','assistant','interpol','partners','premium','validator'].includes(page))html=head('home')+`<div class="notice">${esc(tr('selectGuild'))}</div>`+setupDiscord()+`<div class="section-gap">${button('addGuild','navigate','settings','primary')}</div>`;else{const views={home:homeView,premium:premiumView,topservers:topServersView,maps:mapsView,recipes:recipesView,encyclopedia:encyclopediaView,shop:shopView,rp:rpView,lottery:lotteryView,minigames:minigamesView,quests:questsView,pass:passView,tickets:ticketsView,players:playersView,seasons:seasonsView,logs:logsView,validator:validatorView,settings:settingsView,guide:guideView,assistant:assistantView,recipes:recipesView,interpol:interpolView,partners:partnersView};if(adminPages.includes(page)&&!isStaff()){page='home';html=homeView()}else if(moduleKeys.has(page)&&page!=='logs')html=await moduleView(page);else html=await (views[page]||homeView)();}if(demo)html=`<div class="notice"><strong>${esc(tr('demo'))}</strong> · ${esc(tr('demoNotice'))}</div>`+html;$('#main').innerHTML=html;bindForms();}
function openModal(title,content){$('#modal-content').innerHTML=`<h2>${esc(tr(title))}</h2>${content}`;$('#modal').showModal()}
function formModal(title,fields,submit){openModal(title,`<form id="modal-form"><div class="form-grid">${fields}</div><div class="form-error" role="alert"></div><div class="form-actions">${button('cancel','modal-close')}<button class="primary">${esc(tr('save'))}</button></div></form>`);$('#modal-form').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await submit(new FormData(e.target));$('#modal').close();toast(tr('saved'));await refresh()}catch(err){e.target.querySelector('.form-error').textContent=tr(err.message)}finally{b.disabled=false}}}
function seasonOptions(){return (state.seasons||[]).filter(s=>s.status!=='archived').map(s=>({value:s.id,label:s.name}))}
const localDate=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
async function action(action,id){
 switch(action){
 case 'navigate':location.hash=id;break;
 case 'demo':demo=true;selectedGuild='demo';me={...me,role:'owner'};state=demoState();location.hash='home';await render();break;
 case 'demo-nav':demo=true;selectedGuild='demo';me={...me,role:'owner'};state=demoState();location.hash=id||'home';await render();break;
 case 'refresh':await refresh();break;
 case 'modal-close':$('#modal').close();break;
 case 'map-detail':mapDetailView(id);break;
 case 'premium-buy':{const [product,billing]=String(id).split(':');const r=await api('/api/premium/payment-request',{product,billing});openModal('Premium',`<p>Référence de paiement : <strong>${esc(r.reference)}</strong></p><p>Montant : <strong>${esc(r.amount)}</strong></p><p class="muted">Ajoute cette référence dans le message/note du paiement PayPal pour faciliter la validation.</p><div class="form-actions"><a class="primary" href="${esc(r.paypalUrl)}" target="_blank" rel="noopener noreferrer">Ouvrir PayPal ↗</a>${button('close','modal-close')}</div>`);break;}
 case 'premium-redeem':formModal('Premium','<label class="wide">Code d’activation<input name="code" required maxlength="80" autocomplete="off"></label>',async fd=>{await api('/api/premium/redeem',{code:fd.get('code')});await render()});break;
 case 'premium-server-add':formModal('Premium','<label>Nom du serveur<input name="label" required maxlength="100"></label><label>ID service Nitrado<input name="serviceId" required inputmode="numeric" maxlength="20"></label>',async fd=>{await api('/api/premium/servers',{label:fd.get('label'),serviceId:fd.get('serviceId')});await render()});break;
 case 'premium-server-remove':await api('/api/premium/servers/'+encodeURIComponent(id),undefined,'DELETE');await render();break;
 case 'premium-approve':{const r=await api('/api/premium/admin/approve/'+encodeURIComponent(id),{});openModal('Premium',`<p>Code généré :</p><p><strong style="font-size:1.3em">${esc(r.code)}</strong></p><p class="muted">À transmettre au client. Il ne sera affiché qu’une fois.</p><div class="form-actions">${button('close','modal-close')}</div>`);await render();break;}
 case 'premium-gen':{const [product,billing]=String(id).split(':');const r=await api('/api/premium/admin/code',{product,billing});openModal('Premium',`<p>Code généré :</p><p><strong style="font-size:1.3em">${esc(r.code)}</strong></p><div class="form-actions">${button('close','modal-close')}</div>`);break;}
 case 'top-vote':{const r=await fetch('/api/top-servers/'+encodeURIComponent(id)+'/vote',{method:'POST'}),d=await r.json();if(!r.ok)throw Error(d.error||'Vote impossible');toast(d.accepted?'Vote enregistré':'Tu as déjà voté aujourd’hui');await render();break;}
 case 'top-server-add':formModal('Top Serveurs','<label>Nom<input name="name" required maxlength="100"></label><label>Jeu<input name="game" required maxlength="60"></label><label>Adresse / IP<input name="address" maxlength="200"></label><label>Discord<input name="discord_url" type="url"></label><label>Site<input name="website" type="url"></label><label>Image<input name="image_url" type="url"></label><label class="wide">Description<textarea name="description" maxlength="700"></textarea></label>',async fd=>{await api('/api/top-servers',Object.fromEntries(fd));await render()});break;
 case 'shop-item-add':formModal('shop','<label>Nom<input name="name" required maxlength="100"></label><label>Prix<input name="price" type="number" min="0" required></label><label class="wide">Description<textarea name="description" maxlength="500"></textarea></label>',async fd=>{await api('/api/shop/items',{name:fd.get('name'),price:Number(fd.get('price')),description:fd.get('description')});await render()});break;
 case 'shop-buy':await api('/api/shop/'+encodeURIComponent(id)+'/buy',{});toast('Achat enregistré');await render();break;
 case 'rp-profile-edit':{const e=await api('/api/economy');const p=e.profile||{};formModal('rp','<label>Métier<input name="job" value="'+esc(p.job||'Survivant')+'" required maxlength="60"></label><label>Faction<input name="faction" value="'+esc(p.faction||'')+'" maxlength="60"></label><label class="wide">Bio<textarea name="bio" maxlength="300">'+esc(p.bio||'')+'</textarea></label>',async fd=>{await api('/api/rp/profile',{job:fd.get('job'),faction:fd.get('faction'),bio:fd.get('bio')});await render()});break;}
 case 'rp-transfer':formModal('bank','<label>ID Discord du joueur<input name="userId" required maxlength="30"></label><label>Montant<input name="amount" type="number" min="1" required></label>',async fd=>{await api('/api/economy/transfer',{userId:fd.get('userId'),amount:Number(fd.get('amount'))});await render()});break;
 case 'rp-credit':formModal('bank','<label>ID Discord du joueur<input name="userId" required maxlength="30"></label><label>Montant<input name="amount" type="number" min="1" required></label>',async fd=>{await api('/api/economy/credit',{userId:fd.get('userId'),amount:Number(fd.get('amount'))});await render()});break;
 case 'lottery-ticket':await api('/api/lottery/ticket',{});toast('Ticket acheté');await render();break;
 case 'lottery-draw':{const r=await api('/api/lottery/draw',{});openModal('lottery','<p>Gagnant : <strong>'+esc(r.winner_user_id)+'</strong></p><p>Gain : <strong>'+num(r.prize)+' crédits</strong></p>');await render();break;}
 case 'minigame-start':{const q=await api('/api/minigames/'+encodeURIComponent(id));formModal('minigames','<p>'+esc(q.question)+'</p><label>Réponse<input name="answer" required maxlength="100"></label>',async fd=>{const r=await api('/api/minigames/'+encodeURIComponent(id),{answer:fd.get('answer')});toast(r.correct?'Bonne réponse · +'+r.reward+' crédits':'Mauvaise réponse');await render()});break;}

 case 'install':if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null}else{location.hash='guide'}break;
 case 'new-season':formModal('newSeason',field('title','name')+field('xpPerTier','xp_per_tier','number',100)+field('starts','starts_at','datetime-local',localDate(new Date()))+field('ends','ends_at','datetime-local',localDate(new Date(Date.now()+30*86400000))),async f=>api('/api/seasons',{name:f.get('name'),xp_per_tier:Number(f.get('xp_per_tier')),starts_at:new Date(f.get('starts_at')).toISOString(),ends_at:new Date(f.get('ends_at')).toISOString(),status:'draft'}));break;
 case 'new-quest':if(!seasonOptions().length)throw Error('noSeason');formModal('newQuest',field('season','season_id','text',state.season?.id||seasonOptions()[0].value,seasonOptions())+field('title','title')+field('description','description','textarea','',null,true)+field('kind','kind','text','custom',['custom','tame','kill','boss','craft','build','explore','connect'].map(k=>({value:k,label:tr(k)})))+field('target','target')+field('goal','goal','number',1)+field('xp','xp','number',100)+field('period','period','text','daily',['daily','weekly','season'].map(k=>({value:k,label:tr(k)}))),async f=>api('/api/quests',Object.fromEntries(f)));break;
 case 'new-reward':if(!seasonOptions().length)throw Error('noSeason');formModal('newReward',field('season','season_id','text',state.season?.id||seasonOptions()[0].value,seasonOptions())+field('title','title')+field('description','description','textarea','',null,true)+field('tier','tier','number',1)+field('kind','kind','text','manual',['manual','role'].map(k=>({value:k,label:tr(k)})))+field('role','role_id')+field('premium','premium','checkbox',false),async f=>{const body=Object.fromEntries(f);body.premium=f.has('premium');body.role_id=body.role_id||null;return api('/api/rewards',body)});break;
 case 'claim-quest':formModal('submitProof',field('proof','proof','textarea','',null,true),f=>api('/api/quests/'+id+'/claim',{proof:f.get('proof')}));break;
 case 'approve-claim':await api('/api/claims/'+id+'/review',{approve:true});await refresh();toast(tr('saved'));break;
 case 'reject-claim':await api('/api/claims/'+id+'/review',{approve:false});await refresh();toast(tr('saved'));break;
 case 'toggle-quest':await api('/api/quests/'+id+'/toggle',{});await refresh();break;
 case 'publish-season':await api('/api/seasons/'+id+'/publish',{});await refresh();break;
 case 'archive-season':if(confirm(tr('archiveConfirm'))){await api('/api/seasons/'+id+'/archive',{});await refresh()}break;
 case 'claim-reward':await api('/api/rewards/'+id+'/claim',{});toast(tr('commandClaim'));await refresh();break;
 case 'deliver-reward':await api('/api/reward-claims/'+id+'/deliver',{});await refresh();break;
 case 'new-ticket':formModal('newTicket',field('subject','title','text','',null,true),f=>api('/api/tickets',{title:f.get('title')}));break;
 case 'view-ticket':if(demo){openModal('tickets',`<p>${esc(tr('demoNotice'))}</p><div class="form-actions">${button('close','modal-close')}</div>`);break}ticketView=await api('/api/tickets/'+id);showTicket();break;
 case 'close-ticket':await api('/api/tickets/'+id+'/close',{});$('#modal').close();await refresh();break;
 case 'edit-member':{const m=state.members.find(m=>m.user_id===id);formModal('players',field('name','name','text',m.name)+field('gameId','game_id','text',m.game_id||'')+field('platform','platform','text',m.platform,['PC','Xbox','PlayStation'].map(k=>({value:k,label:k})))+field('verified','verified','checkbox',m.verified)+field('premium','premium','checkbox',m.premium),f=>api('/api/members/'+id,{game_id:f.get('game_id'),platform:f.get('platform'),verified:f.has('verified'),premium:f.has('premium')}));break}
 case 'import-logs':formModal('importLogs',field('logs','text','textarea','',null,true),async f=>{const r=await api('/api/import/logs',{text:f.get('text')});toast(num(r.added))});break;
 case 'import-events':formModal('importEvents',field('description','events','textarea',JSON.stringify([{eventId:'event-001',playerId:'player-id',type:'tame',target:'Raptor',amount:1,occurredAt:new Date().toISOString()}],null,2),null,true),async f=>{let events;try{events=JSON.parse(f.get('events'))}catch{throw Error('invalidInput')}const r=await api('/api/import/events',{events});toast(num(r.accepted))});break;
 case 'poll':await api('/api/nitrado/poll',{});await refresh();toast(tr('saved'));break;
 case 'webhook':{const r=await api('/api/settings/webhook',{});openModal('webhook',`<p>${esc(tr('secretOnce'))}</p><pre class="code">${esc(r.url)}\n\nAuthorization: Bearer ${esc(r.secret)}</pre><div class="form-actions">${button('close','modal-close')}</div>`);break}
 case 'ai-start':startAI();break;
 }
}
function showTicket(){const r=ticketView;openModal('tickets',`<h3>#${r.id} · ${esc(r.title)}</h3><div class="conversation section-gap">${r.messages.map(m=>`<div class="bubble ${m.author_id===me.user?'user':'ai'}"><strong>${esc(m.author_name)}</strong> · <span class="muted">${esc(date(m.created_at))}</span>\n${esc(m.body)}</div>`).join('')||empty()}</div>${r.status==='open'?`<form id="ticket-form" class="ai-input"><input name="body" maxlength="2000" aria-label="${esc(tr('message'))}" required placeholder="${esc(tr('message'))}"><button class="primary">${esc(tr('send'))}</button></form>`:pill('closed')}<div class="form-actions">${button('close','modal-close')}${r.status==='open'?button('close','close-ticket',r.id,'danger'):''}</div>`);const form=$('#ticket-form');if(form)form.onsubmit=async e=>{e.preventDefault();try{await api('/api/tickets/'+r.id+'/message',{body:new FormData(form).get('body')});ticketView=await api('/api/tickets/'+r.id);$('#modal').close();showTicket()}catch(err){toast(tr(err.message),true)}}}
function bindForm(selector,fn){const form=$(selector);if(form)form.onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await fn(new FormData(form));toast(tr('saved'));await refresh()}catch(err){const error=form.querySelector('.form-error');if(error)error.textContent=tr(err.message);else toast(tr(err.message),true)}finally{if(e.submitter)e.submitter.disabled=false}}}
function bindRecipeCatalog(){const input=$('#ark-recipe-search'),grid=$('#ark-recipe-grid');if(!input||!grid)return;let filter='Toutes';const apply=()=>{const q=input.value.trim().toLowerCase();let shown=0;grid.querySelectorAll('.ark-recipe-card').forEach(card=>{const okCat=filter==='Toutes'||card.dataset.cat===filter;const okText=!q||card.dataset.search.includes(q);card.hidden=!(okCat&&okText);if(!card.hidden)shown++});const empty=$('#ark-recipe-empty');if(empty)empty.hidden=shown>0};input.oninput=apply;document.querySelectorAll('.ark-recipe-filter').forEach(b=>b.onclick=()=>{filter=b.dataset.recipeFilter;document.querySelectorAll('.ark-recipe-filter').forEach(x=>x.className='ghost small ark-recipe-filter');b.className='primary small ark-recipe-filter';apply()});apply()}
function bindMapCatalog(){const input=$('#ark-map-search'),grid=$('#ark-map-grid');if(!input||!grid)return;let filter='all';const apply=()=>{const q=input.value.trim().toLowerCase();let shown=0;grid.querySelectorAll('.ark-map-card').forEach(card=>{const okKind=filter==='all'||card.dataset.kind===filter;const okText=!q||card.dataset.search.includes(q);card.hidden=!(okKind&&okText);if(!card.hidden)shown++});const empty=$('#ark-map-empty');if(empty)empty.hidden=shown>0};input.oninput=apply;document.querySelectorAll('.ark-map-filter').forEach(b=>b.onclick=()=>{filter=b.dataset.mapFilter;document.querySelectorAll('.ark-map-filter').forEach(x=>x.className='ghost small ark-map-filter');b.className='primary small ark-map-filter';apply()});apply()}
function bindPortalCatalog(){const input=$('#portal-search'),select=$('#portal-tag'),grid=$('#portal-grid');if(!grid)return;const apply=()=>{const q=(input?.value||'').trim().toLowerCase(),tag=select?.value||'';let shown=0;grid.querySelectorAll('.portal-card').forEach(card=>{const okText=!q||(card.dataset.search||'').includes(q),okTag=!tag||(card.dataset.tags||'').includes(tag);card.hidden=!(okText&&okTag);if(!card.hidden)shown++});const empty=$('#portal-empty');if(empty)empty.hidden=shown!==0};if(input)input.oninput=apply;if(select)select.onchange=apply;apply()}
function bindFileValidator(){
 const input=$('#ark-validator-file'),run=$('#ark-validator-run'),out=$('#ark-validator-output');if(!input||!run||!out)return;
 input.onchange=e=>{validatorFile=e.target.files?.[0]||null;validatorResult=null;out.innerHTML='';};
 run.onclick=async()=>{
  if(!validatorFile){out.innerHTML='<div class="notice">Choisis un fichier.</div>';return}
  if(validatorFile.size>5*1024*1024){out.innerHTML='<div class="notice">Fichier trop volumineux (5 Mo maximum).</div>';return}
  run.disabled=true;out.innerHTML='<div class="notice">Analyse en cours…</div>';
  try{
   const content=await validatorFile.text(),data=await api('/api/file-validator',{filename:validatorFile.name,content});validatorResult=data;
   const title=data.valid?'✅ Fichier valide':data.correctable?'🛠 Correction disponible':'❌ Correction manuelle nécessaire';
   const error=!data.valid&&data.error?'<p><strong>Ligne '+esc(data.line||'?')+(data.column?', colonne '+esc(data.column):'')+'</strong></p><pre class="code">'+esc(data.error)+'</pre>':'';
   const fixes=(data.fixes||[]).length?'<h3>Corrections proposées</h3><ul>'+data.fixes.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
   const warnings=(data.warnings||[]).length?'<h3>Points à vérifier</h3><ul>'+data.warnings.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
   const dl=data.correctable?'<div class="form-actions section-gap"><button id="ark-validator-download" class="primary">Télécharger le fichier corrigé</button></div>':'';
   out.innerHTML='<div class="reward-card"><h3>'+title+'</h3><p class="muted">'+esc(data.format||'')+'</p>'+error+fixes+warnings+dl+'</div>';
   const d=$('#ark-validator-download');if(d)d.onclick=()=>{const dot=validatorFile.name.lastIndexOf('.'),base=dot>0?validatorFile.name.slice(0,dot):validatorFile.name,ext=dot>0?validatorFile.name.slice(dot):'';const blob=new Blob([validatorResult.correctedContent],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=base+'.corrige'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
  }catch(e){out.innerHTML='<div class="notice">'+esc(tr(e.message))+'</div>'}finally{run.disabled=false}
 };
}
function bindForms(){bindPortalCatalog();bindMapCatalog();bindRecipeCatalog();bindFileValidator();
 const moduleForm=$('#module-config-form');if(moduleForm)moduleForm.onsubmit=async e=>{e.preventDefault();const fd=new FormData(moduleForm);let config={};try{config=JSON.parse(String(fd.get('configJson')||'{}'))}catch(err){toast('Configuration JSON invalide',true);return}config.channelId=String(fd.get('channelId')||'');const key=moduleForm.dataset.key;await api('/api/modules/'+encodeURIComponent(key),{enabled:String(fd.get('enabled'))==='true',config});toast('Module enregistré');await render()};
bindForm('#login-form',async f=>{demo=false;selectedGuild='';await api('/api/login',Object.fromEntries(f))});bindForm('#guild-form',f=>api('/api/guilds',Object.fromEntries(f)));bindForm('#discord-form',f=>api('/api/setup/discord',Object.fromEntries(f)));bindForm('#settings-form',f=>api('/api/settings',Object.fromEntries(f)));const ai=$('#ai-form');if(ai)ai.onsubmit=e=>{e.preventDefault();if(!aiReady||aiBusy)return;const question=new FormData(ai).get('question');aiMessages.push({role:'user',content:question});aiBusy=true;render();worker.postMessage({type:'ask',question,language})}}
function startAI(){if(aiReady)return;toast(tr('loading'));if(!worker){worker=new Worker('/ai-worker.js',{type:'module'});worker.onmessage=({data})=>{if(data.type==='ready'){aiReady=true;toast(tr('aiReady'));render()}else if(data.type==='answer'){aiBusy=false;aiMessages.push({role:'ai',content:data.answer});if(page==='assistant')render()}else if(data.type==='progress'){const status=$('#ai-status');if(status)status.textContent=data.progress?num(Math.round(data.progress))+' %':tr('loading')}else if(data.type==='error'){aiBusy=false;aiReady=false;worker?.terminate();worker=null;toast(tr('aiError'),true);if(page==='assistant')render()}};worker.onerror=()=>{aiBusy=false;worker?.terminate();worker=null;aiReady=false;toast(tr('aiError'),true)}}worker.postMessage({type:'load',language})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;action(b.dataset.action,b.dataset.id).catch(err=>toast(tr(err.message),true))});document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const b=e.target.closest('.ark-map-card[data-action]');if(!b)return;e.preventDefault();action(b.dataset.action,b.dataset.id).catch(err=>toast(tr(err.message),true))});
$('#menu').onclick=()=>{document.body.classList.toggle('nav-open');$('#shade').hidden=!document.body.classList.contains('nav-open')};$('#shade').onclick=()=>{document.body.classList.remove('nav-open');$('#shade').hidden=true};
$('#account').onclick=async()=>{if(demo){demo=false;selectedGuild='';me={loggedIn:false,role:null,guilds:[],bot:{}};state={};}else if(me.loggedIn){await api('/api/logout',{});selectedGuild='';}location.hash='home';await refresh()};
$('#language').onchange=async e=>{language=e.target.value;localStorage.setItem('bot-ark-language',language);if(me.loggedIn&&!demo)await api('/api/language',{language}).catch(()=>{});if(demo)state=demoState();await render()};$('#guild-select').onchange=async e=>{selectedGuild=e.target.value;await api('/api/guild/select',{id:selectedGuild});await refresh()};
$('#install').onclick=()=>action('install').catch(err=>toast(tr(err.message),true));
window.addEventListener('hashchange',()=>{const hash=location.hash.slice(1);if(hash.startsWith('login='))return;page=nav.some(([k])=>k===hash)?hash:'home';document.body.classList.remove('nav-open');$('#shade').hidden=true;render().catch(err=>toast(tr(err.message),true))});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});window.addEventListener('online',()=>refresh().catch(()=>{}));window.addEventListener('offline',()=>render());
async function boot(){page=location.hash.slice(1)||'home';try{const hash=location.hash.slice(1);if(hash.startsWith('login=')){const token=hash.slice(6);history.replaceState(null,'',location.pathname);page='home';await api('/api/discord-login',{token})}await refresh()}catch(err){me.loggedIn=false;await render();toast(tr(err.message),true)}}
boot();

let arkSwRegistration=null;
const ARK_PWA_VERSION='29';
const ARK_RELOAD_KEY='bot-ark-pwa-reloaded-'+ARK_PWA_VERSION;
async function forceAppRefresh(){
 const buttons=['force-refresh','draft-refresh'].map(id=>document.getElementById(id)).filter(Boolean);
 buttons.forEach(btn=>{btn.disabled=true;btn.dataset.oldText=btn.textContent;btn.textContent='…'});
 try{
  if('caches' in window){
   const keys=await caches.keys();
   await Promise.all(keys.filter(k=>k.startsWith('bot-ark-shell-')).map(k=>caches.delete(k)));
  }
  if('serviceWorker' in navigator){
   arkSwRegistration=await navigator.serviceWorker.register('/sw.js?v='+ARK_PWA_VERSION,{scope:'/',updateViaCache:'none'});
   await arkSwRegistration.update().catch(()=>{});
  }
 }catch{}
 location.reload();
}
if('serviceWorker' in navigator){
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  try{
   if(sessionStorage.getItem(ARK_RELOAD_KEY)==='1')return;
   sessionStorage.setItem(ARK_RELOAD_KEY,'1');
  }catch{}
  location.reload();
 });
 window.addEventListener('load',async()=>{
  try{
   arkSwRegistration=await navigator.serviceWorker.register('/sw.js?v='+ARK_PWA_VERSION,{scope:'/',updateViaCache:'none'});
   await arkSwRegistration.update().catch(()=>{});
  }catch{}
 });
}
document.getElementById('force-refresh')?.addEventListener('click',forceAppRefresh);
window.forceAppRefresh=forceAppRefresh;

document.getElementById('draft-menu-left')?.addEventListener('click',()=>document.getElementById('menu')?.click());
document.getElementById('draft-menu-grid')?.addEventListener('click',()=>document.getElementById('menu')?.click());

document.getElementById('draft-refresh')?.addEventListener('click',forceAppRefresh);
