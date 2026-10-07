const {Client,GatewayIntentBits,PermissionFlagsBits:P,ChannelType,REST,Routes,SlashCommandBuilder,MessageFlags,Partials}=require('discord.js');
const db=require('./db'),s=require('./service'),vault=require('./crypto');
const {t}=require('../public/locales');
const {fail}=require('./errors');
const discordTools=require('./discord-tools');
const modules=require('./modules');
let client=null,applicationId='',lastError=null,connecting=false;
const langFrom=locale=>({fr:'fr',de:'de',it:'it',ru:'ru','es-ES':'es','es-419':'es'}[locale]||'en');
const commandLocales={fr:'fr','en-US':'en','en-GB':'en',de:'de','es-ES':'es',it:'it',ru:'ru'};
function desc(builder,key){builder.setDescription(t('fr',key).slice(0,100)).setDescriptionLocalizations(Object.fromEntries(Object.entries(commandLocales).map(([k,l])=>[k,t(l,key).slice(0,100)])));return builder}
function commands(){const b=name=>new SlashCommandBuilder().setName(name).setDMPermission(false);return[
 desc(b('dashboard'),'connectDiscord'),desc(b('quetes'),'quests'),desc(b('pass'),'pass'),desc(b('classement'),'leaderboard'),desc(b('ia'),'assistant'),desc(b('aide'),'guide'),desc(b('saison'),'seasonCurrent'),
 desc(b('quete'),'submitProof').addIntegerOption(o=>desc(o.setName('id').setRequired(true),'quests')).addStringOption(o=>desc(o.setName('preuve').setRequired(true).setMaxLength(2000),'proof')),
 desc(b('recompense'),'claim').addIntegerOption(o=>desc(o.setName('id').setRequired(true),'newReward')),
 desc(b('profil'),'players').addStringOption(o=>desc(o.setName('identifiant').setRequired(true).setMaxLength(100),'gameId')).addStringOption(o=>desc(o.setName('plateforme').setRequired(true),'platform').addChoices({name:'PC',value:'PC'},{name:'Xbox',value:'Xbox'},{name:'PlayStation',value:'PlayStation'})),
 desc(b('ticket'),'newTicket').addStringOption(o=>desc(o.setName('sujet').setRequired(true).setMaxLength(150),'subject')),
 desc(b('fermer'),'close').addIntegerOption(o=>desc(o.setName('id').setRequired(true),'tickets'))
 ].concat(discordTools.commands(),modules.commands()).map(c=>c.toJSON())}
function status(){return {ready:Boolean(client?.isReady()),applicationId,username:client?.user?.username||null,guilds:client?.guilds.cache.size||0,error:lastError,connecting,inviteUrl:applicationId?`https://discord.com/oauth2/authorize?client_id=${applicationId}&permissions=268454928&integration_type=0&scope=bot+applications.commands`:null}}
const discordChannelTypes={text:ChannelType.GuildText,voice:ChannelType.GuildVoice,category:ChannelType.GuildCategory,announcement:ChannelType.GuildAnnouncement,forum:ChannelType.GuildForum};
const channelTypeLabel=t=>Object.entries(discordChannelTypes).find(([,v])=>v===t)?.[0]||String(t);
async function adminGuild(id){if(!client?.isReady())fail('botNotReady',503);const g=await client.guilds.fetch(String(id));if(!g)fail('notFound',404);return g}
function permissionObject(allow=[],deny=[]){const out={};for(const name of allow){if(!(name in P))fail('invalidInput',400);out[name]=true}for(const name of deny){if(!(name in P))fail('invalidInput',400);out[name]=false}return out}
async function adminGuilds(){if(!client?.isReady())return[];return [...client.guilds.cache.values()].map(g=>({id:g.id,name:g.name,icon:g.iconURL({extension:'webp',size:128})||null,memberCount:g.memberCount||0})).sort((a,b)=>a.name.localeCompare(b.name,'fr'))}

