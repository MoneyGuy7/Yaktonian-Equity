// Cloudflare Pages Function: updates feed with accounts, likes and replies.
// Uses the same KV binding (YQ) and ADMIN_PASSWORD as data.js.
const J={'content-type':'application/json','cache-control':'no-store'},out=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:J});
const hash=async(p,s)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s+p)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const rd=async(env,k,d)=>JSON.parse((await env.YQ.get(k))||JSON.stringify(d));
export async function onRequest({request,env}){
 if(!env.YQ)return out({error:'KV not configured'},404);
 const h=request.headers,admin=!!env.ADMIN_PASSWORD&&h.get('x-admin-password')===env.ADMIN_PASSWORD;
 const tok=h.get('x-token'),user=tok?await env.YQ.get('sess:'+tok):null,an=h.get('x-anon'),who=user?'u:'+user:(an?'a:'+an.slice(0,64):'');
 let posts=await rd(env,'feed',[]);
 const view=()=>posts.map(p=>({id:p.id,t:p.t,b:p.b,d:p.d,n:p.l.length,y:p.l.includes(who),r:p.r.map(x=>({id:x.id,u:x.u,b:x.b,d:x.d,n:x.l.length,y:x.l.includes(who)}))})).reverse();
 if(request.method=='GET')return out({posts:view(),me:user,admin});
 if(request.method!='POST')return out({error:'Bad method'},405);
 let o;try{o=await request.json()}catch(e){return out({error:'Bad request'},400)}
 const save=()=>env.YQ.put('feed',JSON.stringify(posts)),id=()=>crypto.randomUUID().slice(0,8),txt=(s,n)=>String(s||'').trim().slice(0,n);
 if(o.a=='signup'||o.a=='login'){const u=txt(o.u,24).toLowerCase(),pw=String(o.p||'');
  if(!/^[a-z0-9_]{3,24}$/.test(u)||pw.length<6)return out({error:'Username: 3-24 letters, numbers or _. Password: 6+ characters.'},400);
  const us=await rd(env,'users',{});
  if(o.a=='signup'){if(us[u])return out({error:'That username is taken.'},409);const s=id()+id();us[u]={s,h:await hash(pw,s)};await env.YQ.put('users',JSON.stringify(us))}
  else if(!us[u]||us[u].h!==await hash(pw,us[u].s))return out({error:'Wrong username or password.'},401);
  const t=crypto.randomUUID();await env.YQ.put('sess:'+t,u,{expirationTtl:2592000});return out({token:t,user:u})}
 if(o.a=='post'){if(!admin)return out({error:'Admins only.'},403);const b=txt(o.b,2000);if(!b)return out({error:'Write something first.'},400);posts.push({id:id(),t:txt(o.t,120),b,d:new Date().toISOString(),l:[],r:[]});await save();return out({ok:1})}
 if(o.a=='del'){if(!admin)return out({error:'Admins only.'},403);posts=o.rid?posts.map(p=>p.id==o.id?{...p,r:p.r.filter(x=>x.id!=o.rid)}:p):posts.filter(p=>p.id!=o.id);await save();return out({ok:1})}
 const p=posts.find(x=>x.id==o.id);if(!p)return out({error:'Not found.'},404);
 if(o.a=='reply'){if(!user)return out({error:'Log in to reply.'},401);const b=txt(o.b,1000);if(!b)return out({error:'Write something first.'},400);p.r.push({id:id(),u:user,b,d:new Date().toISOString(),l:[]});await save();return out({ok:1})}
 if(o.a=='like'){if(!who)return out({error:'Missing identity.'},400);const t=o.rid?p.r.find(x=>x.id==o.rid):p;if(!t)return out({error:'Not found.'},404);const i=t.l.indexOf(who);i<0?t.l.push(who):t.l.splice(i,1);await save();return out({ok:1})}
 return out({error:'Unknown action.'},400)}
