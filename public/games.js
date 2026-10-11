const $=s=>document.querySelector(s),rnd=n=>Math.random()*n|0;
function mk(t,a={},x=''){const e=document.createElement(t);for(const k in a)e.setAttribute(k,a[k]);e.textContent=x;return e}
let offs=[],stop,cur;
const on=(t,e,f,o)=>{t.addEventListener(e,f,o);offs.push(()=>t.removeEventListener(e,f,o))};
const st=t=>{$('#st').textContent=t};
function best(id,v,low){try{const k='best-'+id,o=localStorage.getItem(k);if(o===null||(low?v<+o:v>+o)){localStorage.setItem(k,v);return v}return +o}catch{return v}}
const K={ArrowLeft:'l',ArrowRight:'r',ArrowUp:'u',ArrowDown:'d',a:'l',d:'r',w:'u',s:'d'};
function dirs(el,cb){
  on(document,'keydown',e=>{const d=K[e.key];if(d){e.preventDefault();cb(d)}});
  let p;on(el,'touchstart',e=>{p=e.touches[0]},{passive:true});
  on(el,'touchend',e=>{if(!p)return;const q=e.changedTouches[0],x=q.clientX-p.clientX,y=q.clientY-p.clientY;
    if(Math.max(Math.abs(x),Math.abs(y))>24)cb(Math.abs(x)>Math.abs(y)?(x<0?'l':'r'):(y<0?'u':'d'))});
}

function snake(el){
  const c=mk('canvas',{width:320,height:320}),x=c.getContext('2d');el.append(c);
  const V={l:[-1,0],r:[1,0],u:[0,-1],d:[0,1]},hit=(p,q)=>p[0]==q[0]&&p[1]==q[1];let s,d,n,f,sc,over;
  function food(){do f=[rnd(16),rnd(16)];while(s.some(p=>hit(p,f)))}
  function reset(){s=[[8,8],[7,8],[6,8]];d=n=V.r;sc=0;over=0;food();st('Score 0');draw()}
  function tick(){if(over)return;d=n;const h=[s[0][0]+d[0],s[0][1]+d[1]];
    if(h[0]<0||h[1]<0||h[0]>15||h[1]>15||s.some(p=>hit(p,h))){over=1;st(`Game over: ${sc}. Best ${best('snake',sc)}. Tap to restart.`);return}
    s.unshift(h);if(hit(h,f)){sc++;food();st('Score '+sc)}else s.pop();draw()}
  function draw(){x.fillStyle='#0d0b1f';x.fillRect(0,0,320,320);x.fillStyle='#FF5D8F';x.fillRect(f[0]*20+3,f[1]*20+3,14,14);
    x.fillStyle='#4FD1C5';s.forEach(p=>x.fillRect(p[0]*20+1,p[1]*20+1,18,18))}
  dirs(c,k=>{const v=V[k];if(v[0]+d[0]||v[1]+d[1])n=v});
  on(c,'click',()=>{if(over)reset()});
  const t=setInterval(tick,110);reset();return()=>clearInterval(t);
}

function g2048(el){
  const gr=mk('div',{class:'g4'});let b=Array(16).fill(0),sc=0;el.append(gr);
  const add=()=>{const e=[];b.forEach((v,i)=>v||e.push(i));b[e[rnd(e.length)]]=Math.random()<.9?2:4};
  const slide=r=>{r=r.filter(Boolean);const o=[];for(let i=0;i<r.length;i++){if(r[i]==r[i+1]){o.push(r[i]*2);sc+=r[i]*2;i++}else o.push(r[i])}while(o.length<4)o.push(0);return o};
  const stuck=()=>{if(b.includes(0))return 0;for(let i=0;i<16;i++)if((i%4<3&&b[i]==b[i+1])||(i<12&&b[i]==b[i+4]))return 0;return 1};
  function move(d){const hz='lr'.includes(d),rv='rd'.includes(d),nb=b.slice();let ch=0;
    for(let i=0;i<4;i++){const ix=[0,1,2,3].map(j=>hz?i*4+j:j*4+i);if(rv)ix.reverse();
      const o=slide(ix.map(k=>b[k]));ix.forEach((k,j)=>{if(nb[k]!=o[j])ch=1;nb[k]=o[j]})}
    if(ch){b=nb;add();draw()}}
  function draw(){gr.innerHTML=b.map(v=>`<i class="t"${v?` style="--v:${Math.log2(v)}"`:''}>${v||''}</i>`).join('');
    st(stuck()?`No moves left. Score ${sc}. Best ${best('2048',sc)}.`:'Score '+sc)}
  add();add();draw();dirs(gr,move);
}