function adminSerializeMessage(m){
 return {
  id:String(m.id),channelId:String(m.channelId||''),guildId:m.guildId?String(m.guildId):null,
  content:String(m.content||''),timestamp:m.createdAt?.toISOString?.()||null,editedTimestamp:m.editedAt?.toISOString?.()||null,
  author:{id:String(m.author?.id||''),username:String(m.member?.displayName||m.author?.globalName||m.author?.username||'Utilisateur'),tag:String(m.author?.username||''),bot:Boolean(m.author?.bot),avatar:m.author?.displayAvatarURL?.({extension:'webp',size:128})||null},
  attachments:[...(m.attachments?.values?.()||[])].map(a=>({id:String(a.id),filename:a.name||a.filename||'fichier',url:a.url,proxyUrl:a.proxyURL||null,contentType:a.contentType||null,size:Number(a.size||0),width:a.width??null,height:a.height??null,description:a.description||null})),
  embeds:(m.embeds||[]).map(e=>e.toJSON?e.toJSON():e),
  stickers:[...(m.stickers?.values?.()||[])].map(st=>({id:String(st.id),name:st.name,formatType:st.format})),
  reactions:[...(m.reactions?.cache?.values?.()||[])].map(r=>({count:Number(r.count||0),me:Boolean(r.me),emoji:{id:r.emoji?.id||null,name:r.emoji?.name||null,animated:Boolean(r.emoji?.animated)}})),
  mentions:[...(m.mentions?.users?.values?.()||[])].map(u=>({id:String(u.id),username:String(u.globalName||u.username||'Utilisateur'),avatar:u.displayAvatarURL?.({extension:'webp',size:128})||null})),
  mentionRoles:[...(m.mentions?.roles?.keys?.()||[])].map(String),pinned:Boolean(m.pinned),tts:Boolean(m.tts),type:Number(m.type||0),
  reference:m.reference?{messageId:m.reference.messageId||null,channelId:m.reference.channelId||null,guildId:m.reference.guildId||null}:null,
  contentIntentEnabled:process.env.DISCORD_MESSAGE_CONTENT==='true'
 };
}
async function adminMessages(guildId,channelId,before,limit=100){
 const g=await adminGuild(guildId),ch=await g.channels.fetch(String(channelId||''));
 if(!ch||String(ch.guildId||'')!==String(g.id)||!ch.isTextBased?.()||!ch.messages)fail('notFound',404);
 const n=Math.max(1,Math.min(100,Number(limit)||100)),opts={limit:n};if(before&&/^\d{15,22}$/.test(String(before)))opts.before=String(before);
 const rows=await ch.messages.fetch(opts),arr=[...rows.values()];
 return {channel:{id:ch.id,name:ch.name||ch.id,type:channelTypeLabel(ch.type),topic:'topic'in ch?(ch.topic||null):null,parentId:ch.parentId||null},messages:arr.map(adminSerializeMessage),hasMore:arr.length===n,nextBefore:arr.length?arr[arr.length-1].id:null,contentIntentEnabled:process.env.DISCORD_MESSAGE_CONTENT==='true'};
}

function adminSerializeWebhook(w){
 const owner=w.owner||w.user||null;
 return {id:String(w.id),guildId:w.guildId?String(w.guildId):null,channelId:w.channelId?String(w.channelId):null,name:String(w.name||'Webhook'),avatar:w.avatarURL?.({extension:'webp',size:128})||null,type:Number(w.type||1),creator:owner?{id:String(owner.id||''),username:String(owner.globalName||owner.username||owner.tag||'Discord')}:null};
}
async function adminWebhooks(guildId){
 const g=await adminGuild(guildId),rows=await g.fetchWebhooks();
 return {guildId:g.id,webhooks:[...rows.values()].map(adminSerializeWebhook).sort((a,b)=>a.name.localeCompare(b.name,'fr'))};
}

