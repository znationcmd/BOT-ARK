const db=require('./db'),s=require('./service'),vault=require('./crypto');
const {fail}=require('./errors');
async function api(token,path){const r=await fetch('https://api.nitrado.net'+path,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(15000)});if(!r.ok)fail('nitradoError',502);const b=await r.json();return b.data||b}
async function services(g){const row=await db.one('SELECT config FROM ark_guilds WHERE id=$1',[g]);if(!row?.config.nitrado_token_enc)fail('nitradoMissing');const b=await api(vault.decrypt(row.config.nitrado_token_enc),'/services');return (b.services||[]).map(x=>({id:x.id,label:x.details?.name||x.details?.game||String(x.id)}))}
async function poll(g){const row=await db.one('SELECT config FROM ark_guilds WHERE id=$1',[g]);const c=row?.config;if(!c?.nitrado_token_enc||!c.nitrado_service_id)fail('nitradoMissing');const token=vault.decrypt(c.nitrado_token_enc);let file=c.nitrado_log_path;
 if(!file){const data=await api(token,`/services/${encodeURIComponent(c.nitrado_service_id)}/gameservers`);const files=data.gameserver?.game_specific?.log_files||[];const f=files.find(x=>String(typeof x==='string'?x:x.path||x.name).includes('ShooterGame'))||files[0];file=typeof f==='string'?f:f?.path||f?.name;if(!file)fail('logPathMissing')}
 const info=await api(token,`/services/${encodeURIComponent(c.nitrado_service_id)}/gameservers/file_server/download?`+new URLSearchParams({file}));
 if(!info.token?.url||!info.token?.token)fail('nitradoError',502);const url=new URL(info.token.url);if(url.protocol!=='https:')fail('nitradoSecureUrl');url.searchParams.set('token',info.token.token);
 const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)fail('nitradoError',502);
 const limit=1000000;let bytes=0;const chunks=[];for await(const chunk of response.body){bytes+=chunk.length;if(bytes>limit)fail('logTooLarge');chunks.push(Buffer.from(chunk));}
 const result=await s.rawLogs(g,'Nitrado '+c.nitrado_service_id,Buffer.concat(chunks).toString('utf8'));await db.query("UPDATE ark_guilds SET config=config||$2::jsonb WHERE id=$1",[g,JSON.stringify({last_poll:new Date().toISOString(),poll_error:null})]);return result;
}
let timer,busy=false;
function start(){timer=setInterval(async()=>{if(busy)return;busy=true;try{const rows=await db.all("SELECT id FROM ark_guilds WHERE config->>'nitrado_service_id' IS NOT NULL AND config->>'nitrado_service_id'<>''");for(const row of rows){try{await poll(row.id)}catch(e){await db.query('UPDATE ark_guilds SET config=config||$2::jsonb WHERE id=$1',[row.id,JSON.stringify({poll_error:e.code||'nitradoError'})]);}}}catch(e){console.error('Collecte logs :',e.code||e.name)}finally{busy=false}},Math.max(120000,Number(process.env.NITRADO_POLL_MS)||300000));timer.unref()}
module.exports={services,poll,start,stop:()=>clearInterval(timer)};
