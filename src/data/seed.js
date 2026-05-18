export const SEED_DATA = {
  businesses: [
    { id:'GS', name:'Gadong Squad', industry:'Landscaping', color:'green', campaigns:2, leads:1044, hot:20, spend:'RM117', brief:'approved' },
    { id:'KV', name:'KOBIS Video', industry:'Media', color:'blue', campaigns:1, leads:156, hot:9, spend:'RM34', brief:'approved' },
    { id:'TS', name:'TechServ Kuching', industry:'IT', color:'purple', campaigns:1, leads:89, hot:3, spend:'RM21', brief:'pending' },
    { id:'AC', name:'Adura Clinic', industry:'Healthcare', color:'amber', campaigns:0, leads:0, hot:0, spend:'RM0', brief:'none', status:'setup' },
    { id:'GB', name:'GreenBuild Sarawak', industry:'Construction', color:'green', campaigns:2, leads:482, hot:7, spend:'RM67', brief:'approved' },
    { id:'SE', name:'Sarawak Edu Hub', industry:'Education', color:'cyan', campaigns:1, leads:201, hot:5, spend:'RM44', brief:'approved' },
  ],
  campaigns: [
    { id:1, biz:'GS', bizName:'Gadong Squad', name:'Kuching Q2', status:'active', color:'green', leads:743, total:2400, hot:14, spend:'RM46', open:'38.2%', wa:'54%', tier:'Growth' },
    { id:2, biz:'GS', bizName:'Gadong Squad', name:'Kota Samarahan', status:'active', color:'green', leads:301, total:1200, hot:6, spend:'RM28', open:'31.4%', wa:'48%', tier:'Starter' },
    { id:3, biz:'KV', bizName:'KOBIS Video', name:'Sarawak GLCs', status:'active', color:'blue', leads:156, total:1200, hot:9, spend:'RM34', open:'41.7%', wa:'28%', tier:'Starter' },
    { id:4, biz:'TS', bizName:'TechServ Kuching', name:'SME Kuching', status:'active', color:'purple', leads:89, total:600, hot:3, spend:'RM21', open:'29.3%', wa:'31%', tier:'Starter' },
    { id:5, biz:'GB', bizName:'GreenBuild Sarawak', name:'Developers KCH', status:'awaiting_approval', color:'green', leads:50, total:800, hot:0, spend:'RM8', open:'0%', wa:'-', tier:'Growth' },
    { id:6, biz:'GB', bizName:'GreenBuild Sarawak', name:'Contractors', status:'active', color:'green', leads:362, total:1000, hot:7, spend:'RM59', open:'35.1%', wa:'52%', tier:'Growth' },
    { id:7, biz:'SE', bizName:'Sarawak Edu Hub', name:'Universities', status:'active', color:'cyan', leads:201, total:900, hot:5, spend:'RM44', open:'33.5%', wa:'46%', tier:'Starter' },
    { id:8, biz:'AC', bizName:'Adura Clinic', name:'Doctors KCH', status:'paused', color:'amber', leads:120, total:500, hot:2, spend:'RM18', open:'28.8%', wa:'-', tier:'Starter' },
  ],
  leads: [
    { id:1, name:'Ahmad Razali', company:'Naim Holdings', title:'Property Mgr', score:9, status:'hot', lang:'EN', channels:['email','wa','call'], last:'2h', scoreLabel:'High' },
    { id:2, name:'Sarah Lim', company:'Maybank KCH', title:'Facilities Mgr', score:8, status:'hot', lang:'EN', channels:['email','wa'], last:'3h', scoreLabel:'High' },
    { id:3, name:'Tan Wei Ming', company:'HSL', title:'Estate Mgr', score:8, status:'meeting_booked', lang:'EN', channels:['email','wa','call'], last:'5h', scoreLabel:'High' },
    { id:4, name:'Nurul Aina', company:'SEDC', title:'Admin Officer', score:7, status:'wa_sent', lang:'BM', channels:['email','wa_pending'], last:'6h', scoreLabel:'Medium' },
    { id:5, name:'James Ong', company:'Sarawak Plaza', title:'Bldg Mgr', score:7, status:'email_sent', lang:'EN', channels:['email_opened'], last:'8h', scoreLabel:'Medium' },
    { id:6, name:'Fatimah Said', company:'DBKU', title:'Facilities Off', score:6, status:'email_sent', lang:'BM', channels:['email_sent'], last:'10h', scoreLabel:'Medium' },
    { id:7, name:'Lee Chong Wei', company:'Grand Margherita', title:'GM', score:6, status:'personalizing', lang:'EN', channels:[], last:'12h', scoreLabel:'Medium' },
    { id:8, name:'Razi Hamid', company:'Pullman', title:'Ops Mgr', score:5, status:'bounced', lang:'EN', channels:['bounce'], last:'1d', scoreLabel:'Medium' },
    { id:9, name:'Zainab Ismail', company:'SEB', title:'Procurement', score:5, status:'unsubscribed', lang:'BM', channels:[], last:'1d', scoreLabel:'Medium' },
    { id:10, name:'David Wong', company:'IJM Corp', title:'Prop Mgr', score:9, status:'call_initiated', lang:'EN', channels:['email','wa','call_active'], last:'2d', scoreLabel:'High' },
    { id:11, name:'Mohd Salleh', company:'MBKS', title:'Facilities Head', score:8, status:'replied', lang:'BM', channels:['email','wa'], last:'2d', scoreLabel:'High' },
    { id:12, name:'Chua Mei Ling', company:'Riverside Majestic', title:'GM', score:4, status:'low_quality', lang:'EN', channels:[], last:'3d', scoreLabel:'Low' },
  ],
  replies: [
    { id:1, name:'Sarah Lim', company:'Maybank', channel:'WA', msg:'Sounds interesting, can you send pricing info?', time:'8min', status:'unread' },
    { id:2, name:'Ahmad Zul', company:'SEDC', channel:'Email', msg:'Please remove me, tidak berminat', time:'22min', status:'unread', unsub:true },
    { id:3, name:'Tan Wei', company:'HSL', channel:'WA', msg:'Yes interested! When can you do site visit?', time:'45min', status:'unread', hot:true },
    { id:4, name:'David Wong', company:'IJM', channel:'WA', msg:'Can you do industrial areas in Demak?', time:'1h', status:'unread' },
    { id:5, name:'Nurul Aina', company:'SEB', channel:'WA', msg:'Apa pakej bulanan? Boleh quotation?', time:'2h', status:'read' },
    { id:6, name:'James Ong', company:'Sarawak Plaza', channel:'Email', msg:'Send company profile and certifications', time:'3h', status:'handled' },
    { id:7, name:'Mohd Salleh', company:'MBKS', channel:'Email', msg:'Forwarding to our procurement unit', time:'8h', status:'handled' },
  ],
  activity: [
    { color:'green', time:'2:41PM', msg:'14 leads personalized', tag:'Gadong Squad Q2' },
    { color:'blue', time:'2:38PM', msg:'Email sent: Sarah Lim, Maybank', tag:'KOBIS Video' },
    { color:'amber', time:'2:34PM', msg:'HOT: Sarah Lim replied on WhatsApp', tag:'KOBIS Video' },
    { color:'amber', time:'2:31PM', msg:'Approval needed: GreenBuild Developers', tag:'System' },
    { color:'green', time:'2:28PM', msg:'Voice call connected: Tan Wei Ming', tag:'Gadong Squad' },
    { color:'blue', time:'2:15PM', msg:'47 leads scraped from Apollo', tag:'KOBIS Video' },
    { color:'green', time:'2:02PM', msg:'23 WhatsApp sent', tag:'Gadong Squad Q2' },
    { color:'red', time:'1:58PM', msg:'Unsubscribe detected: Ahmad Zulkifli', tag:'KOBIS Video' },
    { color:'green', time:'1:45PM', msg:'Milestone: 500 emails sent', tag:'GreenBuild' },
    { color:'amber', time:'1:32PM', msg:'WATI rate limit 78%', tag:'System' },
  ],
};