function adminPlain(v){try{return JSON.parse(JSON.stringify(v,(k,x)=>typeof x==='bigint'?x.toString():x))}catch{return null}}
function adminIntegrationRow(i){
 const app=i.application||null,user=i.user||null;
 return {id:String(i.id||''),name:String(i.name||''),type:String(i.type||''),enabled:i.enabled!==false,roleId:i.role?.id||i.roleId||null,
  user:user?{id:String(user.id||''),username:String(user.globalName||user.username||user.tag||'Utilisateur'),bot:Boolean(user.bot)}:null,
  application:app?{id:String(app.id||''),name:String(app.name||''),bot:app.bot?{id:String(app.bot.id||''),username:String(app.bot.username||''),avatar:app.bot.displayAvatarURL?.({extension:'webp',size:128})||null}:null}:null,
  scopes:Array.isArray(i.scopes)?i.scopes:[]};
}
async function adminExtras(guildId){
 const g=await adminGuild(guildId);await g.fetch().catch(()=>{});
 const errors={};const take=async(name,fn,fallback)=>{try{return await fn()}catch(e){errors[name]=e.message;return fallback}};
 const integrations=await take('integrations',async()=>[...(await g.fetchIntegrations()).values()].map(adminIntegrationRow),[]);
 const botIds=[...new Set(integrations.flatMap(i=>[i.user?.bot&&i.user?.id,i.application?.bot?.id]).filter(Boolean).map(String))],bots=[];
 for(const id of botIds){const m=await g.members.fetch(id).catch(()=>null);if(!m)continue;bots.push({id:String(id),username:String(m.user?.globalName||m.user?.username||id),avatar:m.user?.displayAvatarURL?.({extension:'webp',size:128})||null,nickname:m.nickname||null,roles:[...m.roles.cache.values()].map(r=>({id:String(r.id),name:r.name,position:r.position})),permissions:m.permissions?.bitfield?.toString?.()||null})}
 const autoModeration=await take('autoModeration',async()=>[...(await g.autoModerationRules.fetch()).values()].map(x=>adminPlain(x.toJSON?x.toJSON():x)),[]);
 const scheduledEvents=await take('scheduledEvents',async()=>[...(await g.scheduledEvents.fetch()).values()].map(x=>adminPlain(x.toJSON?x.toJSON():x)),[]);
 const emojis=await take('emojis',async()=>[...(await g.emojis.fetch()).values()].map(e=>({id:String(e.id),name:e.name,animated:Boolean(e.animated),url:e.imageURL?.({extension:e.animated?'gif':'webp',size:128})||null})),[]);
 const stickers=await take('stickers',async()=>[...(await g.stickers.fetch()).values()].map(st=>({id:String(st.id),name:st.name,description:st.description||null,tags:st.tags||null,format:Number(st.format),url:st.url||null})),[]);
 let threads=[];try{const active=await g.channels.fetchActiveThreads();threads=[...active.threads.values()].map(t=>({id:String(t.id),name:String(t.name||t.id),type:'thread',typeId:t.type,parentId:t.parentId||null,ownerId:t.ownerId||null,archived:Boolean(t.archived),locked:Boolean(t.locked),autoArchiveDuration:t.autoArchiveDuration??null,createdTimestamp:t.createdTimestamp||null,archiveTimestamp:t.archiveTimestamp||null}))}catch(e){errors.threads=e.message}
 return {guild:{id:g.id,name:g.name,description:g.description||null,icon:g.iconURL({extension:'webp',size:256})||null,banner:g.bannerURL?.({extension:'webp',size:1024})||null,splash:g.splashURL?.({extension:'webp',size:1024})||null,ownerId:g.ownerId||null,memberCount:g.memberCount||0,verificationLevel:Number(g.verificationLevel||0),preferredLocale:g.preferredLocale||null,premiumTier:Number(g.premiumTier||0),features:[...(g.features||[])]},integrations,bots,autoModeration,scheduledEvents,emojis,stickers,threads,errors};
}

