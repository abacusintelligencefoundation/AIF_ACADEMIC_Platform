import type { Question, Role } from './sampleData';

export type Attempt = {
  id: string; userId: string; kind: 'practice' | 'exam'; board: string; medium: string;
  grade: number; subject: string; score: number; total: number; percent: number;
  completedAt: string; answers: number[]; syncStatus: 'local-only' | 'queued' | 'synced';
};
const ATTEMPTS_KEY = 'aif.demo.attempts.v1';
const QUEUE_KEY = 'aif.demo.syncqueue.v1';
const get = <T,>(key:string, fallback:T):T => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
};
const set = (key:string, value:unknown) => localStorage.setItem(key, JSON.stringify(value));
export const getAttempts = (userId:string):Attempt[] => get<Attempt[]>(ATTEMPTS_KEY,[]).filter(a=>a.userId===userId).sort((a,b)=>b.completedAt.localeCompare(a.completedAt));
export const getAllAttempts = ():Attempt[] => get<Attempt[]>(ATTEMPTS_KEY,[]);
export const saveAttempt = (attempt:Attempt) => {
  const all = get<Attempt[]>(ATTEMPTS_KEY,[]);
  if (!all.some(a=>a.id===attempt.id)) all.push(attempt);
  set(ATTEMPTS_KEY,all);
  const queue = get<string[]>(QUEUE_KEY,[]);
  if (!queue.includes(attempt.id)) queue.push(attempt.id);
  set(QUEUE_KEY,queue);
};
export const getQueue = () => get<string[]>(QUEUE_KEY,[]);
export const clearQueueId = (id:string) => set(QUEUE_KEY,get<string[]>(QUEUE_KEY,[]).filter(x=>x!==id));
export const setSyncStatus = (id:string,status:Attempt['syncStatus']) => set(ATTEMPTS_KEY,get<Attempt[]>(ATTEMPTS_KEY,[]).map(a=>a.id===id?{...a,syncStatus:status}:a));
export const exportLocalBackup = () => JSON.stringify({format:'aif-demo-backup-v1',exportedAt:new Date().toISOString(),attempts:getAllAttempts()},null,2);
export const importLocalBackup = (json:string) => {
  const parsed = JSON.parse(json);
  if (parsed?.format !== 'aif-demo-backup-v1' || !Array.isArray(parsed.attempts)) throw new Error('Invalid AIF backup file');
  set(ATTEMPTS_KEY,parsed.attempts);
};
export const getLocalAttemptCount = () => get<Attempt[]>(ATTEMPTS_KEY,[]).length;
export function markLocally(questions:Question[], answers:number[]) {
  const total = questions.reduce((s,q)=>s+q.marks,0);
  const score = questions.reduce((s,q,i)=>s+(answers[i]===q.answerIndex?q.marks:0),0);
  return {score,total,percent:total?Math.round(score/total*100):0};
}
export const canUseRole = (role:Role, required:Role) => role===required || role==='admin';