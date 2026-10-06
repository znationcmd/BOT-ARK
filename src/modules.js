const {SlashCommandBuilder,PermissionFlagsBits}=require('discord.js');
const crypto=require('crypto');
const db=require('./db');

const MODULES={
 messages:{label:'Messages',channel:true},
 welcome:{label:'Arrivées et départs',channel:true},
 autoroles:{label:'Rôles automatiques',channel:false},
 levels:{label:'Niveaux',channel:true},
 tempvoice:{label:'Salons vocaux temporaires',channel:false},
 infinity:{label:"Route de l’Infini",channel:true},
 suggestions:{label:'Suggestions',channel:true},
 secureroles:{label:'Rôles sécurisés',channel:true},
 moderation:{label:'Modération',channel:true},
 automod:{label:'Auto-Modération',channel:true},
 reports:{label:'Signalements',channel:true},
 logs:{label:'Logs',channel:true},
 tickets:{label:'Tickets',channel:true},
 snippets:{label:'Snippets',channel:true},
 social:{label:'Notifications sociales',channel:true},
 recurring:{label:'Messages récurrents',channel:true},
 statschannels:{label:'Salons de statistiques',channel:false},
 birthdays:{label:'Anniversaires',channel:true},
 customcommands:{label:'Commandes personnalisées',channel:true},
 wordreactions:{label:'Réactions de mots',channel:true},
 starboard:{label:'Starboards',channel:true},
 reactionroles:{label:'Rôles-Réactions',channel:true}
};

