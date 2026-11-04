// Directory metrics retain their league, season and game-type scope.
export const DIRECTORY_COLUMNS=[
 ['gp','GP','Games played','performance'],['w','W','Wins','performance'],['l','L','Losses','performance'],['svp','SV%','Save percentage','performance'],['gaa','GAA','Goals against average','performance'],['gsax','GSAx','Season goals saved above expected','performance'],['sa','SA','Shots against','performance'],['shutouts','SO','Shutouts','performance'],['stolen','Stolen','Stolen starts among eligible captured games','performance starts'],['blown','Blown','Blown starts among eligible captured games','performance starts'],
 ['starts','Starts','Starts in the official game log','starts'],['qs','QS','Traditional quality starts','starts'],['qsrate','QS%','Traditional quality-start percentage','starts'],['elite','Elite','Elite appearances — provisional shot-quality grade','performance starts'],['quality','Quality','Quality appearances — provisional shot-quality grade','performance starts'],['average','Average','Average appearances — provisional shot-quality grade','performance starts'],['bad','Bad','Bad appearances — provisional shot-quality grade','performance starts'],['reallybad','Really bad','Really bad appearances — provisional shot-quality grade','performance starts'],['graded','Graded','Appearances with a five-tier grade','starts'],
 ['reviewed','Film','Selected goals reviewed on film','tracking'],['depth','Depth · ft','Median measured depth on reviewed goals; estimates excluded','tracking'],['timing','Time · s','Median time available on reviewed goals; estimates excluded','tracking'],['screened','Screened','Reviewed goals with screened or partially screened sight','tracking'],['rrpass','RR pass','Reviewed goals with a royal-road pass','tracking'],['rrcarry','RR carry','Reviewed goals with a royal-road carry','tracking'],['lowhigh','Low → high','Reviewed goals with a low-to-high pass','tracking'],['highlow','High → low','Reviewed goals with a high-to-low pass','tracking'],['behindnet','Behind net','Reviewed goals with a measured behind-net crossing','tracking']
].map(([key,label,title,views])=>({key,label,title,views:views.split(' ')}));
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const norm=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
export function lastNameKey(name,lastName){return norm(lastName||String(name||'').trim().split(/\s+/).at(-1));}
export function directoryMetrics(p){
 const s=p.seasonStats||{},a=p.startSummary||{},f=p.filmCoverage||{},e=p.evidence||[];
 const grades=p.appearanceSummary||a,hasGrades=(grades.ratedAppearances??a.ratedStarts)>0,hasFilm=(f.goals||0)>0;
 const rr=e.filter(r=>r.royalRoadCounts!=null),pass=e.filter(r=>Array.isArray(r.passSequences)&&r.passSequences.length),behind=e.filter(r=>r.behindNet!=null);
 const count=(rows,fn)=>rows.length?rows.filter(fn).length:null;
 return {gp:s.gp??null,w:s.w??null,l:s.l??null,svp:s.svp??null,gaa:s.gaa??null,gsax:p.publishedBenchmark?.gsax??p.benchmarkStats?.gsax??null,sa:s.sa??null,shutouts:s.shutouts??null,
 starts:a.starts>0?a.starts:null,qs:a.qualityStarts??null,qsrate:a.qualityStartRate??null,elite:hasGrades?grades.counts?.Elite??null:null,quality:hasGrades?grades.counts?.Quality??null:null,average:hasGrades?grades.counts?.Average??null:null,bad:hasGrades?grades.counts?.Bad??null:null,reallybad:hasGrades?grades.counts?.['Really Bad']??null:null,stolen:a.stolen??null,blown:a.blown??null,graded:hasGrades?(grades.ratedAppearances??a.ratedStarts):null,
 reviewed:hasFilm?f.goals:null,depth:f.measuredDepthMedianFt??null,timing:f.timingMedianSeconds??null,screened:f.screenRated>0?(f.sightCounts?.screened||0)+(f.sightCounts?.partial||0):null,rrpass:count(rr,r=>(r.royalRoadCounts.pass||0)>0),rrcarry:count(rr,r=>(r.royalRoadCounts.carry||0)>0),lowhigh:count(pass,r=>r.passSequences.some(x=>x.direction==='low-to-high')),highlow:count(pass,r=>r.passSequences.some(x=>x.direction==='high-to-low')),behindnet:count(behind,r=>r.behindNet.crossings>0)};
}
export function formatDirectoryMetric(key,v){if(!finite(v))return '—';if(key==='svp')return v.toFixed(3).replace(/^0/,'');if(key==='qsrate')return (100*v).toFixed(1)+'%';if(key==='gsax')return (v>0?'+':'')+v.toFixed(1);if(key==='gaa'||key==='timing')return v.toFixed(2);if(key==='depth')return v.toFixed(1);return v.toLocaleString('en-US');}
export function compareDirectoryRows(a,b,key='name',direction=key==='name'||key==='gaa'?'asc':'desc'){
 const names=()=>a.lastName.localeCompare(b.lastName)||a.name.localeCompare(b.name)||String(a.id).localeCompare(String(b.id));
 if(key==='name')return (direction==='asc'?1:-1)*names();
 const av=a.metrics[key],bv=b.metrics[key];if(!finite(av))return finite(bv)?1:names();if(!finite(bv))return -1;
 return (direction==='asc'?av-bv:bv-av)||names();
}
