import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, BookOpen,
  Check, CheckCircle2, ChevronDown, CircleHelp, Compass, GraduationCap,
  MapPin, Menu, Search, ShieldCheck, Sparkles, X
} from 'lucide-react';
import { CURRENCIES, matchCandidates } from './core.mjs';
import { DEMO_COURSES, DESTINATION_META } from './demo-data.mjs';
import './ui.css';

const destinations = [
  { name:'Spain', region:'Southern Europe', image:'photo-1539037116277-4db20889f2d4', alt:'Barcelona rooftops and the Mediterranean coast' },
  { name:'Ireland', region:'Western Europe', image:'photo-1549918864-48ac978761a4', alt:'Historic streets in Dublin' },
  { name:'United Kingdom', region:'Northern Europe', image:'photo-1513635269975-59663e0ac1ad', alt:'London city skyline at sunset' },
  { name:'Germany', region:'Central Europe', image:'photo-1560969184-10fe8719e047', alt:'Berlin city architecture' },
  { name:'Hungary', region:'Central Europe', image:'photo-1549877452-9c387954fbc2', alt:'Budapest architecture beside the Danube' },
  { name:'Netherlands', region:'Western Europe', image:'photo-1512470876302-972faa2aa9a4', alt:'Amsterdam canal houses and water' }
];
const destinationPhoto = (id, width=720) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=82`;
const initialProfile = { subject:'', level:'', destinations:[], budgetAmount:'', budgetCurrency:'KES' };
const subjects = ['Computer Science & IT','Business & Management','Engineering','Health & Life Sciences','Arts & Social Sciences','Education','Law','Undecided'];
const levels = [
  {id:'foundation',title:'Foundation',detail:'Pathway or preparatory study'},
  {id:'bachelors',title:'Undergraduate',detail:'Bachelor’s degree'},
  {id:'masters',title:'Postgraduate',detail:'Master’s degree'},
  {id:'phd',title:'Doctoral',detail:'PhD or research degree'}
];
const labelLevel = value => levels.find(x=>x.id===value)?.title || value;
const fmtMoney = (value,currency) => { try { return new Intl.NumberFormat('en',{style:'currency',currency,maximumFractionDigits:0}).format(Number(value)); } catch { return `${currency} ${Number(value).toLocaleString()}`; } };
const isDemo = new URLSearchParams(location.search).get('demo') === '1';

function Brand(){return <a className="brand" href="#top" aria-label="AsterPath home"><span className="brand-mark">A</span><span>AsterPath</span></a>}
function Header({onStart,onSaved,savedCount=0,active,onNavigate}){
  const [menuOpen,setMenuOpen]=useState(false);
  const nav=[['Destinations','destinations'],['How it works','how-it-works'],['Data standards','data-standards']];
  return <header className="site-header"><div className="header-inner"><Brand/><nav className="desktop-nav" aria-label="Main navigation">{nav.map(([label,id])=><a key={id} className={active===id?'is-active':''} href={`#${id}`} onClick={e=>{e.preventDefault();onNavigate(id)}}>{label}</a>)}</nav><div className="header-actions"><button className="saved-link" onClick={onSaved}>Saved {savedCount>0&&<span>{savedCount}</span>}</button><button className="button button-dark button-small" onClick={onStart}>Build my study plan <ArrowUpRight size={16}/></button><button className="menu-toggle" aria-label={menuOpen?'Close menu':'Open menu'} aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X/>:<Menu/>}</button></div></div>{menuOpen&&<nav className="mobile-nav" aria-label="Mobile navigation">{nav.map(([label,id])=><a key={id} href={`#${id}`} onClick={e=>{e.preventDefault();onNavigate(id);setMenuOpen(false)}}>{label}</a>)}<button className="mobile-saved" onClick={()=>{setMenuOpen(false);onSaved()}}>Saved options {savedCount?`(${savedCount})`:''}</button><button className="button button-dark" onClick={()=>{setMenuOpen(false);onStart()}}>Build my study plan <ArrowUpRight size={17}/></button></nav>}</header>
}
function SourceStatus({status}){
 const live=status?.connected;
 return <div className={`source-status ${live?'is-live':'is-pending'}`} role="status" aria-live="polite"><span className="status-dot"/><span>{live?'Verified catalogue connected':'Recommendations require verified sources'}</span>{live&&<BadgeCheck size={15}/>}</div>
}
function Hero({onStart,onExplore,status}){
 return <section className="hero" id="top"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-rule"/>A more considered way to study abroad</div><h1>Your next chapter<br/><em>has a place.</em></h1><p className="hero-lede">Compare study destinations and find programmes that fit your goals, budget and next steps.</p><div className="hero-actions"><button className="button button-lime" onClick={onStart}>Build my study plan <ArrowUpRight size={18}/></button><button className="text-link light-link" onClick={onExplore}>Explore destinations <ArrowDownRight size={17}/></button></div><div className="hero-proof"><ShieldCheck size={17}/><span>Source evidence shown with every available recommendation</span></div></div><div className="hero-visual"><img className="hero-image" src={destinationPhoto('photo-1523580846011-d3a5bc25702b',1300)} alt="Students talking together on a university campus" fetchPriority="high"/><div className="hero-shade"/><div className="photo-caption"><span className="caption-label">A plan that starts with you</span><span className="caption-sub">Goals first. Destinations second.</span></div><div className="image-index"><span>01</span><span className="index-line"/><span>06 destinations</span></div><div className="source-float"><SourceStatus status={status}/></div></div><div className="hero-bottom"><span>Find your direction</span><span className="hero-bottom-line"/><span>Make the next move</span></div></section>
}
function DestinationCard({item,onSelect}){
 return <button className="destination-card" onClick={()=>onSelect(item.name)} aria-label={`Choose ${item.name} as a study destination`}><img src={destinationPhoto(item.image,700)} alt={item.alt} loading="lazy"/><span className="destination-shade"/><span className="destination-meta"><span><small>{item.region}</small><strong>{item.name}</strong></span><span className="round-link"><ArrowUpRight size={18}/></span></span></button>
}
function DestinationSection({onSelect}){
 return <section className="section destinations-section" id="destinations"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-rule"/>Start with a place</div><h2>Six destinations.<br/><em>One clear next step.</em></h2></div><div className="section-intro"><p>Choose a country to shape your search. We’ll only show course options when their records pass the source and freshness checks.</p><button className="text-link" onClick={()=>onSelect('')}>View all destinations <ArrowRight size={17}/></button></div></div><div className="destination-grid">{destinations.map(item=><DestinationCard key={item.name} item={item} onSelect={onSelect}/>)}</div></section>
}
function HowSection({onStart}){
 const steps=[
  {n:'01',title:'Tell us what you want to study',copy:'Choose a subject and level. Your search starts with the direction you have in mind.',Icon:BookOpen},
  {n:'02',title:'Set your destination and budget',copy:'Choose where you might go and the annual tuition range you want to compare.',Icon:Compass},
  {n:'03',title:'Review source-backed options',copy:'See the provider, check date and evidence links before you take a next step.',Icon:BadgeCheck}
 ];
 return <section className="section process-section" id="how-it-works"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-rule"/>A simple process</div><h2>Good decisions start<br/>with <em>clear information.</em></h2></div><p className="section-intro">AsterPath helps you narrow your options. Universities make admission decisions, and official sources remain the authority on fees, entry rules and visas.</p></div><div className="steps-row">{steps.map(({n,title,copy,Icon},i)=><article className="step" key={n}><div className="step-top"><span>{n}</span><Icon size={21} strokeWidth={1.7}/></div><div className="step-rule"/><h3>{title}</h3><p>{copy}</p>{i<steps.length-1&&<ArrowRight className="step-connector" size={18}/>}</article>)}</div><div className="process-cta"><div><strong>Start with the choices you already know.</strong><span>You can change your answers before checking matches.</span></div><button className="button button-dark" onClick={onStart}>Start your study plan <ArrowUpRight size={17}/></button></div></section>
}
function DataSection({status}){
 return <section className="section data-section" id="data-standards"><div className="data-panel"><div className="data-main"><div className="eyebrow eyebrow-light"><span className="eyebrow-rule"/>Clarity about the data</div><h2>Trust the source.<br/><em>Check the details.</em></h2><p>University information changes. Each live option must include course, fee and recognition evidence, a review status and a valid-through date. If the feed is disconnected or the evidence is stale, it won’t appear.</p><a className="text-link light-link" href="docs/LIVE-DATA-SETUP.md" target="_blank" rel="noreferrer">How source checks work <ArrowUpRight size={17}/></a></div><div className="data-checks"><div className="data-check"><CheckCircle2/><div><strong>Official evidence linked</strong><span>Course, tuition and recognition records</span></div></div><div className="data-check"><CheckCircle2/><div><strong>Freshness is enforced</strong><span>Expired or incomplete records are excluded</span></div></div><div className="data-check"><CheckCircle2/><div><strong>Matching stays explainable</strong><span>Course, level, destination and comparable budget</span></div></div><div className="data-connection"><span className={`connection-mark ${status?.connected?'connected':''}`}><ShieldCheck size={20}/></span><div><small>CATALOGUE STATUS</small><strong>{status?.connected?'Connected and checked':'Waiting for approved provider feed'}</strong></div></div></div></div></section>
}
function Footer({onStart}){return <footer className="site-footer"><div className="footer-top"><div><Brand/><p>Make a thoughtful move toward<br/>your next chapter.</p></div><div className="footer-nav"><a href="#destinations">Destinations</a><a href="#how-it-works">How it works</a><a href="#data-standards">Data standards</a></div><button className="button button-lime" onClick={onStart}>Build my study plan <ArrowUpRight size={17}/></button></div><div className="footer-bottom"><span>© {new Date().getFullYear()} AsterPath</span><span>Information supports exploration. It is not an admission decision or visa advice.</span><a href="?screen=admin">Staff workspace</a></div></footer>}
function WelcomeView({onStart}){
 return <main><Hero onStart={onStart} onExplore={()=>document.getElementById('destinations')?.scrollIntoView({behavior:'smooth'})}/><DestinationSection onSelect={country=>onStart(country)}/><HowSection onStart={onStart}/><DataSection/><section className="final-cta"><div><div className="eyebrow"><span className="eyebrow-rule"/>Start where you are</div><h2>Make your next move<br/><em>with a little more clarity.</em></h2></div><button className="button button-dark" onClick={onStart}>Build my study plan <ArrowUpRight size={17}/></button></section></main>
}
function StepHeader({step,onBack,onClose}){
 const labels=['Course','Study level','Destinations','Budget','Review'];
 return <div className="flow-head"><button className="icon-button" aria-label="Back" onClick={step===0?onClose:onBack}><ArrowLeft size={19}/></button><div className="flow-brand"><span className="brand-mark small-mark">A</span><span>AsterPath <i>/</i> Study plan</span></div><span className="flow-step-label">Step {step+1} of 5 <span className="step-current">· {labels[step]}</span></span><button className="icon-button flow-close" aria-label="Close" onClick={onClose}><X size={20}/></button></div>
}
function Progress({step}){return <div className="progress-track" aria-label={`Step ${step+1} of 5`}><span style={{width:`${((step+1)/5)*100}%`}}/></div>}
function ChoiceButton({selected,children,onClick,description}){return <button className={`choice-button ${selected?'selected':''}`} onClick={onClick} aria-pressed={selected}><span className="choice-copy"><strong>{children}</strong>{description&&<small>{description}</small>}</span><span className="choice-indicator">{selected&&<Check size={15}/>}</span></button>}
function StudyFlow({profile,setProfile,step,setStep,onClose,onSubmit,loading,error}){
 const update=(key,value)=>setProfile(p=>({...p,[key]:value}));
 const toggleDestination=country=>setProfile(p=>({...p,destinations:p.destinations.includes(country)?p.destinations.filter(x=>x!==country):[...p.destinations,country]}));
 const valid=step===0?Boolean(profile.subject):step===1?Boolean(profile.level):step===2?profile.destinations.length>0:step===3?Number(profile.budgetAmount)>0:true;
 const next=()=>{if(!valid)return;if(step<4)setStep(step+1);else onSubmit()};
 return <div className="flow-shell"><StepHeader step={step} onBack={()=>setStep(Math.max(0,step-1))} onClose={onClose}/><Progress step={step}/><div className="flow-content">
  {step===0&&<><span className="step-kicker">01 — COURSE</span><h1>What would you<br/><em>like to study?</em></h1><p className="flow-subtitle">Pick the subject area that best fits your plans.</p><div className="choice-grid">{subjects.map(s=><ChoiceButton key={s} selected={profile.subject===s} onClick={()=>update('subject',s)}>{s}</ChoiceButton>)}</div></>}
  {step===1&&<><span className="step-kicker">02 — STUDY LEVEL</span><h1>What level are<br/><em>you applying for?</em></h1><p className="flow-subtitle">Course availability and fees depend on the level.</p><div className="choice-grid choice-grid-two">{levels.map(x=><ChoiceButton key={x.id} selected={profile.level===x.id} onClick={()=>update('level',x.id)} description={x.detail}>{x.title}</ChoiceButton>)}</div></>}
  {step===2&&<><span className="step-kicker">03 — DESTINATIONS</span><h1>Where could you<br/><em>see yourself?</em></h1><p className="flow-subtitle">Choose one or more countries. We’ll search only those destinations.</p><div className="flow-destination-grid">{destinations.map(d=><button type="button" className={`flow-destination ${profile.destinations.includes(d.name)?'selected':''}`} key={d.name} onClick={()=>toggleDestination(d.name)}><img src={destinationPhoto(d.image,500)} alt="" loading="lazy"/><span>{d.name}</span><span className="flow-destination-check">{profile.destinations.includes(d.name)&&<Check size={14}/>}</span></button>)}</div></>}
  {step===3&&<><span className="step-kicker">04 — TUITION RANGE</span><h1>Set a tuition budget<br/><em>that works for you.</em></h1><p className="flow-subtitle">This is annual tuition only. Living costs, travel, insurance and visa fees are separate.</p><div className="budget-fields"><label>Currency<select value={profile.budgetCurrency} onChange={e=>update('budgetCurrency',e.target.value)}>{CURRENCIES.map(x=><option key={x}>{x}</option>)}</select></label><label>Maximum annual tuition<input type="number" inputMode="decimal" min="1" placeholder="e.g. 1,500,000" value={profile.budgetAmount} onChange={e=>update('budgetAmount',e.target.value)}/></label></div><div className="inline-note"><CircleHelp size={17}/><span>We compare tuition only when the programme’s verified international fee uses the same currency. No exchange rate is guessed.</span></div></>}
  {step===4&&<><span className="step-kicker">05 — REVIEW</span><h1>Ready to check<br/><em>your study plan?</em></h1><p className="flow-subtitle">Review your choices. You can go back and change any answer.</p><div className="review-list"><div><span>Course</span><strong>{profile.subject}</strong><button onClick={()=>setStep(0)}>Edit</button></div><div><span>Study level</span><strong>{labelLevel(profile.level)}</strong><button onClick={()=>setStep(1)}>Edit</button></div><div><span>Destinations</span><strong>{profile.destinations.join(', ')}</strong><button onClick={()=>setStep(2)}>Edit</button></div><div><span>Annual tuition budget</span><strong>{fmtMoney(profile.budgetAmount,profile.budgetCurrency)}</strong><button onClick={()=>setStep(3)}>Edit</button></div></div><div className="inline-note"><ShieldCheck size={17}/><span>Results appear only when current source and review evidence passes the catalogue checks. We do not predict admission.</span></div>{error&&<div className="inline-error" role="alert">{error}</div>}</>}
 </div><div className="flow-footer"><span className="privacy-note"><ShieldCheck size={15}/> Your answers stay in this browser.</span><div>{step>0&&<button className="button button-outline" onClick={()=>setStep(step-1)}>Back</button>}<button className="button button-dark" disabled={!valid||loading} onClick={next}>{loading?'Checking sources…':step===4?'Check recommendations':'Continue'} {!loading&&<ArrowRight size={17}/>}</button></div></div></div>
}
function ResultCard({item,isSaved,onSave}){
 const demo=item.demo===true;
 return <article className="result-item"><div className="result-main"><div className="result-flags"><span className={demo?'pill pill-demo':'pill pill-verified'}>{demo?'SYNTHETIC PREVIEW':'SOURCE VERIFIED'}</span><span>{item.country} <span className="dot-separator">·</span> {item.city}</span></div><h2>{item.course}</h2><p className="institution-name">{item.institution}</p><div className="result-tags"><span>{labelLevel(item.level)}</span><span>{item.duration}</span><span>{item.intake}</span></div>{!demo&&<div className="evidence-line"><BadgeCheck size={15}/><span>Checked {item.lastVerifiedAt?.slice(0,10)} · valid through {item.validUntil?.slice(0,10)}</span></div>}</div><div className="result-aside"><div><small>Annual international tuition</small><strong>{fmtMoney(item.tuitionAmount,item.tuitionCurrency)}</strong></div><p>{demo?'Illustrative only — not a real institution or published fee.':item.match?.budgetFit?.status==='within'?'Within your budget in the same currency.':item.match?.budgetFit?.status==='above'?'Above your budget in the same currency.':'Budget comparison unavailable without a verified matching currency.'}</p><button className="button button-outline button-small" onClick={()=>onSave(item.id)}>{isSaved?'Saved':'Save option'} {isSaved?<Check size={15}/>:<ArrowUpRight size={15}/>}</button></div>{!demo&&<div className="evidence-links"><a href={item.courseUrl} target="_blank" rel="noreferrer">Course page <ArrowUpRight size={13}/></a><a href={item.feeSourceUrl} target="_blank" rel="noreferrer">Fee evidence <ArrowUpRight size={13}/></a><a href={item.recognitionSourceUrl} target="_blank" rel="noreferrer">Recognition record <ArrowUpRight size={13}/></a></div>}</article>
}
function Results({profile,results,error,status,onRetry,onEdit,saved,setSaved}){
 const demo=results.length>0&&results.every(x=>x.demo===true);
 const [country,setCountry]=useState('All destinations');
 const countries=useMemo(()=>['All destinations',...new Set(results.map(x=>x.country))],[results]);
 const filtered=useMemo(()=>country==='All destinations'?results:results.filter(x=>x.country===country),[results,country]);
 const [sort,setSort]=useState('fit');
 const sorted=useMemo(()=>sort==='price'?[...filtered].sort((a,b)=>a.tuitionAmount-b.tuitionAmount):[...filtered].sort((a,b)=>(b.match?.score||0)-(a.match?.score||0)),[filtered,sort]);
 return <main className="results-page"><div className="results-intro"><div><div className="eyebrow"><span className="eyebrow-rule"/>YOUR STUDY PLAN</div><h1>{error?'Your search is ready.':'Options that fit your plan.'}</h1><p>{profile.subject} <span>·</span> {labelLevel(profile.level)} <span>·</span> {profile.destinations.join(', ')}</p></div><button className="button button-outline" onClick={onEdit}><ArrowLeft size={16}/> Edit my choices</button></div><div className="results-notice"><ShieldCheck size={18}/><div><strong>{demo?'Demonstration records only':'Source-first recommendations'}</strong><span>{demo?'These synthetic course examples are not real universities or verified fees.':'Only current, approved catalogue records are shown. Matching helps you explore; it is not an admission decision.'}</span></div><span className={`catalogue-pill ${status?.connected?'ok':''}`}><i/>{demo?'Demo mode':status?.connected?'Feed checked':'Feed not connected'}</span></div>{error?<div className="empty-results"><div className="empty-mark"><Search size={22}/></div><h2>No verified matches to show yet.</h2><p>{error}</p><p className="empty-detail">Connect an approved provider feed to see real course records. Synthetic previews are available only at <code>?demo=1</code>.</p><div className="empty-actions"><button className="button button-dark" onClick={onEdit}>Change my search <ArrowRight size={16}/></button><a href="/docs/LIVE-DATA-SETUP.md" target="_blank" rel="noreferrer" className="text-link">See feed setup <ArrowUpRight size={15}/></a></div></div>:sorted.length===0?<div className="empty-results"><div className="empty-mark"><Search size={22}/></div><h2>No verified options match those choices.</h2><p>Try another subject or add another destination. We’ll keep excluding records with expired or incomplete evidence.</p><button className="button button-dark" onClick={onEdit}>Adjust my choices <ArrowRight size={16}/></button></div>:<><div className="result-toolbar"><span>{sorted.length} {demo?'sample':'verified'} option{sorted.length===1?'':'s'} <small>{demo?'in this demo':'from the connected catalogue'}</small></span><div><label>Destination<select value={country} onChange={e=>setCountry(e.target.value)}>{countries.map(c=><option key={c}>{c}</option>)}</select></label><label>Sort<select value={sort} onChange={e=>setSort(e.target.value)}><option value="fit">Best fit</option><option value="price">Lowest tuition</option></select></label></div></div><div className="result-stack">{sorted.map(x=><ResultCard key={x.id} item={x} isSaved={saved.some(s=>typeof s==='object'?s.id===x.id:s===x.id)} onSave={()=>setSaved(s=>s.some(a=>typeof a==='object'?a.id===x.id:a===x.id)?s.filter(a=>typeof a==='object'?a.id!==x.id:a!==x.id):[...s,x])}/>)}</div></> }</main>
}
function SavedPage({saved,onBack,onRemove}){
 const records=saved.filter(x=>x&&typeof x==='object'&&x.id);
 return <main className="results-page"><div className="results-intro"><div><div className="eyebrow"><span className="eyebrow-rule"/>YOUR SHORTLIST</div><h1>Saved options.</h1><p>Keep the courses you want to review together.</p></div><button className="button button-outline" onClick={onBack}><ArrowLeft size={16}/> Back to my search</button></div>{records.length?<div className="result-stack">{records.map(x=><div key={x.id} className="result-item saved-item"><div className="result-main"><div className="result-flags"><span className={x.demo?'pill pill-demo':'pill pill-verified'}>{x.demo?'SYNTHETIC PREVIEW':'SOURCE VERIFIED'}</span><span>{x.country} · {x.city}</span></div><h2>{x.course}</h2><p className="institution-name">{x.institution}</p></div><div className="result-aside"><small>Annual tuition</small><strong>{fmtMoney(x.tuitionAmount,x.tuitionCurrency)}</strong><button className="text-link remove-saved" onClick={()=>onRemove(x.id)}>Remove from saved list <X size={14}/></button></div></div>)}</div>:<div className="empty-results"><div className="empty-mark"><BookOpen size={22}/></div><h2>Your shortlist is empty.</h2><p>Check current recommendations and save any options you want to revisit.</p><button className="button button-dark" onClick={onBack}>Back to my search <ArrowRight size={16}/></button></div>}</main>
}
function App(){
 const [page,setPage]=useState('home');
 const [step,setStep]=useState(0);
 const [profile,setProfile]=useState(()=>{try{return {...initialProfile,...JSON.parse(localStorage.getItem('asterpath_plan_v2')||'{}')}}catch{return initialProfile}});
 const [status,setStatus]=useState(null);
 const [results,setResults]=useState([]);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const [saved,setSaved]=useState(()=>{try{return JSON.parse(localStorage.getItem('asterpath_saved_v2')||'[]')}catch{return []}});
 const [active,setActive]=useState('');
 useEffect(()=>{localStorage.setItem('asterpath_plan_v2',JSON.stringify(profile))},[profile]);
 useEffect(()=>{localStorage.setItem('asterpath_saved_v2',JSON.stringify(saved))},[saved]);
 useEffect(()=>{fetch('/api/catalogue/status',{cache:'no-store'}).then(r=>r.json()).then(setStatus).catch(()=>setStatus({connected:false}))},[]);
 const start=(country)=>{if(country)setProfile(p=>({...p,destinations:p.destinations.includes(country)?p.destinations:[...p.destinations,country]}));setPage('flow');setStep(0);setError('');window.scrollTo(0,0)};
 const closeFlow=()=>{setPage('home');setStep(0);window.scrollTo(0,0)};
 const submit=async()=>{
   setLoading(true);setError('');setResults([]);
   if(isDemo){const found=matchCandidates({...profile,intakeType:'next'},DEMO_COURSES);setResults(found);setPage('results');setLoading(false);window.scrollTo(0,0);return;}
   try{
    const params=new URLSearchParams({subject:profile.subject,level:profile.level,destinations:profile.destinations.join(','),budgetAmount:String(profile.budgetAmount),budgetCurrency:profile.budgetCurrency});
    const response=await fetch(`/api/catalogue/recommendations?${params}`,{headers:{accept:'application/json'},cache:'no-store'});const payload=await response.json();
    if(!response.ok)throw new Error(payload.message||'The verified catalogue could not be reached.');
    setResults(Array.isArray(payload.results)?payload.results:[]);setStatus(payload.status||{...status,connected:true,totalVerifiedRecords:payload.verifiedRecordCount,provider:payload.provider,lastFetchedAt:payload.lastFetchedAt});setPage('results');window.scrollTo(0,0);
   }catch(e){setError(e instanceof Error?e.message:'Could not load current university records.');setPage('results');window.scrollTo(0,0)}finally{setLoading(false)}
 };
 const onNavigate=id=>{setActive(id);if(page!=='home'){setPage('home');setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth'}),40)}else document.getElementById(id)?.scrollIntoView({behavior:'smooth'})};
 return <div className="app-shell">{page!=='flow'&&<Header onStart={()=>start()} onSaved={()=>{setPage('saved');window.scrollTo(0,0)}} savedCount={saved.length} active={active} onNavigate={onNavigate}/>}{page==='home'?<WelcomeView onStart={()=>start()}/>:page==='flow'?<StudyFlow profile={profile} setProfile={setProfile} step={step} setStep={setStep} onClose={closeFlow} onSubmit={submit} loading={loading} error={error}/>:page==='saved'?<SavedPage saved={saved} onBack={()=>{setPage(results.length?'results':'home');window.scrollTo(0,0)}} onRemove={id=>setSaved(s=>s.filter(x=>typeof x==='object'?x.id!==id:x!==id))}/>:<Results profile={profile} results={results} error={error} status={status} onRetry={submit} onEdit={()=>{setPage('flow');setStep(0);window.scrollTo(0,0)}} saved={saved} setSaved={setSaved}/ >}{page!=='flow'&&<Footer onStart={()=>start()}/ >}{isDemo&&<div className="demo-label">DEMO PREVIEW · synthetic records only</div>}</div>
}

const query=new URLSearchParams(location.search);
if(query.get('screen')==='admin'){
 document.title='AsterPath staff preview';
 import('./legacy-entry.mjs');
}else{
 createRoot(document.getElementById('app')).render(<React.StrictMode><App/></React.StrictMode>);
}
