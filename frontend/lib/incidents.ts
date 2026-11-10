import {type Draft, type Incident, seed, people, demoNow, priorities, states, type Priority, type Status} from './mock-data';

const key = 'bugfly:incidentes:v1';

// El modo demo es explícito. En modo normal se utilizan los endpoints reales.
export const demoMode = process.env.NEXT_PUBLIC_BUGFLY_MODE === 'demo';

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

// Campos que expone actualmente el servicio FastAPI.
export type ApiDraft = { titulo:string; descripcion:string; gravedad:string; responsable:string };
export type ApiIncident = ApiDraft & {
 id:number; estado?:string; categoria?:string;
 fecha_creacion?:string; fecha_actualizacion?:string; fecha_resolucion?:string;
};

async function apiRequest<T>(init:RequestInit = {}):Promise<T> {
 let response:Response;
 try {
  response=await fetch('/api/bugfly/incidentes',{...init,cache:'no-store',headers:{Accept:'application/json',...init.headers}});
 } catch {
  throw new Error('No se pudo conectar con FastAPI. Comprueba que el servicio esté iniciado.');
 }
 if(!response.ok)throw new Error('FastAPI respondió con el código '+response.status+'. No se guardaron cambios.');
 try{return await response.json() as T}
 catch{throw new Error('La respuesta del servicio de incidentes no es JSON válido.')}
}

function fromApi(record:ApiIncident):Incident {
 const priority=priorities.includes(record.gravedad as Priority)?record.gravedad as Priority:'Media';
 const status=states.includes(record.estado as Status)?record.estado as Status:'Abierto';
 return {
  id:'BF-'+record.id,
  title:record.titulo,
  description:record.descripcion??'',
  category:record.categoria??'Sin categoría',
  priority,status,
  assignee:record.responsable??'',
  reporter:'',
  created:record.fecha_creacion??'',
  updated:record.fecha_actualizacion??record.fecha_creacion??'',
  resolved:record.fecha_resolucion??undefined,
  activity:[],
 };
}

export async function listIncidents():Promise<Incident[]> {
 if(demoMode)return mockIncidents.list();
 const records=await apiRequest<ApiIncident[]>();
 if(!Array.isArray(records))throw new Error('FastAPI devolvió una lista de incidentes inválida.');
 return records.map(fromApi);
}

export async function createIncident(draft:Draft):Promise<string> {
 if(demoMode){
  const current=mockIncidents.list();
  const incident=mockIncidents.create(draft,current);
  mockIncidents.save([incident,...current]);
  return incident.id;
 }
 const payload:ApiDraft={
  titulo:draft.title.trim(),
  descripcion:draft.description.trim(),
  gravedad:draft.priority,
  responsable:draft.assignee,
 };
 const created=await apiRequest<{id:number;mensaje:string}>({
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify(payload),
 });
 if(!Number.isInteger(created.id))throw new Error('FastAPI no devolvió el ID del incidente creado.');
 return 'BF-'+created.id;
}
