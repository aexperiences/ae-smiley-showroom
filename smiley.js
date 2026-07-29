/* =============================================================================
   Smiley OS — the operating system for an independent dental practice.
   Accelerated Experiences LLC · Post Falls, Idaho.

   WHY THIS IS NOT A CLONE OF THE OTHER VERTICALS
   A listing, a job, a booking — those carry ONE price. A dental visit carries three
   that move independently: what the office PRODUCED, what the plan ALLOWS after the
   PPO write-off, and what the PATIENT owes. Flattening them is the single most
   common way a practice believes it had a great month and cannot make payroll.
   Everything below keeps them apart on purpose.
   ============================================================================= */
(function (global) {
  "use strict";

  var KEY = "smiley_os_v1";
  var STORE = (function(){ try{ localStorage.setItem('_t','1'); localStorage.removeItem('_t'); return localStorage; }catch(e){ return sessionStorage; } })();

  /* DATES. new Date("2026-07-27") is UTC midnight, which reads as the 26th anywhere
     behind UTC. A dental schedule off by one day is worse than no schedule. Local
     noon, and format from local parts — never toISOString(). */
  var TODAY = new Date("2026-07-27T12:00:00");
  function now(){ return Date.now(); }
  function iso(d){ var m=d.getMonth()+1, day=d.getDate();
    return d.getFullYear()+"-"+(m<10?"0":"")+m+"-"+(day<10?"0":"")+day; }
  function addDays(d,n){ var x=new Date(d.getTime()); x.setDate(x.getDate()+n); return x; }
  function addMonths(d,n){ var x=new Date(d.getTime()); x.setMonth(x.getMonth()+n); return x; }
  function dISO(s){ return new Date(String(s)+"T12:00:00"); }
  function read(){ try{ var d=JSON.parse(STORE.getItem(KEY)); return d||null; }catch(e){ return null; } }
  function write(d){ d._t=now(); try{ STORE.setItem(KEY, JSON.stringify(d)); }catch(e){} }
  function clone(a){ return JSON.parse(JSON.stringify(a)); }
  var WEEK_START=(function(){ var d=new Date(TODAY.getTime()); d.setDate(d.getDate()-d.getDay()); return d; })();

  /* ---------------------------------------------------------------- CANON --
     Real CDT codes with fees in the range an independent general practice in the
     Inland Northwest actually charges. "ada" is the plain-English name a patient
     would understand, because the code alone explains nothing to anybody. */
  var CDT = [
    {c:"D0120", n:"Periodic exam",              fee:65,   cat:"Diagnostic", freq:"2/yr"},
    {c:"D0150", n:"Comprehensive exam",         fee:110,  cat:"Diagnostic", freq:"new patient / 3yr"},
    {c:"D0140", n:"Limited exam — problem",     fee:95,   cat:"Diagnostic", freq:null},
    {c:"D0210", n:"Full mouth x-rays",          fee:155,  cat:"Diagnostic", freq:"1/5yr"},
    {c:"D0220", n:"Single x-ray",               fee:35,   cat:"Diagnostic", freq:null},
    {c:"D0274", n:"Bitewings — four films",     fee:75,   cat:"Diagnostic", freq:"1/yr"},
    {c:"D0330", n:"Panoramic x-ray",            fee:135,  cat:"Diagnostic", freq:"1/5yr"},
    {c:"D1110", n:"Cleaning — adult",           fee:110,  cat:"Preventive", freq:"2/yr"},
    {c:"D1120", n:"Cleaning — child",           fee:85,   cat:"Preventive", freq:"2/yr"},
    {c:"D1206", n:"Fluoride varnish",           fee:45,   cat:"Preventive", freq:"2/yr", ageMax:19},
    {c:"D1351", n:"Sealant — per tooth",        fee:60,   cat:"Preventive", freq:"1/3yr per tooth", ageMax:16},
    {c:"D4341", n:"Deep cleaning — quad (4+)",  fee:310,  cat:"Periodontal", freq:"1/2yr per quad"},
    {c:"D4342", n:"Deep cleaning — quad (1-3)", fee:210,  cat:"Periodontal", freq:"1/2yr per quad"},
    {c:"D4910", n:"Perio maintenance",          fee:145,  cat:"Periodontal", freq:"4/yr"},
    {c:"D2140", n:"Silver filling — 1 surface", fee:165,  cat:"Restorative", freq:null},
    {c:"D2150", n:"Silver filling — 2 surface", fee:205,  cat:"Restorative", freq:null},
    {c:"D2330", n:"White filling — front",      fee:175,  cat:"Restorative", freq:null},
    {c:"D2391", n:"White filling — back, 1 srf",fee:195,  cat:"Restorative", freq:null, downgradeTo:"D2140"},
    {c:"D2392", n:"White filling — back, 2 srf",fee:245,  cat:"Restorative", freq:null, downgradeTo:"D2150"},
    {c:"D2740", n:"Crown — all ceramic",        fee:1450, cat:"Major", freq:"1/5yr per tooth", downgradeTo:"D2750"},
    {c:"D2750", n:"Crown — porcelain to metal", fee:1350, cat:"Major", freq:"1/5yr per tooth"},
    {c:"D2950", n:"Core build-up",              fee:290,  cat:"Major", freq:null},
    {c:"D3310", n:"Root canal — front tooth",   fee:950,  cat:"Major", freq:null},
    {c:"D3330", n:"Root canal — molar",         fee:1395, cat:"Major", freq:null},
    {c:"D7140", n:"Extraction — simple",        fee:215,  cat:"Oral surgery", freq:null},
    {c:"D7210", n:"Extraction — surgical",      fee:340,  cat:"Oral surgery", freq:null},
    {c:"D9110", n:"Emergency — pain relief",    fee:145,  cat:"Adjunctive", freq:null}
  ];
  function code(c){ return CDT.filter(function(x){return x.c===c;})[0]||null; }
  function feeFor(c){ var k=code(c); return k?k.fee:0; }
  function codeName(c){ var k=code(c); return k?k.n:c; }
  function codeCat(c){ var k=code(c); return k?k.cat:"Other"; }

  /* Plans. coins = what the PLAN pays by category. This is where a practice gets
     surprised: a "100/80/50" plan pays 50% of a crown, against an annual maximum
     that a single crown very nearly exhausts. */
  var PLANS = [
    {id:"dds",  carrier:"Delta Dental of Idaho", plan:"PPO Premier", annualMax:1500, deductible:50,
     coins:{Diagnostic:1.0,Preventive:1.0,Restorative:.8,Periodontal:.8,Major:.5,"Oral surgery":.8,Adjunctive:.8},
     ppoCut:.22, downgrades:true, waitMajor:0, note:"Largest carrier in the county. Downgrades posterior composite."},
    {id:"reg",  carrier:"Regence BlueShield", plan:"Dental Choice", annualMax:1000, deductible:50,
     coins:{Diagnostic:1.0,Preventive:1.0,Restorative:.8,Periodontal:.5,Major:.5,"Oral surgery":.5,Adjunctive:.5},
     ppoCut:.19, downgrades:true, waitMajor:12, note:"12-month wait on major work for new enrollees."},
    {id:"cig",  carrier:"Cigna", plan:"DPPO Advantage", annualMax:1500, deductible:0,
     coins:{Diagnostic:1.0,Preventive:1.0,Restorative:.8,Periodontal:.8,Major:.5,"Oral surgery":.8,Adjunctive:.8},
     ppoCut:.25, downgrades:false, waitMajor:0, note:"Deepest write-off of the plans we take."},
    {id:"mcd",  carrier:"Idaho Medicaid", plan:"Smiles", annualMax:null, deductible:0,
     coins:{Diagnostic:1.0,Preventive:1.0,Restorative:1.0,Periodontal:.0,Major:.0,"Oral surgery":1.0,Adjunctive:1.0},
     ppoCut:.46, downgrades:true, waitMajor:0, note:"Children only. No adult perio or major benefit."},
    {id:"self", carrier:"No insurance", plan:"Self-pay", annualMax:null, deductible:0,
     coins:null, ppoCut:0, downgrades:false, waitMajor:0, note:"Full fee less the in-house membership discount where it applies."}
  ];
  function planById(id){ return PLANS.filter(function(p){return p.id===id;})[0]||PLANS[4]; }

  var OPERATORIES = ["Op 1","Op 2","Op 3 — hygiene","Op 4 — hygiene"];
  var VISIT_TYPES  = ["Recall — cleaning & exam","New patient exam","Restorative","Crown seat","Crown prep",
                      "Root canal","Extraction","Perio maintenance","Deep cleaning","Emergency","Denture adjust"];

  /* SCOPE — the hard legal line the software has to enforce. A hygienist cannot
     diagnose, cut, or place a restoration; a doctor exam has to accompany the
     recall visit. This is not a preference, and it is not a warning. */
  var DOCTOR_ONLY = ["Restorative","Major","Oral surgery"];
  function needsDoctor(cd){ return DOCTOR_ONLY.indexOf(codeCat(cd))>=0; }

  var COMPLIANCE = [
    {k:"spore",   label:"Autoclave spore test",       cadence:"Weekly",     penalty:"State board inspection finding; sterilisation log is the first thing pulled."},
    {k:"osha",    label:"OSHA bloodborne pathogens",  cadence:"Annual",     penalty:"OSHA citation and fine — this one carries real money."},
    {k:"hipaa",   label:"HIPAA training + risk assessment", cadence:"Annual", penalty:"OCR penalty; the risk assessment is what they ask for first."},
    {k:"xray",    label:"Radiography equipment inspection", cadence:"Every 2 years", penalty:"State radiation control; machine can be red-tagged."},
    {k:"amalgam", label:"Amalgam separator inspection", cadence:"Annual",   penalty:"EPA dental effluent rule — recordkeeping is the violation, not the discharge."},
    {k:"emerg",   label:"Emergency drug kit expiry check", cadence:"Monthly", penalty:"Board finding; an expired kit in a real emergency is the actual risk."}
  ];

  var LICENCES = [
    {k:"dds", label:"DDS licence",            ceHours:30, ceYears:2},
    {k:"rdh", label:"RDH licence",            ceHours:24, ceYears:2},
    {k:"da",  label:"Dental assistant — x-ray cert", ceHours:8, ceYears:2},
    {k:"cpr", label:"CPR / BLS",              ceHours:0,  ceYears:2}
  ];

  /* Benchmarks. SOURCED, and labelled with the source on screen — never invented.
     A practice will compare itself to these, so a made-up number here becomes a
     made-up business decision downstream. */
  var BENCH = {
    collection:      {v:98,  unit:"%",  label:"Collection rate — high performer", src:"Dentx 2026 dental KPI benchmarks"},
    collectionAvg:   {v:95,  unit:"%",  label:"Collection rate — industry average", src:"Dentx 2026 dental KPI benchmarks"},
    caseAcceptance:  {v:50,  unit:"%",  label:"Case acceptance — national average 40–60%", src:"Dentx case-acceptance benchmarks"},
    hygieneShare:    {v:31,  unit:"%",  label:"Hygiene as share of production (30–33%)", src:"Dentx 2026 dental KPI benchmarks"},
    reappoint:       {v:85,  unit:"%",  label:"Reappointment rate benchmark", src:"Dentx 2026 dental KPI benchmarks"},
    soloProduction:  {v:0,   unit:"",   label:"Solo GP monthly production $65k–$90k", src:"gotu.com 2026 production benchmarks"}
  };

  var REPLACES = ["The recall list living in one person's head","Insurance verification by phone, one patient at a time",
    "A whiteboard of unscheduled treatment","Paper sterilisation logs in a binder",
    "Chasing the patient portion after the EOB arrives","Spreadsheet for provider production"];

  /* ----------------------------------------------------------------- SEED --
     A realistic book for a two-doctor, two-hygienist practice. It includes the
     UGLY rows on purpose: an expired x-ray certificate, an overdue spore test,
     a denied claim, unscheduled treatment sitting in the drawer, and a patient
     who has already used their annual maximum. A screen that opens with nothing
     wrong is a slideshow, not an operating system. */
  function onDate(days){ return iso(addDays(TODAY,days)); }
  function monthsOut(m){ return iso(addMonths(TODAY,m)); }

  var SEED = {};
  SEED.practice = { name:"Cedar Ridge Dental", city:"Post Falls, Idaho", ops:4,
                    established:2011, chairs:"2 doctor · 2 hygiene" };

  SEED.team = [
    {id:"t1", name:"Dr. Marcus Okonjo",  role:"Dentist — owner",  kind:"dds", days:"Mon–Thu",
     lic:{dds:monthsOut(14), cpr:monthsOut(9)},  ce:{dds:22}, colour:"#0e7c93"},
    {id:"t2", name:"Dr. Priya Raman",    role:"Dentist — associate", kind:"dds", days:"Tue–Fri",
     lic:{dds:monthsOut(20), cpr:monthsOut(4)},  ce:{dds:12}, colour:"#7a5aa8"},
    {id:"t3", name:"Tessa Lindgren, RDH",role:"Hygienist",        kind:"rdh", days:"Mon–Thu",
     lic:{rdh:monthsOut(11), cpr:monthsOut(15)}, ce:{rdh:19}, colour:"#1f7a5a"},
    {id:"t4", name:"Dana Whitfield, RDH",role:"Hygienist",        kind:"rdh", days:"Tue–Fri",
     lic:{rdh:monthsOut(2),  cpr:monthsOut(7)},  ce:{rdh:6},  colour:"#2f8f8f"},
    {id:"t5", name:"Cory Alvarado",      role:"Dental assistant", kind:"da",  days:"Mon–Fri",
     lic:{da:monthsOut(-1),  cpr:monthsOut(11)}, ce:{da:8},  colour:"#c08a2c"},
    {id:"t6", name:"Bea Nguyen",         role:"Dental assistant", kind:"da",  days:"Mon–Thu",
     lic:{da:monthsOut(16),  cpr:monthsOut(-2)}, ce:{da:8},  colour:"#b8562e"},
    {id:"t7", name:"Roslyn Mbeki",       role:"Office manager",   kind:"admin", days:"Mon–Fri",
     lic:{}, ce:{}, colour:"#c0568f"},
    {id:"t8", name:"Jules Ferraro",      role:"Treatment coordinator", kind:"admin", days:"Mon–Thu",
     lic:{}, ce:{}, colour:"#4d7f8f"}
  ];

  /* Patients. lastRecall/nextRecall drive the recall engine; ytdUsed is what the
     plan has already paid this benefit year, which is what makes an annual
     maximum bite in the middle of a treatment plan. */
  SEED.patients = [
    {id:"p1",  name:"Harold Vance",      dob:"1949-03-12", plan:"dds",  ytdUsed:1180, lastRecall:onDate(-181), nextRecall:onDate(-1),   perio:true,  note:"Perio maintenance every 3 months. Warfarin — see medical."},
    {id:"p2",  name:"Nadia Brzezinski",  dob:"1986-11-02", plan:"cig",  ytdUsed:210,  lastRecall:onDate(-168), nextRecall:onDate(14),   perio:false, note:""},
    {id:"p3",  name:"Tomás Alcaraz",     dob:"2014-06-21", plan:"mcd",  ytdUsed:0,    lastRecall:onDate(-190), nextRecall:onDate(-8),   perio:false, note:"Sealants due on 2nd molars."},
    {id:"p4",  name:"Junie Halloran",    dob:"1972-01-30", plan:"reg",  ytdUsed:940,  lastRecall:onDate(-172), nextRecall:onDate(6),    perio:true,  note:""},
    {id:"p5",  name:"Everett Shaw",      dob:"1958-09-08", plan:"dds",  ytdUsed:1500, lastRecall:onDate(-175), nextRecall:onDate(3),    perio:false, note:"Annual maximum already exhausted."},
    {id:"p6",  name:"Marisol Reyes",     dob:"1994-04-17", plan:"self", ytdUsed:0,    lastRecall:onDate(-166), nextRecall:onDate(19),   perio:false, note:"In-house membership plan."},
    {id:"p7",  name:"Dell Okonkwo",      dob:"1965-12-05", plan:"cig",  ytdUsed:620,  lastRecall:onDate(-401), nextRecall:onDate(-36),  perio:false, note:"Fell out of recall — no contact since last winter."},
    {id:"p8",  name:"Ruth Ann Pike",     dob:"1941-07-23", plan:"dds",  ytdUsed:300,  lastRecall:onDate(-178), nextRecall:onDate(9),    perio:true,  note:"Partial denture, upper."},
    {id:"p9",  name:"Caleb Frye",        dob:"2009-02-14", plan:"reg",  ytdUsed:85,   lastRecall:onDate(-186), nextRecall:onDate(2),    perio:false, note:"Ortho referral pending."},
    {id:"p10", name:"Imani Sowande",     dob:"1990-08-30", plan:"dds",  ytdUsed:0,    lastRecall:onDate(-368), nextRecall:onDate(-22),  perio:false, note:"New baby — missed two recalls."},
    {id:"p11", name:"Franklin Deary",    dob:"1979-05-19", plan:"self", ytdUsed:0,    lastRecall:onDate(-160), nextRecall:onDate(24),   perio:false, note:""},
    {id:"p12", name:"Odette Lamb",       dob:"1953-10-11", plan:"reg",  ytdUsed:1000, lastRecall:onDate(-184), nextRecall:onDate(1),    perio:true,  note:"Maximum used. Wants to wait for January."},
    {id:"p13", name:"Silas Moreau",      dob:"2001-01-25", plan:"cig",  ytdUsed:150,  lastRecall:onDate(-171), nextRecall:onDate(11),   perio:false, note:""},
    {id:"p14", name:"Peggy Ustinov",     dob:"1968-06-03", plan:"dds",  ytdUsed:475,  lastRecall:onDate(-455), nextRecall:onDate(-90),  perio:false, note:"Anxious patient — long appointments only, morning."}
  ];

  /* The roster has to be wide enough that a two-week book does not force the same
     person into the chair twice. Fourteen named charts drive the stories on screen;
     these fill the rest of the schedule the way a real active-patient list does. */
  (function(){
    var first="Arlo Bettina Cyrus Delphine Emory Farrah Gideon Halcyon Ines Jarrah Kess Lorna Micah Nell Orson Petra Quill Rosalind Soren Thea Ulla Vesper Wren Xanthe Yusuf Zelda".split(" ");
    var last ="Ashcombe Barlow Carrow Denholm Eastcote Fairbourne Grimsby Haverly Ingleton Jessup Kettering Lowry Mardle Northcote Ospringe Pennington Quarrier Roswell Stannard Thorne Underhill Vance Wexford Yarrow Zell Ambrose".split(" ");
    var plans=["dds","cig","reg","dds","self","cig","dds","reg"];
    for(var i=0;i<26;i++){
      SEED.patients.push({
        id:"p"+(15+i), name:first[i]+" "+last[i],
        dob:(1948+((i*7)%56))+"-0"+(1+(i%9))+"-1"+(i%9),
        plan:plans[i%plans.length],
        ytdUsed:[0,0,120,340,0,610,85,900,0,240][i%10],
        lastRecall:onDate(-160-(i*3)), nextRecall:onDate(20+(i*4)),
        perio:(i%5===0), note:""
      });
    }
  })();

  /* Treatment plans that were PRESENTED. Whether they got scheduled is the whole
     question of case acceptance, and the money sitting in "presented, never
     scheduled" is the single largest recoverable number in most practices. */
  SEED.treatment = [
    {id:"tp1", pt:"p1",  presented:onDate(-24), codes:["D4910","D4910"],        status:"Scheduled",  tooth:"", by:"t1"},
    {id:"tp2", pt:"p4",  presented:onDate(-31), codes:["D2740","D2950"],        status:"Presented",  tooth:"#19", by:"t1", why:"Wants to wait until the new benefit year."},
    {id:"tp3", pt:"p5",  presented:onDate(-12), codes:["D3330","D2740"],        status:"Presented",  tooth:"#30", by:"t2", why:"Annual maximum exhausted — quoted at full patient cost."},
    {id:"tp4", pt:"p8",  presented:onDate(-45), codes:["D2392","D2391"],        status:"Accepted",   tooth:"#3, #14", by:"t1"},
    {id:"tp5", pt:"p2",  presented:onDate(-6),  presentedBy:"t8", codes:["D2392"], status:"Scheduled", tooth:"#31", by:"t2"},
    {id:"tp6", pt:"p12", presented:onDate(-58), codes:["D4341","D4341","D4341","D4341"], status:"Presented", tooth:"all quads", by:"t1", why:"Never called back after the estimate."},
    {id:"tp7", pt:"p14", presented:onDate(-77), codes:["D2740"],                status:"Presented",  tooth:"#12", by:"t1", why:"Anxiety — asked to think about it."},
    {id:"tp8", pt:"p11", presented:onDate(-9),  codes:["D7140"],                status:"Accepted",   tooth:"#17", by:"t2"},
    {id:"tp9", pt:"p13", presented:onDate(-3),  codes:["D2391"],                status:"Declined",   tooth:"#29", by:"t2", why:"No pain, wants to watch it."},
    {id:"tp10",pt:"p10", presented:onDate(-40), codes:["D1110","D0274","D0120"],status:"Presented",  tooth:"", by:"t3", why:"Overdue recall — never rescheduled."}
  ];

  /* ------------------------------------------------------- ORTHO MODULE --
     Ortho is NOT a bigger filling. A general visit produces a fee per procedure
     against an ANNUAL maximum. An ortho case is a CONTRACT — one signed value
     delivered over 18 to 30 months, against a LIFETIME maximum the plan pays in
     instalments. Booking the whole contract as production on the day it is signed
     is how a practice reads a record month and then cannot make payroll. So the
     contract sits in its own ledger and recognises monthly, in arrears. */
  var ORTHO_CDT = [
    {c:"D8660", n:"Pre-ortho visit",              fee:145,  cat:"Ortho"},
    {c:"D8080", n:"Full braces — adolescent",     fee:5800, cat:"Ortho", contract:true, months:24},
    {c:"D8090", n:"Full braces — adult",          fee:6400, cat:"Ortho", contract:true, months:26},
    {c:"D8040", n:"Clear aligners — limited",     fee:3900, cat:"Ortho", contract:true, months:12},
    {c:"D8670", n:"Adjustment visit",             fee:0,    cat:"Ortho", inContract:true},
    {c:"D8680", n:"Debond + retainers",           fee:0,    cat:"Ortho", inContract:true},
    {c:"D8703", n:"Replacement retainer — upper", fee:325,  cat:"Ortho"}
  ];
  ORTHO_CDT.forEach(function(k){ CDT.push(k); });

  /* Ortho benefits behave differently enough that they need their own record on
     the plan: a LIFETIME cap, usually paid as an initial amount then monthly. */
  var ORTHO_BENEFIT = {
    dds:  {lifetime:1500, initialPct:.25, monthly:62.50, ageLimit:19},
    reg:  {lifetime:1000, initialPct:.20, monthly:44.44, ageLimit:19},
    cig:  {lifetime:1500, initialPct:.25, monthly:62.50, ageLimit:0},   // no age cap on this adult plan
    mcd:  {lifetime:0,    initialPct:0,   monthly:0,     ageLimit:0},
    self: {lifetime:0,    initialPct:0,   monthly:0,     ageLimit:0}
  };
  function orthoBenefit(planId){ return ORTHO_BENEFIT[planId] || ORTHO_BENEFIT.self; }

  SEED.ortho = [
    {id:"o1", pt:"p9",  code:"D8080", started:onDate(-214), months:24, contract:5800, down:1200,
     paid:3050, planPaid:640, status:"Active", wire:"Upper 018 NiTi", nextVisit:onDate(4)},
    {id:"o2", pt:"p13", code:"D8090", started:onDate(-96),  months:26, contract:6400, down:1400,
     paid:2350, planPaid:400, status:"Active", wire:"Lower 016x022 SS", nextVisit:onDate(1)},
    {id:"o3", pt:"p3",  code:"D8040", started:onDate(-31),  months:12, contract:3900, down:900,
     paid:1150, planPaid:0,   status:"Active", wire:"Aligner tray 4 of 22", nextVisit:onDate(9)},
    {id:"o4", pt:"p6",  code:"D8040", started:onDate(-402), months:12, contract:3900, down:900,
     paid:3900, planPaid:0,   status:"Retention", wire:"Retainers delivered", nextVisit:onDate(126)},
    {id:"o5", pt:"p2",  code:"D8090", started:onDate(-560), months:26, contract:6100, down:1300,
     paid:3120, planPaid:1500,status:"Overdue", wire:"Debond overdue — 3 months past term", nextVisit:onDate(-18)}
  ];

  /* ------------------------------------------------------------ SCHEDULE --
     Generated from patterns rather than hand-listed, so the week is internally
     consistent: hygiene columns fill with recall, doctor columns with restorative,
     and a realistic number of holes and broken appointments are left in. */
  function seedWeek(){
    var out=[], id=1;
    var pat = [
      /* day, op, start, mins, provider, type, patient, codes, state */
      [1,0,"08:00",60,"t1","New patient exam","p11",["D0150","D0210"],"done"],
      [1,0,"09:00",90,"t1","Crown prep","p8",["D2950"],"done"],
      [1,0,"10:45",60,"t1","Restorative","p4",["D2392"],"done"],
      [1,0,"13:00",90,"t1","Root canal","p5",["D3330"],"done"],
      [1,0,"14:45",60,"t1","Restorative","p13",["D2391"],"broken"],
      [1,2,"08:00",60,"t3","Recall — cleaning & exam","p9",["D1110","D0120","D0274"],"done"],
      [1,2,"09:00",60,"t3","Perio maintenance","p1",["D4910","D0120"],"done"],
      [1,2,"10:00",60,"t3","Recall — cleaning & exam","p12",["D1110","D0120"],"done"],
      [1,2,"11:00",60,"t3","Recall — cleaning & exam","p2",["D1110","D0120","D0274"],"done"],
      [1,2,"13:00",60,"t3","Deep cleaning","p4",["D4341","D4341"],"done"],
      [1,2,"14:00",60,"t3","",null,[],"open"],

      [2,0,"08:00",60,"t1","Crown seat","p8",["D2740"],"done"],
      [2,0,"09:00",60,"t1","Restorative","p2",["D2392"],"done"],
      [2,0,"10:00",90,"t1","Extraction","p11",["D7140"],"done"],
      [2,0,"13:00",60,"t1","Emergency","p14",["D0140","D9110"],"done"],
      [2,1,"08:30",30,"t2","Ortho adjust","p9",["D8670"],"done"],
      [2,1,"09:00",30,"t2","Ortho adjust","p13",["D8670"],"done"],
      [2,1,"09:30",60,"t2","Restorative","p6",["D2330"],"done"],
      [2,1,"11:00",60,"t2","",null,[],"open"],
      [2,2,"08:00",60,"t3","Recall — cleaning & exam","p13",["D1110","D0120"],"done"],
      [2,2,"09:00",60,"t3","Recall — cleaning & exam","p6",["D1110","D0120","D0274"],"done"],
      [2,2,"10:00",60,"t3","Perio maintenance","p8",["D4910"],"done"],
      [2,3,"08:00",60,"t4","Recall — cleaning & exam","p3",["D1120","D0120","D1206","D1351"],"done"],
      [2,3,"09:00",60,"t4","Recall — cleaning & exam","p4",["D1110","D0120"],"done"],
      [2,3,"10:00",60,"t4","",null,[],"open"],
      [2,3,"11:00",60,"t4","Recall — cleaning & exam","p5",["D1110","D0120","D0274"],"done"],

      [3,0,"08:00",90,"t1","Crown prep","p4",["D2950"],"today"],
      [3,0,"09:45",60,"t1","Restorative","p12",["D2392"],"today"],
      [3,0,"11:00",60,"t1","",null,[],"open"],
      [3,0,"13:00",90,"t1","Root canal","p8",["D3310"],"today"],
      [3,0,"14:45",60,"t1","",null,[],"open"],
      [3,1,"08:30",30,"t2","Ortho adjust","p3",["D8670"],"today"],
      [3,1,"09:00",60,"t2","Restorative","p13",["D2391"],"today"],
      [3,1,"10:15",60,"t2","Extraction","p1",["D7210"],"today"],
      [3,1,"13:00",60,"t2","",null,[],"open"],
      [3,2,"08:00",60,"t3","Recall — cleaning & exam","p1",["D4910","D0120"],"today"],
      [3,2,"09:00",60,"t3","Recall — cleaning & exam","p11",["D1110","D0120"],"today"],
      [3,2,"10:00",60,"t3","",null,[],"open"],
      [3,2,"11:00",60,"t3","",null,[],"open"],
      [3,2,"13:00",60,"t3","Deep cleaning","p12",["D4341","D4341"],"today"],
      [3,3,"08:00",60,"t4","Recall — cleaning & exam","p2",["D1110","D0120"],"today"],
      [3,3,"09:00",60,"t4","",null,[],"open"],
      [3,3,"10:00",60,"t4","Recall — cleaning & exam","p6",["D1110","D0120"],"today"],

      [4,0,"08:00",60,"t1","Restorative","p8",["D2391","D2392"],"booked"],
      [4,0,"09:15",90,"t1","Crown seat","p4",["D2740"],"booked"],
      [4,0,"11:00",60,"t1","",null,[],"open"],
      [4,0,"13:00",60,"t1","Restorative","p2",["D2392"],"booked"],
      [4,1,"08:30",30,"t2","Ortho adjust","p9",["D8670"],"booked"],
      [4,1,"09:00",60,"t2","Restorative","p11",["D2330"],"booked"],
      [4,1,"10:15",60,"t2","",null,[],"open"],
      [4,2,"08:00",60,"t3","Recall — cleaning & exam","p5",["D1110","D0120"],"booked"],
      [4,2,"09:00",60,"t3","Perio maintenance","p1",["D4910"],"booked"],
      [4,2,"10:00",60,"t3","",null,[],"open"],
      [4,2,"11:00",60,"t3","Recall — cleaning & exam","p9",["D1110","D0120"],"booked"],
      [4,3,"08:00",60,"t4","Recall — cleaning & exam","p13",["D1110","D0120"],"booked"],
      [4,3,"09:00",60,"t4","",null,[],"open"],
      [4,3,"10:00",60,"t4","",null,[],"open"],

      [5,1,"08:30",30,"t2","Ortho adjust","p13",["D8670"],"booked"],
      [5,1,"09:00",90,"t2","Crown prep","p6",["D2950"],"booked"],
      [5,1,"11:00",60,"t2","Restorative","p12",["D2391"],"booked"],
      [5,3,"08:00",60,"t4","Recall — cleaning & exam","p11",["D1110","D0120","D0274"],"booked"],
      [5,3,"09:00",60,"t4","",null,[],"open"],
      [5,3,"10:00",60,"t4","Recall — cleaning & exam","p8",["D4910"],"booked"],
      [5,3,"11:00",60,"t4","",null,[],"open"]
    ];
    /* Seed the week that FINISHED as well as the week in progress. The Command
       Center reads the finished week — seeding only the current one leaves every
       money figure at zero, which reads as a catastrophe rather than a gap. */
    [-7,0].forEach(function(off){
      var past = off<0;
      pat.forEach(function(r){
        var st = past ? (r[8]==="open" ? "open" : r[8]==="broken" ? "broken" : "done") : r[8];
        /* Last week must hold DIFFERENT people. Recall patients come every six
           months, so repeating the same book two weeks running made the frequency
           checker flag almost every patient - technically correct, and useless. */
        var who = r[6];
        if(past && who){ var n=parseInt(who.slice(1),10); who = "p"+(14+((n*2)%26)+1); }
        out.push({ id:"v"+(id++), date:iso(addDays(WEEK_START,r[0]+off)), op:r[1], start:r[2], mins:r[3],
                   prov:r[4], type:r[5], pt:who, codes:r[7].slice(), state:st,
                   checkedOut:(st==="done"),
                   /* a completed visit had its doctor exam; only live ones are still open */
                   exam:(st==="done") });
      });
    });
    return out;
  }
  SEED.visits = seedWeek();

  SEED.claims = [
    {id:"c1", pt:"p8",  visit:"v12", sub:onDate(-14), codes:["D2740"],  billed:1450, allowed:1131, plan:565, patient:566, status:"Paid",    aging:14, denial:null},
    {id:"c2", pt:"p4",  visit:"v5",  sub:onDate(-21), codes:["D2392"],  billed:245,  allowed:191,  plan:153, patient:38,  status:"Paid",    aging:21, denial:null},
    {id:"c3", pt:"p1",  visit:"v7",  sub:onDate(-33), codes:["D4910"],  billed:145,  allowed:113,  plan:90,  patient:23,  status:"Paid",    aging:33, denial:null},
    {id:"c4", pt:"p5",  visit:"v4",  sub:onDate(-38), codes:["D3330"],  billed:1395, allowed:1088, plan:0,   patient:1088,status:"Patient balance", aging:38, denial:null, why:"Annual maximum met — correctly the patient's, not a denial"},
    {id:"c5", pt:"p2",  visit:"v13", sub:onDate(-46), codes:["D2392"],  billed:245,  allowed:184,  plan:0,   patient:184, status:"Denied",  aging:46, denial:"Frequency — same tooth, same surface within 24 months"},
    {id:"c6", pt:"p12", visit:"v9",  sub:onDate(-52), codes:["D1110"],  billed:110,  allowed:86,   plan:0,   patient:86,  status:"Denied",  aging:52, denial:"Frequency — third cleaning in the benefit year"},
    {id:"c7", pt:"p9",  visit:"v6",  sub:onDate(-11), codes:["D1110","D0120","D0274"], billed:250, allowed:196, plan:196, patient:0, status:"Paid", aging:11, denial:null},
    {id:"c8", pt:"p11", visit:"v14", sub:onDate(-63), codes:["D7140"],  billed:215,  allowed:0,    plan:0,   patient:0,   status:"Denied", aging:63, denial:"Patient not eligible on date of service"},
    {id:"c13",pt:"p8",  visit:"v2",  sub:onDate(-27), codes:["D2740","D2950"], billed:1740, allowed:1357, plan:679, patient:678, status:"Paid", aging:27, denial:null},
    {id:"c14",pt:"p4",  visit:"v3",  sub:onDate(-19), codes:["D4341","D4341"], billed:620, allowed:484, plan:387, patient:97, status:"Paid", aging:19, denial:null},
    {id:"c15",pt:"p11", visit:"v1",  sub:onDate(-24), codes:["D0150","D0210"], billed:265, allowed:207, plan:207, patient:0, status:"Paid", aging:24, denial:null},
    {id:"c16",pt:"p6",  visit:"v18", sub:onDate(-16), codes:["D2330"], billed:175, allowed:175, plan:0, patient:175, status:"Paid", aging:16, denial:null},
    {id:"c17",pt:"p13", visit:"v20", sub:onDate(-29), codes:["D1110","D0120"], billed:175, allowed:137, plan:137, patient:0, status:"Paid", aging:29, denial:null},
    {id:"c18",pt:"p9",  visit:"v6",  sub:onDate(-34), codes:["D1110","D0120"], billed:175, allowed:142, plan:142, patient:0, status:"Paid", aging:34, denial:null},
    {id:"c19",pt:"p1",  visit:"v7",  sub:onDate(-41), codes:["D4910","D0120"], billed:210, allowed:164, plan:131, patient:33, status:"Paid", aging:41, denial:null},
    {id:"c20",pt:"p2",  visit:"v13", sub:onDate(-23), codes:["D2392"], billed:245, allowed:184, plan:147, patient:37, status:"Paid", aging:23, denial:null},
    {id:"c9", pt:"p13", visit:"v20", sub:onDate(-7),  codes:["D1110","D0120"], billed:175, allowed:137, plan:137, patient:0, status:"Sent", aging:7,  denial:null},
    {id:"c10",pt:"p3",  visit:"v23", sub:onDate(-9),  codes:["D1120","D1206","D1351"], billed:250, allowed:135, plan:135, patient:0, status:"Sent", aging:9, denial:null},
    {id:"c11",pt:"p6",  visit:"v21", sub:onDate(-4),  codes:["D1110","D0120","D0274"], billed:250, allowed:188, plan:188, patient:0, status:"Sent", aging:4, denial:null},
    {id:"c12",pt:"p14", visit:"v16", sub:onDate(-72), codes:["D0140","D9110"], billed:240, allowed:187, plan:0, patient:187, status:"Denied", aging:72, denial:"Missing narrative — palliative treatment requires documentation"}
  ];

  SEED.compliance = [
    {k:"spore",   last:onDate(-11), by:"t5"},
    {k:"osha",    last:onDate(-96), by:"t7"},
    {k:"hipaa",   last:onDate(-402),by:"t7"},
    {k:"xray",    last:onDate(-410),by:"t7"},
    {k:"amalgam", last:onDate(-201),by:"t7"},
    {k:"emerg",   last:onDate(-38), by:"t6"}
  ];

  SEED.notes = [];

  function fresh(){
    return { v:1, sample:true, tier:"grandsuite", adds:[], offs:[], ortho:true,
      practice:clone(SEED.practice), team:clone(SEED.team), patients:clone(SEED.patients),
      treatment:clone(SEED.treatment), visits:clone(SEED.visits), claims:clone(SEED.claims),
      ortho_cases:clone(SEED.ortho), compliance:clone(SEED.compliance),
      documents:[], approvals:[], bus:[], notes:[] };
  }
  function emptyBook(){ var d=fresh(); d.sample=false;
    d.patients=[]; d.treatment=[]; d.visits=[]; d.claims=[]; d.ortho_cases=[];
    d.documents=[]; d.approvals=[]; d.bus=[]; d.notes=[];
    d.compliance=COMPLIANCE.map(function(c){ return {k:c.k,last:null,by:null}; });
    return d; }
  function goLive(){ var d=emptyBook(); write(d); return d; }
  function isSample(){ return db().sample!==false; }
  function db(){ var d=read(); if(!d){ d=fresh(); write(d); return d; } return d; }
  function save(mut){ var d=db(); mut(d); write(d); return d; }

  /* --------------------------------------------------------- LOOKUPS --- */
  function ptById(id){ return db().patients.filter(function(p){return p.id===id;})[0]||null; }
  function memberById(id){ return db().team.filter(function(t){return t.id===id;})[0]||null; }
  function visitById(id){ return db().visits.filter(function(v){return v.id===id;})[0]||null; }
  function claimById(id){ return db().claims.filter(function(c){return c.id===id;})[0]||null; }
  function tpById(id){ return db().treatment.filter(function(t){return t.id===id;})[0]||null; }
  function orthoById(id){ return db().ortho_cases.filter(function(o){return o.id===id;})[0]||null; }
  function ptName(id){ var p=ptById(id); return p?p.name:"—"; }
  function memberName(id){ var t=memberById(id); return t?t.name:"Unassigned"; }
  function weekOf(s){ var d=dISO(s); return iso(addDays(d,-d.getDay())); }
  function thisWeek(){ return iso(WEEK_START); }
  function lastWeek(){ return iso(addDays(WEEK_START,-7)); }
  function visitsInWeek(wk){ return db().visits.filter(function(v){ return weekOf(v.date)===(wk||thisWeek()); }); }
  function daysUntil(s){ if(!s) return null;
    return Math.round((dISO(s).getTime()-TODAY.getTime())/86400000); }
  function ageOf(p){ if(!p||!p.dob) return null;
    var b=dISO(p.dob), a=TODAY.getFullYear()-b.getFullYear();
    var m=TODAY.getMonth()-b.getMonth(); if(m<0||(m===0&&TODAY.getDate()<b.getDate())) a--; return a; }

  /* ============================== THE MONEY ENGINE ==========================
     Three numbers, kept apart, always:
       PRODUCTION — the full fee for what was done. What a practice brags about.
       ALLOWED    — what the plan's contract says the fee may be. The difference
                    is the PPO write-off, and it is not revenue that went missing;
                    it is revenue that never existed.
       COLLECTED  — what actually arrived, from the plan and from the patient.
     A practice that tracks only the first number is flying on an airspeed
     indicator that reads the wrong number by twenty per cent.
     ======================================================================== */
  function visitProduction(v){
    if(!v||!v.codes) return 0;
    return v.codes.reduce(function(a,c){
      var k=code(c); if(!k) return a;
      if(k.inContract) return a;            // ortho adjustments bill nothing — they are inside the contract
      return a+(k.fee||0);
    },0);
  }
  /* One procedure, priced three ways against one patient's actual plan. */
  function priceLine(cd, planId, ptRec){
    var k=code(cd), plan=planById(planId);
    if(!k) return null;
    var fee = k.fee||0;
    if(k.inContract) return {code:cd, fee:0, allowed:0, planPays:0, patient:0, note:"Included in the ortho contract", writeOff:0, downgraded:false};
    if(plan.id==="self") return {code:cd, fee:fee, allowed:fee, planPays:0, patient:fee, writeOff:0, downgraded:false, note:"Self-pay — full fee"};

    var downgraded=false, effCat=k.cat, effFee=fee;
    if(plan.downgrades && k.downgradeTo){
      var alt=code(k.downgradeTo);
      if(alt){ downgraded=true; effFee=alt.fee; }
    }
    var allowed = Math.round(effFee * (1-plan.ppoCut));
    var coins = plan.coins ? (plan.coins[effCat]===undefined ? .5 : plan.coins[effCat]) : 0;

    /* The annual maximum is the wall almost nobody sees coming. Whatever the plan
       would have paid above the remaining balance becomes the patient's problem. */
    var used = ptRec ? (Number(ptRec.ytdUsed)||0) : 0;
    var remaining = plan.annualMax==null ? Infinity : Math.max(0, plan.annualMax - used);
    var wouldPay = Math.round(allowed * coins);
    var planPays = Math.min(wouldPay, remaining);
    var cappedBy = planPays < wouldPay;

    /* The write-off only exists on the CONTRACTED fee. The downgrade difference is
       NOT a write-off — the patient owes it. Conflating the two is how an office
       tells a patient "insurance covers it" and then bills them $60 they were not
       warned about. */
    var writeOff = Math.round(fee*(1-plan.ppoCut)) < fee ? (fee - Math.round(fee*(1-plan.ppoCut))) : 0;
    var patient  = Math.max(0, fee - writeOff - planPays);

    return {code:cd, fee:fee, allowed:allowed, planPays:planPays, patient:patient,
            writeOff:writeOff, downgraded:downgraded, cappedBy:cappedBy,
            note: downgraded ? ("Plan pays at the "+code(k.downgradeTo).n.toLowerCase()+" rate — the difference is the patient's")
                 : cappedBy ? "Annual maximum reached — the balance moves to the patient" : ""};
  }
  function priceVisit(v){
    var p=ptById(v.pt); if(!p) return {lines:[],fee:0,writeOff:0,planPays:0,patient:0};
    var lines=v.codes.map(function(c){ return priceLine(c,p.plan,p); }).filter(Boolean);
    return { lines:lines,
      fee:      lines.reduce(function(a,l){return a+l.fee;},0),
      writeOff: lines.reduce(function(a,l){return a+l.writeOff;},0),
      planPays: lines.reduce(function(a,l){return a+l.planPays;},0),
      patient:  lines.reduce(function(a,l){return a+l.patient;},0) };
  }

  /* --------------------------------------------- INSURANCE RULES ENGINE --
     Frequency limitation is now one of the most common denial reasons in dental
     billing, and it is entirely preventable: the office already holds the history
     that proves the claim will bounce. This checks BEFORE the visit, not after
     the EOB. */
  /* PRIOR history only. A visit must never count itself, or the frequency check
     reports every appointment as a repeat of itself. */
  function historyFor(ptId, cd, beforeISO, exceptId){
    return db().visits.filter(function(v){
      if(v.pt!==ptId || v.codes.indexOf(cd)<0) return false;
      if(v.state==="open" || v.state==="broken") return false;
      if(exceptId && v.id===exceptId) return false;
      if(beforeISO && v.date>=beforeISO) return false;
      return true;
    }).sort(function(a,b){ return a.date<b.date?1:-1; });
  }
  function freqLimit(cd){
    var k=code(cd); if(!k||!k.freq) return null;
    var m=String(k.freq).match(/^(\d+)\/yr$/);           if(m) return {per:"year", times:+m[1]};
    var q=String(k.freq).match(/^1\/(\d+)yr/);           if(q) return {per:"years", years:+q[1], times:1};
    return null;
  }
  /* Returns hard blockers (this WILL be denied) separately from advisories
     (this MIGHT cost the patient). Conflating those two is how staff learn to
     ignore the warnings entirely. */
  function checkCoverage(ptId, cd, beforeISO, exceptId){
    var p=ptById(ptId); if(!p) return {blockers:[],notes:[]};
    var plan=planById(p.plan), k=code(cd);
    var blockers=[], notes=[];
    if(!k) return {blockers:["Unknown procedure code"],notes:[]};

    if(plan.id==="self"){ notes.push("Self-pay — no plan rules apply. Full fee is the patient's."); return {blockers:blockers,notes:notes}; }

    var lim=freqLimit(cd), hist=historyFor(ptId,cd,beforeISO,exceptId);
    if(lim){
      if(lim.per==="year"){
        var yr=TODAY.getFullYear();
        var inYear=hist.filter(function(v){ return dISO(v.date).getFullYear()===yr; });
        if(inYear.length>=lim.times)
          blockers.push("Frequency: "+k.n.toLowerCase()+" is "+k.freq+" and the patient has had "+inYear.length+" this benefit year.");
      } else if(lim.per==="years" && hist.length){
        var since=Math.abs(daysUntil(hist[0].date))/365;
        if(since < lim.years)
          blockers.push("Frequency: "+k.n.toLowerCase()+" is "+k.freq+" — last one was "+since.toFixed(1)+" years ago.");
      }
    }
    if(k.ageMax!=null){
      var a=ageOf(p);
      if(a!=null && a>k.ageMax) blockers.push("Age: this plan covers "+k.n.toLowerCase()+" to age "+k.ageMax+"; patient is "+a+".");
    }
    if(plan.waitMajor && k.cat==="Major") notes.push("This plan has a "+plan.waitMajor+"-month wait on major work — confirm the enrolment date.");
    if(plan.downgrades && k.downgradeTo)
      notes.push("Downgrade: the plan pays at the "+code(k.downgradeTo).n.toLowerCase()+" rate. The patient owes the difference and should be told before the appointment.");
    if(plan.annualMax!=null){
      var rem=Math.max(0, plan.annualMax-(p.ytdUsed||0));
      if(rem<=0) blockers.push("Annual maximum of "+money(plan.annualMax)+" is fully used. The plan will pay nothing more this benefit year.");
      else if(rem < feeFor(cd)*0.5) notes.push("Only "+money(rem)+" of the annual maximum is left — most of this will fall to the patient.");
    }
    if(plan.id==="mcd" && (k.cat==="Major"||k.cat==="Periodontal") && (ageOf(p)||0)>=21)
      blockers.push("Idaho Medicaid does not carry an adult benefit for "+k.cat.toLowerCase()+" work.");
    return {blockers:blockers, notes:notes};
  }
  function visitCoverageIssues(v){
    var out=[], seen={};
    (v.codes||[]).forEach(function(c){
      var r=checkCoverage(v.pt,c,v.date,v.id);
      r.blockers.forEach(function(b){ if(seen[b]) return; seen[b]=1; out.push({code:c, kind:"blocker", text:b}); });
      r.notes.forEach(function(n){ if(seen[n]) return; seen[n]=1; out.push({code:c, kind:"note", text:n}); });
    });
    return out;
  }
  /* Every booked visit from today forward that will bounce or surprise the patient. */
  function verificationQueue(){
    return db().visits.filter(function(v){
      return v.pt && v.state!=="open" && !v.checkedOut && daysUntil(v.date)>=0;
    }).map(function(v){
      var iss=visitCoverageIssues(v);
      return {visit:v, blockers:iss.filter(function(i){return i.kind==="blocker";}),
                       notes:iss.filter(function(i){return i.kind==="note";})};
    }).filter(function(r){ return r.blockers.length||r.notes.length; })
      .sort(function(a,b){ return (b.blockers.length-a.blockers.length) || (a.visit.date<b.visit.date?-1:1); });
  }

  /* ------------------------------------------------------- SCOPE GATE --
     A hygienist cannot diagnose or restore, and a recall visit is not complete
     without the doctor's exam. This is a legal boundary, so it is a blocker, not
     a nudge. */
  function scopeIssues(v){
    var out=[], prov=memberById(v.prov);
    if(!prov||!v.pt) return out;
    if(prov.kind==="rdh"){
      (v.codes||[]).forEach(function(c){
        if(needsDoctor(c)) out.push(codeName(c)+" is outside hygiene scope — a dentist has to perform it.");
      });
      var hasExam=(v.codes||[]).some(function(c){ return codeCat(c)==="Diagnostic" && /exam/i.test(codeName(c)); });
      if(hasExam && !v.exam) out.push("The doctor's exam has not been recorded — the visit cannot be checked out and the exam cannot be billed.");
    }
    return out;
  }

  /* ------------------------------------------------------------ RECALL --
     An unfilled hygiene hour is the most expensive empty hour in the building:
     the hygienist is paid whether or not the chair is full, and hygiene is where
     the doctor's restorative work gets FOUND. */
  function recallDue(days){
    days = days==null ? 30 : days;
    return db().patients.filter(function(p){
      var d=daysUntil(p.nextRecall); return d!=null && d<=days;
    }).map(function(p){
      var d=daysUntil(p.nextRecall);
      var booked=db().visits.some(function(v){ return v.pt===p.id && /Recall|Perio maintenance/.test(v.type||"") && daysUntil(v.date)>=0; });
      return {pt:p, days:d, overdue:d<0, booked:booked};
    }).sort(function(a,b){ return a.days-b.days; });
  }
  function lapsed(){ return recallDue(9999).filter(function(r){ return r.overdue && !r.booked; }); }
  /* The industry metric is "did the patient leave with the next one booked" — so
     the denominator is patients SEEN RECENTLY, not every chart in the practice.
     Measuring against the whole active list just reports how big the list is. */
  function reappointRate(){
    var seen={}, vs=db().visits;
    vs.forEach(function(v){
      if(v.pt && v.checkedOut){ var d=daysUntil(v.date); if(d<=0 && d>=-30) seen[v.pt]=1; }
    });
    var ids=Object.keys(seen); if(!ids.length) return 0;
    var booked=ids.filter(function(id){
      return vs.some(function(v){ return v.pt===id && daysUntil(v.date)>0 && v.state!=="open"; });
    }).length;
    return Math.round(booked/ids.length*100);
  }
  function seenNotReappointed(){
    var seen={}, vs=db().visits;
    vs.forEach(function(v){ if(v.pt && v.checkedOut){ var d=daysUntil(v.date); if(d<=0 && d>=-30) seen[v.pt]=1; } });
    return Object.keys(seen).filter(function(id){
      return !vs.some(function(v){ return v.pt===id && daysUntil(v.date)>0 && v.state!=="open"; });
    }).map(function(id){ return ptById(id); }).filter(Boolean);
  }
  /* What the empty hygiene chairs cost. Priced at a real recall visit, not a guess. */
  function openHygieneSlots(wk){
    return visitsInWeek(wk).filter(function(v){
      return v.state==="open" && String(OPERATORIES[v.op]||"").indexOf("hygiene")>=0;
    });
  }
  function recallFee(){ return feeFor("D1110")+feeFor("D0120")+ (feeFor("D0274")/2); }
  function openHygieneCost(wk){ return Math.round(openHygieneSlots(wk).length * recallFee()); }

  /* -------------------------------------------------- CASE ACCEPTANCE --
     "Unscheduled treatment" is diagnosed work the patient has not booked. It is
     the largest recoverable number in most practices and almost nobody totals it. */
  function tpValue(tp){ return (tp.codes||[]).reduce(function(a,c){ return a+feeFor(c); },0); }
  function unscheduled(){ return db().treatment.filter(function(t){ return t.status==="Presented"||t.status==="Accepted"; }); }
  function unscheduledValue(){ return unscheduled().reduce(function(a,t){ return a+tpValue(t); },0); }
  function caseAcceptance(){
    var all=db().treatment;                 // everything presented, accepted, scheduled or declined
    if(!all.length) return 0;
    var won=all.filter(function(t){ return t.status==="Scheduled"||t.status==="Accepted"; }).length;
    return Math.round(won/all.length*100);
  }
  function acceptTreatment(id,status){ return save(function(d){
    var t=d.treatment.filter(function(x){return x.id===id;})[0]; if(t) t.status=status; }); }

  /* ------------------------------------------------ ORTHO CONTRACT LEDGER --
     The whole reason ortho lives in its own ledger. A signed contract is NOT
     revenue. It is recognised straight-line over the treatment term, in arrears,
     and the plan's share arrives as an initial payment plus monthly instalments
     against a LIFETIME cap — not the annual maximum the rest of the practice
     lives under. */
  function orthoOn(){ return db().ortho!==false; }
  function monthsElapsed(o){
    var s=dISO(o.started);
    var m=(TODAY.getFullYear()-s.getFullYear())*12 + (TODAY.getMonth()-s.getMonth());
    return Math.max(0, Math.min(o.months, m));
  }
  function orthoRecognised(o){ return Math.round(o.contract * (monthsElapsed(o)/o.months)); }
  function orthoUnearned(o){ return Math.max(0, o.contract - orthoRecognised(o)); }
  function orthoBalance(o){ return Math.max(0, o.contract - (o.paid||0)); }
  /* Behind = they have paid less than the treatment they have already received.
     This is the ortho equivalent of accounts receivable and it hides easily. */
  function orthoBehind(o){ return Math.max(0, orthoRecognised(o) - (o.paid||0)); }
  function orthoLifetimeLeft(o){
    var p=ptById(o.pt); if(!p) return 0;
    var b=orthoBenefit(p.plan);
    return Math.max(0, b.lifetime - (o.planPaid||0));
  }
  function orthoMonthlyDue(o){
    if(o.status!=="Active") return 0;
    return Math.round((o.contract-(o.down||0))/o.months);
  }
  function orthoIssues(o){
    var out=[], p=ptById(o.pt);
    if(monthsElapsed(o) > o.months) out.push("Past the contracted term by "+(monthsElapsed(o)-o.months)+" months — the contract stopped recognising but the chair time has not stopped.");
    if(orthoBehind(o) > 400) out.push("Behind by "+money(orthoBehind(o))+" against treatment already delivered.");
    if(p){
      var b=orthoBenefit(p.plan), a=ageOf(p);
      if(b.lifetime===0) out.push("This plan carries no orthodontic benefit — the whole contract is the patient's.");
      else if(orthoLifetimeLeft(o)<=0) out.push("Lifetime orthodontic maximum of "+money(b.lifetime)+" is used up.");
      if(b.ageLimit && a!=null && a>b.ageLimit) out.push("Patient is "+a+"; this plan's ortho benefit stops at "+b.ageLimit+".");
    }
    return out;
  }
  function orthoTotals(){
    var cs=db().ortho_cases||[];
    return { cases:cs.length,
      active:      cs.filter(function(o){return o.status==="Active";}).length,
      contracted:  cs.reduce(function(a,o){ return a+o.contract; },0),
      recognised:  cs.reduce(function(a,o){ return a+orthoRecognised(o); },0),
      unearned:    cs.reduce(function(a,o){ return a+orthoUnearned(o); },0),
      collected:   cs.reduce(function(a,o){ return a+(o.paid||0); },0),
      behind:      cs.reduce(function(a,o){ return a+orthoBehind(o); },0),
      monthly:     cs.reduce(function(a,o){ return a+orthoMonthlyDue(o); },0) };
  }
  function postOrthoPayment(id, amt){ return save(function(d){
    var o=d.ortho_cases.filter(function(x){return x.id===id;})[0];
    if(o) o.paid=(o.paid||0)+(Number(amt)||0); }); }

  /* ------------------------------------------------------- WEEK MONEY --
     SCOPE MATTERS. "Production" counts what was scheduled; "completed" counts
     what was actually done. Comparing one against the other by accident is the
     bug that makes a dashboard quietly lie. Every caller states its scope. */
  function scoped(wk,scope){
    var vs=visitsInWeek(wk||thisWeek()).filter(function(v){ return v.pt; });
    if(scope==="completed") return vs.filter(function(v){ return v.checkedOut; });
    if(scope==="broken")    return vs.filter(function(v){ return v.state==="broken"; });
    if(scope==="booked")    return vs.filter(function(v){ return !v.checkedOut && v.state!=="broken"; });
    return vs;                                              // "scheduled" — everything with a patient
  }
  function weekProduction(wk,scope){
    return scoped(wk,scope||"completed").reduce(function(a,v){ return a+visitProduction(v); },0);
  }
  function weekMoney(wk,scope){
    return scoped(wk,scope||"completed").reduce(function(a,v){
      var m=priceVisit(v);
      a.fee+=m.fee; a.writeOff+=m.writeOff; a.planPays+=m.planPays; a.patient+=m.patient; return a;
    },{fee:0,writeOff:0,planPays:0,patient:0});
  }
  function productionByProvider(wk,scope){
    var m={};
    scoped(wk,scope||"completed").forEach(function(v){
      m[v.prov]=(m[v.prov]||0)+visitProduction(v); });
    return Object.keys(m).map(function(k){ return {id:k,name:memberName(k),v:m[k],kind:(memberById(k)||{}).kind}; })
      .sort(function(a,b){ return b.v-a.v; });
  }
  function hygieneShare(wk,scope){
    var rows=productionByProvider(wk,scope), tot=rows.reduce(function(a,r){return a+r.v;},0);
    if(!tot) return 0;
    var hyg=rows.filter(function(r){return r.kind==="rdh";}).reduce(function(a,r){return a+r.v;},0);
    return Math.round(hyg/tot*100);
  }
  /* Broken appointments and short-notice cancellations. The lost production is
     real and almost never totalled, because the appointment simply disappears. */
  function brokenAppointments(wk){ return scoped(wk,"broken"); }
  function brokenCost(wk){ return brokenAppointments(wk).reduce(function(a,v){ return a+visitProduction(v); },0); }

  /* ----------------------------------------------------------- CLAIMS --
     Aging buckets are the standard the whole industry reads, so use them. */
  function claimsBy(status){ return db().claims.filter(function(c){ return c.status===status; }); }
  /* A claim that hit the annual maximum adjudicated correctly — the balance simply
     moved to the patient. Grouping it with true denials makes a working billing
     department look broken and buries the denials that can actually be worked. */
  function patientBalances(){ return claimsBy("Patient balance"); }
  function aging(){
    var b={"0-30":0,"31-60":0,"61-90":0,"90+":0};
    db().claims.filter(function(c){ return c.status!=="Paid"; }).forEach(function(c){
      var a=c.aging;
      if(a<=30) b["0-30"]+=c.patient+ (c.status==="Sent"?c.plan:0);
      else if(a<=60) b["31-60"]+=c.patient+(c.status==="Sent"?c.plan:0);
      else if(a<=90) b["61-90"]+=c.patient+(c.status==="Sent"?c.plan:0);
      else b["90+"]+=c.patient+(c.status==="Sent"?c.plan:0);
    });
    return b;
  }
  function arTotal(){ var a=aging(); return a["0-30"]+a["31-60"]+a["61-90"]+a["90+"]; }
  function denials(){ return claimsBy("Denied"); }
  function denialReasons(){
    var m={}; denials().forEach(function(c){ var k=c.denial||"Unspecified"; m[k]=(m[k]||0)+1; });
    return Object.keys(m).map(function(k){ return {reason:k,n:m[k]}; }).sort(function(a,b){ return b.n-a.n; });
  }
  function deniedValue(){ return denials().reduce(function(a,c){ return a+(c.allowed||0); },0); }
  /* Collection rate on the ONE definition that is not misleading: what was
     collected against what could ever have been collected (the allowed amount),
     not against the full fee — the PPO write-off was never collectable. */
  function collectionRate(){
    /* Measured against what was ever COLLECTABLE (the allowed amount), never the
       full fee — the PPO write-off was never collectable and including it makes a
       healthy practice look broken. Claims still in flight are excluded from the
       denominator too: they have not had their chance to be collected yet, and
       counting them punishes a practice for having billed recently. */
    var cs=db().claims.filter(function(c){ return c.status!=="Sent" && c.status!=="Appealed" && c.status!=="Patient balance"; });
    var collectable=cs.reduce(function(a,c){ return a+(c.allowed||0); },0);
    var collected=cs.filter(function(c){return c.status==="Paid";}).reduce(function(a,c){ return a+(c.plan||0)+(c.patient||0); },0);
    if(!collectable) return 0;
    return Math.round(collected/collectable*100);
  }
  function appealClaim(id){ return save(function(d){
    var c=d.claims.filter(function(x){return x.id===id;})[0];
    if(c){ c.status="Appealed"; c.aging=0; } }); }

  /* ------------------------------------------------------- COMPLIANCE --
     Only the items with a real inspector and a real penalty behind them. */
  function cadenceDays(c){
    return {Weekly:7, Monthly:30, Annual:365, "Every 2 years":730}[c] || 365;
  }
  function complianceState(){
    return COMPLIANCE.map(function(def){
      var rec=(db().compliance||[]).filter(function(r){return r.k===def.k;})[0]||{last:null};
      var due = rec.last ? iso(addDays(dISO(rec.last), cadenceDays(def.cadence))) : null;
      var d   = due ? daysUntil(due) : null;
      return {def:def, last:rec.last, by:rec.by, due:due, days:d,
              state: !rec.last ? "never" : d<0 ? "overdue" : d<=14 ? "soon" : "ok"};
    }).sort(function(a,b){
      var r={never:0,overdue:1,soon:2,ok:3};
      return r[a.state]-r[b.state] || ((a.days||0)-(b.days||0)); });
  }
  function complianceOverdue(){ return complianceState().filter(function(c){ return c.state==="overdue"||c.state==="never"; }); }
  function logCompliance(k,by){ return save(function(d){
    d.compliance=d.compliance||[];
    var r=d.compliance.filter(function(x){return x.k===k;})[0];
    if(r){ r.last=iso(TODAY); r.by=by||null; } else d.compliance.push({k:k,last:iso(TODAY),by:by||null}); }); }

  /* Licences and CE. An expired licence is not a reminder — that person legally
     cannot work, so they come off the schedule. */
  function licenceState(){
    var out=[];
    db().team.forEach(function(t){
      Object.keys(t.lic||{}).forEach(function(k){
        var def=LICENCES.filter(function(l){return l.k===k;})[0]||{label:k, ceHours:0};
        var d=daysUntil(t.lic[k]);
        out.push({member:t, key:k, label:def.label, expires:t.lic[k], days:d,
                  state: d<0?"expired": d<=60?"soon":"ok",
                  ceNeeded:def.ceHours, ceHave:(t.ce||{})[k]});
      });
    });
    return out.sort(function(a,b){ return a.days-b.days; });
  }
  function cannotWork(){
    var bad={};
    licenceState().filter(function(l){return l.state==="expired";}).forEach(function(l){ bad[l.member.id]=l; });
    return Object.keys(bad).map(function(k){ return bad[k]; });
  }

  /* ------------------------------------------------------------- KPIs -- */
  function kpis(){
    var wk=lastWeek();                    // a practice reads the week that FINISHED
    var m=weekMoney(wk,"completed");
    return {
      week: wk,
      production:  m.fee,
      writeOff:    m.writeOff,
      collectable: m.fee-m.writeOff,
      patientPortion: m.patient,
      planPortion: m.planPays,
      collectionRate: collectionRate(),
      caseAcceptance: caseAcceptance(),
      unscheduled: unscheduledValue(),
      hygieneShare: hygieneShare(wk,"completed"),
      reappoint: reappointRate(),
      openHygiene: openHygieneSlots(thisWeek()).length,
      openHygieneCost: openHygieneCost(thisWeek()),
      broken: brokenAppointments(wk).length,
      brokenCost: brokenCost(wk),
      ar: arTotal(),
      denied: denials().length,
      deniedValue: deniedValue(),
      lapsed: lapsed().length,
      verifyFlags: verificationQueue().length,
      complianceOverdue: complianceOverdue().length,
      cannotWork: cannotWork().length,
      ortho: orthoOn() ? orthoTotals() : null
    };
  }

  function addNote(v){ return save(function(d){ d.notes.push(v); }); }
  function checkOut(id){ return save(function(d){
    var v=d.visits.filter(function(x){return x.id===id;})[0];
    if(v){ v.checkedOut=true; v.state="done"; } }); }
  function recordExam(id){ return save(function(d){
    var v=d.visits.filter(function(x){return x.id===id;})[0]; if(v) v.exam=true; }); }
  function bookOpen(visitId, ptId, type, codes){ return save(function(d){
    var v=d.visits.filter(function(x){return x.id===visitId;})[0];
    if(v){ v.pt=ptId; v.type=type||"Recall — cleaning & exam"; v.codes=(codes||["D1110","D0120"]).slice(); v.state="booked"; } }); }
  function addPatient(rec){ return save(function(d){
    var id="p"+(d.patients.length+1)+"_"+Math.floor(Math.random()*9999);
    d.patients.push(Object.assign({id:id, plan:"self", ytdUsed:0, perio:false, note:"",
      lastRecall:null, nextRecall:iso(addMonths(TODAY,6))}, rec||{})); }); }

  function logBus(d,dept,msg){ d.bus=d.bus||[];
    d.bus.unshift({t:now(), dept:dept, msg:msg}); d.bus=d.bus.slice(0,60); }
  function bus(){ return db().bus||[]; }
  function approvals(){ return db().approvals||[]; }
  function decideApproval(id,dec){ return save(function(d){
    var a=(d.approvals||[]).filter(function(x){return x.id===id;})[0];
    if(a){ a.status=dec; a.decided=now(); logBus(d,"Front desk", "Approval "+dec.toLowerCase()+": "+a.what); } }); }

  /* ------------------------------------------------------------ E-SIGN --
     ESIGN/UETA: consent to do business electronically, clear intent to sign,
     attribution to a person, and a record the signer can keep. The audit trail
     is frozen once signed. */
  var ESIGN_CONSENT = "By selecting Adopt and Sign, I agree to do business electronically with {{PRACTICE}}, "
    + "that my electronic signature is the legal equivalent of my handwritten signature, and that I have had "
    + "the opportunity to read this document in full. I may request a paper copy at no charge.";
  var DOC_TEMPLATES = [
    {id:"consent-tx", name:"Treatment consent", who:"Patient",
     body:"I authorise {{PRACTICE}} to perform the treatment explained to me, including {{PROC}}. The risks, benefits and alternatives — including the option of no treatment — have been explained and I have had my questions answered."},
    {id:"financial", name:"Financial agreement", who:"Patient / guarantor",
     body:"I understand that my dental benefit is a contract between me and my plan, not between the plan and {{PRACTICE}}. Any estimate given is an estimate only. I am responsible for the balance the plan does not pay, including amounts denied for frequency, annual maximum or downgrade."},
    {id:"hipaa-ack", name:"Privacy practices acknowledgement", who:"Patient",
     body:"I acknowledge that I have been offered a copy of the Notice of Privacy Practices for {{PRACTICE}}."},
    {id:"ortho-contract", name:"Orthodontic treatment contract", who:"Patient / guarantor",
     body:"I agree to the orthodontic treatment plan and to the fee shown, payable as the stated down payment followed by monthly instalments for the treatment term. I understand any orthodontic benefit is a LIFETIME maximum, is paid to {{PRACTICE}} in instalments, and ends if coverage ends."},
    {id:"medical-hx", name:"Medical history update", who:"Patient",
     body:"I confirm the medical history, medications and allergies recorded for me are accurate as of today, and I will inform {{PRACTICE}} of any change."}
  ];
  function templateById(id){ return DOC_TEMPLATES.filter(function(t){return t.id===id;})[0]||null; }
  function fillTemplate(s,ctx){ return String(s||"")
    .replace(/\{\{PRACTICE\}\}/g, ctx.practice||"the practice")
    .replace(/\{\{PROC\}\}/g, ctx.proc||"the planned treatment"); }
  function newToken(){ var A="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",p=function(n){var s="";for(var i=0;i<n;i++)s+=A[Math.floor(Math.random()*A.length)];return s;};
    return p(4)+"-"+p(4)+"-"+p(4); }
  function createDoc(tplId,subjectId,signerName){
    var t=templateById(tplId); if(!t) return null; var id="d"+now();
    save(function(d){ d.documents.push({id:id, tpl:tplId, name:t.name, pt:subjectId||null,
      signer:signerName||ptName(subjectId), token:newToken(), status:"Draft",
      created:now(), trail:[{t:now(), what:"Created"}]}); });
    return id;
  }
  function docById(id){ return db().documents.filter(function(d){return d.id===id;})[0]||null; }
  function docByToken(t){ return db().documents.filter(function(d){return d.token===t;})[0]||null; }
  function sendDoc(id){ return save(function(d){
    var x=d.documents.filter(function(y){return y.id===id;})[0];
    if(x && x.status==="Draft"){ x.status="Sent"; x.trail.push({t:now(),what:"Sent to signer"}); } }); }
  function openDoc(token){ save(function(d){
    var x=d.documents.filter(function(y){return y.token===token;})[0];
    if(x && x.status==="Sent"){ x.status="Viewed"; x.trail.push({t:now(),what:"Opened by signer"}); } });
    return docByToken(token); }
  function signDoc(token,sig,meta){ meta=meta||{};
    save(function(d){
      var x=d.documents.filter(function(y){return y.token===token;})[0];
      if(!x || x.status==="Signed") return;
      x.status="Signed"; x.sig=sig; x.signedAt=now();
      x.trail.push({t:now(), what:"Consent to electronic signature accepted"});
      x.trail.push({t:now(), what:"Signed", by:x.signer, ua:meta.ua||""});
    });
    return docByToken(token); }
  function docsAwaiting(){ return db().documents.filter(function(d){ return d.status==="Sent"||d.status==="Viewed"; }); }

  /* -------------------------------------------------------- PRICE BOOK --
     The SPINE is in every tier at every price. Tiers differ by SCALE, never by
     whether the practice gets a calendar. */
  var ROOMS = {
    schedule:  {name:"Schedule & chairs",        mo:79, build:600},
    chairside: {name:"Chairside & check-out",    mo:69, build:520},
    recall:    {name:"Recall & reactivation",    mo:59, build:440},
    treat:     {name:"Treatment plans",          mo:69, build:520},
    ins:       {name:"Insurance verification",   mo:89, build:700},
    claims:    {name:"Claims & aging",           mo:79, build:640},
    money:     {name:"Production & collection",  mo:79, build:640},
    ortho:     {name:"Ortho module",             mo:99, build:900},
    sterile:   {name:"Sterilisation & OSHA",     mo:49, build:380},
    team:      {name:"Team, licences & CE",      mo:49, build:380},
    portal:    {name:"Patient portal",           mo:59, build:460},
    sign:      {name:"e-Sign",                   mo:49, build:380}
  };
  var TIERS = {
    solo:      {name:"Solo", mo:350, build:3200,
      includes:["schedule","chairside","recall","treat","money","sterile","team","sign"],
      blurb:"One doctor, one or two hygiene chairs — the whole system for a practice where the owner is also the office manager."},
    practice:  {name:"Practice", mo:750, build:6400,
      includes:["schedule","chairside","recall","treat","ins","claims","money","sterile","team","portal","sign"],
      blurb:"Two to four operatories with an office manager and a treatment coordinator. Insurance verification and claims aging come in here."},
    grandsuite:{name:"Grandsuite", mo:1500, build:12000,
      includes:["schedule","chairside","recall","treat","ins","claims","money","ortho","sterile","team","portal","sign"],
      blurb:"Multi-provider, multi-location, ortho module switched on, dedicated environment and a branded patient portal."}
  };
  function tier(){ return db().tier||"grandsuite"; }
  function setTier(k){ return save(function(d){ d.tier=k; d.adds=[]; d.offs=[]; d.ortho = (TIERS[k]||TIERS.grandsuite).includes.indexOf("ortho")>=0; }); }
  function activeRooms(){ var d=db(), t=TIERS[d.tier]||TIERS.grandsuite, set=t.includes.slice();
    (d.adds||[]).forEach(function(k){ if(set.indexOf(k)<0) set.push(k); });
    (d.offs||[]).forEach(function(k){ var i=set.indexOf(k); if(i>=0) set.splice(i,1); });
    return set; }
  function hasRoom(k){ return activeRooms().indexOf(k)>=0; }
  function toggleRoom(k){ return save(function(d){
    var t=TIERS[d.tier]||TIERS.grandsuite, inTier=t.includes.indexOf(k)>=0;
    d.adds=d.adds||[]; d.offs=d.offs||[];
    if(inTier){ var i=d.offs.indexOf(k); if(i>=0) d.offs.splice(i,1); else d.offs.push(k); }
    else { var j=d.adds.indexOf(k); if(j>=0) d.adds.splice(j,1); else d.adds.push(k); }
    if(k==="ortho") d.ortho = activeRoomsFor(d).indexOf("ortho")>=0;
  }); }
  function activeRoomsFor(d){ var t=TIERS[d.tier]||TIERS.grandsuite, set=t.includes.slice();
    (d.adds||[]).forEach(function(k){ if(set.indexOf(k)<0) set.push(k); });
    (d.offs||[]).forEach(function(k){ var i=set.indexOf(k); if(i>=0) set.splice(i,1); });
    return set; }
  function priceNow(){ var d=db(), t=TIERS[d.tier]||TIERS.grandsuite;
    var mo=t.mo, build=t.build;
    (d.adds||[]).forEach(function(k){ if(ROOMS[k]){ mo+=ROOMS[k].mo; build+=ROOMS[k].build; } });
    (d.offs||[]).forEach(function(k){ if(ROOMS[k]){ mo-=ROOMS[k].mo; build-=ROOMS[k].build; } });
    return {mo:Math.max(0,mo), build:Math.max(0,build)}; }
  function priceLabel(){ var p=priceNow(); return money(p.mo)+"/mo · "+money(p.build)+" build"; }

  var SEATS = [
    {dept:"Front desk",  head:"Marisa", aes:["Verification","Recall","Collections"]},
    {dept:"Clinical",    head:"Owen",   aes:["Scheduling","Sterilisation","Charting"]},
    {dept:"Billing",     head:"Delia",  aes:["Claims","Appeals","Aging"]},
    {dept:"Growth",      head:"Ivo",    aes:["Case acceptance","Reactivation","Reviews"]}
  ];
  var BRAIN = {name:"Pearl", role:"COO — the single point of contact",
    line:"Every department reports here. You get one decision, not four opinions."};

  /* --------------------------------------------------------- RENDERING -- */
  function el(h){ var t=document.createElement("template"); t.innerHTML=String(h).trim(); return t.content.firstChild; }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function money(n){ return "$"+(Math.round(Number(n)||0)).toLocaleString(); }
  function pct(n,dp){ return (Number(n)||0).toFixed(dp===undefined?0:dp)+"%"; }
  function hhmm(s){ var p=String(s||"").split(":"); if(p.length<2) return s||"";
    var h=+p[0], ap=h>=12?"pm":"am", hh=h%12||12; return hh+":"+p[1]+ap; }
  function dayLabel(s){ var d=dISO(s);
    return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]+" "+(d.getMonth()+1)+"/"+d.getDate(); }

  var MARK_URL="https://www.aexperiences.com/Smiley_OS.png";
  function brandMark(){
    return '<img src="'+MARK_URL+'" alt="Smiley OS" onerror="this.remove()">';
  }

  var NAV=[
    {g:"COMMAND", items:[
      {h:"dashboard.html", l:"Command Center", i:"◎"},
      {h:"calendar.html",  l:"Calendar",       i:"▤"},
      {h:"contacts.html",  l:"Contacts",       i:"☎"},
      {h:"connect.html",   l:"Connect · Video",i:"◉"},
      {h:"records.html",   l:"Records · Filing",i:"▤"},
      {h:"approvals.html", l:"Approval Desk",  i:"✓"}]},
    {g:"THE DAY", items:[
      {h:"schedule.html",  l:"Schedule & Chairs", i:"▦", room:"schedule"},
      {h:"chairside.html", l:"Chairside",         i:"⛨", room:"chairside"},
      {h:"recall.html",    l:"Recall",            i:"↻", room:"recall"}]},
    {g:"THE PLAN", items:[
      {h:"treatment.html", l:"Treatment Plans",   i:"✦", room:"treat"},
      {h:"insurance.html", l:"Insurance Check",   i:"⛉", room:"ins"},
      {h:"ortho.html",     l:"Ortho",             i:"◈", room:"ortho"}]},
    {g:"MONEY", items:[
      {h:"claims.html",    l:"Claims & Aging",    i:"◧", room:"claims"},
      {h:"money.html",     l:"Production & Collection", i:"◭", room:"money"},
      {h:"portal.html",    l:"Patient Portal",    i:"☗", room:"portal"}]},
    {g:"THE PRACTICE", items:[
      {h:"sterile.html",   l:"Sterilisation & OSHA", i:"⚕", room:"sterile"},
      {h:"team.html",      l:"Team & Licences",   i:"★", room:"team"},
      {h:"sign.html",      l:"e-Sign",            i:"✍", room:"sign"},
      {h:"org.html",       l:"Agent Org · Bus",   i:"❖"}]}
  ];
  /* The chassis stylesheet targets .sidebar / .nav-group / .navlink .ic / .navlink .lb
     and .navlink.active. This used to emit .rail / .navgroup / .on, so the sidebar
     never got its dark background and cream nav text meant for a dark rail sat on
     white — unreadable. Markup now matches the CSS exactly. */
  function renderShell(active){
    var side=document.createElement("aside"); side.className="sidebar";
    side.appendChild(el('<a href="dashboard.html" class="brand">'+
      '<div class="bmark" aria-hidden="true">'+brandMark()+'</div>'+
      '<div><div class="bt">Smiley OS</div><div class="bs">Dental Practice OS</div></div></a>'));
    var nav=document.createElement("nav"); nav.className="nav";
    NAV.forEach(function(g){
      var items=g.items.filter(function(it){ return !it.room || hasRoom(it.room); });
      if(!items.length) return;
      nav.appendChild(el('<div class="nav-group">'+esc(g.g)+'</div>'));
      items.forEach(function(it){
        nav.appendChild(el('<a href="'+it.h+'" class="navlink'+(it.h===active?" active":"")+'">'+
          '<span class="ic">'+it.i+'</span><span class="lb">'+esc(it.l)+'</span></a>'));
      });
    });
    side.appendChild(nav);
    return side;
  }
  var MOBILE_NAV=[{h:"dashboard.html",l:"Home",i:"◎"},{h:"schedule.html",l:"Chairs",i:"▦"},
    {h:"recall.html",l:"Recall",i:"↻"},{h:"money.html",l:"Money",i:"◭"},{h:"index.html",l:"More",i:"≡"}];
  function renderMobileBar(active){
    var h=MOBILE_NAV.map(function(n){
      return '<a class="'+(n.h===active?"on":"")+'" href="'+n.h+'"><i>'+n.i+'</i>'+esc(n.l)+'</a>'; }).join("");
    return el('<nav class="mobilebar">'+h+'</nav>');
  }
  function renderTopbar(crumb){
    var p=db().practice;
    return el('<header class="topbar"><div class="crumb">'+esc(crumb||"")+'</div>'+
      '<div class="who"><span class="tierpill" id="tierPillStatic">'+esc((TIERS[tier()]||TIERS.grandsuite).name)+' '+priceLabel()+'</span>'+
      '<span class="avatar">'+esc((p.name||"C").slice(0,2).toUpperCase())+'</span>'+
      '<span class="whoami"><b>'+esc(p.name)+'</b><small>'+esc(p.city)+'</small></span></div></header>');
  }
  function ribbon(){
    if(!isSample()) return null;
    return el('<div class="ribbon"><span class="live">LIVE SHOWROOM</span>'+
      ' this is the real operating system, not a slideshow. Type anywhere; it saves in your browser. '+
      'The practice, team and patients below are a realistic sample book. '+
      '<button class="linkbtn" id="goLiveBtn">Start with a clean slate</button></div>');
  }
  function footer(){ return el('<div class="ae-credit">Powered by <b>Accelerated Experiences LLC</b> · Smiley OS is a '+
    'white-label product — your practice name and colours replace ours.</div>'); }
  function toast(m){ var w=document.getElementById("toast-wrap"); if(!w) return;
    var t=el('<div class="toast">'+esc(m)+'</div>'); w.appendChild(t);
    setTimeout(function(){ t.classList.add("out"); setTimeout(function(){ t.remove(); },400); },2600); }

  function mount(o){
    o=o||{}; db();
    var body=document.body;
    body.innerHTML='<div class="app" id="appRoot">'+
      '<div class="main"><div class="topwrap"></div>'+
      '<div class="ribwrap"></div><div class="content" id="content"></div>'+
      '<div class="footwrap"></div></div></div><div id="toast-wrap"></div><div class="mobwrap"></div>';
    var appRoot=document.getElementById("appRoot");
    appRoot.insertBefore(renderShell(o.active), appRoot.firstChild);
    body.querySelector(".topwrap").appendChild(renderTopbar(o.crumb));
    var r=ribbon(); if(r) body.querySelector(".ribwrap").appendChild(r);
    body.querySelector(".footwrap").appendChild(footer());
    body.querySelector(".mobwrap").appendChild(renderMobileBar(o.active));
    var g=document.getElementById("goLiveBtn");
    if(g) g.addEventListener("click", function(){
      goLive(); toast("Cleared. This is your practice now."); setTimeout(function(){ location.reload(); },700); });
    if(typeof o.render==="function") o.render(document.getElementById("content"));
    return document.getElementById("content");
  }
  function page(t,s){ return el('<div class="pagehead"><div><h1>'+esc(t)+'</h1>'+
    (s?'<p class="lede">'+esc(s)+'</p>':'')+'</div></div>'); }
  function card(i,c){ return el('<section class="card '+(c||"")+'">'+i+'</section>'); }
  function stat(l,v,n,b){ return '<div class="stat '+(b||"")+'"><div class="s-l">'+esc(l)+'</div>'+
    '<div class="s-v">'+v+'</div>'+(n?'<div class="s-n">'+n+'</div>':'')+'</div>'; }
  function tag(t,k){ return '<span class="tag '+(k||"")+'">'+esc(t)+'</span>'; }
  function srcNote(t){ return '<div class="srcnote">Source: '+esc(t)+'</div>'; }
  function bar(p,c){ var w=Math.max(0,Math.min(100,p));
    return '<div class="barwrap"><div class="bar '+(c||"")+'" style="width:'+w+'%"></div></div>'; }

  /* --------------------------------------------------- OWNER'S MANUAL -- */
  var MANUAL = [
    {t:"Production, collection and the patient portion are three different numbers", k:"money production collection writeoff",
     b:"Production is the full fee for the work. The PPO write-off is the part your contract with the plan says you may never charge — it is not lost money, it never existed. What is left is collectable, and it splits between what the plan pays and what the patient owes. Smiley OS never adds those together."},
    {t:"Why the dashboard shows LAST week", k:"week dashboard which week",
     b:"A practice reads the week that finished. Showing the week in progress makes every number look like a collapse until Friday afternoon."},
    {t:"Insurance verification happens before the visit", k:"insurance verify eligibility frequency",
     b:"Insurance Check reads each booked patient's history against their plan's frequency limits, annual maximum, age limits and downgrade rules, and tells you what will bounce BEFORE the appointment. Frequency violations are one of the most common denial reasons in dental billing and the office already holds the history that proves it."},
    {t:"Hard blockers are separated from advisories", k:"blocker warning denial",
     b:"A blocker means the claim will be denied — the maximum is used, the frequency is exceeded, the age limit has passed. An advisory means the patient may owe more than they expect, usually a downgrade. They are shown apart on purpose, because staff who see everything in red learn to ignore all of it."},
    {t:"A downgrade is not a write-off", k:"downgrade composite amalgam",
     b:"When a plan pays a white back-tooth filling at the silver rate, the difference is the PATIENT'S, not the practice's. Telling somebody 'insurance covers it' and then billing them the difference is how a practice loses a family."},
    {t:"An unfilled hygiene hour is the most expensive empty hour you have", k:"hygiene recall open chair",
     b:"The hygienist is paid whether the chair is full or not, and hygiene is where the doctor's restorative work gets found. Recall prices your open hygiene slots at a real recall visit so the hole has a number on it."},
    {t:"Unscheduled treatment is the money already in the building", k:"case acceptance unscheduled treatment",
     b:"Treatment you diagnosed and presented but nobody booked. Most practices never total it. Treatment Plans totals it and shows why each one stalled, because 'they said they would call' is not a reason you can work."},
    {t:"Ortho is a contract, not a procedure", k:"ortho orthodontic contract lifetime",
     b:"A $5,800 case is not $5,800 of production the day it is signed. It recognises straight-line over the treatment term, in arrears. The plan's share comes from a LIFETIME orthodontic maximum paid in instalments, not the annual maximum the rest of the practice lives under. Booking it as production on signing day is how a practice reads a record month and then cannot make payroll."},
    {t:"Turning the ortho module on and off", k:"ortho module switch tier",
     b:"Ortho is a module. It ships switched on in Grandsuite and can be added to any tier. A practice that does not do ortho never sees the room, and a practice that starts doing aligners switches it on without changing systems."},
    {t:"Scope is enforced, not suggested", k:"hygienist scope doctor exam",
     b:"A hygienist cannot diagnose or restore, and a recall visit is not complete until the doctor's exam is recorded. Smiley OS will not let the visit check out without it, because the exam is also billable and it is the most commonly missed charge in the practice."},
    {t:"Only compliance with a real inspector behind it", k:"osha hipaa sterilisation spore compliance",
     b:"Weekly spore testing, annual OSHA bloodborne pathogens, HIPAA training and risk assessment, radiography equipment inspection, the EPA amalgam separator record, and the emergency drug kit. Each one shows what actually happens if it lapses. We left out the things nobody inspects."},
    {t:"An expired licence removes somebody from the schedule", k:"licence expired CE credentials",
     b:"Not a reminder — that person legally cannot work. Team & Licences shows who cannot be scheduled today and how many CE hours each person still needs."},
    {t:"Claims aging uses the buckets the industry reads", k:"claims aging AR denial appeal",
     b:"0–30, 31–60, 61–90, 90+. Denials are grouped by reason so you can see whether you have twelve problems or one problem twelve times."},
    {t:"Collection rate is measured against what was collectable", k:"collection rate benchmark",
     b:"Against the allowed amount, never the full fee — the write-off was never collectable, so including it makes a healthy practice look broken. High performers run 98%+; the industry average is around 95%."},
    {t:"Benchmarks are sourced or blank", k:"benchmark source honest",
     b:"Every benchmark on screen names where it came from. Where we could not source a number we leave it blank. A plausible invented number becomes a real business decision downstream, and that is worse than no number."},
    {t:"What Smiley OS does NOT do", k:"limits not native vendor claims clearinghouse",
     b:"It does not submit claims to a clearinghouse, it does not take card or ACH payments, it does not write to Dentrix, Eaglesoft or Open Dental, it does not capture or store radiographs, and it does not file payroll. Those are named as vendor connections wherever they appear. Any product that claims all of that natively is telling you something untrue."},
    {t:"Everything is stored in your browser", k:"storage privacy data save",
     b:"This showroom keeps everything in your own browser. Nothing you type is sent anywhere. 'Start with a clean slate' empties the sample book and does not come back."},
    {t:"e-Sign is real, and holds up", k:"esign signature legal consent",
     b:"Consent to sign electronically, clear intent, attribution to a named person, and a signing trail that freezes when the document is signed. That is what ESIGN and UETA ask for."},
    {t:"The Approval Desk is the brake", k:"approval ghost mode",
     b:"Anything that spends money, sends to a patient, or changes a fee waits for a named person. Nothing leaves the building on its own."},
    {t:"Broken appointments are costed", k:"broken cancellation no show",
     b:"A cancelled appointment normally just vanishes from the book. Here it keeps its production value so you can see what the week actually cost you."},
    {t:"White-label", k:"branding white label logo colours",
     b:"Your practice name, your colours, your domain. The Accelerated Experiences credit sits quietly in the footer."}
  ];
  function manual(){ return MANUAL; }
  function askManual(q){
    q=String(q||"").toLowerCase().trim(); if(!q) return [];
    var SYN={cost:"money",fee:"money",revenue:"money",income:"money",bill:"money",
      cleaning:"hygiene",hygienist:"hygiene",prophy:"hygiene",
      insurance:"insurance",claim:"claims",denied:"denial",reject:"denial",
      braces:"ortho",aligner:"ortho",orthodontic:"ortho",
      sterilize:"sterilisation",autoclave:"sterilisation",spore:"sterilisation",
      privacy:"hipaa",security:"hipaa",safe:"storage",data:"storage",
      cancel:"broken",noshow:"broken","no-show":"broken",
      recare:"recall",reactivation:"recall",overdue:"recall",
      sign:"esign",signature:"esign",contract:"ortho"};
    var words=q.split(/[^a-z0-9]+/).filter(Boolean).map(function(w){ return SYN[w]||w; });
    return MANUAL.map(function(a){
      var hay=(a.t+" "+a.k+" "+a.b).toLowerCase(), score=0;
      words.forEach(function(w){ if(!w) return;
        if(a.k.toLowerCase().indexOf(w)>=0) score+=3;
        if(a.t.toLowerCase().indexOf(w)>=0) score+=2;
        else if(hay.indexOf(w)>=0) score+=1; });
      return {a:a, score:score};
    }).filter(function(r){ return r.score>0; })
      .sort(function(x,y){ return y.score-x.score; })
      .slice(0,4).map(function(r){ return r.a; });
  }

  /* SCOPE — named vendor hops. Claiming these as native is the kind of lie that
     gets a client audited. */
  var SYSTEMS = [
    {what:"Claim submission to payers", how:"Clearinghouse (vendor)", native:false},
    {what:"Card and ACH payments",      how:"Licensed payment processor (vendor)", native:false},
    {what:"Radiographs and imaging",    how:"Your sensor/imaging software (vendor)", native:false},
    {what:"Practice-management sync",   how:"Dentrix / Eaglesoft / Open Dental export (vendor)", native:false},
    {what:"Payroll filing",             how:"Payroll provider (vendor)", native:false},
    {what:"Patient texting",            how:"Messaging provider (vendor)", native:false},
    {what:"Scheduling, recall, treatment plans, claims aging, ortho ledger, e-sign, compliance",
     how:"Native to Smiley OS", native:true}
  ];

  global.Smiley = {
    // store
    db:db, save:save, goLive:goLive, isSample:isSample, fresh:fresh,
    TODAY:TODAY, iso:iso, addDays:addDays, addMonths:addMonths, dISO:dISO,
    thisWeek:thisWeek, lastWeek:lastWeek, weekOf:weekOf, daysUntil:daysUntil, dayLabel:dayLabel,
    // canon
    CDT:CDT, code:code, feeFor:feeFor, codeName:codeName, codeCat:codeCat,
    PLANS:PLANS, planById:planById, OPERATORIES:OPERATORIES, VISIT_TYPES:VISIT_TYPES,
    COMPLIANCE:COMPLIANCE, LICENCES:LICENCES, BENCH:BENCH, REPLACES:REPLACES, SYSTEMS:SYSTEMS,
    ORTHO_BENEFIT:ORTHO_BENEFIT, orthoBenefit:orthoBenefit,
    // lookups
    ptById:ptById, ptName:ptName, memberById:memberById, memberName:memberName,
    visitById:visitById, claimById:claimById, tpById:tpById, orthoById:orthoById,
    visitsInWeek:visitsInWeek, ageOf:ageOf,
    // money
    visitProduction:visitProduction, priceLine:priceLine, priceVisit:priceVisit,
    scoped:scoped, weekProduction:weekProduction, weekMoney:weekMoney,
    productionByProvider:productionByProvider, hygieneShare:hygieneShare,
    brokenAppointments:brokenAppointments, brokenCost:brokenCost,
    // insurance
    checkCoverage:checkCoverage, visitCoverageIssues:visitCoverageIssues,
    verificationQueue:verificationQueue, historyFor:historyFor,
    // scope + clinical
    scopeIssues:scopeIssues, needsDoctor:needsDoctor, checkOut:checkOut, recordExam:recordExam,
    // recall
    recallDue:recallDue, lapsed:lapsed, reappointRate:reappointRate, seenNotReappointed:seenNotReappointed,
    openHygieneSlots:openHygieneSlots, openHygieneCost:openHygieneCost, recallFee:recallFee,
    bookOpen:bookOpen, addPatient:addPatient,
    // treatment
    tpValue:tpValue, unscheduled:unscheduled, unscheduledValue:unscheduledValue,
    caseAcceptance:caseAcceptance, acceptTreatment:acceptTreatment,
    // ortho
    orthoOn:orthoOn, monthsElapsed:monthsElapsed, orthoRecognised:orthoRecognised,
    orthoUnearned:orthoUnearned, orthoBalance:orthoBalance, orthoBehind:orthoBehind,
    orthoLifetimeLeft:orthoLifetimeLeft, orthoMonthlyDue:orthoMonthlyDue,
    orthoIssues:orthoIssues, orthoTotals:orthoTotals, postOrthoPayment:postOrthoPayment,
    // claims
    claimsBy:claimsBy, patientBalances:patientBalances, aging:aging, arTotal:arTotal, denials:denials,
    denialReasons:denialReasons, deniedValue:deniedValue, collectionRate:collectionRate, appealClaim:appealClaim,
    // compliance
    complianceState:complianceState, complianceOverdue:complianceOverdue, logCompliance:logCompliance,
    licenceState:licenceState, cannotWork:cannotWork,
    // esign
    DOC_TEMPLATES:DOC_TEMPLATES, ESIGN_CONSENT:ESIGN_CONSENT, templateById:templateById,
    fillTemplate:fillTemplate, createDoc:createDoc, docById:docById, docByToken:docByToken,
    sendDoc:sendDoc, openDoc:openDoc, signDoc:signDoc, docsAwaiting:docsAwaiting,
    // org
    bus:bus, approvals:approvals, decideApproval:decideApproval, SEATS:SEATS, BRAIN:BRAIN,
    // price book
    ROOMS:ROOMS, TIERS:TIERS, tier:tier, setTier:setTier, activeRooms:activeRooms,
    hasRoom:hasRoom, toggleRoom:toggleRoom, priceNow:priceNow, priceLabel:priceLabel,
    // kpis
    kpis:kpis,
    // manual
    manual:manual, askManual:askManual,
    // ui
    mount:mount, page:page, card:card, stat:stat, tag:tag, bar:bar, srcNote:srcNote,
    el:el, esc:esc, money:money, pct:pct, hhmm:hhmm, toast:toast, brandMark:brandMark
  };
})(this);