function memory(el){
  const e=['🐙','🍕','🚀','🎸','🌵','🦊','🍩','⚡'],gr=mk('div',{class:'g4'});let o=[],lock=0,mv=0,ok=0;
  [...e,...e].sort(()=>Math.random()-.5).forEach(v=>{
    const b=mk('button',{class:'card','aria-label':'Hidden card'});
    b.onclick=()=>{if(lock||b.classList.contains('up'))return;b.textContent=v;b.classList.add('up');o.push(b);
      if(o.length<2)return;mv++;
      if(o[0].textContent==v){ok++;o=[];st(ok==8?`Cleared in ${mv} moves. Best ${best('memory',mv,1)}.`:mv+' moves')}
      else{lock=1;setTimeout(()=>{o.forEach(x=>{x.textContent='';x.classList.remove('up')});o=[];lock=0;st(mv+' moves')},700)}};
    gr.append(b)});
  el.append(gr);st('Find all 8 pairs.');
}

function ttt(el){
  const L=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]],gr=mk('div',{class:'g3'});let b=Array(9).fill(''),end=0;el.append(gr);
  const w=(p,m)=>L.some(l=>l.every(i=>p[i]==m)),free=p=>p.map((v,i)=>v?-1:i).filter(i=>i>=0);
  function mm(p,t){if(w(p,'O'))return 1;if(w(p,'X'))return -1;const f=free(p);if(!f.length)return 0;
    let r=t=='O'?-2:2;for(const i of f){p[i]=t;const s=mm(p,t=='O'?'X':'O');p[i]='';r=t=='O'?Math.max(r,s):Math.min(r,s)}return r}
  function ai(){const f=free(b);if(Math.random()<.2)return f[rnd(f.length)];let bi,bs=-2;
    for(const i of f){b[i]='O';const s=mm(b,'X');b[i]='';if(s>bs){bs=s;bi=i}}return bi}
  function check(){if(w(b,'X')){st('You win!');end=1}else if(w(b,'O')){st('Computer wins.');end=1}else if(!free(b).length){st('Draw.');end=1}}
  function draw(){gr.innerHTML='';b.forEach((v,i)=>{const c=mk('button',{class:v=='O'?'o':'','aria-label':'Square '+(i+1)},v);
    c.onclick=()=>{if(b[i]||end)return;b[i]='X';check();if(!end){b[ai()]='O';check()}draw()};gr.append(c)})}
  st('You are X. The computer sometimes slips.');draw();
}

function mines(el){
  const N=9,M=10,gr=mk('div',{class:'ms'}),tb=mk('button',{class:'ghost'},'Flag mode: off');
  let mine=Array(N*N).fill(0),rev=Array(N*N).fill(0),flg=Array(N*N).fill(0),over=0,first=1,fm=0;
  gr.style.gridTemplateColumns=`repeat(${N},1fr)`;tb.onclick=()=>{fm=!fm;tb.textContent='Flag mode: '+(fm?'on':'off')};el.append(tb,gr);
  const nb=i=>{const r=i/N|0,c=i%N,o=[];for(let a=-1;a<2;a++)for(let b=-1;b<2;b++){const y=r+a,x=c+b;if((a||b)&&y>=0&&y<N&&x>=0&&x<N)o.push(y*N+x)}return o};
  const cnt=i=>nb(i).filter(j=>mine[j]).length;
  function open(i){if(rev[i]||flg[i])return;rev[i]=1;if(!mine[i]&&!cnt(i))nb(i).forEach(open)}
  function act(i,flag){if(over||rev[i])return;
    if(flag||fm){flg[i]=!flg[i]}
    else{if(first){first=0;let k=0;while(k<M){const j=rnd(N*N);if(!mine[j]&&j!=i&&!nb(i).includes(j)){mine[j]=1;k++}}}
      if(flg[i])return;open(i);
      if(mine[i]){over=1;st('Boom. Tap Restart.')}
      else if(rev.filter(Boolean).length==N*N-M){over=1;st('Cleared!')}}
    draw()}
  function draw(){gr.innerHTML='';for(let i=0;i<N*N;i++){const s=(over&&mine[i])||rev[i],
    c=mk('button',{class:s?'o':'','aria-label':'Cell'},s?(mine[i]?'💣':cnt(i)||''):flg[i]?'🚩':'');
    c.style.setProperty('--n',cnt(i));c.onclick=()=>act(i);c.oncontextmenu=e=>{e.preventDefault();act(i,1)};gr.append(c)}}
  st(M+' mines. Right-click, or use Flag mode, to flag.');draw();
}

function react(el){
  const b=mk('button',{class:'react'},'Click to start');el.append(b);let t,s=0,tm;
  b.onclick=()=>{
    if(s==0){s=1;b.className='react wait';b.textContent='Wait for green…';
      tm=setTimeout(()=>{s=2;t=performance.now();b.className='react go';b.textContent='Click!'},1000+rnd(2500))}
    else if(s==1){clearTimeout(tm);s=0;b.className='react';b.textContent='Too soon. Click to try again'}
    else{const ms=Math.round(performance.now()-t);s=0;b.className='react';b.textContent='Click to go again';st(`${ms} ms. Best ${best('react',ms,1)} ms.`)}};
  st('Click, then wait for green.');return()=>clearTimeout(tm);
}

