function racer(el){
  const W=360,H=560,c=mk('canvas',{width:W,height:H}),x=c.getContext('2d'),LC=[67,142,217,292],cols=['#3b82f6','#22c55e','#f97316','#a855f7','#eab308','#e5e7eb'],k={};
  let px,cars,sp,dist,over,nit,off,bonus,tdir,gap,msg,msgT;
  const score=()=>Math.floor(dist/10)+bonus;
  function reset(){px=LC[1];cars=[];sp=6;dist=0;over=0;nit=100;off=0;bonus=0;tdir=0;gap=100;msgT=0;st('Dodge traffic. Hold Space or Up for nitro.')}
  function car(cx,cy,col,me){
    x.fillStyle='#000a';x.fillRect(cx-17,cy-29,36,64);
    x.fillStyle='#000';[[-20,-20],[14,-20],[-20,12],[14,12]].forEach(w=>x.fillRect(cx+w[0],cy+w[1],6,16));
    x.fillStyle=col;x.fillRect(cx-16,cy-31,32,62);
    x.fillStyle='#0b1220';x.fillRect(cx-12,cy-14,24,14);x.fillRect(cx-12,cy+10,24,8);
    x.fillStyle=me?'#fff':'#fde68a';x.fillRect(cx-14,cy-31,6,4);x.fillRect(cx+8,cy-31,6,4);
    x.fillStyle='#ef4444';x.fillRect(cx-14,cy+27,7,4);x.fillRect(cx+7,cy+27,7,4);
  }
  function tick(){
    if(!over){
      const nb=(k.shift||k[' ']||k.arrowup||k.w)&&nit>0;
      nit=nb?nit-.7:Math.min(100,nit+.12);
      sp=Math.min(13,sp+.0025);const v=sp+(nb?4:0);
      const d=(k.arrowright||k.d||tdir>0?1:0)-(k.arrowleft||k.a||tdir<0?1:0);
      px=Math.max(48,Math.min(312,px+d*5.5));
      off+=v;dist+=v;gap-=v;
      if(gap<0){gap=rnd(120)+260-sp*8;const l=rnd(4);if(!cars.some(e=>e.l==l&&e.y<150))cars.push({l,x:LC[l],y:-70,ev:2+Math.random()*2,col:cols[rnd(6)]})}
      cars.forEach(e=>e.y+=v-e.ev);cars=cars.filter(e=>e.y<H+80);
      for(const e of cars){const dx=Math.abs(e.x-px),dy=Math.abs(e.y-470);
        if(dx<30&&dy<58){over=1;st(`Crashed! ${score()} points. Best ${best('racer',score())}. Click or press Enter.`);break}
        if(!e.pass&&e.y>530){e.pass=1;if(dx<52){bonus+=25;msg='Close call +25';msgT=40}}}
    }
    draw();
  }
  function draw(){
    x.fillStyle='#1c3b2b';x.fillRect(0,0,W,H);x.fillStyle='#2a2a2e';x.fillRect(30,0,300,H);
    x.fillStyle='#f4f4f0';x.fillRect(28,0,4,H);x.fillRect(328,0,4,H);
    for(let l=1;l<4;l++)for(let y=-80+off%80;y<H;y+=80)x.fillRect(30+75*l-2,y,4,40);
    cars.forEach(e=>car(e.x,e.y,e.col));car(px,470,'#e63027',1);
    x.textAlign='left';x.font='bold 18px system-ui';x.fillStyle='#fff';x.fillText(score()+' pts',12,26);x.fillText(Math.round(sp*12)+' km/h',12,48);
    x.fillStyle='#333';x.fillRect(W-112,12,100,10);x.fillStyle='#ffd21f';x.fillRect(W-112,12,Math.max(0,nit),10);
    if(msgT-->0){x.fillStyle='#ffd21f';x.fillText(msg,110,110)}
    if(over){x.fillStyle='#000b';x.fillRect(0,H/2-50,W,100);x.fillStyle='#fff';x.font='36px Impact,"Arial Black",sans-serif';x.fillText('CRASHED',118,H/2+12)}
  }
  on(document,'keydown',e=>{const n=e.key.toLowerCase();k[n]=1;if(n.startsWith('arrow')||n==' ')e.preventDefault();if(over&&n=='enter')reset()});
  on(document,'keyup',e=>{k[e.key.toLowerCase()]=0});
  on(c,'pointerdown',e=>{tdir=e.offsetX<c.clientWidth/2?-1:1});
  on(c,'pointerup',()=>{tdir=0});on(c,'pointerleave',()=>{tdir=0});
  on(c,'click',()=>{if(over)reset()});
  reset();const t=setInterval(tick,16);return()=>clearInterval(t);
}