export const SEED_WALLET = {
  balance: 500,
  allocations: { apollo: 40, sendgrid: 20, wati: 25, retell: 15 },
  history: [
    { date:'2026-05-01', type:'topup', amount:500, note:'Initial top-up' },
    { date:'2026-05-10', type:'usage', amount:-167, note:'May campaigns' },
  ],
};

export const SEED_SETTINGS = {
  apiKeys: { apollo:'', sendgrid:'', wati:'', retell:'', claude:'', openai:'' },
  team: [
    { id:1, name:'Ahmad Razali', email:'ahmad@kobis.my', role:'Admin', campaigns:8 },
    { id:2, name:'Siti Norzahra', email:'siti@kobis.my', role:'Operator', campaigns:5 },
    { id:3, name:'Lim Wei', email:'lim@kobis.my', role:'Operator', campaigns:3 },
  ],
  waTemplates: [
    { id:1, name:'Initial Outreach', body:'Hi {{name}}, saya dari Gadong Squad — kami bantu {{company}} dalam penyelenggaraan kawasan landskap. Boleh saya hantar info lebih lanjut? 🌿', status:'approved' },
    { id:2, name:'Follow-up Day 2', body:'Hi {{name}}, just following up on my earlier message about landscape maintenance for {{company}}. Would you be open for a quick call?', status:'approved' },
    { id:3, name:'Site Visit Confirm', body:'Great! I can arrange a site visit at {{company}} this week. What time works best for you?', status:'approved' },
    { id:4, name:'Pricing Request', body:'Hi {{name}}, here is our service package for {{company}}: Starter RM 297/mo, Growth RM 597/mo. Which suits your needs?', status:'pending' },
    { id:5, name:'GLC Outreach BM', body:'Selamat sejahtera {{name}}, kami dari Gadong Squad ingin menawarkan perkhidmatan penyelenggaraan kawasan untuk {{company}}.', status:'approved' },
    { id:6, name:'Re-engagement', body:'Hi {{name}}, it has been a while! We have new packages for {{company}}. Would you like an updated proposal?', status:'pending' },
  ],
  domains: [{ domain:'gadong.my', verified:true }],
  billing: {
    tiers: { GS:'Growth', KV:'Starter', TS:'Starter', AC:'Starter', GB:'Growth', SE:'Starter' },
    schedule:'weekly',
  },
  driveConnected: false,
};
