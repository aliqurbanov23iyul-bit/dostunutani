import qrcode from './vendor/qrcode.mjs';

export function invitationTitle(name){
 const clean=String(name).trim();
 const letters=Array.from(clean.toLocaleLowerCase('az')).filter(c=>/[a-zəıöüçşğ]/u.test(c));
 const vowels=letters.filter(c=>'aıeəiouöü'.includes(c));
 const vowel=vowels.at(-1)||'i';
 const ending='aı'.includes(vowel)?'ı':'ou'.includes(vowel)?'u':'öü'.includes(vowel)?'ü':'i';
 return clean+('aıeəiouöü'.includes(letters.at(-1))?'n':'')+ending+' nə qədər tanıyırsan?';
}
export function invitationCaption(name,link){return invitationTitle(name)+' 👀\n15 sual. Görək neçə faiz çıxır.\nTesti həll et: '+link;}
export function publicInvitationURL(value){
 const url=new URL(value);
 if(!['https:','http:'].includes(url.protocol)||!url.searchParams.get('test'))throw Error('Test linki düzgün deyil.');
 // Invitations never carry a private panel key, extra parameters or a fragment.
 url.pathname=url.pathname.replace(/(?:panel|admin)\.html$/,'');
 const test=url.searchParams.get('test');url.search='';url.searchParams.set('test',test);url.hash='';url.username='';url.password='';return url.href;
}
export function invitationQR(link){const qr=qrcode(0,'M');qr.addData(publicInvitationURL(link),'Byte');qr.make();return qr;}
export async function makeInvitation(name,value){
 const link=publicInvitationURL(value),qr=invitationQR(link);
 await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Bu brauzer şəkil yarada bilmir.');
 const box=(x,y,w,h,r,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
 const circle=(x,y,r,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();};
 const text=(value,y,size=40,color='#493758',weight=900,max=810)=>{let n=size;ctx.textAlign='center';ctx.font=weight+' '+n+'px Nunito, sans-serif';while(ctx.measureText(value).width>max&&n>18){n--;ctx.font=weight+' '+n+'px Nunito, sans-serif';}ctx.fillStyle=color;ctx.fillText(value,540,y);};
 ctx.fillStyle='#f3edfb';ctx.fillRect(0,0,1080,1920);
 circle(1040,100,250,'#e9dff6');circle(40,1840,220,'#f9e2ed');
 ctx.save();ctx.shadowColor='#73528c20';ctx.shadowBlur=40;ctx.shadowOffsetY=18;box(80,220,920,1480,60,'#fffdfF');ctx.restore();
 text('dostunutanı',330,40,'#9366cf');text('DOSTLUQ RADARI · DƏVƏT',389,22,'#94849e',800);
 circle(540,525,85,'#efe3f9');text(Array.from(String(name).trim())[0]?.toLocaleUpperCase('az')||'?',549,67,'#9366cf');
 const title=invitationTitle(name),suffix=' nə qədər tanıyırsan?';
 text(title.slice(0,-suffix.length),712,92);text('nə qədər tanıyırsan?',799,58,'#9366cf');
 box(260,880,260,72,24,'#f2eafa');box(560,880,260,72,24,'#e7f3ec');
 ctx.font='800 29px Nunito, sans-serif';ctx.textAlign='center';ctx.fillStyle='#84619f';ctx.fillText('15 sual',390,927);ctx.fillStyle='#5c836c';ctx.fillText('4 variant',690,927);
 text('“Hamısını bilirəm” deyən dost,',1030,33,'#8b7d98',700);text('səhnə sənindir.',1078,33,'#8b7d98',700);
 box(265,1130,550,88,30,'#9366cf');text('Testi həll et →',1188,36,'#ffffff');
 // High-contrast square modules and a four-module quiet zone for reliable scanning.
 const count=qr.getModuleCount(),unit=Math.floor(320/(count+8)),size=unit*(count+8),left=(1080-size)/2,top=1270;
 box(left,top,size,size,0,'#ffffff');ctx.fillStyle='#302337';
 for(let row=0;row<count;row++)for(let col=0;col<count;col++)if(qr.isDark(row,col))ctx.fillRect(left+(col+4)*unit,top+(row+4)*unit,unit,unit);
 text('QR kodu oxut və ya mesajdakı linkə bas.',1620,25,'#8b7d98',700);
 text(new URL(link).host,1785,30,'#9366cf',900);text('Öz testini yarat. Dostlarına göndər.',1840,25,'#8b7d98',700);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Şəkil yaradıla bilmədi.')),'image/png'));
 return {blob,dataUrl:canvas.toDataURL('image/png'),link};
}
