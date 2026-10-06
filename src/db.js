const {Pool}=require('pg');
const {AsyncLocalStorage}=require('node:async_hooks');
const context=new AsyncLocalStorage();
let pool;
function connect(){
 if(!pool){if(!process.env.DATABASE_URL)throw Error('DATABASE_URL requis : connecter un Postgres à BOT ARK');
 pool=new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:30000});
 pool.on('error',e=>console.error('Postgres :',e.code||e.name));}return pool;
}
async function query(sql,args=[]){return (context.getStore()||connect()).query(sql,args)}
async function all(sql,args){return (await query(sql,args)).rows}
async function one(sql,args){return (await all(sql,args))[0]}
async function tx(fn){if(context.getStore())return fn();const client=await connect().connect();try{await client.query('BEGIN');const result=await context.run(client,fn);await client.query('COMMIT');return result}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}
async function init(){await query(`
CREATE TABLE IF NOT EXISTS ark_system(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ark_guilds(id TEXT PRIMARY KEY,name TEXT NOT NULL,config JSONB NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS ark_members(guild_id TEXT NOT NULL REFERENCES ark_guilds(id),user_id TEXT NOT NULL,name TEXT NOT NULL,game_id TEXT,platform TEXT NOT NULL DEFAULT 'PC',verified BOOLEAN NOT NULL DEFAULT false,PRIMARY KEY(guild_id,user_id));
CREATE UNIQUE INDEX IF NOT EXISTS ark_unique_game_id ON ark_members(guild_id,game_id) WHERE verified AND game_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS ark_seasons(id SERIAL PRIMARY KEY,guild_id TEXT NOT NULL REFERENCES ark_guilds(id),name TEXT NOT NULL,starts_at TIMESTAMPTZ NOT NULL,ends_at TIMESTAMPTZ NOT NULL,xp_per_tier INTEGER NOT NULL DEFAULT 100,status TEXT NOT NULL DEFAULT 'draft',CHECK(ends_at>starts_at));
CREATE TABLE IF NOT EXISTS ark_quests(id SERIAL PRIMARY KEY,guild_id TEXT NOT NULL REFERENCES ark_guilds(id),season_id INTEGER NOT NULL REFERENCES ark_seasons(id),title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',kind TEXT NOT NULL DEFAULT 'custom',target TEXT NOT NULL DEFAULT '',goal INTEGER NOT NULL DEFAULT 1,xp INTEGER NOT NULL DEFAULT 100,period TEXT NOT NULL DEFAULT 'season',enabled BOOLEAN NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS ark_rewards(id SERIAL PRIMARY KEY,guild_id TEXT NOT NULL REFERENCES ark_guilds(id),season_id INTEGER NOT NULL REFERENCES ark_seasons(id),tier INTEGER NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',premium BOOLEAN NOT NULL DEFAULT false,kind TEXT NOT NULL DEFAULT 'manual',role_id TEXT);
CREATE TABLE IF NOT EXISTS ark_progress(guild_id TEXT NOT NULL,season_id INTEGER NOT NULL REFERENCES ark_seasons(id),user_id TEXT NOT NULL,xp INTEGER NOT NULL DEFAULT 0,premium BOOLEAN NOT NULL DEFAULT false,PRIMARY KEY(guild_id,season_id,user_id));
CREATE TABLE IF NOT EXISTS ark_quest_progress(guild_id TEXT NOT NULL,quest_id INTEGER NOT NULL REFERENCES ark_quests(id),user_id TEXT NOT NULL,period_key TEXT NOT NULL,value INTEGER NOT NULL DEFAULT 0,completed_at TIMESTAMPTZ,PRIMARY KEY(guild_id,quest_id,user_id,period_key));
CREATE TABLE IF NOT EXISTS ark_claims(id SERIAL PRIMARY KEY,guild_id TEXT NOT NULL,user_id TEXT NOT NULL,quest_id INTEGER NOT NULL REFERENCES ark_quests(id),period_key TEXT NOT NULL,proof TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',reviewer TEXT,reviewed_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE UNIQUE INDEX IF NOT EXISTS ark_one_pending_claim ON ark_claims(guild_id,quest_id,user_id,period_key) WHERE status='pending';
CREATE TABLE IF NOT EXISTS ark_reward_claims(id SERIAL PRIMARY KEY,guild_id TEXT NOT NULL,user_id TEXT NOT NULL,reward_id INTEGER NOT NULL REFERENCES ark_rewards(id),status TEXT NOT NULL DEFAULT 'pending',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),delivered_at TIMESTAMPTZ,UNIQUE(guild_id,user_id,reward_id));
CREATE TABLE IF NOT EXISTS ark_tickets(id SERIAL PRIMARY KEY,guild_id TEXT NOT NULL,user_id TEXT NOT NULL,title TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',channel_id TEXT UNIQUE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),closed_at TIMESTAMPTZ);
CREATE UNIQUE INDEX IF NOT EXISTS ark_one_open_ticket ON ark_tickets(guild_id,user_id) WHERE status='open';
CREATE TABLE IF NOT EXISTS ark_ticket_messages(id SERIAL PRIMARY KEY,ticket_id INTEGER NOT NULL REFERENCES ark_tickets(id),author_id TEXT NOT NULL,author_name TEXT NOT NULL,body TEXT NOT NULL,discord_message_id TEXT UNIQUE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS ark_audit(id SERIAL PRIMARY KEY,guild_id TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,details JSONB NOT NULL DEFAULT '{}',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS ark_game_logs(id SERIAL PRIMARY KEY,guild_id TEXT NOT NULL,source TEXT NOT NULL,event_key TEXT NOT NULL,line TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(guild_id,source,event_key));
CREATE TABLE IF NOT EXISTS ark_events(id SERIAL PRIMARY KEY,guild_id TEXT NOT NULL,event_key TEXT NOT NULL,player_id TEXT NOT NULL,kind TEXT NOT NULL,target TEXT NOT NULL DEFAULT '',amount INTEGER NOT NULL,occurred_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(guild_id,event_key));
ALTER TABLE ark_audit ADD COLUMN IF NOT EXISTS discord_sent BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS ark_login_links(token_hash TEXT PRIMARY KEY,guild_id TEXT NOT NULL,user_id TEXT NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL,expires_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS ark_sessions(sid TEXT PRIMARY KEY,data JSONB NOT NULL,expires_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS ark_wallets(guild_id TEXT NOT NULL REFERENCES ark_guilds(id),user_id TEXT NOT NULL,balance BIGINT NOT NULL DEFAULT 1000,CHECK(balance>=0),PRIMARY KEY(guild_id,user_id));
CREATE TABLE IF NOT EXISTS ark_wallet_transactions(id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,user_id TEXT NOT NULL,amount BIGINT NOT NULL,kind TEXT NOT NULL,details JSONB NOT NULL DEFAULT '{}',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS ark_shop_items(id SERIAL PRIMARY KEY,guild_id TEXT NOT NULL REFERENCES ark_guilds(id),name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',price BIGINT NOT NULL CHECK(price>=0),delivery JSONB NOT NULL DEFAULT '{}',enabled BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS ark_shop_orders(id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,user_id TEXT NOT NULL,item_id INTEGER NOT NULL REFERENCES ark_shop_items(id),price BIGINT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS ark_lottery_tickets(id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,user_id TEXT NOT NULL,draw_key TEXT NOT NULL,cost BIGINT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS ark_lottery_draws(id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,draw_key TEXT NOT NULL UNIQUE,winner_user_id TEXT,prize BIGINT NOT NULL DEFAULT 0,drawn_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS ark_minigame_scores(id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,user_id TEXT NOT NULL,game TEXT NOT NULL,score INTEGER NOT NULL DEFAULT 0,reward BIGINT NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS shared_top_servers(
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 game TEXT NOT NULL,
 address TEXT NOT NULL DEFAULT '',
 website TEXT NOT NULL DEFAULT '',
 discord_url TEXT NOT NULL DEFAULT '',
 description TEXT NOT NULL DEFAULT '',
 image_url TEXT NOT NULL DEFAULT '',
 source_bot TEXT NOT NULL DEFAULT 'BOT ARK',
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS shared_top_server_votes(
 id BIGSERIAL PRIMARY KEY,
 server_id TEXT NOT NULL REFERENCES shared_top_servers(id) ON DELETE CASCADE,
 voter_hash TEXT NOT NULL,
 vote_day DATE NOT NULL DEFAULT CURRENT_DATE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(server_id,voter_hash,vote_day)
);
CREATE INDEX IF NOT EXISTS shared_top_server_votes_rank_idx ON shared_top_server_votes(server_id,created_at DESC);

`);console.log('BOT ARK : Postgres prêt')}
module.exports={query,one,all,tx,init,close:()=>pool?.end()};