function rush(el){
  const W=640,H=430,c=mk('canvas',{width:W,height:H}),x=c.getContext('2d'),B=[],k={},shop={x:175,y:150};el.append(c);
  for(let i=0;i<4;i++)for(let j=0;j<3;j++)B.push({x:50+i*150,y:40+j*130,w:100,h:90,col:`hsl(${(i*53+j*97)%360} 30% 38%)`});
  let car,v,a,time,money,n,carry,goal,over;
  const hits=(px,py)=>px<9||py<9||px>W-9||py>H-9||B.some(b=>Math.hypot(px-Math.max(b.x,Math.min(px,b.x+b.w)),py-Math.max(b.y,Math.min(py,b.y+b.h)))<9);
  function pick(){let p;do{const b=B[rnd(12)];p={x:b.x+50,y:b.y+110}}while(Math.hypot(p.x-shop.x,p.y-shop.y)<160);return p}
  function reset(){car={x:shop.x,y:shop.y};v=0;a=Math.PI/2;time=60;money=0;n=0;carry=0;goal=shop;over=0;st('Grab a pizza at the red P, then deliver it to the yellow $.')}
  function tick(){
    if(!over){
      const u=k.arrowup||k.w,d=k.arrowdown||k.s,l=k.arrowleft||k.a,r=k.arrowright||k.d;
      v+=u?.1:d?-.08:0;v*=.985;if(k[' '])v*=.93;v=Math.max(-2,Math.min(4.2,v));
      if(Math.abs(v)>.2)a+=((r?1:0)-(l?1:0))*.05*Math.min(1,Math.abs(v)/2)*(v>0?1:-1);
      const nx=car.x+Math.sin(a)*v,ny=car.y-Math.cos(a)*v;
      if(hits(nx,ny))v*=-.4;else{car.x=nx;car.y=ny}
      time-=1/60;
      if(time<=0){over=1;st(`Time's up! $${money}, ${n} delivered. Best $${best('rush',money)}. Click or press Enter.`)}
      else if(Math.hypot(car.x-goal.x,car.y-goal.y)<24){if(!carry){carry=1;goal=pick()}else{carry=0;n++;money+=10;time+=10;goal=shop}}
    }
    draw();
  }
  function draw(){
    x.fillStyle='#3c3c42';x.fillRect(0,0,W,H);
    B.forEach(b=>{x.fillStyle=b.col;x.fillRect(b.x,b.y,b.w,b.h);x.fillStyle='#0003';x.fillRect(b.x+8,b.y+8,b.w-16,b.h-16)});
    x.beginPath();x.arc(goal.x,goal.y,20,0,7);x.fillStyle=carry?'#ffd21f':'#e63027';x.fill();
    x.fillStyle='#111';x.font='bold 18px system-ui';x.textAlign='center';x.fillText(carry?'$':'P',goal.x,goal.y+6);
    const g=Math.atan2(goal.x-car.x,-(goal.y-car.y));
    x.save();x.translate(car.x+Math.sin(g)*30,car.y-Math.cos(g)*30);x.rotate(g);x.fillStyle='#fff';x.beginPath();x.moveTo(0,-6);x.lineTo(5,5);x.lineTo(-5,5);x.fill();x.restore();
    x.save();x.translate(car.x,car.y);x.rotate(a);x.fillStyle='#000';x.fillRect(-7,-12,14,24);x.fillStyle='#e63027';x.fillRect(-6,-11,12,22);
    x.fillStyle='#0b1220';x.fillRect(-5,-5,10,6);if(carry){x.fillStyle='#ffd21f';x.fillRect(-4,4,8,6)}x.restore();
    x.textAlign='left';x.fillStyle='#fff';x.fillText('$'+money,12,24);x.fillText(Math.ceil(time)+'s',W-52,24);
    if(over){x.fillStyle='#000b';x.fillRect(0,H/2-50,W,100);x.fillStyle='#fff';x.textAlign='center';x.font='40px Impact,"Arial Black",sans-serif';x.fillText("TIME'S UP",W/2,H/2+14)}
  }
  on(document,'keydown',e=>{const n=e.key.toLowerCase();k[n]=1;if(n.startsWith('arrow')||n==' ')e.preventDefault();if(over&&n=='enter')reset()});
  on(document,'keyup',e=>{k[e.key.toLowerCase()]=0});on(c,'click',()=>{if(over)reset()});
  reset();const t=setInterval(tick,1000/60);return()=>clearInterval(t);
}

function clicker(el){
  const U=[['Oven',15,1],['Pizza cook',100,5],['Delivery car',600,25],['Pizza factory',3000,120],['Pizza planet',20000,700]];
  let s={n:0,c:1,own:U.map(()=>0)};try{Object.assign(s,JSON.parse(localStorage.getItem('pc')))}catch{}
  const fmt=n=>n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e4?(n/1e3).toFixed(1)+'K':String(Math.floor(n));
  const rate=()=>U.reduce((t,u,i)=>t+u[2]*s.own[i],0),save=()=>{try{localStorage.setItem('pc',JSON.stringify(s))}catch{}};
  const big=mk('div',{class:'big'}),pz=mk('button',{class:'pz','aria-label':'Make pizza'}),shop=mk('div',{class:'shop'});el.append(big,pz,shop);
  const items=[['Thicker crust',()=>Math.ceil(50*1.7**(s.c-1)),()=>s.c++,()=>s.c],...U.map((u,i)=>[u[0],()=>Math.ceil(u[1]*1.15**s.own[i]),()=>s.own[i]++,()=>s.own[i]])];
  const bs=items.map(it=>{const b=mk('button');b.onclick=()=>{const p=it[1]();if(s.n>=p){s.n-=p;it[2]();upd()}};shop.append(b);return b});
  function upd(){big.textContent=fmt(s.n)+' pizzas';st(`${fmt(rate())} per second, ${s.c} per click`);
    bs.forEach((b,i)=>{const p=items[i][1]();b.disabled=s.n<p;b.textContent=`${items[i][0]} (${items[i][3]()}) - ${fmt(p)}`})}
  pz.onclick=()=>{s.n+=s.c;upd()};
  const t=setInterval(()=>{s.n+=rate()/10;upd()},100),sv=setInterval(save,3000);upd();
  return()=>{clearInterval(t);clearInterval(sv);save()};
}
