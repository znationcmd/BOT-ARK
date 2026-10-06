const {SlashCommandBuilder,PermissionFlagsBits,AttachmentBuilder}=require('discord.js');
const s=require('./service');
const premium=require('./premium');
const fileValidator=require('./file-validator');

const MAPS=['The Island','Scorched Earth','The Center','Aberration','Extinction','Astraeos','Ragnarok','Valguero','Crystal Isles','Fjordur','Genesis: Part 1','Genesis: Part 2','Lost Colony','Club ARK'];
const RECIPES={
 narcotic:'Narcoberry ×5 + Spoiled Meat ×1',
 stimulant:'Stimberry ×5 + Sparkpowder ×2',
 'medical brew':'Tintoberry ×20 + Narcotic ×2 + Water',
 sparkpowder:'Flint ×2 + Stone ×1',
 gunpowder:'Sparkpowder ×1 + Charcoal ×1',
 gasoline:'Hide ×5 + Oil ×6',
 polymer:'Obsidian ×2 + Cementing Paste ×2',
 electronics:'Silica Pearls ×3 + Metal Ingot ×1',
 'basic kibble':'Extra Small Egg ×1 + Cooked Meat ×1 + Amarberry ×10 + Mejoberry ×5 + Tintoberry ×10 + Fiber ×5 + Water',
 'simple kibble':'Small Egg ×1 + Cooked Fish Meat ×1 + Rockarrot ×2 + Mejoberry ×5 + Fiber ×5 + Water',
 'regular kibble':'Medium Egg ×1 + Cooked Meat Jerky ×1 + Longrass ×2 + Savoroot ×2 + Fiber ×5 + Water',
 'superior kibble':'Large Egg ×1 + Prime Meat Jerky ×1 + Citronal ×2 + Sap ×1 + Rare Mushroom ×2 + Fiber ×5 + Water',
 'exceptional kibble':'Extra Large Egg ×1 + Focal Chili ×1 + Rare Flower ×1 + Mejoberry ×10 + Fiber ×5 + Water',
 'extraordinary kibble':'Special Egg ×1 + Giant Bee Honey ×1 + Lazarus Chowder ×1 + Mejoberry ×10 + Fiber ×5 + Water'
};
const isStaff=i=>i.guild.ownerId===i.user.id||i.memberPermissions.has(PermissionFlagsBits.Administrator)||i.memberPermissions.has(PermissionFlagsBits.ManageGuild);
async function isProjectOwner(i,client){
 const ids=new Set(String(process.env.PREMIUM_ADMIN_DISCORD_IDS||process.env.BOT_OWNER_DISCORD_ID||'').split(',').map(x=>x.trim()).filter(Boolean));
 if(ids.has(i.user.id))return true;
 try{await client.application.fetch();const owner=client.application.owner;if(owner&&owner.id===i.user.id)return true;if(owner&&owner.members&&owner.members.some&&owner.members.some(m=>m.user&&m.user.id===i.user.id))return true;}catch{}
 return false;
}
function commands(){return [
 new SlashCommandBuilder().setName('banque').setDescription('Banque et monnaie RP BOT ARK')
  .addSubcommand(sc=>sc.setName('solde').setDescription('Voir ton solde'))
  .addSubcommand(sc=>sc.setName('payer').setDescription('Payer un joueur').addUserOption(o=>o.setName('joueur').setDescription('Joueur').setRequired(true)).addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true).setMinValue(1)))
  .addSubcommand(sc=>sc.setName('donner').setDescription('Staff : ajouter des crédits').addUserOption(o=>o.setName('joueur').setDescription('Joueur').setRequired(true)).addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true).setMinValue(1))),
 new SlashCommandBuilder().setName('rp').setDescription('Profil RP BOT ARK')
  .addSubcommand(sc=>sc.setName('profil').setDescription('Voir un profil').addUserOption(o=>o.setName('joueur').setDescription('Joueur').setRequired(false)))
  .addSubcommand(sc=>sc.setName('configurer').setDescription('Configurer ton profil').addStringOption(o=>o.setName('metier').setDescription('Métier').setRequired(true).setMaxLength(60)).addStringOption(o=>o.setName('faction').setDescription('Faction').setRequired(false).setMaxLength(60)).addStringOption(o=>o.setName('bio').setDescription('Bio RP').setRequired(false).setMaxLength(300))),
 new SlashCommandBuilder().setName('shop').setDescription('Shop BOT ARK')
  .addSubcommand(sc=>sc.setName('liste').setDescription('Voir les articles'))
  .addSubcommand(sc=>sc.setName('acheter').setDescription('Acheter un article').addIntegerOption(o=>o.setName('id').setDescription('ID article').setRequired(true)))
  .addSubcommand(sc=>sc.setName('creer').setDescription('Staff : créer un article').addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true)).addIntegerOption(o=>o.setName('prix').setDescription('Prix').setRequired(true).setMinValue(0)).addStringOption(o=>o.setName('description').setDescription('Description').setRequired(false))),
 new SlashCommandBuilder().setName('loterie').setDescription('Loterie BOT ARK')
  .addSubcommand(sc=>sc.setName('acheter').setDescription('Acheter un ticket à 100 crédits'))
  .addSubcommand(sc=>sc.setName('info').setDescription('Voir la cagnotte'))
  .addSubcommand(sc=>sc.setName('tirer').setDescription('Staff : tirer le gagnant')),
 new SlashCommandBuilder().setName('minijeu').setDescription('Mini-jeux BOT ARK')
  .addStringOption(o=>o.setName('jeu').setDescription('Jeu').setRequired(true).addChoices({name:'Dino Quiz',value:'dinoquiz'},{name:'Défi Survivant',value:'survivor'}))
  .addStringOption(o=>o.setName('reponse').setDescription('Réponse, vide pour recevoir la question').setRequired(false)),
 new SlashCommandBuilder().setName('premium').setDescription('Premium BOT ARK')
  .addSubcommand(sc=>sc.setName('statut').setDescription('Voir ton Premium'))
  .addSubcommand(sc=>sc.setName('activer').setDescription('Activer un code').addStringOption(o=>o.setName('code').setDescription('Code').setRequired(true)))
  .addSubcommand(sc=>sc.setName('generer').setDescription('Propriétaire du bot : générer un code').addStringOption(o=>o.setName('produit').setDescription('Produit').setRequired(true).addChoices({name:'Multi-serveur',value:'multiserver'},{name:'Battle Pass',value:'battlepass'})).addStringOption(o=>o.setName('duree').setDescription('Durée').setRequired(true).addChoices({name:'1 mois',value:'monthly'},{name:'1 an',value:'yearly'}))),
 new SlashCommandBuilder().setName('topserveur').setDescription('Top Serveurs partagé')
  .addSubcommand(sc=>sc.setName('liste').setDescription('Voir le classement'))
  .addSubcommand(sc=>sc.setName('voter').setDescription('Voter').addStringOption(o=>o.setName('id').setDescription('ID serveur').setRequired(true)))
  .addSubcommand(sc=>sc.setName('ajouter').setDescription('Propriétaire du bot : ajouter').addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true)).addStringOption(o=>o.setName('jeu').setDescription('Jeu').setRequired(false)).addStringOption(o=>o.setName('adresse').setDescription('Adresse').setRequired(false)).addStringOption(o=>o.setName('discord').setDescription('Discord').setRequired(false)).addStringOption(o=>o.setName('description').setDescription('Description').setRequired(false))),
 new SlashCommandBuilder().setName('fichier').setDescription('Valider et corriger JSON XML ou INI').addAttachmentOption(o=>o.setName('fichier').setDescription('Fichier ARK').setRequired(true)),
 new SlashCommandBuilder().setName('carte').setDescription('Cartes ARK').addSubcommand(sc=>sc.setName('liste').setDescription('Lister les cartes officielles')).addSubcommand(sc=>sc.setName('chercher').setDescription('Chercher une carte').addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true))),
 new SlashCommandBuilder().setName('recette').setDescription('Chercher une recette ARK').addStringOption(o=>o.setName('nom').setDescription('Nom de recette').setRequired(true)),
 new SlashCommandBuilder().setName('outils').setDescription('Lister les outils BOT ARK')
];}
async function handle(i,ctx){
 const names=['banque','rp','shop','loterie','minijeu','premium','topserveur','fichier','carte','recette','outils'];
 if(!names.includes(i.commandName))return false;
 const g=i.guildId,u=i.user.id,client=ctx.client;
 const sub=i.options.getSubcommand(false);
 const reply=async p=>{const x=typeof p==='string'?{content:p}:p;return i.editReply(x);};
 if(i.commandName==='banque'){
  if(sub==='solde'){const e=await s.economy(g,u);return reply('🏦 Solde : '+e.balance+' crédits');}
  if(sub==='payer'){const target=i.options.getUser('joueur',true),r=await s.transferCredits(g,u,target.id,i.options.getInteger('montant',true));return reply('✅ Paiement envoyé à '+target+' · solde : '+r.balance+' crédits');}
  if(!isStaff(i))throw new Error('forbidden');const target=i.options.getUser('joueur',true),r=await s.grantCredits(g,u,target.id,i.options.getInteger('montant',true));return reply('✅ Nouveau solde de '+target+' : '+r.balance+' crédits');
 }
 if(i.commandName==='rp'){
  if(sub==='configurer'){const p=await s.saveRpProfile(g,u,{job:i.options.getString('metier',true),faction:i.options.getString('faction')||'',bio:i.options.getString('bio')||''});return reply('✅ Profil RP : '+p.job+(p.faction?' · '+p.faction:'')+(p.bio?'\n'+p.bio:''));}
  const target=i.options.getUser('joueur')||i.user,e=await s.economy(g,target.id),p=e.profile||{};return reply('🎭 '+target+' · '+(p.job||'Survivant')+(p.faction?' · '+p.faction:'')+(p.bio?'\n'+p.bio:'')+'\nSolde : '+e.balance+' crédits');
 }
 if(i.commandName==='shop'){
  if(sub==='liste'){const e=await s.economy(g,u);return reply(e.shop.length?e.shop.slice(0,30).map(x=>'• #'+x.id+' · '+x.name+' · '+x.price+' crédits'+(x.description?' · '+x.description:'')).join('\n'):'Boutique vide.');}
  if(sub==='acheter'){const r=await s.buyShopItem(g,u,i.options.getInteger('id',true));return reply('✅ Achat enregistré · commande #'+r.id);}
  if(!isStaff(i))throw new Error('forbidden');const r=await s.addShopItem(g,u,{name:i.options.getString('nom',true),price:i.options.getInteger('prix',true),description:i.options.getString('description')||''});return reply('✅ Article créé : #'+r.id+' · '+r.name);
 }
 if(i.commandName==='loterie'){
  if(sub==='acheter'){await s.lotteryTicket(g,u);return reply('🎟️ Ticket acheté pour 100 crédits.');}
  if(sub==='info'){const e=await s.economy(g,u);return reply('🎟️ Cagnotte : '+e.lottery.pot+' crédits · '+e.lottery.tickets+' ticket(s) · tes tickets : '+e.lottery.mine);}
  if(!isStaff(i))throw new Error('forbidden');const r=await s.drawLottery(g,u);return reply('🎉 Gagnant : <@'+r.winner_user_id+'> · '+r.prize+' crédits');
 }
 if(i.commandName==='minijeu'){const game=i.options.getString('jeu',true),answer=i.options.getString('reponse');const r=await s.playMiniGame(g,u,game,answer===null?undefined:answer);if(r.question)return reply('🎮 '+r.question+'\nRelance la commande avec reponse:...');return reply((r.correct?'✅ Bonne réponse':'❌ Mauvaise réponse')+(r.reward?' · +'+r.reward+' crédits':''));}
 if(i.commandName==='premium'){
  if(sub==='statut'){const owner=await isProjectOwner(i,client),st=await premium.status(g,owner?'owner':u);return reply('⭐ Multi-serveur : '+(st.multiserver?'actif':'inactif')+' · Battle Pass : '+(st.battlepass?'actif':'inactif')+' · Serveurs : '+(st.unlimitedServers?'illimités':st.servers.length+'/'+st.maxServers)+(owner?' · offert propriétaire à vie':''));}
  if(sub==='activer'){const r=await premium.redeem(g,u,i.options.getString('code',true));return reply('✅ Premium activé jusqu’au '+new Date(r.expires_at).toLocaleString('fr-FR'));}
  if(!await isProjectOwner(i,client))throw new Error('forbidden');const r=await premium.generateCode(u,i.options.getString('produit',true),i.options.getString('duree',true));return reply('✅ Code généré : '+r.code);
 }
 if(i.commandName==='topserveur'){
  if(sub==='liste'){const rows=await s.topServers();return reply(rows.length?rows.slice(0,20).map((x,n)=>(n+1)+'. '+x.name+' · '+x.game+' · '+x.votes_24h+' votes/24h · ID '+x.id).join('\n'):'Aucun serveur.');}
  if(sub==='voter'){const r=await s.voteTopServer(i.options.getString('id',true),u,'discord');return reply(r.accepted?'✅ Vote enregistré.':'Tu as déjà voté aujourd’hui.');}
  if(!await isProjectOwner(i,client))throw new Error('forbidden');const r=await s.saveTopServer(u,{name:i.options.getString('nom',true),game:i.options.getString('jeu')||'ARK',address:i.options.getString('adresse')||'',discord_url:i.options.getString('discord')||'',description:i.options.getString('description')||'',source_bot:'BOT ARK'});return reply('✅ Serveur ajouté : '+r.name+' · ID '+r.id);
 }
 if(i.commandName==='fichier'){
  const a=i.options.getAttachment('fichier',true);if(a.size>5*1024*1024)throw new Error('invalidInput');const res=await fetch(a.url);if(!res.ok)throw new Error('error');const text=await res.text(),r=fileValidator.validateFile(a.name,text,{dayz:false});const msg=(r.valid?'✅ Fichier valide':r.correctable?'🛠 Correction disponible':'❌ Correction manuelle requise')+(r.error?' · ligne '+(r.line||'?')+' · '+r.error:'');if(r.correctable&&r.correctedContent!=null){const name=a.name.replace(/(\.[^.]+)?$/,'.corrige$1');return reply({content:msg,files:[new AttachmentBuilder(Buffer.from(r.correctedContent,'utf8'),{name})]});}return reply(msg);
 }
 if(i.commandName==='carte'){if(sub==='liste')return reply('🗺️ '+MAPS.join(' · '));const q=i.options.getString('nom',true).toLowerCase(),rows=MAPS.filter(x=>x.toLowerCase().includes(q));return reply(rows.length?'🗺️ '+rows.join(' · '):'Aucune carte officielle trouvée.');}
 if(i.commandName==='recette'){const q=i.options.getString('nom',true).toLowerCase(),key=Object.keys(RECIPES).find(k=>k.includes(q)||q.includes(k));return reply(key?'⚗️ '+key+' : '+RECIPES[key]:'Recette non trouvée dans le catalogue Discord. Utilise le Dashboard pour le catalogue complet.');}
 return reply('🛠️ BOT ARK : cartes, recettes, fichiers JSON/XML/INI, Premium, Top Serveurs, shop, banque RP, profils RP, loterie, mini-jeux, tickets, quêtes, pass, logs et configuration.');
}
module.exports={commands,handle};
