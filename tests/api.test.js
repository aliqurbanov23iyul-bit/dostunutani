import test from 'node:test';import assert from 'node:assert/strict';import {createHandler} from '../api/index.js';import {hash} from '../api/core.js';
const quizId='a'.repeat(24),attemptId='b'.repeat(24),token='owner-private-token';
const q={id:quizId,name:'Əli',version:1,answers:Array(15).fill(2),owner_hash:hash(token)};
async function call(path,method='GET',body,authorization){let output;const handler=createHandler(async()=>({query:async(sql,args)=>{
 if(sql.includes('rate_limits'))return {rows:[{hits:1}]};
 if(sql.startsWith('SELECT * FROM quizzes'))return {rows:[q]};
 if(sql.startsWith('INSERT INTO attempts')){assert.equal(args[4],15);return {rows:[]};}
 if(sql.startsWith('SELECT a.*'))return {rows:[{id:attemptId,quiz_id:quizId,name:'Dost',answers:Array(15).fill(2),correct_answers:q.answers,owner_hash:q.owner_hash,owner_name:q.name,score:15}]};
 throw Error('Unexpected query '+sql);
 }}));const old=process.env.DATABASE_URL;process.env.DATABASE_URL='test';try{const res={setHeader(){},statusCode:0,end(s){output={status:this.statusCode,data:JSON.parse(s)};}};await handler({url:'/api'+path,method,body,headers:{...(authorization?{authorization:'Bearer '+authorization}:{}),host:'site.test'},socket:{remoteAddress:'127.0.0.1'}},res);return output;}finally{if(old)process.env.DATABASE_URL=old;else delete process.env.DATABASE_URL;}}
test('public test endpoint hides answers and owner credential',async()=>{const r=await call('/tests/'+quizId);assert.equal(r.status,200);assert.deepEqual(r.data,{id:quizId,name:'Əli',version:1});});
test('unrelated creator cannot access or delete a test',async()=>{for(const method of ['GET','DELETE']){const r=await call('/tests/'+quizId+'/manage',method,null,'wrong-owner');assert.equal(r.status,403);}});
test('unauthorized attempt details hide answers',async()=>{const r=await call('/attempts/'+attemptId);assert.equal(r.status,403);assert.deepEqual(Object.keys(r.data),['error']);});
test('owner sees question-level results without secret hash',async()=>{const r=await call('/attempts/'+attemptId,'GET',null,token);assert.equal(r.status,200);assert.deepEqual(r.data.correct,q.answers);assert.equal(r.data.owner_hash,undefined);});
test('client supplied score is ignored and server computes score',async()=>{const r=await call('/tests/'+quizId+'/attempts','POST',{name:'Dost',answers:Array(15).fill(2),score:999});assert.equal(r.status,201);assert.equal(r.data.score,15);assert.equal(r.data.answers,undefined);});
