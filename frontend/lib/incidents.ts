import { type Draft, type Incident, seed, people, demoNow } from './mock-data';
const key = 'bugfly:incidentes:v1';
export const mockIncidents = {
 list(): Incident[] {
  try { const stored=localStorage.getItem(key); return stored ? JSON.parse(stored) : seed; } catch { return seed; }
 },
 save(items:Incident[]) { localStorage.setItem(key, JSON.stringify(items)); },
 nextId(items:Incident[]) { return 'BF-'+(1+Math.max(1087,...items.map(item=>Number(item.id.slice(3))))); },
 create(draft:Draft,items:Incident[]):Incident {
  return {...draft,id:this.nextId(items),created:demoNow,updated:demoNow,reporter:people[0],activity:[{text:people[0]+' creó el incidente.',date:demoNow}]};
 },
};

// Contrato que expone FastAPI. La demostración usa mockIncidents.
export type ApiDraft = { titulo:string; descripcion:string; gravedad:string; responsable:string|null };
export type ApiIncident = ApiDraft & { id:number };
export function fastApiIncidents(baseUrl:string) {
 const url=baseUrl.replace(/\/$/,'')+'/incidentes';
 async function request<T>(init?:RequestInit):Promise<T> {
  const response=await fetch(url,init);
  if(!response.ok) throw new Error('No se pudo consultar el servicio de incidentes.');
  return response.json() as Promise<T>;
 }
 return {
  list:()=>request<ApiIncident[]>(),
  create:(draft:ApiDraft)=>request<{id:number;mensaje:string}>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)}),
 };
}