async function adminStructure(id){
 const g=await adminGuild(id);await g.channels.fetch();await g.roles.fetch();const me=await g.members.fetchMe().catch(()=>null);
 return {id:g.id,name:g.name,icon:g.iconURL({extension:'webp',size:128})||null,memberCount:g.memberCount||0,bot:{id:client.user?.id||null,name:client.user?.username||null,highestRolePosition:me?.roles?.highest?.position??null},channels:[...g.channels.cache.values()].map(ch=>({id:ch.id,name:ch.name,type:channelTypeLabel(ch.type),typeId:ch.type,parentId:ch.parentId||null,position:ch.rawPosition??ch.position??0,topic:'topic'in ch?(ch.topic||null):null})).sort((a,b)=>a.position-b.position||a.name.localeCompare(b.name,'fr')),roles:[...g.roles.cache.values()].map(r=>({id:r.id,name:r.name,color:r.hexColor,position:r.position,hoist:r.hoist,mentionable:r.mentionable,managed:r.managed,permissions:r.permissions.bitfield.toString(),everyone:r.id===g.id})).sort((a,b)=>b.position-a.position)};
}
async function adminAction(body){
 const g=await adminGuild(body.guildId),action=String(body.action||'');
 if(action==='create_category'){const ch=await g.channels.create({name:String(body.name||'Nouvelle catégorie').slice(0,100),type:ChannelType.GuildCategory,position:Number.isFinite(Number(body.position))?Number(body.position):undefined,reason:'CMD Discord MCP'});return {ok:true,channel:{id:ch.id,name:ch.name,type:'category',position:ch.position}}}
 if(action==='create_channel'){const type=discordChannelTypes[String(body.type||'text')];if(type===undefined)fail('invalidInput',400);const ch=await g.channels.create({name:String(body.name||'nouveau-salon').slice(0,100),type,parent:body.parentId||undefined,topic:body.topic&&type===ChannelType.GuildText?String(body.topic).slice(0,1024):undefined,position:Number.isFinite(Number(body.position))?Number(body.position):undefined,reason:'CMD Discord MCP'});return {ok:true,channel:{id:ch.id,name:ch.name,type:channelTypeLabel(ch.type),parentId:ch.parentId||null,position:ch.position}}}
 if(action==='update_channel'){const ch=await g.channels.fetch(String(body.channelId||''));if(!ch)fail('notFound',404);const edit={reason:'CMD Discord MCP'};if(body.name!==undefined)edit.name=String(body.name).slice(0,100);if(body.parentId!==undefined)edit.parent=body.parentId||null;if(body.topic!==undefined&&'setTopic'in ch)edit.topic=body.topic?String(body.topic).slice(0,1024):null;await ch.edit(edit);if(body.position!==undefined)await ch.setPosition(Number(body.position),{reason:'CMD Discord MCP'});return {ok:true,channel:{id:ch.id,name:ch.name,parentId:ch.parentId||null,position:ch.position}}}
 if(action==='delete_channel'){const ch=await g.channels.fetch(String(body.channelId||''));if(!ch)fail('notFound',404);const result={id:ch.id,name:ch.name};await ch.delete('CMD Discord MCP');return {ok:true,deleted:result}}
 if(action==='create_role'){const opts={name:String(body.name||'Nouveau rôle').slice(0,100),hoist:Boolean(body.hoist),mentionable:Boolean(body.mentionable),reason:'CMD Discord MCP'};if(body.color)opts.color=String(body.color);if(body.permissions!==undefined)opts.permissions=BigInt(String(body.permissions));const role=await g.roles.create(opts);if(body.position!==undefined)await role.setPosition(Number(body.position),{reason:'CMD Discord MCP'});return {ok:true,role:{id:role.id,name:role.name,color:role.hexColor,position:role.position}}}
 if(action==='update_role'){const role=await g.roles.fetch(String(body.roleId||''));if(!role||role.id===g.id)fail('notFound',404);const opts={reason:'CMD Discord MCP'};if(body.name!==undefined)opts.name=String(body.name).slice(0,100);if(body.color!==undefined)opts.color=body.color?String(body.color):null;if(body.hoist!==undefined)opts.hoist=Boolean(body.hoist);if(body.mentionable!==undefined)opts.mentionable=Boolean(body.mentionable);if(body.permissions!==undefined)opts.permissions=BigInt(String(body.permissions));await role.edit(opts);if(body.position!==undefined)await role.setPosition(Number(body.position),{reason:'CMD Discord MCP'});return {ok:true,role:{id:role.id,name:role.name,color:role.hexColor,position:role.position}}}
 if(action==='delete_role'){const role=await g.roles.fetch(String(body.roleId||''));if(!role||role.id===g.id)fail('notFound',404);const result={id:role.id,name:role.name};await role.delete('CMD Discord MCP');return {ok:true,deleted:result}}
 if(action==='set_channel_permissions'){const ch=await g.channels.fetch(String(body.channelId||''));if(!ch)fail('notFound',404);const target=body.targetType==='member'?await g.members.fetch(String(body.targetId||'')):await g.roles.fetch(String(body.targetId||''));if(!target)fail('notFound',404);await ch.permissionOverwrites.edit(target,permissionObject(body.allow||[],body.deny||[]),{reason:'CMD Discord MCP'});return {ok:true,channelId:ch.id,targetId:String(body.targetId)}}
 if(action==='send_message'){const ch=await g.channels.fetch(String(body.channelId||''));if(!ch||String(ch.guildId||'')!==String(g.id)||!ch.isTextBased?.())fail('notFound',404);const content=String(body.content||'').trim().slice(0,2000);if(!content)fail('invalidInput',400);const options={content,allowedMentions:{parse:['users','roles'],repliedUser:false}};if(body.replyTo&&/^\d{15,22}$/.test(String(body.replyTo)))options.reply={messageReference:String(body.replyTo),failIfNotExists:false};const m=await ch.send(options);return {ok:true,message:adminSerializeMessage(m),sentAsBot:true}}
 fail('invalidInput',400);
}
function installedGuilds(){if(!client?.isReady())return [];return [...client.guilds.cache.values()].map(g=>({id:g.id,name:g.name,icon:g.iconURL({extension:'webp',size:128})||null,ownerId:g.ownerId,memberCount:g.memberCount||0,installed:true})).sort((a,b)=>a.name.localeCompare(b.name,'fr'))}
async function guildAccess(guildId,userId){
  if(!client?.isReady())return null;
  try{
    const guild=await client.guilds.fetch(guildId);
    const member=await guild.members.fetch(userId);
    return isManager(guild,member)?'admin':'player';
  }catch{return null}
}
async function accessibleGuilds(userId){
  if(!client?.isReady()||!userId)return[];
  const out=[];
  for(const guild of client.guilds.cache.values()){
    try{
      const member=await guild.members.fetch(userId);
      if(!isManager(guild,member))continue;
      out.push({id:guild.id,name:guild.name,icon:guild.iconURL({extension:'webp',size:128})||null,ownerId:guild.ownerId,memberCount:guild.memberCount||0,installed:true,manageable:true,owned:guild.ownerId===userId,role:'admin'});
    }catch{}
  }
  return out.sort((a,b)=>a.name.localeCompare(b.name,'fr'));
}
async function guildChannels(guildId){if(!client?.isReady())return[];const guild=await client.guilds.fetch(guildId);await guild.channels.fetch();return [...guild.channels.cache.values()].filter(ch=>[ChannelType.GuildText,ChannelType.GuildAnnouncement,ChannelType.GuildVoice,ChannelType.GuildCategory].includes(ch.type)).map(ch=>({id:ch.id,name:ch.name,type:ch.type,parentId:ch.parentId||null})).sort((a,b)=>a.type-b.type||a.name.localeCompare(b.name,'fr'))}
function isManager(guild,member){return guild.ownerId===member.id||member.permissions.has(P.Administrator)||member.permissions.has(P.ManageGuild)}
async function verify(g,user,role){if(!client?.isReady())fail('botNotReady');const guild=await client.guilds.fetch(g);const member=await guild.members.fetch(user);if(role==='admin'&&!isManager(guild,member))fail('forbidden',403);return true}
async function createTicketChannel(ticket){if(!client?.isReady())return ticket;return db.tx(async()=>{ticket=await db.one('SELECT * FROM ark_tickets WHERE id=$1 FOR UPDATE',[ticket.id]);if(!ticket||ticket.channel_id||ticket.status!=='open')return ticket;const guild=await client.guilds.fetch(ticket.guild_id);const config=(await db.one('SELECT config FROM ark_guilds WHERE id=$1',[ticket.guild_id]))?.config||{};
 const overwrites=[{id:guild.id,deny:[P.ViewChannel]},{id:client.user.id,allow:[P.ViewChannel,P.SendMessages,P.ReadMessageHistory,P.ManageChannels]},{id:ticket.user_id,allow:[P.ViewChannel,P.SendMessages,P.ReadMessageHistory]}];
 if(config.staff_role_id)overwrites.push({id:config.staff_role_id,allow:[P.ViewChannel,P.SendMessages,P.ReadMessageHistory]});
 const channel=await guild.channels.create({name:'ticket-'+ticket.id,type:ChannelType.GuildText,parent:config.ticket_category_id||undefined,permissionOverwrites:overwrites,reason:'BOT ARK ticket '+ticket.id});
 await db.query('UPDATE ark_tickets SET channel_id=$2 WHERE id=$1',[ticket.id,channel.id]);await channel.send({content:`**BOT ARK · #${ticket.id}**\n${ticket.title}`,allowedMentions:{parse:[]}});return {...ticket,channel_id:channel.id};});
}
async function closeTicketChannel(ticket){if(!client?.isReady()||!ticket.channel_id)return;const channel=await client.channels.fetch(ticket.channel_id);if(!channel)return;await channel.permissionOverwrites.edit(ticket.user_id,{SendMessages:false});await channel.setName('closed-'+ticket.id);}
async function mirrorMessage(ticket,name,body){if(!client?.isReady()||!ticket.channel_id)return;const channel=await client.channels.fetch(ticket.channel_id);await channel.send({content:`**${name.slice(0,100)}**\n${body}`.slice(0,2000),allowedMentions:{parse:[]}})}
async function deliverRole(claim){if(claim.reward.kind!=='role'||!client?.isReady())return false;const guild=await client.guilds.fetch(claim.guild_id);const role=await guild.roles.fetch(claim.reward.role_id);if(!role||role.managed||role.id===guild.id)fail('discordError');const member=await guild.members.fetch(claim.user_id);await member.roles.add(role);await s.deliverReward(claim.guild_id,'BOT ARK',claim.id);return true}
async function onInteraction(i){if(!i.isChatInputCommand()||!i.guildId)return;await i.deferReply({flags:MessageFlags.Ephemeral});const g=i.guildId,user=i.user.id;await s.guild(g,i.guild.name);await s.member(g,user,i.user.username);const config=(await db.one('SELECT config FROM ark_guilds WHERE id=$1',[g])).config;const lang=config.language||langFrom(i.locale);const tr=key=>t(lang,key);const base=String(process.env.PUBLIC_BASE_URL||'').replace(/\/$/,'');let content='';
 try{
 if(await modules.handle(i,client))return;
 switch(i.commandName){
 case 'dashboard':{const token=require('crypto').randomBytes(32).toString('base64url');const role=isManager(i.guild,{id:user,permissions:i.memberPermissions})?'admin':'player';await db.query('DELETE FROM ark_login_links WHERE expires_at<$1',[Date.now()]);await db.query('INSERT INTO ark_login_links VALUES($1,$2,$3,$4,$5,$6)',[s.sha(token),g,user,i.user.username,role,Date.now()+300000]);return i.editReply({content:tr('commandDashboard'),components:[{type:1,components:[{type:2,style:5,label:'Ouvrir mon Dashboard',url:base+'/#login='+token}]}]})}
 case 'quetes':{const rows=await s.quests(g,user);content=rows.length?rows.slice(0,15).map(q=>`**#${q.id} ${q.title}** — ${q.progress}/${q.goal} · ${q.xp} XP · ${tr(q.period)}${q.completed?' ✅':''}`).join('\n'):tr('noSeason');break}
 case 'quete':await s.claimQuest(g,user,i.options.getInteger('id',true),i.options.getString('preuve',true));content=tr('commandSent');break;
 case 'pass':{const p=await s.pass(g,user);content=p.season?`**${p.season.name}**\n${tr('tier')} **${p.tier}** · **${p.xp} XP** · ${tr(p.premium?'premium':'free')}\n`+p.rewards.slice(0,10).map(r=>`#${r.id} · ${r.title} · ${tr('tier')} ${r.tier} · ${tr(r.claim_status||(!r.unlocked?'locked':'claim'))}`).join('\n'):tr('noSeason');break}
 case 'recompense':{const c=await s.claimReward(g,user,i.options.getInteger('id',true));try{await deliverRole(c)}catch(e){await s.audit(g,'BOT ARK','reward.delivery_pending',{id:c.id})}content=tr('commandClaim');break}
 case 'profil':await db.query('UPDATE ark_members SET game_id=$3,platform=$4,verified=false WHERE guild_id=$1 AND user_id=$2',[g,user,i.options.getString('identifiant',true),i.options.getString('plateforme',true)]);content=tr('commandProfile');break;
 case 'ticket':{let row=await s.openTicket(g,user,i.options.getString('sujet',true));try{row=await createTicketChannel(row)}catch(e){await s.audit(g,'BOT ARK','ticket.channel_pending',{id:row.id})}content=tr('commandTicket')+` #${row.id}`+(row.channel_id?` <#${row.channel_id}>`:'');break}
 case 'fermer':{const role=isManager(i.guild,{id:user,permissions:i.memberPermissions})||Boolean(config.staff_role_id&&(i.member?.roles?.cache?.has(config.staff_role_id)||i.member?.roles?.includes?.(config.staff_role_id)));const row=await s.closeTicket(g,user,i.options.getInteger('id',true),role);await closeTicketChannel(row).catch(()=>{});content=tr('closed');break}
 case 'classement':{const snap=await s.snapshot(g,user,false);content=snap.leaderboard.length?snap.leaderboard.slice(0,10).map((r,n)=>`${n+1}. **${r.name}** · ${r.xp} XP`).join('\n'):tr('empty');break}
 case 'saison':{const row=await s.active(g);content=row?`**${row.name}**\n${tr('ends')} : ${new Intl.DateTimeFormat(lang,{dateStyle:'long'}).format(new Date(row.ends_at))}`:tr('noSeason');break}
 case 'ia':content=tr('aiIntro')+'\n'+base+'/#assistant';break;
 case 'aide':content=tr('guideSeasons')+'\n\n'+tr('guideQuests')+'\n'+base+'/#guide';break;
 default:content=tr('guide');
 }await i.editReply({content:content.slice(0,1950),allowedMentions:{parse:[]}});
 }catch(e){await i.editReply({content:tr(e.code||'error'),allowedMentions:{parse:[]}})}
}
async function start(credentials){if(connecting)fail('working');connecting=true;let candidate,readyTimeout;try{
 let token=credentials?.token||process.env.DISCORD_TOKEN,id=credentials?.clientId||process.env.DISCORD_CLIENT_ID;
 if(!token){const row=await db.one("SELECT value FROM ark_system WHERE key='discord'");if(row){const data=JSON.parse(vault.decrypt(row.value));token=data.token;id=data.clientId;}}
 if(!token||!id){lastError=null;return status()}
 const rest=new REST({version:'10'}).setToken(token);const app=await rest.get(Routes.oauth2CurrentApplication());if(app.id!==id)fail('discordError');
 const intents=[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.GuildMessageReactions,GatewayIntentBits.GuildVoiceStates];
 if(process.env.DISCORD_MESSAGE_CONTENT==='true')intents.push(GatewayIntentBits.MessageContent);
 if(process.env.DISCORD_GUILD_MEMBERS==='true')intents.push(GatewayIntentBits.GuildMembers);
 candidate=new Client({intents,partials:[Partials.Message,Partials.Channel,Partials.Reaction]});candidate.on('error',e=>console.error('Discord :',e.code||e.name));candidate.on('shardDisconnect',()=>{lastError='discordDisconnected';console.warn('Discord déconnecté — discord.js tente la reconnexion automatiquement')});candidate.on('shardResume',()=>{lastError=null;console.log('BOT ARK reconnecté à Discord')});candidate.on('invalidated',()=>{lastError='discordInvalidated';console.error('Session Discord invalidée — redémarrage de la connexion');setTimeout(()=>start().catch(()=>{}),5000).unref()});
 candidate.on('interactionCreate',i=>onInteraction(i).catch(e=>console.error('Commande Discord :',e.code||e.name)));
 candidate.on('guildCreate',g=>s.guild(g.id,g.name).catch(()=>{}));
 candidate.on('guildMemberAdd',m=>modules.handleJoin(candidate,m).catch(e=>console.error('Arrivée Discord :',e.code||e.name)));
 candidate.on('guildMemberRemove',m=>modules.handleLeave(candidate,m).catch(e=>console.error('Départ Discord :',e.code||e.name)));
 candidate.on('voiceStateUpdate',(a,b)=>modules.handleVoice(candidate,a,b).catch(e=>console.error('Vocal temporaire :',e.code||e.name)));
 candidate.on('messageReactionAdd',(r,u)=>modules.handleReaction(candidate,r,u).catch(e=>console.error('Starboard :',e.code||e.name)));
 candidate.on('messageCreate',async m=>{if(m.author.bot||!m.guildId)return;try{await modules.handleMessage(candidate,m);const ticket=await db.one("SELECT * FROM ark_tickets WHERE channel_id=$1 AND status='open'",[m.channelId]);if(!ticket)return;const config=(await db.one('SELECT config FROM ark_guilds WHERE id=$1',[m.guildId]))?.config||{};const staff=isManager(m.guild,m.member)||m.member.roles.cache.has(config.staff_role_id);await s.ticketMessage(m.guildId,m.author.id,m.author.username,ticket.id,m.content,staff,m.id)}catch(e){console.error('Message Discord :',e.code||e.name)}});
 const ready=new Promise((resolve,reject)=>{readyTimeout=setTimeout(()=>reject(Error('timeout')),20000);candidate.once('clientReady',()=>{clearTimeout(readyTimeout);resolve()});});
 ready.catch(()=>{});await candidate.login(token);await ready;
 const old=client;client=candidate;applicationId=id;lastError=null;old?.destroy();console.log('BOT ARK connecté :',client.user.tag);
 try{await rest.put(Routes.applicationCommands(id),{body:commands()})}catch(e){lastError='discordCommands';console.error('BOT ARK · commandes Discord :',e.code||e.message||e.name)}
 for(const g of client.guilds.cache.values())await s.guild(g.id,g.name);
 if(credentials)await db.query("INSERT INTO ark_system(key,value) VALUES('discord',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value",[vault.encrypt(JSON.stringify({token,clientId:id}))]);
 return status();
 }catch(e){candidate?.destroy();lastError='discordError';if(credentials)fail('discordError',400);console.error('BOT ARK : Discord non connecté :',e.code||e.message||e.name);return status()}finally{clearTimeout(readyTimeout);connecting=false}}
