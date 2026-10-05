const session=require('express-session'),db=require('./db');
class Store extends session.Store{
 get(sid,cb){db.one('SELECT data FROM ark_sessions WHERE sid=$1 AND expires_at>$2',[sid,Date.now()]).then(row=>cb(null,row?.data||null)).catch(cb)}
 set(sid,data,cb){const expires=data.cookie?.expires?new Date(data.cookie.expires).getTime():Date.now()+365*86400000;db.query('INSERT INTO ark_sessions(sid,data,expires_at) VALUES($1,$2,$3) ON CONFLICT(sid) DO UPDATE SET data=EXCLUDED.data,expires_at=EXCLUDED.expires_at',[sid,data,expires]).then(()=>cb?.()).catch(e=>cb?.(e))}
 destroy(sid,cb){db.query('DELETE FROM ark_sessions WHERE sid=$1',[sid]).then(()=>cb?.()).catch(e=>cb?.(e))}
 touch(sid,data,cb){this.set(sid,data,cb)}
}
module.exports=Store;
