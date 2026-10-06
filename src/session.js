const session=require('express-session'),db=require('./db');
let lastCleanup=0;
async function cleanup(){const now=Date.now();if(now-lastCleanup<15*60*1000)return;lastCleanup=now;await db.query('DELETE FROM ark_sessions WHERE expires_at<$1',[now])}
class Store extends session.Store{
 get(sid,cb){db.one('SELECT data FROM ark_sessions WHERE sid=$1 AND expires_at>$2',[sid,Date.now()]).then(row=>cb(null,row?.data||null)).catch(cb)}
 async set(sid,data,cb){try{const expires=data.cookie?.expires?new Date(data.cookie.expires).getTime():Date.now()+365*86400000;await db.query('INSERT INTO ark_sessions(sid,data,expires_at) VALUES($1,$2,$3) ON CONFLICT(sid) DO UPDATE SET data=EXCLUDED.data,expires_at=EXCLUDED.expires_at',[sid,data,expires]);await cleanup();cb?.()}catch(e){cb?.(e)}}
 destroy(sid,cb){db.query('DELETE FROM ark_sessions WHERE sid=$1',[sid]).then(()=>cb?.()).catch(e=>cb?.(e))}
 async touch(sid,data,cb){try{const expires=data.cookie?.expires?new Date(data.cookie.expires).getTime():Date.now()+365*86400000;await db.query('UPDATE ark_sessions SET expires_at=$2 WHERE sid=$1',[sid,expires]);await cleanup();cb?.()}catch(e){cb?.(e)}}
}
module.exports=Store;
