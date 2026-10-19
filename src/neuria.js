'use strict';
// BOT ARK -> real CMD NEURIA Railway chat service.
// Never download a browser-side AI model or expose provider credentials.
const DEFAULT_URL='https://cmd-ai-cpu-web-production.up.railway.app/api/chat';
const CONTEXT='Contexte : tu aides dans BOT ARK, bot Discord et tableau de bord ARK: Survival Ascended (PC, Xbox et PlayStation). Réponds en tant que CMD NEURIA, dans la langue de la question. Ne prétends pas avoir consulté un serveur ni exécuté une commande. ';
const MAX_HISTORY=12;

function validatePayload(body){
  const message=body?.message;
  if(typeof message!=='string'||!message.trim()||message.length>1000)
    return {error:'La question doit contenir entre 1 et 1000 caractères.'};
  const history=Array.isArray(body.history)?body.history.slice(-MAX_HISTORY)
    .filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string')
    .map(m=>({role:m.role,content:m.content.slice(0,1200)})):[];
  while(JSON.stringify(history).length>5000)history.shift();
  const question=message.trim();
  const contextual=CONTEXT+question;
  return {message:contextual.length<=1000?contextual:question,history};
}

async function askNeuria(body,fetchFn=fetch){
  const payload=validatePayload(body);
  if(payload.error)return {status:400,body:{error:payload.error}};
  const endpoint=process.env.CMD_NEURIA_API_URL||DEFAULT_URL;
  let url;
  try{url=new URL(endpoint);if(url.protocol!=='https:')throw Error('HTTPS required')}
  catch{return {status:503,body:{error:'Adresse CMD NEURIA invalide.'}}}
  try{
    const upstream=await fetchFn(url.toString(),{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(payload),
      signal:AbortSignal.timeout(65000)
    });
    const data=await upstream.json().catch(()=>null);
    if(!upstream.ok){
      const status=upstream.status===429?429:upstream.status===503?503:502;
      return {status,body:{error:String(data?.error||'CMD NEURIA est momentanément indisponible.').slice(0,240),service:'CMD NEURIA'}};
    }
    const reply=typeof data?.reply==='string'?data.reply.trim():'';
    if(!reply)return {status:502,body:{error:'CMD NEURIA n’a pas renvoyé de réponse.',service:'CMD NEURIA'}};
    return {status:200,body:{reply,service:'CMD NEURIA',engine:String(data.engine||'cmd-neuria').slice(0,60)}};
  }catch(e){
    return {status:502,body:{error:e?.name==='TimeoutError'?'CMD NEURIA met trop de temps à répondre.':'Connexion à CMD NEURIA indisponible. Réessaie.',service:'CMD NEURIA'}};
  }
}
module.exports={askNeuria,validatePayload};
