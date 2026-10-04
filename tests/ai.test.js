import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../api/index.js';
import {cleanQuestions,generateQuestions,hash,signSession,selectGeminiModel} from '../api/core.js';
const questions=prefix=>Array.from({length:15},(_,i)=>({text:`${prefix} sual ${i+1}?`,options:['Bir','İki','Üç','Dörd']}));
function fixture(){
 const quizzes=new Map(),attempts=new Map(),limits=new Map();let settings={enabled:true,perIp:3,daily:50},calls=0;
 const database={async query(sql,args=[]){
  if(sql.startsWith('DELETE FROM rate_limits'))return {rows:[]};
  if(sql.startsWith('SELECT value'))return {rows:[{value:settings}]};
  if(sql.startsWith('INSERT INTO app_settings')){settings=JSON.parse(args[1]);return {rows:[]};}
  if(sql.startsWith('SELECT hits'))return {rows:[{hits:limits.get(args[0])||0}]};
  if(sql.startsWith('INSERT INTO rate_limits')){const hits=limits.get(args[0])||0;if(args.length===2&&hits>=args[1])return {rows:[]};limits.set(args[0],hits+1);return {rows:[{hits:hits+1}]};}
  if(sql.startsWith('INSERT INTO quizzes')){quizzes.set(args[0],{id:args[0],name:args[1],answers:args[2],owner_hash:args[3],version:1,questions:args[4]?JSON.parse(args[4]):null});return {rows:[]};}
  if(sql.startsWith('SELECT * FROM quizzes'))return {rows:quizzes.has(args[0])?[quizzes.get(args[0])]:[]};
  if(sql.startsWith('INSERT INTO attempts')){attempts.set(args[0],{id:args[0],quiz_id:args[1],name:args[2],answers:args[3],score:args[4]});return {rows:[]};}
  if(sql.startsWith('SELECT a.*')){const a=attempts.get(args[0]);if(!a)return {rows:[]};const q=quizzes.get(a.quiz_id);return {rows:[{...a,owner_hash:q.owner_hash,correct_answers:q.answers,owner_name:q.name,questions:q.questions}]};}
  if(sql.startsWith('SELECT id,name,score'))return {rows:[...attempts.values()].filter(a=>a.quiz_id===args[0])};
  if(sql.startsWith('SELECT count'))return {rows:[{count:[...attempts.values()].filter(a=>a.quiz_id===args[0]).length}]};
  if(sql.startsWith('DELETE FROM quizzes')){quizzes.delete(args[0]);return {rows:[]};}
  throw Error('Unexpected query '+sql);
 }};
 const handler=createHandler(async()=>database,async(url,options)=>{if(url.includes('?pageSize='))return {ok:true,json:async()=>({models:[{name:'models/gemini-2.5-flash-lite',supportedGenerationMethods:['generateContent']}]})};calls++;assert.equal(options.headers['x-goog-api-key'],'test-key');assert.ok(options.signal);assert.ok(JSON.parse(options.body).generationConfig.responseSchema);return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({questions:questions('AI')})}]}}]})};});
 async function call(path,method='GET',body,token='',cookie=''){
  let result;await handler({url:'/api'+path,method,body,headers:{host:'site.test',...(token?{authorization:'Bearer '+token}:{}),cookie},socket:{remoteAddress:'127.0.0.1'}},{setHeader(){},statusCode:0,end(s){result={status:this.statusCode,data:JSON.parse(s)};}});return result;
 }
 return {call,get calls(){return calls;}};
}
function env(){const keys=['DATABASE_URL','GEMINI_API_KEY','SESSION_SECRET'];const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));Object.assign(process.env,{DATABASE_URL:'test',GEMINI_API_KEY:'test-key',SESSION_SECRET:'s'.repeat(40)});return ()=>keys.forEach(k=>old[k]===undefined?delete process.env[k]:process.env[k]=old[k]);}
test('AI question validation rejects malformed, duplicate and oversized data',()=>{
 assert.ok(cleanQuestions(questions('valid')));assert.equal(cleanQuestions(questions('x').slice(1)),null);
 for(const mutate of [q=>q[0].options.pop(),q=>q[0].options[1]='Bir',q=>q[0].text='x'.repeat(201),q=>q[1].text=q[0].text]){const q=questions('bad');mutate(q);assert.equal(cleanQuestions(q),null);}
});
test('two creators retain separate questions, grading and private attempt details',async()=>{
 const restore=env();try{const f=fixture();
 const a=(await f.call('/tests','POST',{name:'Əli',answers:Array(15).fill(0),questions:questions('Əli')})).data;
 const b=(await f.call('/tests','POST',{name:'Okan',answers:Array(15).fill(1),questions:questions('Okan')})).data;
 assert.notEqual(a.id,b.id);assert.notEqual(a.token,b.token);
 for(const q of [a,b]){const pub=await f.call('/tests/'+q.id);assert.deepEqual(pub.data.questions,q.questions);assert.equal(pub.data.answers,undefined);assert.equal(pub.data.token,undefined);}
 const aa=(await f.call('/tests/'+a.id+'/attempts','POST',{name:'Dost',answers:Array(15).fill(0),score:999,questions:questions('fake')})).data;
 const bb=(await f.call('/tests/'+b.id+'/attempts','POST',{name:'Dost',answers:Array(15).fill(0)})).data;
 assert.equal(aa.score,15);assert.equal(bb.score,0);
 assert.equal((await f.call('/attempts/'+aa.id,'GET',null,b.token)).status,403);
 assert.equal((await f.call('/tests/'+b.id+'/manage','DELETE',null,a.token)).status,403);
 assert.deepEqual((await f.call('/attempts/'+aa.id,'GET',null,a.token)).data.questions,a.questions);
 assert.deepEqual((await f.call('/attempts/'+bb.id,'GET',null,b.token)).data.questions,b.questions);
 assert.equal((await f.call('/tests/'+a.id+'/manage','GET',null,a.token)).data.count,1);
 }finally{restore();}
});
test('generation uses server key, validates output and enforces daily IP limit',async()=>{
 const restore=env();try{const f=fixture();for(let i=0;i<3;i++)assert.equal((await f.call('/ai/generate','POST',{about:'Musiqini və gəzməyi çox sevirəm.',style:'fun'})).status,200);
 assert.equal((await f.call('/ai/generate','POST',{about:'Musiqini və gəzməyi çox sevirəm.',style:'fun'})).status,429);assert.equal(f.calls,3);
 }finally{restore();}
});
test('only admin may change AI settings; disabled and global cap prevent upstream calls',async()=>{
 const restore=env();try{const f=fixture(),cookie='dt_admin='+signSession(process.env.SESSION_SECRET);
 assert.equal((await f.call('/admin/ai','POST',{enabled:false,perIp:3,daily:50})).status,401);
 assert.equal((await f.call('/admin/ai','POST',{enabled:false,perIp:3,daily:50},'',cookie)).status,200);
 assert.equal((await f.call('/ai/status')).data.available,false);
 assert.equal((await f.call('/ai/generate','POST',{about:'Musiqini və gəzməyi çox sevirəm.',style:'fun'})).status,503);assert.equal(f.calls,0);
 await f.call('/admin/ai','POST',{enabled:true,perIp:3,daily:1},'',cookie);
 assert.equal((await f.call('/ai/generate','POST',{about:'Musiqini və gəzməyi çox sevirəm.',style:'simple'})).status,200);
 assert.equal((await f.call('/ai/generate','POST',{about:'Musiqini və gəzməyi çox sevirəm.',style:'simple'})).status,429);assert.equal(f.calls,1);
 }finally{restore();}
});
test('provider errors and incomplete JSON produce safe errors without credentials',async()=>{
 const restore=env();const oldModel=process.env.GEMINI_MODEL;process.env.GEMINI_MODEL='gemini-2.5-flash-lite';try{
 await assert.rejects(()=>generateQuestions('about','fun',async()=>({ok:false,status:403})),e=>e.status===502&&!e.message.includes('test-key'));
 await assert.rejects(()=>generateQuestions('about','fun',async()=>({ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:'broken'}]}}]})})),e=>e.status===502);
 }finally{if(oldModel===undefined)delete process.env.GEMINI_MODEL;else process.env.GEMINI_MODEL=oldModel;restore();}
});


test('automatic model selection uses only listed text-generation models',async()=>{
 const old=process.env.GEMINI_MODEL;delete process.env.GEMINI_MODEL;try{
 const model=await selectGeminiModel(async()=>({ok:true,json:async()=>({models:[{name:'models/gemini-2.5-flash-image',supportedGenerationMethods:['generateContent']},{name:'models/gemini-2.5-flash-lite',supportedGenerationMethods:['generateContent']}]})}));assert.equal(model,'gemini-2.5-flash-lite');
 await assert.rejects(()=>selectGeminiModel(async()=>({ok:true,json:async()=>({models:[]})})),e=>e.status===503);
 }finally{if(old===undefined)delete process.env.GEMINI_MODEL;else process.env.GEMINI_MODEL=old;}
});
