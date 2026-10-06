const crypto=require('node:crypto');
const db=require('./db');
const {fail}=require('./errors');

const PAYPAL_URL='https://www.paypal.me/ZnationCmdofficiel';
const PLANS={
 multiserver:{name:'Premium Multi-serveur',maxServers:20,monthly:{amountCents:299,days:30},yearly:{amountCents:2500,days:365}},
 battlepass:{name:'Pass de combat Premium',maxServers:0,monthly:{amountCents:299,days:30},yearly:{amountCents:2500,days:365}}
};
const hash=s=>crypto.createHash('sha256').update(String(s).trim().toUpperCase()).digest('hex');
function plan(product,billing){const p=PLANS[product],b=p?.[billing];if(!p||!b)fail('invalidPremiumPlan',400);return {...p,...b,product,billing};}
function makeCode(product){return `VAL-${product==='multiserver'?'MULTI':'PASS'}-${crypto.randomBytes(9).toString('base64url').toUpperCase()}`;}
async function activeSubscription(g,user,product){
 return db.one("SELECT * FROM ark_premium_subscriptions WHERE guild_id=$1 AND user_id=$2 AND product=$3 AND expires_at>NOW() ORDER BY expires_at DESC LIMIT 1",[g,user,product]);
}
async function status(g,user){
 const [multi,battle,servers]=await Promise.all([activeSubscription(g,user,'multiserver'),activeSubscription(g,user,'battlepass'),db.all('SELECT * FROM ark_premium_servers WHERE guild_id=$1 ORDER BY id',[g])]);
 return {paypalUrl:PAYPAL_URL,plans:PLANS,multiserver:multi||null,battlepass:battle||null,maxServers:multi?20:1,servers};
}
async function requestPayment(g,user,product,billing){
 const p=plan(product,billing),id=crypto.randomUUID(),reference=`VAL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
 const row=await db.one('INSERT INTO ark_payment_requests(id,guild_id,user_id,product,billing,amount_cents,reference) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[id,g,user,product,billing,p.amountCents,reference]);
 return {...row,paypalUrl:PAYPAL_URL,amount:(p.amountCents/100).toFixed(2)+' €'};
}
async function generateCode(actor,product,billing){
 const p=plan(product,billing),code=makeCode(product);
 const row=await db.one('INSERT INTO ark_premium_codes(code_hash,product,billing,duration_days,max_servers,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,product,billing,duration_days,max_servers,created_at',[hash(code),product,billing,p.days,p.maxServers,actor]);
 return {...row,code};
}
async function approvePayment(actor,id){
 return db.tx(async()=>{
   const req=await db.one("SELECT * FROM ark_payment_requests WHERE id=$1 FOR UPDATE",[id]);if(!req)fail('notFound',404);if(req.status!=='pending')fail('alreadyReviewed',400);
   const generated=await generateCode(actor,req.product,req.billing);
   await db.query("UPDATE ark_payment_requests SET status='approved',validated_at=NOW() WHERE id=$1",[id]);
   return {...generated,reference:req.reference,userId:req.user_id,guildId:req.guild_id};
 });
}
async function redeem(g,user,code){
 const codeHash=hash(code);
 return db.tx(async()=>{
   const row=await db.one('SELECT * FROM ark_premium_codes WHERE code_hash=$1 FOR UPDATE',[codeHash]);if(!row)fail('invalidActivationCode',400);if(row.used_at)fail('activationCodeUsed',400);
   const existing=await activeSubscription(g,user,row.product);
   const base=existing&&new Date(existing.expires_at)>new Date()?new Date(existing.expires_at):new Date();
   const expires=new Date(base.getTime()+Number(row.duration_days)*86400000);
   const sub=await db.one('INSERT INTO ark_premium_subscriptions(guild_id,user_id,product,starts_at,expires_at,source_code_id) VALUES($1,$2,$3,NOW(),$4,$5) RETURNING *',[g,user,row.product,expires,row.id]);
   await db.query('UPDATE ark_premium_codes SET used_by=$2,used_guild=$3,used_at=NOW() WHERE id=$1',[row.id,user,g]);
   if(row.product==='battlepass'){
     const season=await db.one("SELECT id FROM ark_seasons WHERE guild_id=$1 AND status='published' AND starts_at<=NOW() AND ends_at>NOW() ORDER BY starts_at DESC LIMIT 1",[g]);
     if(season)await db.query('INSERT INTO ark_progress(guild_id,season_id,user_id,premium) VALUES($1,$2,$3,TRUE) ON CONFLICT(guild_id,season_id,user_id) DO UPDATE SET premium=TRUE',[g,season.id,user]);
   }
   return sub;
 });
}
async function registerServer(g,user,label,serviceId){
 const multi=await activeSubscription(g,user,'multiserver'),limit=multi?20:1;
 const count=Number((await db.one('SELECT COUNT(*)::int AS c FROM ark_premium_servers WHERE guild_id=$1',[g]))?.c||0);
 if(count>=limit)fail(multi?'premiumServerLimit':'premiumRequired',403);
 const service=String(serviceId||'').trim();if(!/^\d{1,20}$/.test(service))fail('invalidInput',400);
 const name=String(label||('ARK #'+service)).trim().slice(0,100);
 return db.one('INSERT INTO ark_premium_servers(guild_id,label,service_id) VALUES($1,$2,$3) ON CONFLICT(guild_id,service_id) DO UPDATE SET label=EXCLUDED.label RETURNING *',[g,name,service]);
}
async function removeServer(g,id){const row=await db.one('DELETE FROM ark_premium_servers WHERE guild_id=$1 AND id=$2 RETURNING id',[g,id]);if(!row)fail('notFound',404);return {ok:true};}
async function admin(g){
 const [requests,codes,subs]=await Promise.all([
  db.all('SELECT * FROM ark_payment_requests WHERE ($1::text IS NULL OR guild_id=$1) ORDER BY created_at DESC LIMIT 200',[g||null]),
  db.all('SELECT id,product,billing,duration_days,max_servers,created_by,created_at,used_by,used_guild,used_at FROM ark_premium_codes ORDER BY id DESC LIMIT 200'),
  db.all('SELECT * FROM ark_premium_subscriptions WHERE ($1::text IS NULL OR guild_id=$1) ORDER BY id DESC LIMIT 200',[g||null])
 ]);
 return {requests,codes,subscriptions:subs};
}
module.exports={PAYPAL_URL,PLANS,status,requestPayment,generateCode,approvePayment,redeem,registerServer,removeServer,admin,activeSubscription};