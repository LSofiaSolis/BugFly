'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {active,categories,colors,dateLabel,demoNow,hours,priorities,seed,trend,type Incident} from '../lib/mock-data';
import {mockIncidents} from '../lib/incidents';
import {Avatar,Panel,Priority,Shell,Status,list,url} from './ui';
export function useIncidents(){
 const [items,setItems]=useState(seed);
 useEffect(()=>setItems(mockIncidents.list()),[]);
 return items;
}
export function sla(item:Incident){
 const target=hours[priorities.indexOf(item.priority)];
 if(!target)return {fraction:0,label:'Sin objetivo',due:''};
 const elapsed=Date.parse(item.resolved??demoNow)-Date.parse(item.created);
 const remaining=target*3600000-elapsed;
 const mins=Math.floor(Math.abs(item.resolved?elapsed:remaining)/60000);
 const duration=(mins>=60?Math.floor(mins/60)+' h ':'')+mins%60+' min';
 return {fraction:Math.max(0,elapsed/(target*3600000)),label:item.resolved?'Resuelto en '+duration:remaining<=0?'Vencido hace '+duration:duration+' restantes',due:new Date(Date.parse(item.created)+target*3600000).toISOString()};
}
export function Meter({item}:{item:Incident}){
 const {fraction}=sla(item);
 return <div className="meter"><span style={{width:Math.min(100,fraction*100)+'%',background:item.resolved?'#2e8b57':fraction>=1?'#ff7b72':fraction>=.5?'#f5b97a':'#7fa2f0'}}/></div>;
}
export default function Dashboard(){
 const items=useIncidents();
 const [period,setPeriod]=useState(14);
 const ongoing=items.filter(active);
 const critical=ongoing.filter(i=>i.priority==='Crítica').sort((a,b)=>sla(b).fraction-sla(a).fraction);
 const overdue=critical.filter(i=>sla(i).fraction>=1).length;
 const resolved=items.filter(i=>i.resolved&&Date.parse(demoNow)-Date.parse(i.resolved)<30*86400000);
 const average=resolved.length?Math.round(resolved.reduce((sum,i)=>sum+(Date.parse(i.resolved!)-Date.parse(i.created))/60000,0)/resolved.length):0;
 const days=Array.from({length:period},(_,i)=>{
  const date=new Date(2026,10,10-period+i);
  const history=14-period+i;
  const sameDay=(value:string)=>new Date(value).toDateString()===date.toDateString();
  const created=(history>=0?trend.created[history]:items.filter(item=>sameDay(item.created)).length)+(i===period-1?items.filter(item=>Number(item.id.slice(3))>1087).length:0);
  const closed=(history>=0?trend.resolved[history]:resolved.filter(item=>sameDay(item.resolved!)).length)+(i===period-1?resolved.filter(item=>item.resolved===demoNow).length:0);
  return {label:i===period-1?'Hoy':String(date.getDate()),created,closed};
 });
 const totalCreated=days.reduce((sum,d)=>sum+d.created,0);
 const totalClosed=days.reduce((sum,d)=>sum+d.closed,0);
 const net=totalCreated-totalClosed;
 const scale=Math.max(6,...days.flatMap(d=>[d.created,d.closed]));
 const recent=[...items].sort((a,b)=>Date.parse(b.created)-Date.parse(a.created)||b.id.localeCompare(a.id)).slice(0,6);
 const events=items.flatMap(i=>i.activity.map(e=>({...e,id:i.id}))).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,6);
 const categoryCounts=categories.map(c=>({name:c,count:ongoing.filter(i=>i.category===c).length}));
 const max=Math.max(1,...categoryCounts.map(c=>c.count));
 return <Shell items={items} title="Panel" view="activos"><div className="space-y-4">
  <header className="mb-5"><p className="eyebrow mb-2">Lunes 9 nov · 21:09</p><h1>{ongoing.length} incidentes activos. <span className="muted font-medium">En {period} días {net>0?'entraron '+net+' más de los que se resolvieron.':net<0?'se resolvieron '+Math.abs(net)+' más de los que entraron.':'se resolvieron tantos como entraron.'}</span></h1></header>
  <section className="attention"><div className="mb-3 flex flex-wrap items-center gap-3"><span className={'signal '+(!critical.length?'healthy':'')}/><h2>{critical.length?'Requiere atención':'Sin incidentes críticos activos'}</h2>{!!critical.length&&<span className="eyebrow text-[#a9b6cc]">{critical.length} críticos · {overdue} SLA vencido · {critical.filter(i=>!i.assignee).length} sin responsable</span>}<Link className="ml-auto text-[#9db4eb]" href={list('criticos')}>Ver críticos →</Link></div>
   {!!critical.length&&<div className="attention-grid">{critical.map(i=><Link className="attention-card" href={url(i.id)} key={i.id}><div className="flex justify-between gap-2"><span className="mono text-[#9db4eb]">{i.id}</span><span className="text-[#a9b6cc]">{i.status}</span></div><p className="my-2 min-h-9 font-medium">{i.title}</p><div className="mb-2 flex flex-wrap justify-between gap-2"><Avatar name={i.assignee}/><span className="text-[#f5b97a]">{sla(i).label}</span></div><Meter item={i}/></Link>)}</div>}
  </section>
  <section className="panel kpis" aria-label="Indicadores">{[
   ['Abiertos',ongoing.filter(i=>i.status==='Abierto').length,ongoing.filter(i=>!i.assignee).length+' sin responsable'],
   ['En progreso',ongoing.filter(i=>i.status==='En progreso').length,'Repartidos entre '+new Set(ongoing.map(i=>i.assignee).filter(Boolean)).size+' personas'],
   ['Resueltos · 30 días',resolved.length,'Tiempo medio: '+Math.floor(average/60)+' h '+average%60+' min'],
   ['Críticos activos',critical.length,overdue+' SLA vencido · objetivo 4 h'],
  ].map(([label,value,foot])=><div key={label}><p className="font-medium muted">{label}</p><strong className="block text-3xl tabular-nums my-2">{value}</strong><p className="muted text-xs">{foot}</p></div>)}</section>
  <div className="columns"><Panel title="Entradas vs. resoluciones" action={<div className="segments">{[7,14,30].map(d=><button key={d} aria-pressed={period===d} onClick={()=>setPeriod(d)}>{d} d</button>)}</div>}><div className="panel-body"><div className="mb-4 flex flex-wrap gap-4 text-xs"><span>■ Creados <b>{totalCreated}</b></span><span className="text-[#536ca6]">■ Resueltos <b>{totalClosed}</b></span><span className={net>0?'text-amber-700':''}>Saldo neto <b>{net>0?'+':''}{net}</b></span></div><div className="table-scroll"><div className="chart" style={{minWidth:period===30?620:330}}><div className="axis"><span>{scale}</span><span>{Math.round(scale/2)}</span><span>0</span></div>{days.map((d,i)=><div className="bar-day" key={i} title={d.label+' · '+d.created+' creados, '+d.closed+' resueltos'}><div className="bars"><i style={{height:d.created/scale*100+'%'}}/><i style={{height:d.closed/scale*100+'%'}}/></div><span>{d.label}</span></div>)}</div></div></div></Panel>
  <Panel title="Activos por prioridad" action={<span className="mono">{ongoing.length}</span>}><div className="panel-body"><div className="distribution">{priorities.map((p,i)=><i key={p} style={{flex:ongoing.filter(item=>item.priority===p).length,background:colors[i]}}/>)}</div><ul className="mt-3 space-y-2">{priorities.map(p=>{const count=ongoing.filter(i=>i.priority===p).length;return <li className="flex items-center gap-3" key={p}><Priority value={p}/><strong className="ml-auto">{count}</strong><span className="mono muted w-9 text-right">{ongoing.length?Math.round(count/ongoing.length*100):0}%</span></li>})}</ul><p className="eyebrow border-t border-slate-100 mt-4 pt-3 mb-2">Por categoría</p>{categoryCounts.map(c=><div className="category-bar" key={c.name}><span>{c.name}</span><div className="meter"><span style={{width:c.count/max*100+'%',background:'#c7d3ea'}}/></div><b>{c.count}</b></div>)}</div></Panel></div>
  <div className="columns"><Panel title="Incidentes recientes" action={<Link className="text-[#3867d6]" href={list()}>Ver todos →</Link>}><div className="table-scroll"><table className="incident-table"><thead><tr>{['ID','Incidente','Prioridad','Estado','Responsable','Creado'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{recent.map(i=><tr key={i.id}><td><Link className="id-chip" href={url(i.id)}>{i.id}</Link></td><td><Link className="incident-title" href={url(i.id)}>{i.title}</Link></td><td><Priority value={i.priority}/></td><td><Status value={i.status}/></td><td><Avatar name={i.assignee}/></td><td className="muted">{dateLabel(i.created)}</td></tr>)}</tbody></table></div></Panel>
  <Panel title="Actividad"><ol className="panel-body timeline">{events.map((e,i)=><li key={e.id+i}><span>{e.text} <Link className="id-chip" href={url(e.id)}>{e.id}</Link><small className="block muted mt-1">{dateLabel(e.date)}</small></span></li>)}</ol></Panel></div>
 </div></Shell>;
}