let auditRunning=false;
async function flushAudit(){if(auditRunning||!client?.isReady())return;auditRunning=true;try{const rows=await db.all("SELECT a.*,g.config->>'audit_channel_id' AS channel FROM ark_audit a JOIN ark_guilds g ON g.id=a.guild_id WHERE a.discord_sent=false AND a.created_at>NOW()-INTERVAL '1 day' AND COALESCE(g.config->>'audit_channel_id','')<>'' ORDER BY a.id LIMIT 20");for(const row of rows){try{const channel=await client.channels.fetch(row.channel);if(channel?.guildId!==row.guild_id||!channel.isTextBased())continue;await channel.send({content:`**BOT ARK · ${row.action}**\n${row.actor} · ${new Date(row.created_at).toISOString()}`,allowedMentions:{parse:[]}});await db.query('UPDATE ark_audit SET discord_sent=true WHERE id=$1',[row.id]);}catch(e){console.error('Journal Discord :',e.code||e.name)}}}finally{auditRunning=false}}
const auditTimer=setInterval(()=>flushAudit().catch(()=>{}),60000);auditTimer.unref();
const moduleTimer=setInterval(()=>modules.tick(client).catch(()=>{}),60000);moduleTimer.unref();
module.exports={start,status,installedGuilds,accessibleGuilds,guildAccess,guildChannels,verify,createTicketChannel,closeTicketChannel,mirrorMessage,deliverRole,commands,adminGuilds,adminStructure,adminMessages,adminWebhooks,adminExtras,adminAction,stop:()=>{clearInterval(auditTimer);clearInterval(moduleTimer);client?.destroy()}};
