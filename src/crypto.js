const crypto=require('node:crypto');
function key(){const secret=process.env.SESSION_SECRET;if(!secret||secret.length<24)throw Error('SESSION_SECRET doit contenir au moins 24 caractères');return crypto.createHash('sha256').update(secret).digest()}
function encrypt(value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);const body=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),body].map(x=>x.toString('base64url')).join('.')}
function decrypt(value){const [iv,tag,body]=value.split('.').map(x=>Buffer.from(x,'base64url'));const cipher=crypto.createDecipheriv('aes-256-gcm',key(),iv);cipher.setAuthTag(tag);return Buffer.concat([cipher.update(body),cipher.final()]).toString('utf8')}
module.exports={encrypt,decrypt};
