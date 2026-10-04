import test from 'node:test';import assert from 'node:assert/strict';
import {invitationTitle,invitationCaption,publicInvitationURL,invitationQR} from '../public/invitation.js';
test('personal invitations use Azerbaijani name endings',()=>{
 for(const [name,title] of [['Əli','Əlini'],['Okan','Okanı'],['Röya','Röyanı'],['Aysel','Ayseli']])assert.equal(invitationTitle(name),title+' nə qədər tanıyırsan?');
});
test('invitation caption includes public link and never shares panel credentials',()=>{
 const url=publicInvitationURL('https://dostunutani.vercel.app/panel.html?test=abc&key=secret#key=private');
 assert.equal(url,'https://dostunutani.vercel.app/?test=abc');assert.ok(invitationCaption('Əli',url).includes(url));assert.equal(url.includes('secret'),false);assert.equal(url.includes('private'),false);
 assert.throws(()=>publicInvitationURL('javascript:alert(1)'));assert.throws(()=>publicInvitationURL('https://example.com/'));
});
test('each quiz has a separate valid QR matrix',()=>{
 const a=invitationQR('https://dostunutani.vercel.app/?test='+'a'.repeat(24));const b=invitationQR('https://dostunutani.vercel.app/?test='+'b'.repeat(24));
 assert.ok(a.getModuleCount()>=21);assert.equal((a.getModuleCount()-21)%4,0);
 assert.ok(Array.from({length:a.getModuleCount()},(_,r)=>Array.from({length:a.getModuleCount()},(_,c)=>a.isDark(r,c)!==b.isDark(r,c))).flat().some(Boolean));
});
