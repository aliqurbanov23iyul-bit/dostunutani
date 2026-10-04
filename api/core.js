import {createHash,randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
export const hash=s=>createHash('sha256').update(s).digest('hex');
export const id=()=>randomBytes(18).toString('base64url');
export function validAnswers(a){return Array.isArray(a)&&a.length===15&&a.every(x=>Number.isInteger(x)&&x>=0&&x<=3);}
export function cleanName(n){if(typeof n!=='string')return null; n=n.trim().replace(/\s+/g,' ');return n.length>=1&&n.length<=40&&!/[\x00-\x1f]/.test(n)?n:null;}
export const score=(a,b)=>a.reduce((s,v,i)=>s+Number(v===b[i]),0);
export function equal(a,b){const x=Buffer.from(hash(a)),y=Buffer.from(hash(b));return timingSafeEqual(x,y);}
export function signSession(secret,now=Date.now()){const body=Buffer.from(JSON.stringify({exp:now+8*3600000})).toString('base64url');return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');}
export function verifySession(token,secret,now=Date.now()){try{const [b,s]=token.split('.');return equal(s,createHmac('sha256',secret).update(b).digest('base64url'))&&JSON.parse(Buffer.from(b,'base64url')).exp>now;}catch{return false;}}
