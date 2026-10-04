import {hash,id,validAnswers,cleanName,score,equal,signSession,verifySession} from './core.js';
let pool;
async function db(){if(!pool){const {default:pg}=await import('pg');pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:3});}return pool;}
export function createHandler(getDatabase=db){return async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const send=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
 const url=new URL(req.url,'http://localhost');const path=url.pathname.replace(/^\/api/,'');const method=req.method;
 if(path==='/config')return send(200,{configured:!!process.env.DATABASE_URL});
 if(!process.env.DATABASE_URL)return send(503,{error:'Database qoşulmayıb. Hazırda demo rejimidir.'});
 try{
 if(!['GET','POST','DELETE'].includes(method))return send(405,{error:'Metod dəstəklənmir.'});
 if(method!=='GET'&&req.headers.origin){const origin=new URL(req.headers.origin);if(origin.host!==req.headers.host)return send(403,{error:'Sorğu mənbəyi uyğun deyil.'});}
 let body={};if(method==='POST'){if(req.body)body=typeof req.body==='string'?JSON.parse(req.body):req.body;else{let s='';for await(const c of req){s+=c;if(s.length>12000)return send(413,{error:'Sorğu çox böyükdür.'});}body=JSON.parse(s||'{}');}}
 const d=await getDatabase();
 if(method==='POST'){
 const ip=req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown';const key=hash(String(ip).split(',')[0]+(path==='/admin/login'?'login':'public'));
 const lim=await d.query("INSERT INTO rate_limits(key,hits,expires_at) VALUES($1,1,now()+interval '1 hour') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.hits+1 END, expires_at=CASE WHEN rate_limits.expires_at<now() THEN now()+interval '1 hour' ELSE rate_limits.expires_at END RETURNING hits",[key]);
 if(lim.rows[0].hits>(path==='/admin/login'?10:100))return send(429,{error:'Bir az fasilə ver, sonra yenidən yoxla.'});
 if(Math.random()<0.02)await d.query('DELETE FROM rate_limits WHERE expires_at<now()');
 }
 const secret=process.env.SESSION_SECRET||'';const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('dt_admin='))?.slice(9)||'';
 const admin=secret.length>=32&&verifySession(cookie,secret);
 if(path==='/admin/login'&&method==='POST'){
 if(secret.length<32||!process.env.ADMIN_PASSWORD||process.env.ADMIN_PASSWORD.length<12)return send(503,{error:'Admin girişini serverdə konfiqurasiya et.'});
 if(typeof body.password!=='string'||!equal(body.password,process.env.ADMIN_PASSWORD))return send(401,{error:'Şifrə düzgün deyil.'});
 res.setHeader('Set-Cookie',`dt_admin=${signSession(secret)}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=28800${process.env.VERCEL?'; Secure':''}`);return send(200,{ok:true});
 }
 if(path==='/admin/logout'&&method==='POST'){res.setHeader('Set-Cookie','dt_admin=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0');return send(200,{ok:true});}
 if(path.startsWith('/admin/')&&!admin)return send(401,{error:'Admin girişini et.'});
 if(path==='/admin/tests'&&method==='GET'){
 const page=Math.max(0,Math.min(100000,Number(url.searchParams.get('page'))||0));
 const r=await d.query('SELECT q.id,q.name,q.created_at,count(a.id)::int AS count FROM quizzes q LEFT JOIN attempts a ON a.quiz_id=q.id GROUP BY q.id ORDER BY q.created_at DESC LIMIT 50 OFFSET $1',[page*50]);
 const stats=await d.query('SELECT (SELECT count(*)::int FROM quizzes) AS tests,(SELECT count(*)::int FROM attempts) AS attempts');return send(200,{items:r.rows,stats:stats.rows[0],page});
 }
 if(path==='/tests'&&method==='POST'){
 const name=cleanName(body.name);if(!name||!validAnswers(body.answers))return send(400,{error:'Adı və bütün 15 cavabı düzgün doldur.'});const quizId=id(),token=id()+id();
 await d.query('INSERT INTO quizzes(id,name,answers,owner_hash) VALUES($1,$2,$3,$4)',[quizId,name,body.answers,hash(token)]);return send(201,{id:quizId,name,token});
 }
 const match=path.match(/^\/tests\/([A-Za-z0-9_-]{24})(?:\/(attempts|manage))?$/);
 if(match){const quizId=match[1],action=match[2];const r=await d.query('SELECT * FROM quizzes WHERE id=$1',[quizId]);const q=r.rows[0];if(!q)return send(404,{error:'Test tapılmadı və ya silinib.'});
 const token=(req.headers.authorization||'').replace(/^Bearer /,'');const owner=token&&equal(hash(token),q.owner_hash);
 if(method==='GET'&&!action)return send(200,{id:q.id,name:q.name,version:q.version});
 if(action==='attempts'&&method==='POST'){
 const name=cleanName(body.name);if(!name||!validAnswers(body.answers))return send(400,{error:'Adı və 15 cavabı yoxla.'});const attemptId=id(),points=score(body.answers,q.answers);
 await d.query('INSERT INTO attempts(id,quiz_id,name,answers,score) VALUES($1,$2,$3,$4,$5)',[attemptId,quizId,name,body.answers,points]);
 return send(201,{id:attemptId,name,ownerName:q.name,score:points});
 }
 if(action==='manage'){
 if(!owner&&!admin)return send(403,{error:'Bu testin şəxsi giriş açarı tələb olunur.'});
 if(method==='DELETE'){await d.query('DELETE FROM quizzes WHERE id=$1',[quizId]);return send(200,{ok:true});}
 if(method==='GET'){const page=Math.max(0,Math.min(100000,Number(url.searchParams.get('page'))||0));const a=await d.query('SELECT id,name,score,created_at FROM attempts WHERE quiz_id=$1 ORDER BY created_at DESC LIMIT 50 OFFSET $2',[quizId,page*50]);const c=await d.query('SELECT count(*)::int AS count FROM attempts WHERE quiz_id=$1',[quizId]);return send(200,{id:q.id,name:q.name,items:a.rows,count:c.rows[0].count,page});}
 }
 }
 const detail=path.match(/^\/attempts\/([A-Za-z0-9_-]{24})$/);
 if(detail){const r=await d.query('SELECT a.*,q.owner_hash,q.answers AS correct_answers,q.name AS owner_name FROM attempts a JOIN quizzes q ON q.id=a.quiz_id WHERE a.id=$1',[detail[1]]);const a=r.rows[0];if(!a)return send(404,{error:'Nəticə tapılmadı.'});const token=(req.headers.authorization||'').replace(/^Bearer /,'');if(!admin&&(!token||!equal(hash(token),a.owner_hash)))return send(403,{error:'Bu nəticəni görmək icazən yoxdur.'});if(method==='DELETE'&&admin){await d.query('DELETE FROM attempts WHERE id=$1',[a.id]);return send(200,{ok:true});}if(method==='GET')return send(200,{id:a.id,name:a.name,ownerName:a.owner_name,answers:a.answers,correct:a.correct_answers,score:a.score});}
 return send(404,{error:'Ünvan tapılmadı.'});
 }catch(e){console.error('API failure',e.code||e.name);return send(e instanceof SyntaxError?400:500,{error:e instanceof SyntaxError?'Sorğu formatı yanlışdır.':'Server sorğunu tamamlaya bilmədi. Database quraşdırmasını yoxla.'});}
};
}
export default createHandler();
