import { useEffect, useMemo, useState } from 'react';
import { Activity, BookOpen, CheckCircle2, ChevronRight, Cloud, Download, GraduationCap, LogOut, ShieldCheck, Users, Wifi, WifiOff, ClipboardList, Award, Database } from 'lucide-react';
import { boards, demoAccounts, sampleQuestions, subjects, type Role, type Question } from './sampleData';
import { clearQueueId, exportLocalBackup, getAllAttempts, getAttempts, getLocalAttemptCount, getQueue, importLocalBackup, markLocally, saveAttempt, setSyncStatus, type Attempt } from './storage';
import { supabase, supabaseConfigured } from './supabase';

type Account = {id:string;role:Role;name:string;scope:string};
const roleLabels:Record<Role,string> = {student:'Student',teacher:'Teacher',centre:'Centre Head',admin:'Super Admin'};
const roleIcons:Record<Role,typeof GraduationCap> = {student:GraduationCap,teacher:BookOpen,centre:Users,admin:ShieldCheck};
const formatDate = (s:string) => new Date(s).toLocaleString();
export default function App() {
  const [account,setAccount] = useState<Account|null>(null);
  const [loginId,setLoginId] = useState('AIF-STU-0001');
  const [password,setPassword] = useState('student123');
  const [error,setError] = useState('');
  const [lang,setLang] = useState<'English'|'বাংলা'>('English');
  const [screen,setScreen] = useState<'home'|'quiz'|'history'|'questions'|'accounts'|'reports'>('home');
  const [kind,setKind] = useState<'practice'|'exam'>('practice');
  const [board,setBoard] = useState('CBSE');
  const [grade,setGrade] = useState(1);
  const [subject,setSubject] = useState('Mathematics');
  const [answers,setAnswers] = useState<number[]>([]);
  const [questionIndex,setQuestionIndex] = useState(0);
  const [startedAt,setStartedAt] = useState<number>(Date.now());
  const [now,setNow] = useState(Date.now());
  const [questionDraft,setQuestionDraft] = useState({prompt:'',o1:'',o2:'',o3:'',o4:'',answer:'0',subject:'Mathematics',board:'CBSE',medium:'English',grade:'1',explanation:''});
  const [localQuestionBank,setLocalQuestionBank] = useState<Question[]>(() => {
    try { return JSON.parse(localStorage.getItem('aif.demo.questions')||'[]'); } catch { return []; }
  });
  const [showPassword,setShowPassword] = useState(false);
  const [toast,setToast] = useState('');
  const online = typeof navigator !== 'undefined' ? navigator.onLine : false;
  const allQuestions = useMemo(()=>[...sampleQuestions,...localQuestionBank],[localQuestionBank]);
  const visibleQuestions = useMemo(()=>allQuestions.filter(q=>q.board===board && q.grade===grade && q.subject===subject && q.medium===lang),[allQuestions,board,grade,subject,lang]);
  const activeQuestions = visibleQuestions.length ? visibleQuestions : allQuestions.filter(q=>q.grade===grade).slice(0,5);
  const attempts = account ? getAttempts(account.id) : [];
  const queue = getQueue();
  const allAttempts = getAllAttempts();
  const isStaff = account && account.role !== 'student';

  useEffect(()=>{ const onOnline=()=>setNow(Date.now()); const onOffline=()=>setNow(Date.now()); window.addEventListener('online',onOnline); window.addEventListener('offline',onOffline); const t=window.setInterval(()=>setNow(Date.now()),1000); return ()=>{window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline);window.clearInterval(t);}; },[]);
  useEffect(()=>{localStorage.setItem('aif.demo.questions',JSON.stringify(localQuestionBank));},[localQuestionBank]);
  useEffect(()=>{ if (!toast) return; const t=window.setTimeout(()=>setToast(''),3000); return ()=>window.clearTimeout(t); },[toast]);

  async function login(e:React.FormEvent) {
    e.preventDefault(); setError('');
    if (supabase && !loginId.startsWith('AIF-')) {
      const {data,error:authError}=await supabase.auth.signInWithPassword({email:loginId,password});
      if (!authError && data.user) {
        const {data:profile}=await supabase.from('profiles').select('role,display_name,centre_id,active').eq('id',data.user.id).single();
        if (profile?.active) { setAccount({id:data.user.id,role:profile.role as Role,name:profile.display_name||loginId,scope:profile.role==='student'?'Assigned academic scope':'Authorized scope'}); return; }
        await supabase.auth.signOut(); setError('Account profile inactive or missing. Ask AIF administrator.'); return;
      }
      setError(authError?.message || 'Sign-in failed.'); return;
    }
    const found=demoAccounts.find(a=>a.id===loginId && a.password===password);
    if (!found) {setError('Invalid demo credentials.');return;}
    setAccount({id:found.id,role:found.role,name:found.name,scope:found.scope});
    setScreen('home');
  }
  async function logout(){if(supabase) await supabase.auth.signOut();setAccount(null);setScreen('home');setError('');}
  function startQuiz(type:'practice'|'exam') {
    if (!activeQuestions.length) {setToast('No questions available for this selection.');return;}
    const recent=account?getAttempts(account.id).filter(a=>a.kind===type):[];
    if (type==='practice' && recent.filter(a=>Date.now()-Date.parse(a.completedAt)<7*24*3600*1000).length>=3) {setToast('Weekly practice limit reached in this demo.');return;}
    if (type==='exam' && recent.some(a=>new Date(a.completedAt).getMonth()===new Date().getMonth() && new Date(a.completedAt).getFullYear()===new Date().getFullYear())) {setToast('Monthly exam already completed in this demo.');return;}
    setKind(type);setAnswers([]);setQuestionIndex(0);setStartedAt(Date.now());setScreen('quiz');
  }
  function finishQuiz() {
    if (!account) return;
    const score=markLocally(activeQuestions,answers);
    const attempt:Attempt={id:crypto.randomUUID(),userId:account.id,kind,board,medium:lang,grade,subject,score:score.score,total:score.total,percent:score.percent,completedAt:new Date().toISOString(),answers,syncStatus:supabaseConfigured?'queued':'local-only'};
    saveAttempt(attempt);setScreen('history');setToast(`Saved locally: ${score.score}/${score.total}. ${supabaseConfigured?'Awaiting secure sync service.':'Demo mode — no cloud sync configured.'}`);
  }
  async function syncQueue() {
    if (!navigator.onLine) {setToast('You are offline. Sync will be available when connection returns.');return;}
    if (!supabase) {setToast('Cloud backend is not configured. Local results remain on this device.');return;}
    setToast('Authentication is connected, but result sync endpoint is not included in this starter. Do not use for live exams yet.');
  }
  function saveQuestion(e:React.FormEvent) {
    e.preventDefault();
    const q:Question={id:`local-${Date.now()}`,board:questionDraft.board,medium:questionDraft.medium as 'English'|'বাংলা',grade:Number(questionDraft.grade),subject:questionDraft.subject,prompt:questionDraft.prompt,options:[questionDraft.o1,questionDraft.o2,questionDraft.o3,questionDraft.o4],answerIndex:Number(questionDraft.answer),explanation:questionDraft.explanation,marks:1};
    if(!q.prompt.trim()||q.options.some(o=>!o.trim())) {setToast('Complete the question and all four options.');return;}
    setLocalQuestionBank(p=>[q,...p]);setToast('Question saved on this device only. It is not published to other users.');setQuestionDraft({...questionDraft,prompt:'',o1:'',o2:'',o3:'',o4:'',explanation:''});
  }
  function downloadBackup(){const blob=new Blob([exportLocalBackup()],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='aif-demo-backup.json';a.click();URL.revokeObjectURL(a.href);}
  async function restoreBackup(e:React.ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;try{importLocalBackup(await f.text());setToast('Local attempt backup imported.');}catch{setToast('Backup rejected: file format invalid.');}}
  const headerText = account ? `${roleLabels[account.role]} workspace` : 'Learning • Practice • Progress';
  const Icon = account ? roleIcons[account.role] : GraduationCap;
  const selectedQuestion=activeQuestions[questionIndex];
  const progress=activeQuestions.length?Math.round((answers.filter(a=>a!==undefined).length/activeQuestions.length)*100):0;
  const elapsed=Math.max(0,Math.floor((now-startedAt)/1000));
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">AIF</div><div><div className="brand-title">Academic Platform</div><div className="brand-sub">Training That Transform</div></div></div><div className="top-actions"><span className={`connection ${online?'online':'offline'}`}>{online?<Wifi size={15}/>:<WifiOff size={15}/>} {online?'Online':'Offline'}</span><button className="ghost small" onClick={()=>setLang(v=>v==='English'?'বাংলা':'English')}>EN / বাংলা</button>{account&&<button className="ghost small" onClick={logout}><LogOut size={15}/> Logout</button>}</div></header>
    <main className="main">
      {!account ? <section className="login-layout">
        <div className="welcome"><span className="eyebrow">AIF MULTI-CENTRE LEARNING</span><h1>Every child deserves a clearer path to progress.</h1><p>Practice, assess and understand learning progress across school subjects, Reasoning and Abacus.</p><div className="feature-pills"><span><BookOpen size={15}/> Classes 1–6</span><span><Activity size={15}/> Practice + exams</span><span><WifiOff size={15}/> Offline-ready shell</span></div><div className="notice"><ShieldCheck size={18}/><span><b>Prototype notice</b><br/>Demo accounts are for local testing only. Do not use them for real student data.</span></div></div>
        <form className="login-card" onSubmit={login}><div className="icon-disc"><Icon size={25}/></div><h2>Sign in to AIF</h2><p className="muted">Choose your role's demo account or connect a configured Supabase account.</p><label>Login ID / email<input value={loginId} onChange={e=>setLoginId(e.target.value)} autoComplete="username" required /></label><label>Password<div className="password-row"><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/><button type="button" className="text-button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?'Hide':'Show'}</button></div></label>{error&&<div className="error">{error}</div>}<button className="primary full" type="submit">Sign in <ChevronRight size={17}/></button><div className="demo-box"><b>Local demo credentials</b><div className="demo-grid">{demoAccounts.map(a=><button type="button" key={a.role} onClick={()=>{setLoginId(a.id);setPassword(a.password);}}><span>{a.name}</span><small>{a.id}</small></button>)}</div></div></form>
      </section> : <>
        <div className="page-heading"><div><span className="eyebrow">{headerText}</span><h1>Hello, {account.name}</h1><p className="muted">{account.scope} · {supabaseConfigured?'Cloud settings detected':'Local demonstration mode'}</p></div><div className="heading-icon"><Icon size={28}/></div></div>
        <div className="stats-grid">
          <Stat icon={<ClipboardList/>} label="My recent attempts" value={account.role==='student'?String(attempts.length):String(allAttempts.length)} detail={account.role==='student'?'Latest 15 practices / 10 exams':'Demo device data only'}/>
          <Stat icon={<CheckCircle2/>} label="Practice schedule" value="3 / week" detail="Policy prototype; server enforcement required"/>
          <Stat icon={<Award/>} label="Monthly examination" value="1 / month" detail="Demo client-side check only"/>
          <Stat icon={<Cloud/>} label="Pending sync" value={String(queue.length)} detail={supabaseConfigured?'Backend sync endpoint not implemented':'No cloud configured'}/>
        </div>
        <nav className="tabs">{(['home',...(account.role==='student'?['history']:[]),...(account.role==='teacher'?['questions']:[]),...(account.role==='centre'?['reports']:[]),...(account.role==='admin'?['accounts','questions','reports']:[])] as Array<typeof screen>).map(tab=><button key={tab} className={screen===tab?'tab active':'tab'} onClick={()=>setScreen(tab)}>{({home:'Overview',history:'My results',questions:'Question studio',accounts:'Account controls',reports:'Performance reports'} as Record<string,string>)[tab]}</button>)}</nav>
        {screen==='quiz' ? <section className="panel quiz-panel"><div className="quiz-head"><div><span className="eyebrow">{kind==='practice'?'PRACTICE SESSION':'MONTHLY EXAMINATION'}</span><h2>{subject} · Class {grade}</h2></div><div className="timer">Elapsed {Math.floor(elapsed/60).toString().padStart(2,'0')}:{(elapsed%60).toString().padStart(2,'0')}</div></div><div className="progress-track"><div style={{width:`${progress}%`}}/></div><p className="muted">Question {questionIndex+1} of {activeQuestions.length} · {board} · {lang}</p>{selectedQuestion&&<div className="question-card"><h3>{selectedQuestion.prompt}</h3><div className="option-list">{selectedQuestion.options.map((o,i)=><button key={o+i} className={answers[questionIndex]===i?'option selected':'option'} onClick={()=>setAnswers(a=>{const b=[...a];b[questionIndex]=i;return b;})}><span className="option-letter">{String.fromCharCode(65+i)}</span>{o}</button>)}</div></div>}<div className="quiz-actions"><button className="secondary" disabled={questionIndex===0} onClick={()=>setQuestionIndex(i=>i-1)}>Previous</button>{questionIndex<activeQuestions.length-1?<button className="primary" onClick={()=>setQuestionIndex(i=>i+1)}>Next question <ChevronRight size={16}/></button>:<button className="primary" onClick={finishQuiz}>Submit and mark</button>}</div><p className="small muted">Prototype: timer is informational only; server-enforced deadlines and secure marking are not yet implemented.</p></section>
        : screen==='history' ? <section className="panel"><SectionTitle title="My recent results" subtitle="Only this demo account's local history is shown here."/><div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Subject</th><th>Score</th><th>Percent</th><th>Sync</th></tr></thead><tbody>{attempts.filter(a=>a.kind==='practice').slice(0,15).map(a=><AttemptRow key={a.id} a={a}/>)}{attempts.filter(a=>a.kind==='exam').slice(0,10).map(a=><AttemptRow key={a.id} a={a}/>)}</tbody></table>{!attempts.length&&<Empty text="No completed attempts yet. Start a practice session to see your result here."/>}</div></section>
        : screen==='questions' ? <section className="panel"><SectionTitle title="Question studio" subtitle="Local draft entry only. Publishing, review workflow and cross-centre sharing require the backend."/><form className="question-form" onSubmit={saveQuestion}><label>Question<textarea required value={questionDraft.prompt} onChange={e=>setQuestionDraft({...questionDraft,prompt:e.target.value})}/></label><div className="form-grid"><label>Board<select value={questionDraft.board} onChange={e=>setQuestionDraft({...questionDraft,board:e.target.value})}>{boards.map(b=><option key={b}>{b}</option>)}</select></label><label>Medium<select value={questionDraft.medium} onChange={e=>setQuestionDraft({...questionDraft,medium:e.target.value})}><option>English</option><option>বাংলা</option></select></label><label>Class<select value={questionDraft.grade} onChange={e=>setQuestionDraft({...questionDraft,grade:e.target.value})}>{[1,2,3,4,5,6].map(n=><option key={n}>{n}</option>)}</select></label><label>Subject<select value={questionDraft.subject} onChange={e=>setQuestionDraft({...questionDraft,subject:e.target.value})}>{[...subjects,'গণিত','বিজ্ঞান','পরিবেশ'].map(s=><option key={s}>{s}</option>)}</select></label></div><div className="form-grid">{(['o1','o2','o3','o4'] as const).map((k,i)=><label key={k}>Option {i+1}<input required value={questionDraft[k]} onChange={e=>setQuestionDraft({...questionDraft,[k]:e.target.value})}/></label>)}</div><div className="form-grid"><label>Correct option<select value={questionDraft.answer} onChange={e=>setQuestionDraft({...questionDraft,answer:e.target.value})}>{[0,1,2,3].map(n=><option value={n} key={n}>{String.fromCharCode(65+n)}</option>)}</select></label><label>Explanation<input value={questionDraft.explanation} onChange={e=>setQuestionDraft({...questionDraft,explanation:e.target.value})}/></label></div><button className="primary">Save local draft</button></form><h3>Device question drafts ({localQuestionBank.length})</h3><p className="muted small">These drafts are not shared with other teachers or centres.</p></section>
        : screen==='accounts' ? <section className="panel"><SectionTitle title="Account controls" subtitle="Production account generation and termination must be performed by a protected server-side admin function."/><div className="notice warning"><ShieldCheck size={18}/><span>Never create accounts by placing an admin/service key in browser code. This prototype intentionally does not generate or terminate live accounts.</span></div><div className="table-wrap"><table><thead><tr><th>Demo ID</th><th>Role</th><th>Access scope</th><th>Status</th></tr></thead><tbody>{demoAccounts.map(a=><tr key={a.id}><td>{a.id}</td><td>{roleLabels[a.role]}</td><td>{a.scope}</td><td><span className="status">Demo only</span></td></tr>)}</tbody></table></div></section>
        : screen==='reports' ? <section className="panel"><SectionTitle title="Performance reports" subtitle="Staff-only view in the demo. Production requires centre-scoped server policies."/><div className="stats-grid"><Stat icon={<Users/>} label="Demo attempts on this device" value={String(allAttempts.length)} detail="Not a cloud-wide total"/><Stat icon={<Database/>} label="Local stored attempts" value={String(getLocalAttemptCount())} detail="Browser storage only"/><Stat icon={<Cloud/>} label="Queued records" value={String(queue.length)} detail="Not uploaded yet"/></div><div className="table-wrap"><table><thead><tr><th>Student ID</th><th>Kind</th><th>Subject</th><th>Score</th><th>Date</th></tr></thead><tbody>{allAttempts.map(a=><tr key={a.id}><td>{a.userId}</td><td>{a.kind}</td><td>{a.subject}</td><td>{a.score}/{a.total}</td><td>{formatDate(a.completedAt)}</td></tr>)}</tbody></table></div><div className="button-row"><button className="secondary" onClick={downloadBackup}><Download size={16}/> Export local backup</button><label className="file-button">Restore backup<input type="file" accept="application/json" onChange={restoreBackup}/></label></div></section>
        : <div className="content-grid"><section className="panel"><SectionTitle title={account.role==='student'?'Start learning':'Workspace shortcuts'} subtitle={account.role==='student'?'Choose a subject and start a sample assessment.':'Manage your assigned tasks in this local prototype.'}/><div className="assessment-config"><label>Board<select value={board} onChange={e=>setBoard(e.target.value)}>{boards.map(b=><option key={b}>{b}</option>)}</select></label><label>Class<select value={grade} onChange={e=>setGrade(Number(e.target.value))}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>Class {n}</option>)}</select></label><label>Subject<select value={subject} onChange={e=>setSubject(e.target.value)}>{[...subjects,'গণিত','বিজ্ঞান','পরিবেশ'].map(s=><option key={s}>{s}</option>)}</select></label><div className="button-row"><button className="primary" onClick={()=>startQuiz('practice')}>Start practice <ChevronRight size={16}/></button><button className="secondary" onClick={()=>startQuiz('exam')}>Monthly exam</button></div></div><div className="notice"><BookOpen size={18}/><span><b>Sample content only</b><br/>This package contains a few illustrative questions, not a complete verified syllabus for all boards and classes.</span></div></section><section className="panel"><SectionTitle title="Learning framework" subtitle="Built for a multi-centre AIF rollout"/><div className="framework-list"><Feature icon={<BookOpen/>} title="Curriculum mapped" body="Board, medium, class and subject tags on every question."/><Feature icon={<Activity/>} title="Practice discipline" body="Target: three practice sessions per week."/><Feature icon={<Award/>} title="Quarterly rewards" body="Student, teacher and centre awards are planned for a later milestone."/><Feature icon={<Cloud/>} title="Sync-ready data model" body="Local attempts are queued, but the secure cloud sync service remains to be built."/></div></section></div>}
        <div className="bottom-tools"><span className="muted small">Build: 0.1.0 · {supabaseConfigured?'Backend variables found':'Demo-only mode'} · Device sync queue: {queue.length}</span><button className="ghost small" onClick={syncQueue}><Cloud size={15}/> Check sync</button></div>
      </>}
    </main>
    <footer className="footer">© Abacus Intelligence Foundation · Academic platform starter · Protect children's data.</footer>
    {toast&&<div className="toast" role="status">{toast}</div>}
  </div>;
}
function Stat({icon,label,value,detail}:{icon:React.ReactNode;label:string;value:string;detail:string}){return <div className="stat-card"><div className="stat-icon">{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>}
function SectionTitle({title,subtitle}:{title:string;subtitle:string}){return <div className="section-title"><div><h2>{title}</h2><p className="muted">{subtitle}</p></div></div>}
function Feature({icon,title,body}:{icon:React.ReactNode;title:string;body:string}){return <div className="feature-row"><div className="feature-icon">{icon}</div><div><b>{title}</b><p className="muted">{body}</p></div></div>}
function Empty({text}:{text:string}){return <div className="empty">{text}</div>}
function AttemptRow({a}:{a:Attempt}){return <tr><td>{formatDate(a.completedAt)}</td><td>{a.kind==='practice'?'Practice':'Examination'}</td><td>{a.subject}</td><td>{a.score}/{a.total}</td><td>{a.percent}%</td><td><span className={`status ${a.syncStatus}`}>{a.syncStatus}</span></td></tr>}