const G=[
  {id:'racer',name:'Traffic Racer',tag:'Cars',a:'#e63027',b:'#17171a',help:'Left and right (or A and D) to steer. Hold Space or Up for nitro. On a phone, touch the left or right side.',run:racer},
  {id:'rush',name:'Pizza Rush',tag:'Cars',a:'#ffd21f',b:'#17171a',help:'Arrow keys or WASD to drive, Space to brake. Pick up at the P, deliver to the $. Each delivery adds 10 seconds.',run:rush},
  {id:'clicker',name:'Pizza Clicker',tag:'Idle',a:'#f2a33a',b:'#8f2a1a',help:'Click the pizza, then buy ovens, cooks and cars to make pizza on their own. Your progress saves.',run:clicker},
  {id:'snake',name:'Snake',tag:'Arcade',a:'#2f9e6f',b:'#17171a',help:'Arrow keys or WASD. Swipe on a phone.',run:snake},
  {id:'react',name:'Reaction Time',tag:'Arcade',a:'#3ddc84',b:'#17171a',help:'Click as soon as the box turns green.',run:react},
  {id:'2048',name:'2048',tag:'Puzzle',a:'#f2c14e',b:'#17171a',help:'Slide tiles with arrow keys or swipes. Matching numbers merge.',run:g2048},
  {id:'memory',name:'Memory Match',tag:'Puzzle',a:'#e63027',b:'#f4f4f0',help:'Flip two cards at a time and find the pairs.',run:memory},
  {id:'mines',name:'Minesweeper',tag:'Puzzle',a:'#7a7a86',b:'#17171a',help:'Numbers count the mines next to a square. Your first click is safe.',run:mines},
  {id:'ttt',name:'Tic-Tac-Toe',tag:'Puzzle',a:'#5b6cff',b:'#17171a',help:'Three in a row beats the computer.',run:ttt}
];
let tag='All';
function load(id){
  const g=G.find(x=>x.id==id);if(!g)return;cur=g.id;offs.forEach(f=>f());offs=[];if(stop)stop();
  const el=$('#game');el.innerHTML='';$('#gt').textContent=g.name;$('#help').textContent=g.help;st('');
  $('#stage').hidden=false;stop=g.run(el);history.replaceState(0,'','#'+g.id);
}
function openGame(id){load(id);$('#stage').scrollIntoView({behavior:'smooth'})}
function closeGame(){offs.forEach(f=>f());offs=[];if(stop)stop();stop=null;$('#game').innerHTML='';$('#stage').hidden=true;history.replaceState(0,'',location.pathname)}
function filter(){const q=$('#q').value.toLowerCase();G.forEach(g=>{g.el.hidden=!(g.name.toLowerCase().includes(q)&&(tag=='All'||g.tag==tag))})}
G.forEach(g=>{const b=mk('button',{type:'button',class:'tile'});b.style.cssText=`--a:${g.a};--b:${g.b}`;
  b.innerHTML=`<small>${g.tag}</small><b>${g.name}</b>`;b.onclick=()=>openGame(g.id);g.el=b;$('#grid').append(b)});
['All',...new Set(G.map(g=>g.tag))].forEach(t=>{const b=mk('button',{type:'button'},t);b.onclick=()=>{tag=t;document.querySelectorAll('#chips button').forEach(x=>x.setAttribute('aria-pressed',x==b));filter()};
  b.setAttribute('aria-pressed',t=='All');$('#chips').append(b)});
$('#q').oninput=filter;$('#again').onclick=()=>load(cur);$('#back').onclick=closeGame;
$('#fs').onclick=()=>{const s=$('#stage');document.fullscreenElement?document.exitFullscreen():s.requestFullscreen&&s.requestFullscreen()};
addEventListener('hashchange',()=>load(location.hash.slice(1)));
load(location.hash.slice(1));
