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
module.exports={start,status,installedGuilds,accessibleGuilds,guildAccess,guildChannels,verify,createTicketChannel,closeTicketChannel,mirrorMessage,deliverRole,commands,stop:()=>{clearInterval(auditTimer);clearInterval(moduleTimer);client?.destroy()}};
