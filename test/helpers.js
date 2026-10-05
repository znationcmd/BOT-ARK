const {PGlite}=require('@electric-sql/pglite');
const engine=new PGlite();let gate=Promise.resolve();
class Pool{on(){} async query(sql,args=[]){if(sql.includes(';')){const results=await engine.exec(sql);return {rows:results.at(-1)?.rows||[],rowCount:results.at(-1)?.affectedRows||0}}const r=await engine.query(sql,args);return {rows:r.rows,rowCount:r.affectedRows}}async connect(){const previous=gate;let release;gate=new Promise(r=>release=r);await previous;return {query:this.query.bind(this),release}}async end(){}}
require.cache[require.resolve('pg')]={exports:{Pool}};
process.env.DATABASE_URL='postgres://test';process.env.SESSION_SECRET='test-session-secret-32-characters-ark';process.env.NODE_ENV='test';process.env.DASHBOARD_USER='owner';process.env.DASHBOARD_PASSWORD='test-owner-password';
module.exports={engine};