function validateKey(key){if(!MODULES[key]){const e=new Error('Module inconnu');e.code='invalidInput';throw e}return key}
async function get(guildId,key){
 validateKey(key);
 const row=await db.one('SELECT * FROM ark_module_settings WHERE guild_id=$1 AND module_key=$2',[guildId,key]);
 return row?{key,label:MODULES[key].label,enabled:row.enabled,config:row.config||{}}:{key,label:MODULES[key].label,enabled:true,config:{}};
}
async function list(guildId){
 const rows=await db.all('SELECT * FROM ark_module_settings WHERE guild_id=$1',[guildId]);
 const map=new Map(rows.map(r=>[r.module_key,r]));
 return Object.entries(MODULES).map(([key,meta])=>{const r=map.get(key);return{key,label:meta.label,enabled:r?r.enabled:true,config:r?.config||{},needsChannel:meta.channel}});
}
async function save(guildId,key,input){
 validateKey(key);
 const current=await get(guildId,key);
 const config={...(current.config||{}),...(input.config||{})};
 const enabled=input.enabled===undefined?current.enabled:Boolean(input.enabled);
 if(config.channelId!==undefined){
  const id=String(config.channelId||'').trim();
  if(id&&!/^\d{15,25}$/.test(id)){const e=new Error('ID salon Discord invalide');e.code='invalidInput';throw e}
  config.channelId=id;
 }
 const row=await db.one(`INSERT INTO ark_module_settings(guild_id,module_key,enabled,config) VALUES($1,$2,$3,$4)
 ON CONFLICT(guild_id,module_key) DO UPDATE SET enabled=EXCLUDED.enabled,config=EXCLUDED.config,updated_at=NOW()
 RETURNING *`,[guildId,key,enabled,config]);
 return{key,label:MODULES[key].label,enabled:row.enabled,config:row.config||{},needsChannel:MODULES[key].channel};
}
async function record(guildId,key,userId,data){
 validateKey(key);
 const id=crypto.randomUUID();
 await db.query('INSERT INTO ark_module_records(id,guild_id,module_key,user_id,data) VALUES($1,$2,$3,$4,$5)',[id,guildId,key,String(userId||''),data||{}]);
 return{id,guildId,key,userId:String(userId||''),data:data||{}};
}
async function records(guildId,key,limit=50){
 validateKey(key);
 return db.all('SELECT * FROM ark_module_records WHERE guild_id=$1 AND module_key=$2 ORDER BY created_at DESC LIMIT $3',[guildId,key,Math.max(1,Math.min(200,Number(limit)||50))]);
}
async function configuredChannel(client,guildId,key){
 const setting=await get(guildId,key);
 if(!setting.enabled)return null;
 const id=String(setting.config?.channelId||'').trim();
 if(!id)return null;
 const guild=await client.guilds.fetch(guildId).catch(()=>null);
 if(!guild)return null;
 const ch=await guild.channels.fetch(id).catch(()=>null);
 return ch&&ch.isTextBased&&ch.isTextBased()?ch:null;
}
async function send(client,guildId,key,payload){
 const ch=await configuredChannel(client,guildId,key);
 if(!ch)return{sent:false,reason:'channel_not_configured'};
 const safe=typeof payload==='string'?{content:String(payload).slice(0,2000)}:{...payload};
 if(safe.content)safe.content=String(safe.content).slice(0,2000);
 safe.allowedMentions??={parse:[]};
 const message=await ch.send(safe);
 return{sent:true,channelId:ch.id,messageId:message.id};
}
async function handleJoin(client,member){
 const setting=await get(member.guild.id,'welcome');if(!setting.enabled)return;
 const tpl=String(setting.config?.joinMessage||'Bienvenue {user} sur **{server}** !');
 await send(client,member.guild.id,'welcome',tpl.replaceAll('{user}',member.toString()).replaceAll('{server}',member.guild.name));
 const roles=Array.isArray(setting.config?.roleIds)?setting.config.roleIds:[];
 for(const id of roles){const role=member.guild.roles.cache.get(String(id));if(role&&!role.managed)await member.roles.add(role).catch(()=>{})}
}
async function handleLeave(client,member){
 const setting=await get(member.guild.id,'welcome');if(!setting.enabled)return;
 const tpl=String(setting.config?.leaveMessage||'{user} a quitté **{server}**.');
 await send(client,member.guild.id,'welcome',tpl.replaceAll('{user}',member.user?.tag||member.id).replaceAll('{server}',member.guild.name));
}
async function handleMessage(client,message){
 if(!message.guild||message.author?.bot)return;
 const g=message.guild.id;
 // Réactions de mots
 const wr=await get(g,'wordreactions');
 if(wr.enabled&&Array.isArray(wr.config?.rules)){
  for(const rule of wr.config.rules){
   const word=String(rule.word||'').toLowerCase();if(!word||!message.content.toLowerCase().includes(word))continue;
   const emoji=String(rule.emoji||'👍').trim();await message.react(emoji).catch(()=>{});
  }
 }
 // Commandes personnalisées
 const cc=await get(g,'customcommands');
 if(cc.enabled&&message.content.startsWith(String(cc.config?.prefix||'!'))){
  const key=message.content.slice(String(cc.config?.prefix||'!').length).trim().split(/\s+/)[0]?.toLowerCase();
  const cmd=(cc.config?.commands||[]).find(x=>String(x.name||'').toLowerCase()===key);
  if(cmd?.response)await message.reply({content:String(cmd.response).slice(0,1900),allowedMentions:{repliedUser:false,parse:[]} }).catch(()=>{});
 }
 // Auto-mod simple configurable
 const am=await get(g,'automod');
 if(am.enabled){
  const blocked=(am.config?.blockedWords||[]).map(x=>String(x).toLowerCase()).filter(Boolean);
  const hit=blocked.find(w=>message.content.toLowerCase().includes(w));
  if(hit){
    await message.delete().catch(()=>{});
    await send(client,g,'automod',`🛡️ Message supprimé dans <#${message.channelId}> · utilisateur <@${message.author.id}> · mot bloqué: **${hit}**`).catch(()=>{});
    return;
  }
 }
 // Starboard
 if(message.reactions?.cache?.size){
  const star=await get(g,'starboard');const min=Math.max(1,Number(star.config?.minStars||3));
  const count=message.reactions.cache.get('⭐')?.count||0;
  if(star.enabled&&count>=min)await send(client,g,'starboard',{content:`⭐ **Starboard** · ${message.author}\n${message.content||'(message sans texte)'}\n${message.url}`}).catch(()=>{});
 }
}
async function handleReaction(client,reaction,user){
 if(user.bot)return;
 const message=reaction.message.partial?await reaction.message.fetch().catch(()=>null):reaction.message;
 if(!message?.guildId)return;
 const g=message.guildId,setting=await get(g,'starboard');
 if(!setting.enabled)return;
 const emoji=String(setting.config?.emoji||'⭐'),min=Math.max(1,Number(setting.config?.minStars||3));
 if(String(reaction.emoji.name||'')!==emoji||reaction.count<min)return;
 const existing=await db.one("SELECT id FROM ark_module_records WHERE guild_id=$1 AND module_key='starboard' AND data->>'messageId'=$2",[g,message.id]);
 if(existing)return;
 const sent=await send(client,g,'starboard',{content:`${emoji} **Starboard** · ${message.author}\n${message.content||'(message sans texte)'}\n${message.url}`});
 if(sent.sent)await record(g,'starboard',message.author?.id||'',{messageId:message.id,sourceChannelId:message.channelId,starCount:reaction.count});
}
async function handleVoice(client,oldState,newState){
 const g=newState.guild?.id||oldState.guild?.id;if(!g)return;
 const setting=await get(g,'tempvoice');if(!setting.enabled)return;
 const hub=String(setting.config?.hubChannelId||'');
 if(newState.channelId&&newState.channelId===hub&&newState.member){
   const guild=newState.guild;
   const nameTpl=String(setting.config?.name||'Salon de {user}');
   const ch=await guild.channels.create({name:nameTpl.replaceAll('{user}',newState.member.displayName).slice(0,90),type:2,parent:setting.config?.categoryId||undefined,reason:'Salon vocal temporaire'});
   await newState.setChannel(ch).catch(()=>{});
   await record(g,'tempvoice',newState.member.id,{channelId:ch.id,ownerId:newState.member.id});
 }
 if(oldState.channelId&&oldState.channelId!==hub){
   const rec=await db.one("SELECT * FROM ark_module_records WHERE guild_id=$1 AND module_key='tempvoice' AND data->>'channelId'=$2 ORDER BY created_at DESC LIMIT 1",[g,oldState.channelId]);
   if(rec){
     const ch=oldState.guild.channels.cache.get(oldState.channelId);
     if(ch&&ch.members?.size===0){await ch.delete('Salon vocal temporaire vide').catch(()=>{});await db.query('DELETE FROM ark_module_records WHERE id=$1',[rec.id])}
   }
 }
}
async function handleRecurring(client){
 if(!client?.isReady())return;
 const rows=await db.all("SELECT * FROM ark_module_settings WHERE module_key='recurring' AND enabled=true");
 const now=Date.now();
 for(const row of rows){
   const items=Array.isArray(row.config?.items)?row.config.items:[];
   let changed=false;
   for(const item of items){
     const minutes=Math.max(5,Number(item.intervalMinutes||60)),last=Number(item.lastSentAt||0);
     if(!item.message||now-last<minutes*60000)continue;
     const channelId=String(item.channelId||row.config?.channelId||'');
     if(!channelId)continue;
     const guild=await client.guilds.fetch(row.guild_id).catch(()=>null);const ch=guild?await guild.channels.fetch(channelId).catch(()=>null):null;
     if(ch?.isTextBased?.()){await ch.send({content:String(item.message).slice(0,2000),allowedMentions:{parse:[]}}).catch(()=>{});item.lastSentAt=now;changed=true}
   }
   if(changed)await save(row.guild_id,'recurring',{config:{...row.config,items}});
 }
}
async function handleBirthdays(client){
 if(!client?.isReady())return;
 const now=new Date(),day=now.getUTCDate(),month=now.getUTCMonth()+1,year=now.getUTCFullYear();
 const rows=await db.all("SELECT * FROM ark_module_records WHERE module_key='birthdays'");
 for(const row of rows){
   if(Number(row.data?.day)!==day||Number(row.data?.month)!==month||Number(row.data?.lastYear||0)===year)continue;
   const sent=await send(client,row.guild_id,'birthdays',{content:`🎂 Joyeux anniversaire <@${row.user_id}> !`}).catch(()=>({sent:false}));
   if(sent.sent)await db.query("UPDATE ark_module_records SET data=jsonb_set(data,'{lastYear}',to_jsonb($2::int),true),updated_at=NOW() WHERE id=$1",[row.id,year]);
 }
}
async function tick(client){await handleRecurring(client);await handleBirthdays(client)}
function commands(){
 return[
  new SlashCommandBuilder().setName('module-config').setDescription('Configurer un module et son salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o=>o.setName('module').setDescription('Module').setRequired(true).addChoices(...Object.entries(MODULES).map(([value,m])=>({name:m.label,value}))))
    .addChannelOption(o=>o.setName('salon').setDescription('Salon utilisé par ce module').setRequired(false))
    .addBooleanOption(o=>o.setName('active').setDescription('Activer/désactiver').setRequired(false)),
  new SlashCommandBuilder().setName('suggestion').setDescription('Envoyer une suggestion').addStringOption(o=>o.setName('texte').setDescription('Suggestion').setRequired(true).setMaxLength(1200)),
  new SlashCommandBuilder().setName('signalement').setDescription('Faire un signalement').addUserOption(o=>o.setName('joueur').setDescription('Joueur concerné').setRequired(false)).addStringOption(o=>o.setName('raison').setDescription('Raison').setRequired(true).setMaxLength(1200)),
  new SlashCommandBuilder().setName('anniversaire').setDescription('Enregistrer ton anniversaire').addIntegerOption(o=>o.setName('jour').setDescription('Jour').setRequired(true).setMinValue(1).setMaxValue(31)).addIntegerOption(o=>o.setName('mois').setDescription('Mois').setRequired(true).setMinValue(1).setMaxValue(12)),
  new SlashCommandBuilder().setName('snippet').setDescription('Envoyer un snippet enregistré').addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true))
 ];
}
async function handle(i,client){
 if(!['module-config','suggestion','signalement','anniversaire','snippet'].includes(i.commandName))return false;
 const g=i.guildId,u=i.user.id;
 const reply=async x=>i.editReply(typeof x==='string'?{content:x}:{...x});
 if(i.commandName==='module-config'){
  const key=i.options.getString('module',true),ch=i.options.getChannel('salon'),active=i.options.getBoolean('active');
  const patch={};if(ch)patch.channelId=ch.id;
  const row=await save(g,key,{enabled:active===null?undefined:active,config:patch});
  return reply(`✅ **${row.label}** · ${row.enabled?'activé':'désactivé'}${row.config.channelId?` · salon <#${row.config.channelId}>`:''}`);
 }
 if(i.commandName==='suggestion'){
  const text=i.options.getString('texte',true);const rec=await record(g,'suggestions',u,{text,status:'open'});
  const sent=await send(client,g,'suggestions',{content:`💡 **Nouvelle suggestion** de ${i.user}\n${text}\nID: ${rec.id}`});
  return reply(sent.sent?'✅ Suggestion envoyée dans le salon configuré.':'⚠️ Suggestion enregistrée, mais aucun salon Suggestions n’est configuré.');
 }
 if(i.commandName==='signalement'){
  const reason=i.options.getString('raison',true),target=i.options.getUser('joueur');
  const rec=await record(g,'reports',u,{reason,targetId:target?.id||'',status:'open'});
  const sent=await send(client,g,'reports',{content:`🚩 **Signalement**\nAuteur: ${i.user}\n${target?`Concerné: ${target}\n`:''}Raison: ${reason}\nID: ${rec.id}`});
  return reply(sent.sent?'✅ Signalement transmis aux administrateurs.':'⚠️ Signalement enregistré, mais aucun salon Signalements n’est configuré.');
 }
 if(i.commandName==='anniversaire'){
  const day=i.options.getInteger('jour',true),month=i.options.getInteger('mois',true);
  await record(g,'birthdays',u,{day,month});
  return reply(`🎂 Anniversaire enregistré : **${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}**`);
 }
 const cfg=await get(g,'snippets');const name=i.options.getString('nom',true).toLowerCase();const sn=(cfg.config?.items||[]).find(x=>String(x.name||'').toLowerCase()===name);
 if(!sn)return reply('Snippet introuvable.');
 const sent=await send(client,g,'snippets',{content:String(sn.content||'').slice(0,1900)});
 return reply(sent.sent?'✅ Snippet envoyé dans le salon configuré.':'⚠️ Aucun salon Snippets configuré.');
}
module.exports={MODULES,get,list,save,record,records,send,configuredChannel,handleJoin,handleLeave,handleMessage,handleReaction,handleVoice,handleRecurring,handleBirthdays,tick,commands,handle};
