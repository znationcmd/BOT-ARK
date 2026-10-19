const test=require('node:test');
const assert=require('node:assert/strict');
const {askNeuria,validatePayload}=require('../src/neuria');

test('CMD NEURIA input validation and history limits',async()=>{
  for(const message of ['', ' ', 'x'.repeat(1001), null]){
    const result=await askNeuria({message},()=>{throw Error('No outbound request expected')});
    assert.equal(result.status,400);
  }
  const valid=validatePayload({message:'Comment utiliser les quêtes ?',history:[
    {role:'system',content:'not allowed'},
    ...Array.from({length:16},(_,i)=>({role:i%2?'assistant':'user',content:'message'+i}))
  ]});
  assert.ok(!valid.error);
  assert.ok(valid.history.length<=12);
  assert.ok(valid.history.every(m=>['user','assistant'].includes(m.role)));
});

test('BOT ARK sends questions to real CMD NEURIA and displays actual replies',async()=>{
  const answer=await askNeuria({
    message:'Comment utiliser les quêtes ?',
    history:[{role:'user',content:'Salut'},{role:'assistant',content:'Bonjour'}]
  },async(url,request)=>{
    assert.equal(url,'https://cmd-ai-cpu-web-production.up.railway.app/api/chat');
    assert.equal(request.method,'POST');
    const payload=JSON.parse(request.body);
    assert.match(payload.message,/BOT ARK/);
    assert.match(payload.message,/quêtes/);
    assert.equal(payload.history.length,2);
    assert.ok(request.signal);
    return {ok:true,status:200,json:async()=>({reply:'Voici les étapes des quêtes.',engine:'external-llm'})};
  });
  assert.equal(answer.status,200);
  assert.equal(answer.body.reply,'Voici les étapes des quêtes.');
  assert.equal(answer.body.service,'CMD NEURIA');
});

test('No fictitious answer when the remote CMD NEURIA service fails',async()=>{
  const unavailable=await askNeuria({message:'Bonjour'},async()=>({
    ok:false,status:503,json:async()=>({error:'Moteur indisponible'})
  }));
  assert.equal(unavailable.status,503);
  assert.match(unavailable.body.error,/indisponible/);
  const empty=await askNeuria({message:'Bonjour'},async()=>({
    ok:true,status:200,json:async()=>({reply:''})
  }));
  assert.equal(empty.status,502);
  const failure=await askNeuria({message:'Bonjour'},async()=>{throw Error('Network')});
  assert.equal(failure.status,502);
});