/* ---- ae-charts: the visual command center (auto-discovers the engine) ---- */
(function(){
  if (typeof document==='undefined') return;
  if (!/dashboard/.test(location.pathname)) return;
  var NAMES=['Moments','Smiley','FB','Fourbarrel','Amph','EightMM','Truss','Abode','LilNinja','Buttress','Musical','MusicalCore','Showroom'];
  function eng(){ for(var i=0;i<NAMES.length;i++){ var g=window[NAMES[i]]; if(g&&typeof g.db==='function') return g; } return null; }
  function cvar(list,fb){ try{ var cs=getComputedStyle(document.documentElement);
    for(var i=0;i<list.length;i++){ var v=(cs.getPropertyValue(list[i])||'').trim(); if(v) return v; } }catch(e){} return fb; }
  var MONEYRE=/fee|price|amount|total|revenue|cost|value|gross|net|tuition|billed|budget|earned|paid|guarantee|sale|msrp|acq/i;
  var LABELRE=/^(name|title|project|show|production|unit|family|account|client|customer|patron|vehicle|item|label|company|program|artist|address|make)$/i;
  var CATRE=/^(phase|status|stage|type|category|kind|dept|department|state|tier|track|discipline|genre)$/i;
  var BAD=/^(id|key|uid|number|vin|stock)$/i;
  function pick(r,f){ return f.indexOf('.')>0 ? ((r[f.split('.')[0]]||{})[f.split('.')[1]]) : r[f]; }

  function discover(d){
    var best=null;
    Object.keys(d||{}).forEach(function(k){
      var a=d[k];
      if(!Array.isArray(a)||a.length<2||typeof a[0]!=='object'||!a[0]) return;
      var fields=[];
      Object.keys(a[0]).forEach(function(f){ var v=a[0][f];
        if(v&&typeof v==='object'&&!Array.isArray(v)){ Object.keys(v).forEach(function(s){ if(typeof v[s]==='number') fields.push(f+'.'+s); }); }
        else fields.push(f); });
      fields.forEach(function(f){
        var vals=a.map(function(r){ return Number(pick(r,f)); }).filter(function(n){ return isFinite(n); });
        if(vals.length<Math.max(2,Math.floor(a.length*0.6))) return;
        var sum=vals.reduce(function(x,y){return x+y;},0); if(!(sum>0)) return;
        var money=MONEYRE.test(f.split('.').pop())||MONEYRE.test(f);
        var score=sum*(money?1000:1);
        if(!best||score>best.score) best={coll:k,rows:a,field:f,sum:sum,money:money,score:score};
      });
    });
    if(!best) return null;
    var k0=Object.keys(best.rows[0]||{});
    best.label=k0.filter(function(f){ return LABELRE.test(f)&&typeof best.rows[0][f]==='string'; })[0]
            || k0.filter(function(f){ return !BAD.test(f)&&typeof best.rows[0][f]==='string'&&String(best.rows[0][f]).length>2; })[0]
            || k0.filter(function(f){ return typeof best.rows[0][f]==='string'; })[0] || null;
    best.cat=k0.filter(function(f){ if(!CATRE.test(f)) return false;
      var set={}; best.rows.forEach(function(r){ if(typeof r[f]==='string') set[r[f]]=1; });
      var n=Object.keys(set).length; return n>=2&&n<=6; })[0]||null;
    return best;
  }

  function build(){
    var E=eng(); if(!E) return;
    var content=document.getElementById('content'); if(!content) return;
    if(document.getElementById('aeChartCard')) return;
    var d; try{ d=E.db(); }catch(e){ return; }
    var S=discover(d); if(!S) return;

    var ACC =cvar(['--blue','--accent','--primary','--brand','--a-money','--a-projects','--teal'],'#4a7fa5');
    var ACC2=cvar(['--blue-2','--brand-2','--a-books','--a-field'],ACC);
    var HI  =cvar(['--amber','--gold','--amber-3','--brand-glow'],'#c9871f');
    var TRK =cvar(['--sunk','--line-2','--line'],'rgba(128,128,128,.18)');
    var INK =cvar(['--ink'],'#1b1f22'), MUT=cvar(['--mut','--ink-2'],'#7b8288');

    function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
    function fmt(n){ n=Number(n)||0;
      if(!S.money) return String(Math.round(n));
      if(n>=1000000) return '$'+(n/1000000).toFixed(2).replace(/\.?0+$/,'')+'M';
      if(n>=1000) return '$'+Math.round(n/1000)+'k';
      return '$'+Math.round(n); }
    function words(s){ s=String(s==null?'':s); return s.length>26?s.slice(0,25)+'…':s; }
    function title(s){ return String(s).replace(/[._-]/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}); }

    /* --- bars: top rows by value --- */
    /* A label field can legitimately hold a foreign key ("client":"c1") rather than a
       name, which renders a chart labelled c1, c5, c8 — useless. If the engine exposes
       its own lookup, resolve through it. */
    function human(v){
      if(typeof v!=='string' || !/^[a-z]{1,3}\d+$/.test(v)) return v;
      var fns=['clientName','ptName','memberName','artistName','name'];
      for(var i=0;i<fns.length;i++){
        if(typeof E[fns[i]]==='function'){ try{ var n=E[fns[i]](v); if(n && n!=='—') return n; }catch(e){} }
      }
      return v;
    }
    var rows=S.rows.slice().map(function(r){ return {l:S.label?human(r[S.label]):'—', v:Number(pick(r,S.field))||0}; })
                   .filter(function(r){ return r.v>0; })
                   .sort(function(a,b){ return b.v-a.v; }).slice(0,6);
    var max=Math.max.apply(null,rows.map(function(r){return r.v;}).concat([1]));
    var W=760,labW=190,valW=76,barW=W-labW-valW,rowH=32,H=rows.length*rowH+6,g1='';
    rows.forEach(function(r,i){
      var y=i*rowH+4, w=Math.max(2,(r.v/max)*barW);
      g1+='<text x="0" y="'+(y+15)+'" font-size="11.5" fill="'+MUT+'" font-family="system-ui,sans-serif">'+esc(words(r.l))+'</text>'
        +'<rect x="'+labW+'" y="'+(y+4)+'" width="'+barW+'" height="14" rx="4" fill="'+TRK+'"/>'
        +'<rect x="'+labW+'" y="'+(y+4)+'" width="'+w+'" height="14" rx="4" fill="'+(i===0?HI:ACC)+'"/>'
        +'<text x="'+W+'" y="'+(y+15)+'" text-anchor="end" font-size="11" font-weight="600" fill="'+INK+'" font-family="ui-monospace,Menlo,monospace">'+fmt(r.v)+'</text>';
    });

    /* --- donut by category --- */
    var g2='',leg='';
    if(S.cat){
      var by={},tot=0;
      S.rows.forEach(function(r){ var c=human(r[S.cat]); if(typeof c!=='string')return;
        var v=Number(pick(r,S.field))||0; if(!(v>0))return; by[c]=(by[c]||0)+v; tot+=v; });
      var keys=Object.keys(by).sort(function(a,b){return by[b]-by[a];});
      var PAL=[ACC,HI,ACC2,'#6a8f7a','#8a7fa8','#a8865f'];
      var R=52,CX=68,CY=68,C=2*Math.PI*R,off=0;
      keys.forEach(function(k,i){ var fr=tot?by[k]/tot:0; if(fr<=0)return;
        g2+='<circle cx="'+CX+'" cy="'+CY+'" r="'+R+'" fill="none" stroke="'+PAL[i%PAL.length]+'" stroke-width="19" stroke-dasharray="'+(fr*C)+' '+C+'" stroke-dashoffset="'+(-off*C)+'" transform="rotate(-90 '+CX+' '+CY+')"/>';
        leg+='<span style="display:inline-flex;align-items:center;gap:6px;margin:0 12px 7px 0;font-size:12px;color:'+MUT+'"><i style="width:10px;height:10px;border-radius:3px;background:'+PAL[i%PAL.length]+';display:inline-block"></i>'+esc(k)+' · '+fmt(by[k])+'</span>';
        off+=fr; });
      g2+='<text x="'+CX+'" y="'+(CY-1)+'" text-anchor="middle" font-size="14" font-weight="700" fill="'+INK+'" font-family="system-ui,sans-serif">'+fmt(tot)+'</text>'
        +'<text x="'+CX+'" y="'+(CY+13)+'" text-anchor="middle" font-size="8.5" fill="'+MUT+'" font-family="ui-monospace,Menlo,monospace">TOTAL</text>';
    }

    /* --- KPI bullets vs target bands (only if this engine publishes them) --- */
    var g3='';
    try{
      if(typeof E.kpis==='function'){
        var ks=E.kpis().filter(function(k){ return k.bench&&k.bench.target&&typeof k.value==='number'; }).slice(0,3);
        ks.forEach(function(k,i){
          var lo=k.bench.target[0],hi=k.bench.target[1],mx=Math.max(hi*1.35,k.value*1.1),bw=400,x0=132,y0=i*34+12;
          var vx=Math.min(bw,(k.value/mx)*bw),lx=(lo/mx)*bw,hx=(hi/mx)*bw,inb=k.value>=lo&&k.value<=hi;
          var val=(k.fmt==='pct')?Math.round(k.value)+'%':(k.fmt==='x')?k.value.toFixed(2)+'x':Math.round(k.value);
          g3+='<text x="0" y="'+(y0+11)+'" font-size="11.5" fill="'+MUT+'" font-family="system-ui,sans-serif">'+esc(k.label||k.k)+'</text>'
            +'<rect x="'+x0+'" y="'+y0+'" width="'+bw+'" height="13" rx="4" fill="'+TRK+'"/>'
            +'<rect x="'+(x0+lx)+'" y="'+y0+'" width="'+Math.max(2,hx-lx)+'" height="13" fill="none" stroke="'+ACC+'" stroke-dasharray="3 3"/>'
            +'<rect x="'+x0+'" y="'+(y0+3)+'" width="'+vx+'" height="7" rx="3" fill="'+(inb?ACC:HI)+'"/>'
            +'<text x="'+(x0+bw+8)+'" y="'+(y0+11)+'" font-size="11" font-weight="700" fill="'+(inb?ACC:HI)+'" font-family="ui-monospace,Menlo,monospace">'+val+'</text>';
        });
      }
    }catch(e){}

    var card=document.createElement('div');
    card.className='card'; card.id='aeChartCard';
    var heading=(S.money?'The money, drawn':'The numbers, drawn');
    card.innerHTML='<h2 style="margin:0 0 4px">'+heading+'</h2>'+
      '<div class="card-sub" style="margin-bottom:14px">Same figures as the tables below, as pictures — computed live from this system\'s own data, nothing hand-entered.</div>'+
      '<div style="border:1px solid '+TRK+';border-radius:12px;padding:14px 16px 10px;margin-bottom:14px">'+
        '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+MUT+';margin-bottom:8px">Top '+esc(title(S.coll))+' by '+esc(title(S.field.split('.').pop()))+'</div>'+
        '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block">'+g1+'</svg></div>'+
      (g2?'<div style="display:grid;grid-template-columns:1fr 1.15fr;gap:14px">'+
        '<div style="border:1px solid '+TRK+';border-radius:12px;padding:14px 16px">'+
          '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+MUT+';margin-bottom:8px">By '+esc(title(S.cat))+'</div>'+
          '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><svg viewBox="0 0 136 136" style="max-width:136px;width:100%;height:auto">'+g2+'</svg>'+
          '<div style="flex:1;min-width:120px">'+leg+'</div></div></div>'+
        (g3?'<div style="border:1px solid '+TRK+';border-radius:12px;padding:14px 16px"><div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+MUT+';margin-bottom:8px">Health vs. target band</div><svg viewBox="0 0 560 '+(Math.max(1,Math.min(3,3))*34+14)+'" style="width:100%;height:auto">'+g3+'</svg></div>':'<div></div>')+
      '</div>':(g3?'<div style="border:1px solid '+TRK+';border-radius:12px;padding:14px 16px"><div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+MUT+';margin-bottom:8px">Health vs. target band</div><svg viewBox="0 0 560 116" style="width:100%;height:auto">'+g3+'</svg></div>':''));

    var first=content.querySelector('.card');
    if(first&&first.nextSibling) content.insertBefore(card,first.nextSibling);
    else content.appendChild(card);
  }
  function boot(){ build(); setTimeout(build,300); setTimeout(build,1200); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
