import { useState, useEffect, useRef } from 'react';

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');

  .lp-body {
    min-height:100vh; background:#03050a;
    display:flex; align-items:center; justify-content:center;
    font-family:'Outfit',-apple-system,sans-serif; overflow:hidden; position:relative;
  }
  #lp-canvas { position:fixed; inset:0; pointer-events:none; z-index:0; }

  .lp-hex {
    position:fixed; inset:0; z-index:1; pointer-events:none;
    background-image:
      linear-gradient(30deg,  rgba(0,255,128,0.03) 12%, transparent 12.5%, transparent 87%, rgba(0,255,128,0.03) 87.5%),
      linear-gradient(150deg, rgba(0,255,128,0.03) 12%, transparent 12.5%, transparent 87%, rgba(0,255,128,0.03) 87.5%),
      linear-gradient(60deg,  rgba(0,255,128,0.045) 25%, transparent 25.5%, transparent 75%, rgba(0,255,128,0.045) 75%);
    background-size:40px 70px; background-position:0 0,0 0,20px 35px;
  }
  .lp-vignette {
    position:fixed; inset:0; z-index:2; pointer-events:none;
    background:radial-gradient(ellipse at 50% 50%, transparent 15%, rgba(3,5,10,0.18) 55%, rgba(3,5,10,0.55) 100%);
  }

  .lp-card-border {
    position:relative; z-index:10; border-radius:28px; width:100%; max-width:420px;
    box-shadow:0 0 60px oklch(65% 0.22 145 / 0.28),0 0 120px oklch(65% 0.22 145 / 0.12);
  }
  .lp-card {
    background:rgba(6,10,16,0.96);
    backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
    border-radius:27px; padding:46px 42px 42px;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.07),inset 0 -1px 0 rgba(0,0,0,0.3);
    transform:translateZ(0);
  }

  .lp-logo { text-align:center; margin-bottom:38px; }
  .lp-icon-wrap { display:block; margin:0 auto 16px; width:fit-content; animation:lpIconPulse 4s ease-in-out infinite; will-change:opacity; }
  @keyframes lpIconPulse { 0%,100%{opacity:0.85} 50%{opacity:1} }
  .lp-icon { display:block; filter:drop-shadow(0 0 14px oklch(70% 0.24 145 / 0.9)) drop-shadow(0 0 32px oklch(70% 0.24 145 / 0.5)); }

  .lp-kboos {
    font-size:44px; font-weight:900; letter-spacing:0.14em; line-height:1; font-family:'Outfit',sans-serif;
    background:linear-gradient(90deg,oklch(78% 0.22 145) 0%,oklch(72% 0.2 185) 25%,oklch(65% 0.2 245) 50%,oklch(72% 0.2 185) 75%,oklch(78% 0.22 145) 100%);
    background-size:200% auto;
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
    animation:lpGradShift 4s linear infinite;
  }
  @keyframes lpGradShift { from{background-position:0% center} to{background-position:200% center} }
  .lp-outreach { font-size:10px; font-weight:700; letter-spacing:0.35em; color:rgba(255,255,255,0.4); text-transform:uppercase; margin-top:7px; }
  .lp-line { width:70px; height:1px; margin:11px auto; background:linear-gradient(90deg,transparent,oklch(70% 0.22 145 / 0.55),transparent); animation:lpLineShimmer 3s ease-in-out infinite; will-change:transform; }
  @keyframes lpLineShimmer { 0%,100%{transform:scaleX(0.57);opacity:0.6} 50%{transform:scaleX(1);opacity:1} }
  .lp-sub { font-size:10px; color:rgba(255,255,255,0.22); letter-spacing:0.1em; }

  .lp-h2 { font-size:22px; font-weight:800; color:#fff; margin-bottom:5px; letter-spacing:-0.02em; font-family:'Outfit',sans-serif; }
  .lp-subtitle { font-size:13px; color:rgba(255,255,255,0.3); margin-bottom:30px; font-weight:400; }
  .lp-label { display:block; font-size:11px; font-weight:700; color:rgba(255,255,255,0.4); margin-bottom:7px; letter-spacing:0.09em; text-transform:uppercase; }
  .lp-input-wrap { margin-bottom:18px; }
  .lp-input {
    width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
    color:#fff; padding:13px 16px; border-radius:13px; font-size:14px;
    font-family:'Outfit',sans-serif; outline:none;
    transition:border-color 0.25s,box-shadow 0.25s,background 0.25s;
  }
  .lp-input:focus { border-color:oklch(68% 0.22 145 / 0.6); background:rgba(255,255,255,0.06); box-shadow:0 0 0 3px oklch(65% 0.22 145 / 0.12); }
  .lp-input::placeholder { color:rgba(255,255,255,0.15); }
  .lp-btn {
    position:relative; width:100%; padding:14px;
    background:linear-gradient(135deg,#ffffff 0%,#dfffee 100%);
    color:#03050a; border:none; border-radius:13px; font-size:15px; font-weight:800;
    font-family:'Outfit',sans-serif; cursor:pointer; letter-spacing:0.04em; margin-top:8px;
    overflow:hidden; transition:transform 0.18s,box-shadow 0.2s;
    box-shadow:0 4px 28px rgba(0,0,0,0.5),0 0 50px oklch(65% 0.22 145 / 0.22);
  }
  .lp-btn::after {
    content:''; position:absolute; top:0; left:0; width:60%; height:100%;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent);
    transform:translateX(-200%); animation:lpShine 3.5s ease-in-out infinite; will-change:transform;
  }
  @keyframes lpShine { 0%{transform:translateX(-200%)} 30%{transform:translateX(280%)} 100%{transform:translateX(280%)} }
  .lp-btn:hover { transform:translateY(-2px); box-shadow:0 10px 40px rgba(0,0,0,0.5),0 0 70px oklch(65% 0.22 145 / 0.3); }
  .lp-btn:active { transform:translateY(0); }
  .lp-btn:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
  .lp-error { background:oklch(55% 0.22 25 / 0.1); border:1px solid oklch(55% 0.22 25 / 0.3); border-radius:8px; padding:10px 14px; margin-bottom:16px; color:oklch(70% 0.22 25); font-size:13px; }
`;

export function Login({ onLogin }) {
  const canvasRef = useRef(null);
  const inviteToken = new URLSearchParams(window.location.search).get('invite');
  const [mode, setMode] = useState(inviteToken ? 'set-password' : 'login');
  const [inviteUser, setInviteUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    fetch(`${BASE}/auth/invite/${inviteToken}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setMode('login'); }
        else setInviteUser(data);
      })
      .catch(() => { setError('Invalid invite link'); setMode('login'); });
  }, [inviteToken]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, raf;

    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    // ── Constants ──
    const C = { hub:[0,255,140], hq:[80,255,160], lead:[0,200,255], hot:[255,185,40] };
    const HUB_POS = [
      [0.10,0.76],[0.07,0.07],[0.50,0.05],[0.93,0.07],
      [0.95,0.48],[0.93,0.92],[0.50,0.95],[0.06,0.45],
    ];
    const CITIES    = ['Kuching · HQ','Kuala Lumpur','Penang','Johor Bahru','Ipoh','Kota Kinabalu','Melaka','Shah Alam'];
    const NAMES     = ['Ahmad Razif','Nurul Ain','Mohd Faizal','Siti Hajar','Azlan Shah','Kavitha R.','Lee Wei Ming','Raj Kumar','Farah Nadia','Hairul Azmi'];
    const TITLES    = ['CEO','Managing Director','VP Sales','Head of BD','Co-Founder','CFO','Director','COO'];
    const COMPANIES = ['Petronas','Tenaga Nasional','CIMB Bank','Maybank','AirAsia','Axiata','Sime Darby','IHH Healthcare'];
    const EMAIL_SUBJ= ['Partnership Opportunity — KOBIS','Strategic Collaboration Proposal','Following Up — Growth Partnership','B2B Outreach: Let\'s Connect','Exclusive Offer for Your Business'];
    const MSGS      = ['Email sent ✓','WhatsApp ✓','Opened 👀','Replied! 💬','Meeting booked!','Hot lead 🔥','Connected ✓','Contacted ✓'];
    const CH_ICONS  = ['✉','💬','📞','📱','🔔','📧'];
    const stats     = { emails:1247, hot:23, meetings:8 };

    // ── Malaysia map ──
    const MAP_PENINSULA = [[100.1,5.6],[100.3,5.85],[101.0,6.2],[101.8,6.25],[102.3,6.1],[103.0,5.8],[103.7,5.3],[104.2,4.85],[104.35,4.2],[104.1,3.5],[103.85,2.8],[104.15,2.0],[103.95,1.5],[103.5,1.28],[103.0,1.35],[102.55,2.0],[102.1,2.8],[101.65,3.5],[101.15,4.0],[100.75,4.5],[100.45,5.0],[100.2,5.4],[100.1,5.6]];
    const MAP_SARAWAK   = [[109.6,1.8],[110.5,1.5],[111.5,1.85],[112.5,2.2],[113.5,2.8],[114.2,3.4],[114.85,4.05],[115.05,4.55],[114.5,4.65],[113.8,4.5],[112.5,4.2],[111.2,4.0],[110.0,3.5],[109.3,2.8],[109.0,2.2],[109.6,1.8]];
    const MAP_SABAH     = [[115.2,4.1],[116.0,4.5],[116.8,5.5],[117.5,6.3],[118.5,6.85],[119.3,6.5],[119.5,5.8],[118.8,5.0],[118.0,4.5],[117.0,4.2],[116.0,4.0],[115.5,4.1],[115.2,4.1]];

    function geo(lon,lat){ return [W*(0.04+(lon-99.5)/21*0.92), H*(0.96-(lat-0.5)/8.5*0.92)]; }

    function drawMap() {
      [MAP_PENINSULA,MAP_SARAWAK,MAP_SABAH].forEach(pts=>{
        ctx.beginPath();
        const [sx,sy]=geo(pts[0][0],pts[0][1]); ctx.moveTo(sx,sy);
        for(let i=1;i<pts.length;i++){ const [x,y]=geo(pts[i][0],pts[i][1]); ctx.lineTo(x,y); }
        ctx.closePath();
        ctx.fillStyle='rgba(0,255,128,0.010)'; ctx.fill();
        ctx.strokeStyle='rgba(0,255,128,0.048)'; ctx.lineWidth=0.8; ctx.stroke();
      });
    }

    // ── Classes ──
    class Node {
      constructor(x,y,type,cityIdx){ this.x=x;this.y=y;this.type=type;this.cityIdx=cityIdx;this.isHQ=(cityIdx===0);this.r=this.isHQ?10:type==='hub'?6.5:3+Math.random()*2.5;this.age=0;this.life=type==='hub'?Infinity:16000+Math.random()*10000;this.ph=Math.random()*Math.PI*2;this.edges=[]; }
      get col(){ return this.isHQ?C.hq:C[this.type]||C.lead; }
      get alive(){ return this.age<this.life; }
      get opacity(){ if(this.type==='hub')return 1;const fi=Math.min(1,this.age/700);const fo=this.life-this.age<2000?(this.life-this.age)/2000:1;return fi*fo; }
    }
    class Edge { constructor(src,dst){ this.src=src;this.dst=dst;this.prog=0;this.done=false;this.particles=[];this.ptimer=0;this.replyPs=[]; } }
    class Pulse { constructor(x,y,col,r){ this.x=x;this.y=y;this.col=col;this.r=2;this.maxR=r||55;this.a=0.75; } get done(){ return this.a<=0; } }
    class Tag { constructor(x,y,text,col){ this.x=x;this.y=y;this.text=text;this.col=col;this.a=1;this.vy=-0.32; } get done(){ return this.a<=0; } }

    class ChannelIcon {
      constructor(){ this.icon=CH_ICONS[Math.floor(Math.random()*CH_ICONS.length)];this.x=W*0.04+Math.random()*W*0.92;this.y=H*0.04+Math.random()*H*0.92;this.age=0;this.life=2000+Math.random()*2500;this.speed=0.005+Math.random()*0.006; }
      get done(){ return this.age>=this.life; }
      update(dt){ this.age+=dt; }
      draw(){
        const p=this.age/this.life,op=Math.min(1,this.age/300)*(p>0.65?1-(p-0.65)/0.35:1)*(0.3+0.7*Math.abs(Math.sin(this.age*this.speed)));
        if(op<0.02)return;
        const [r,g,b]=C.lead;
        ctx.save();const gr=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,20);gr.addColorStop(0,`rgba(${r},${g},${b},${0.14*op})`);gr.addColorStop(1,`rgba(${r},${g},${b},0)`);ctx.beginPath();ctx.arc(this.x,this.y,20,0,Math.PI*2);ctx.fillStyle=gr;ctx.fill();
        ctx.globalAlpha=op*0.88;ctx.font='15px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(this.icon,this.x,this.y);ctx.restore();
      }
    }

    class SequenceBadge {
      constructor(hub){ this.hub=hub;this.step=1+Math.floor(Math.random()*4);this.total=this.step+1+Math.floor(Math.random()*2);this.day=1+Math.floor(Math.random()*14);this.age=0;this.life=4000+Math.random()*3000;this.ox=(Math.random()-0.5)*70;this.oy=-22-Math.random()*18; }
      get done(){ return this.age>=this.life; }
      update(dt){ this.age+=dt; }
      draw(){
        const p=this.age/this.life,op=Math.min(1,this.age/500)*(p>0.75?1-(p-0.75)/0.25:1);
        if(op<0.02)return;
        const x=this.hub.x*W+this.ox,y=this.hub.y*H+this.oy,txt=`Day ${this.day}  ·  Step ${this.step}/${this.total}`;
        ctx.save();ctx.globalAlpha=op;ctx.font='600 9px Outfit,sans-serif';ctx.textAlign='center';
        const tw=ctx.measureText(txt).width,pw=tw+16,ph=15;
        ctx.fillStyle='rgba(0,255,128,0.10)';ctx.beginPath();ctx.roundRect(x-pw/2,y-ph/2,pw,ph,4);ctx.fill();
        ctx.strokeStyle='rgba(0,255,128,0.32)';ctx.lineWidth=0.6;ctx.stroke();
        ctx.fillStyle='rgba(0,255,128,0.95)';ctx.fillText(txt,x,y+1);ctx.restore();
      }
    }

    class ProfileCard {
      constructor(x,y){ this.x=x;this.y=y;this.name=NAMES[Math.floor(Math.random()*NAMES.length)];this.title=TITLES[Math.floor(Math.random()*TITLES.length)];this.company=COMPANIES[Math.floor(Math.random()*COMPANIES.length)];this.city=CITIES[1+Math.floor(Math.random()*(CITIES.length-1))];this.age=0;this.life=3800;this.vy=-0.15; }
      get done(){ return this.age>=this.life; }
      update(dt){ this.age+=dt;this.y+=this.vy*(dt*0.1); }
      draw(){
        const p=this.age/this.life,op=Math.min(1,this.age/400)*(p>0.65?1-(p-0.65)/0.35:1);
        if(op<0.02)return;
        const w=164,h=54,r=8,bx=Math.max(4,Math.min(W-w-4,this.x-w/2)),by=this.y-h/2;
        ctx.save();ctx.globalAlpha=op;
        ctx.fillStyle='rgba(5,10,20,0.90)';ctx.beginPath();ctx.roundRect(bx,by,w,h,r);ctx.fill();
        ctx.strokeStyle='rgba(255,185,40,0.45)';ctx.lineWidth=0.7;ctx.stroke();
        ctx.font='700 11px Outfit,sans-serif';ctx.textAlign='left';ctx.fillStyle='rgba(255,220,80,0.95)';ctx.shadowColor='rgba(255,185,40,0.5)';ctx.shadowBlur=6;ctx.fillText(`🔥 ${this.name}`,bx+10,by+18);ctx.shadowBlur=0;
        ctx.font='600 9px Outfit,sans-serif';ctx.fillStyle='rgba(255,255,255,0.5)';ctx.fillText(`${this.title} · ${this.company}`,bx+10,by+31);
        ctx.fillStyle='rgba(0,200,255,0.6)';ctx.fillText(this.city,bx+10,by+44);ctx.restore();
      }
    }

    class BroadcastWave {
      constructor(x,y){ this.x=x;this.y=y;this.r=5;this.maxR=Math.hypot(W,H)*1.15;this.a=0.6; }
      get done(){ return this.r>=this.maxR; }
      update(dt){ this.r+=dt*0.10;this.a=0.6*(1-this.r/this.maxR); }
      draw(){
        if(this.a<0.005)return;
        const [r,g,b]=C.hq;
        ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);ctx.strokeStyle=`rgba(${r},${g},${b},${this.a*0.32})`;ctx.lineWidth=1.3;ctx.stroke();
        ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);ctx.strokeStyle=`rgba(${r},${g},${b},${this.a*0.10})`;ctx.lineWidth=6;ctx.stroke();
      }
    }

    class EmailComposer {
      constructor(hq){ this.hq=hq;this.bx=hq.x*W+85;this.by=hq.y*H-72;this.subject=EMAIL_SUBJ[Math.floor(Math.random()*EMAIL_SUBJ.length)];this.displayed=0;this.age=0;this.life=this.subject.length*52+2800;this.sent=false;this.phase='typing'; }
      get done(){ return this.age>=this.life; }
      update(dt){
        this.age+=dt;this.displayed=Math.min(this.subject.length,Math.floor(this.age/52));
        if(!this.sent&&this.displayed>=this.subject.length&&this.age>this.subject.length*52+550){
          this.sent=true;this.phase='sending';
          const ch=nodes.filter(n=>n.type==='hub'&&!n.isHQ);
          const target=ch[Math.floor(Math.random()*ch.length)];
          if(target){ addEdge(this.hq,target);addPulse(this.hq.x*W,this.hq.y*H,C.hq,50);stats.emails++; }
        }
      }
      draw(){
        const p=this.age/this.life,op=Math.min(1,this.age/300)*(p>0.82?1-(p-0.82)/0.18:1);
        if(op<0.02)return;
        const w=214,h=70,r=9,bx=Math.min(this.bx,W-w-12),by=Math.max(12,this.by);
        ctx.save();ctx.globalAlpha=op;
        ctx.fillStyle='rgba(4,9,18,0.93)';ctx.beginPath();ctx.roundRect(bx,by,w,h,r);ctx.fill();
        ctx.strokeStyle=this.phase==='sending'?'rgba(80,255,160,0.55)':'rgba(0,200,255,0.22)';ctx.lineWidth=0.8;ctx.stroke();
        ctx.font='600 9px Outfit,sans-serif';ctx.textAlign='left';ctx.fillStyle='rgba(0,200,255,0.6)';ctx.fillText('✉  New Outreach',bx+10,by+14);
        ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(bx+8,by+19);ctx.lineTo(bx+w-8,by+19);ctx.stroke();
        const cursor=(this.displayed<this.subject.length&&Math.floor(this.age/420)%2===0)?'█':'';
        const shown=this.subject.slice(0,this.displayed);
        ctx.font='600 10px Outfit,sans-serif';ctx.fillStyle='rgba(255,255,255,0.78)';ctx.fillText((shown.length>22?shown.slice(-22):shown)+cursor,bx+10,by+35);
        const bw=54,bh=15,btnX=bx+w-bw-8,btnY=by+h-bh-8;
        ctx.fillStyle=this.phase==='sending'?'rgba(80,255,160,0.22)':'rgba(0,200,255,0.10)';ctx.beginPath();ctx.roundRect(btnX,btnY,bw,bh,3);ctx.fill();
        ctx.strokeStyle=this.phase==='sending'?'rgba(80,255,160,0.6)':'rgba(0,200,255,0.28)';ctx.lineWidth=0.6;ctx.stroke();
        ctx.font='700 8px Outfit,sans-serif';ctx.textAlign='center';ctx.fillStyle=this.phase==='sending'?'rgba(80,255,160,0.95)':'rgba(0,200,255,0.75)';ctx.fillText(this.phase==='sending'?'Sent ✓':'Send →',btnX+bw/2,btnY+10);
        ctx.restore();
      }
    }

    // ── State arrays ──
    const nodes=[],edges=[],pulses=[],tags=[],chIcons=[],seqBadges=[],profileCards=[],broadWaves=[],emailComposers=[];

    // ── Helpers ──
    function addPulse(x,y,col,r){ pulses.push(new Pulse(x,y,col,r||55)); }
    function dist(a,b){ return Math.hypot((a.x-b.x)*W,(a.y-b.y)*H); }
    function edgeExists(a,b){ return edges.some(e=>(e.src===a&&e.dst===b)||(e.src===b&&e.dst===a)); }
    function addEdge(a,b){
      if(edgeExists(a,b))return;
      const e=new Edge(a,b);a.edges.push(e);b.edges.push(e);edges.push(e);
      setTimeout(()=>{ tags.push(new Tag(b.x*W,b.y*H-22,MSGS[Math.floor(Math.random()*MSGS.length)],C.lead)); },1300);
    }

    function replyWave(lead){
      const he=lead.edges.find(e=>e.src.type==='hub'||e.dst.type==='hub');if(!he)return;
      const hub=he.src.type==='hub'?he.src:he.dst;
      setTimeout(()=>{
        if(!lead.alive)return;
        he.replyPs.push({t:1,speed:0.00055,trail:[]});
        setTimeout(()=>{
          if(!hub.alive)return;
          addPulse(hub.x*W,hub.y*H,C.hot,80);
          [0,280].forEach(d=>setTimeout(()=>addPulse(hub.x*W,hub.y*H,hub.isHQ?C.hq:C.hub,55),d));
          tags.push(new Tag(hub.x*W,hub.y*H-32,'Reply received! 💬',C.hot));
        },2100);
      },600);
    }

    function spawnLead(){
      if(nodes.filter(n=>n.type!=='hub').length>100)return;
      const hubs=nodes.filter(n=>n.type==='hub');
      const hub=Math.random()<0.35?hubs[0]:hubs[1+Math.floor(Math.random()*(hubs.length-1))];
      if(!hub)return;
      const angle=Math.random()*Math.PI*2,range=0.10+Math.random()*0.28;
      const px=Math.max(0.01,Math.min(0.99,hub.x+Math.cos(angle)*range));
      const py=Math.max(0.01,Math.min(0.99,hub.y+Math.sin(angle)*range*(W/H)));
      const lead=new Node(px,py,'lead');nodes.push(lead);
      setTimeout(()=>{ if(!lead.alive)return;addEdge(hub,lead);addPulse(hub.x*W,hub.y*H,hub.col,55);addPulse(lead.x*W,lead.y*H,C.lead,30);stats.emails++; },500+Math.random()*400);
      setTimeout(()=>{ if(!lead.alive)return;nodes.filter(n=>n!==lead&&n.type!=='hub'&&n.edges.length>0&&dist(n,lead)<170).sort((a,b)=>dist(a,lead)-dist(b,lead)).slice(0,2).forEach(n=>addEdge(lead,n)); },1600);
      if(Math.random()<0.38){
        setTimeout(()=>{
          if(!lead.alive)return;
          tags.push(new Tag(lead.x*W,lead.y*H-22,'Opened 👀',C.lead));addPulse(lead.x*W,lead.y*H,C.lead,38);
          setTimeout(()=>{
            if(!lead.alive)return;
            lead.type='hot';stats.hot++;
            tags.push(new Tag(lead.x*W,lead.y*H-26,'Hot lead 🔥',C.hot));addPulse(lead.x*W,lead.y*H,C.hot,55);
            profileCards.push(new ProfileCard(lead.x*W+20,lead.y*H-30));
            replyWave(lead);
            if(Math.random()<0.45){
              setTimeout(()=>{ if(!lead.alive)return;stats.meetings++;tags.push(new Tag(lead.x*W,lead.y*H-26,'Meeting booked!',C.hot));addPulse(lead.x*W,lead.y*H,C.hot,75); },2000+Math.random()*2500);
            }
          },1800+Math.random()*2000);
        },3500+Math.random()*5000);
      }
    }

    let hqBroadT=0,cityBroadT=0;
    function broadcastHQ(){ const hq=nodes[0];if(!hq)return;broadWaves.push(new BroadcastWave(hq.x*W,hq.y*H));[0,250,500].forEach(d=>setTimeout(()=>addPulse(hq.x*W,hq.y*H,C.hq,55+d/10),d));if(Math.random()<0.75)seqBadges.push(new SequenceBadge(hq)); }
    function broadcastCity(){ const ch=nodes.filter(n=>n.type==='hub'&&!n.isHQ);if(!ch.length)return;const hub=ch[Math.floor(Math.random()*ch.length)];[0,300].forEach(d=>setTimeout(()=>addPulse(hub.x*W,hub.y*H,C.hub,45),d));if(Math.random()<0.5)seqBadges.push(new SequenceBadge(hub)); }

    // ── Draw ──
    function drawNode(n){
      const x=n.x*W,y=n.y*H,[r,g,b]=n.col,op=n.opacity,glow=1+0.18*Math.sin(Date.now()*0.002+n.ph);
      if(n.isHQ){ const ring=ctx.createRadialGradient(x,y,n.r*4,x,y,n.r*14);ring.addColorStop(0,`rgba(${r},${g},${b},0.18)`);ring.addColorStop(1,`rgba(${r},${g},${b},0)`);ctx.beginPath();ctx.arc(x,y,n.r*14,0,Math.PI*2);ctx.fillStyle=ring;ctx.fill(); }
      const gr=ctx.createRadialGradient(x,y,0,x,y,n.r*7*glow);gr.addColorStop(0,`rgba(${r},${g},${b},${0.3*op})`);gr.addColorStop(0.4,`rgba(${r},${g},${b},${0.1*op})`);gr.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.beginPath();ctx.arc(x,y,n.r*7*glow,0,Math.PI*2);ctx.fillStyle=gr;ctx.fill();
      ctx.beginPath();ctx.arc(x,y,n.r*glow,0,Math.PI*2);ctx.fillStyle=`rgba(${r},${g},${b},${0.92*op})`;ctx.fill();
      ctx.beginPath();ctx.arc(x,y,n.r*0.35,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${0.78*op})`;ctx.fill();
      if(n.type==='hub'&&CITIES[n.cityIdx]){ ctx.save();ctx.font=n.isHQ?'700 11px Outfit,sans-serif':'600 10px Outfit,sans-serif';ctx.textAlign='center';ctx.fillStyle=n.isHQ?'rgba(80,255,160,0.88)':'rgba(0,255,140,0.68)';ctx.shadowColor=n.isHQ?'rgba(80,255,160,0.55)':'rgba(0,255,140,0.38)';ctx.shadowBlur=n.isHQ?10:6;ctx.fillText(CITIES[n.cityIdx],x,y+n.r+15);ctx.restore(); }
    }

    function drawEdge(e){
      const sx=e.src.x*W,sy=e.src.y*H,dx=e.dst.x*W,dy=e.dst.y*H;
      const [sr,sg,sb]=e.src.col,[dr,dg,db]=e.dst.col,op=Math.min(e.src.opacity,e.dst.opacity),isHQ=e.src.isHQ||e.dst.isHQ;
      const ex=sx+(dx-sx)*e.prog,ey=sy+(dy-sy)*e.prog;
      const lg=ctx.createLinearGradient(sx,sy,ex,ey);lg.addColorStop(0,`rgba(${sr},${sg},${sb},${(isHQ?0.7:0.5)*op})`);lg.addColorStop(1,`rgba(${dr},${dg},${db},${(isHQ?0.5:0.3)*op})`);
      ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex,ey);ctx.strokeStyle=lg;ctx.lineWidth=isHQ?1.2:0.85;ctx.stroke();
      e.particles.forEach(p=>{
        const px=sx+(dx-sx)*p.t,py=sy+(dy-sy)*p.t;
        p.trail.forEach((pt,i)=>{ ctx.beginPath();ctx.arc(pt[0],pt[1],0.9,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${(i/p.trail.length)*0.45*op})`;ctx.fill(); });
        ctx.beginPath();ctx.arc(px,py,isHQ?2.5:2,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${0.9*op})`;ctx.fill();
        const pg=ctx.createRadialGradient(px,py,0,px,py,8);pg.addColorStop(0,`rgba(255,255,255,${0.25*op})`);pg.addColorStop(1,'rgba(255,255,255,0)');ctx.beginPath();ctx.arc(px,py,8,0,Math.PI*2);ctx.fillStyle=pg;ctx.fill();
      });
      e.replyPs.forEach(p=>{
        const [hr,hg,hb]=C.hot,px=sx+(dx-sx)*p.t,py=sy+(dy-sy)*p.t;
        p.trail.forEach((pt,i)=>{ ctx.beginPath();ctx.arc(pt[0],pt[1],1.1,0,Math.PI*2);ctx.fillStyle=`rgba(${hr},${hg},${hb},${(i/p.trail.length)*0.55*op})`;ctx.fill(); });
        ctx.beginPath();ctx.arc(px,py,2.5,0,Math.PI*2);ctx.fillStyle=`rgba(${hr},${hg},${hb},${0.95*op})`;ctx.fill();
        const pg=ctx.createRadialGradient(px,py,0,px,py,9);pg.addColorStop(0,`rgba(${hr},${hg},${hb},0.28)`);pg.addColorStop(1,'rgba(255,185,40,0)');ctx.beginPath();ctx.arc(px,py,9,0,Math.PI*2);ctx.fillStyle=pg;ctx.fill();
      });
    }

    function drawPulse(p){
      const [r,g,b]=p.col;
      const gr=ctx.createRadialGradient(p.x,p.y,p.r*0.6,p.x,p.y,p.r);gr.addColorStop(0,`rgba(${r},${g},${b},0)`);gr.addColorStop(0.6,`rgba(${r},${g},${b},${p.a*0.35})`);gr.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=gr;ctx.fill();
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.strokeStyle=`rgba(${r},${g},${b},${p.a*0.55})`;ctx.lineWidth=1;ctx.stroke();
    }

    function drawTag(t){ const [r,g,b]=t.col;ctx.font='600 11px Outfit,sans-serif';ctx.textAlign='center';ctx.fillStyle=`rgba(${r},${g},${b},${t.a})`;ctx.shadowColor=`rgba(${r},${g},${b},${t.a*0.7})`;ctx.shadowBlur=8;ctx.fillText(t.text,t.x,t.y);ctx.shadowBlur=0; }

    function drawStats(){
      const items=[{label:'Emails Sent',val:stats.emails.toLocaleString()},{label:'Hot Leads',val:stats.hot.toString()},{label:'Meetings',val:stats.meetings.toString()}];
      const pw=252,ph=52,px=W-pw-16,py=16;
      ctx.save();ctx.fillStyle='rgba(5,10,18,0.72)';ctx.beginPath();ctx.roundRect(px,py,pw,ph,10);ctx.fill();ctx.strokeStyle='rgba(0,255,128,0.14)';ctx.lineWidth=0.8;ctx.stroke();
      const cw=pw/3;
      items.forEach((item,i)=>{
        const cx=px+cw*i+cw/2;
        ctx.font='700 14px Outfit,sans-serif';ctx.textAlign='center';ctx.fillStyle='rgba(80,255,160,0.95)';ctx.shadowColor='rgba(0,255,140,0.45)';ctx.shadowBlur=7;ctx.fillText(item.val,cx,py+27);ctx.shadowBlur=0;
        ctx.font='600 8px Outfit,sans-serif';ctx.fillStyle='rgba(255,255,255,0.32)';ctx.fillText(item.label,cx,py+41);
        if(i<2){ ctx.strokeStyle='rgba(255,255,255,0.07)';ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(px+cw*(i+1),py+10);ctx.lineTo(px+cw*(i+1),py+42);ctx.stroke(); }
      });
      ctx.restore();
    }

    // ── Init hubs ──
    HUB_POS.forEach(([px,py],i)=>nodes.push(new Node(px,py,'hub',i)));
    setTimeout(()=>{ const hq=nodes[0];nodes.filter(n=>n.type==='hub'&&!n.isHQ).forEach((hub,i)=>setTimeout(()=>addEdge(hq,hub),i*400)); },1000);

    // ── Main loop ──
    let spawnT=0,iconT=0,emailT=0,last=0;
    function loop(now){
      const dt=Math.min(now-last,50);last=now;
      ctx.clearRect(0,0,W,H);
      drawMap();
      spawnT+=dt;hqBroadT+=dt;cityBroadT+=dt;iconT+=dt;emailT+=dt;
      if(spawnT>1700){ spawnT=0;spawnLead(); }
      if(hqBroadT>2800){ hqBroadT=0;broadcastHQ(); }
      if(cityBroadT>5500){ cityBroadT=0;broadcastCity(); }
      if(iconT>1500){ iconT=0;chIcons.push(new ChannelIcon()); }
      if(emailT>9000){ emailT=0;const hq=nodes[0];if(hq)emailComposers.push(new EmailComposer(hq)); }
      for(let i=nodes.length-1;i>=0;i--){ nodes[i].age+=dt;if(!nodes[i].alive){ for(let j=edges.length-1;j>=0;j--)if(edges[j].src===nodes[i]||edges[j].dst===nodes[i])edges.splice(j,1);nodes.splice(i,1); } }
      edges.forEach(e=>{
        if(!e.done){ e.prog=Math.min(1,e.prog+dt*0.00085);if(e.prog>=1)e.done=true; }
        if(e.done){ e.ptimer+=dt;const iv=(e.src.isHQ||e.dst.isHQ)?1500:e.src.type==='hub'?2000:3200;if(e.ptimer>iv){ e.ptimer=0;e.particles.push({t:0,speed:0.00038+Math.random()*0.00028,trail:[]}); } }
        for(let i=e.particles.length-1;i>=0;i--){ const p=e.particles[i];const px=e.src.x*W+(e.dst.x*W-e.src.x*W)*p.t,py=e.src.y*H+(e.dst.y*H-e.src.y*H)*p.t;p.trail.push([px,py]);if(p.trail.length>14)p.trail.shift();p.t+=p.speed*dt;if(p.t>=1)e.particles.splice(i,1); }
        for(let i=e.replyPs.length-1;i>=0;i--){ const p=e.replyPs[i];const px=e.src.x*W+(e.dst.x*W-e.src.x*W)*p.t,py=e.src.y*H+(e.dst.y*H-e.src.y*H)*p.t;p.trail.push([px,py]);if(p.trail.length>12)p.trail.shift();p.t-=p.speed*dt;if(p.t<=0)e.replyPs.splice(i,1); }
      });
      for(let i=pulses.length-1;i>=0;i--){ pulses[i].r+=dt*0.05;pulses[i].a-=dt*0.00085;if(pulses[i].done)pulses.splice(i,1); }
      for(let i=tags.length-1;i>=0;i--){ tags[i].y+=tags[i].vy*(dt*0.1);tags[i].a-=dt*0.00038;if(tags[i].done)tags.splice(i,1); }
      for(let i=chIcons.length-1;i>=0;i--){ chIcons[i].update(dt);if(chIcons[i].done)chIcons.splice(i,1); }
      for(let i=seqBadges.length-1;i>=0;i--){ seqBadges[i].update(dt);if(seqBadges[i].done)seqBadges.splice(i,1); }
      for(let i=profileCards.length-1;i>=0;i--){ profileCards[i].update(dt);if(profileCards[i].done)profileCards.splice(i,1); }
      for(let i=broadWaves.length-1;i>=0;i--){ broadWaves[i].update(dt);if(broadWaves[i].done)broadWaves.splice(i,1); }
      for(let i=emailComposers.length-1;i>=0;i--){ emailComposers[i].update(dt);if(emailComposers[i].done)emailComposers.splice(i,1); }
      broadWaves.forEach(w=>w.draw());edges.forEach(drawEdge);pulses.forEach(drawPulse);nodes.forEach(drawNode);tags.forEach(drawTag);chIcons.forEach(c=>c.draw());seqBadges.forEach(b=>b.draw());profileCards.forEach(c=>c.draw());emailComposers.forEach(e=>e.draw());drawStats();
      raf=requestAnimationFrame(loop);
    }

    for(let i=0;i<16;i++) setTimeout(spawnLead,i*280);
    broadcastHQ();
    raf=requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize',resize); };
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('kboos_token', data.token);
      localStorage.setItem('kboos_user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword(e) {
    e.preventDefault();
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${BASE}/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set password');
      localStorage.setItem('kboos_token', data.token);
      localStorage.setItem('kboos_user', JSON.stringify(data.user));
      window.history.replaceState({}, '', '/');
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="lp-body">
        <canvas id="lp-canvas" ref={canvasRef} style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0}} />
        <div className="lp-hex" />
        <div className="lp-vignette" />

        <div className="lp-card-border" style={{padding:24}}>
          <div className="lp-card">
            <div className="lp-logo">
              <span className="lp-icon-wrap">
                <svg className="lp-icon" width="44" height="32" viewBox="0 0 28 20" fill="none">
                  <path d="M2 10L8 3L14 10L8 17L2 10Z" fill="oklch(75% 0.24 145 / 0.95)"/>
                  <path d="M9 10L15 3L21 10L15 17L9 10Z" fill="oklch(65% 0.2 210 / 0.8)"/>
                  <path d="M16 10L22 3L28 10L22 17L16 10Z" fill="oklch(60% 0.2 260 / 0.55)"/>
                </svg>
              </span>
              <div className="lp-kboos">KBOOS</div>
              <div className="lp-outreach">Outreach OS</div>
              <div className="lp-line" />
              <div className="lp-sub">by KOBIS Berhad</div>
            </div>

            {mode === 'set-password' ? (
              <>
                <div className="lp-h2">Set Your Password</div>
                <div className="lp-subtitle">
                  {inviteUser ? `Welcome, ${inviteUser.name}! Create a password for ${inviteUser.email}` : 'Create a password to activate your account'}
                </div>
                <form onSubmit={handleSetPassword}>
                  <label className="lp-label">New Password</label>
                  <div className="lp-input-wrap">
                    <input className="lp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required />
                  </div>
                  <label className="lp-label">Confirm Password</label>
                  <div className="lp-input-wrap">
                    <input className="lp-input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required />
                  </div>
                  {error && <div className="lp-error">{error}</div>}
                  <button className="lp-btn" type="submit" disabled={loading}>
                    {loading ? 'Activating...' : 'Set Password & Sign In'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="lp-h2">Sign In</div>
                <div className="lp-subtitle">Enter your team credentials to continue</div>
                <form onSubmit={handleLogin}>
                  <label className="lp-label">Email</label>
                  <div className="lp-input-wrap">
                    <input className="lp-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
                  </div>
                  <label className="lp-label">Password</label>
                  <div className="lp-input-wrap">
                    <input className="lp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  {error && <div className="lp-error">{error}</div>}
                  <button className="lp-btn" type="submit" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
