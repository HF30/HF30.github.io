import {DIRECTORY_COLUMNS,formatDirectoryMetric,compareDirectoryRows} from './directory.mjs';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s,root=document) => [...root.querySelectorAll(s)];
let directoryView='performance',directoryDirection='asc';
const directoryRows=$$('[data-goalie-row]').map(row=>({row,id:row.dataset.id,name:row.dataset.displayName,lastName:row.dataset.lastName,metrics:JSON.parse(row.dataset.metrics||'{}'),base:JSON.parse(row.dataset.metrics||'{}'),lines:JSON.parse(row.dataset.lines||'[]')}));
function filterGoalies(){
 const query=($('#goalie-search')?.value||'').toLowerCase().trim(),team=$('#team-filter')?.value||'',league=$('#league-filter')?.value||'',season=$('#season-filter')?.value||'',gameType=$('#game-type-filter')?.value||'2';let count=0;
 for(const entry of directoryRows){const {row,lines,base}=entry;
 const line=lines.find(x=>(!league||x.league===league)&&(!season||x.season===season)&&(gameType==='other'?![1,2,3].includes(x.gameTypeId):String(x.gameTypeId??2)===gameType));
 row.hidden=!(line&&row.dataset.name.includes(query)&&(!team||row.dataset.team===team));
 if(line){const current=line.season===row.dataset.currentSeason&&line.league===row.dataset.currentLeague&&(line.gameTypeId??2)===2;
 entry.metrics=Object.fromEntries(DIRECTORY_COLUMNS.map(c=>[c.key,current?base[c.key]:['gp','w','l','svp','gaa','sa','shutouts'].includes(c.key)?line[c.key]??null:null]));
 for(const cell of $$('[data-directory-metric]',row))cell.textContent=formatDirectoryMetric(cell.dataset.directoryMetric,entry.metrics[cell.dataset.directoryMetric]);
 $('[data-row-league]',row).textContent=line.league||'No record';}
 if(!row.hidden)count++;
 }
 if($('#directory-count'))$('#directory-count').textContent=`${count} goalie profile${count===1?'':'s'}`;
 if($('#directory-empty')){const empty=$('#directory-empty');empty.hidden=count>0;$('h3',empty).textContent='No records loaded for these filters';$('p',empty).textContent=gameType==='1'?'Preseason records are not loaded for this selection. Choose another game type, season or league.':'Try another name, game type, season or league.';}
 renderLeaders();
 sortGoalies();
}
function renderLeaders(){
 const grid=$('#goalie-leaders');if(!grid)return;
 const categories=[['gsax','Goals saved above expected','desc'],['svp','Save percentage','desc'],['gaa','Goals against average','asc'],['w','Wins','desc'],['shutouts','Shutouts','desc'],['elite','Elite appearances','desc']];
 const scope=[$('#league-filter')?.value||'Selected leagues',$('#season-filter')?.value,$('#game-type-filter')?.selectedOptions[0]?.textContent].filter(Boolean).join(' · ');
 $('#leaders-scope').textContent=scope+' · SV% and GAA: minimum 150 shots faced. Elite grades are provisional and cover captured games.';
 grid.replaceChildren();
 for(const [key,label,direction] of categories){
  const ranked=directoryRows.filter(e=>!e.row.hidden&&typeof e.metrics[key]==='number'&&Number.isFinite(e.metrics[key])&&(!['svp','gaa'].includes(key)||e.metrics.sa>=150)).sort((a,b)=>compareDirectoryRows(a,b,key,direction)).slice(0,3);
  const card=document.createElement('article');card.className='leader-card';
  const heading=document.createElement('button');heading.className='leader-category';heading.textContent=label+' ↗';heading.dataset.leaderSort=key;heading.addEventListener('click',()=>{setDirectorySort(key);$('#directory').scrollIntoView({behavior:'smooth'});});card.append(heading);
  if(!ranked.length){const empty=document.createElement('p');empty.className='leader-unavailable';empty.textContent='No qualifying records';card.append(empty);}
  ranked.forEach((entry,i)=>{
   const link=document.createElement('a');link.className=i===0?'leader-first':'leader-runner';link.href='/goalie/'+encodeURIComponent(entry.id)+'/';
   const rank=document.createElement('span');rank.className='leader-rank';rank.textContent=String(1+directoryRows.filter(e=>!e.row.hidden&&typeof e.metrics[key]==='number'&&Number.isFinite(e.metrics[key])&&(!['svp','gaa'].includes(key)||e.metrics.sa>=150)&&(direction==='asc'?e.metrics[key]<entry.metrics[key]:e.metrics[key]>entry.metrics[key])).length);link.append(rank);
   if(i===0){const portrait=entry.row.querySelector('img');if(portrait){const image=portrait.cloneNode();image.alt='';image.className='leader-portrait';link.append(image);}}
   const name=document.createElement('span');name.className='leader-name';name.textContent=entry.name;const team=document.createElement('small');team.textContent=entry.row.dataset.team||'';name.append(team);link.append(name);
   const value=document.createElement('strong');value.textContent=formatDirectoryMetric(key,entry.metrics[key]);link.append(value);card.append(link);
  });grid.append(card);
 }
}
function sortGoalies(){
 const key=$('#sort-goalies')?.value||'name';directoryRows.sort((a,b)=>compareDirectoryRows(a,b,key,directoryDirection));
 for(const {row} of directoryRows)$('#goalie-rows').append(row);
 for(const th of $$('[data-sort-header]')){const active=th.dataset.sortHeader===key;th.setAttribute('aria-sort',active?(directoryDirection==='asc'?'ascending':'descending'):'none');$('[data-sort-arrow]',th).textContent=active?(directoryDirection==='asc'?'↑':'↓'):'';}
 const direction=$('#directory-direction');if(direction)direction.textContent=key==='name'?(directoryDirection==='asc'?'A → Z':'Z → A'):(directoryDirection==='asc'?'Low → high':'High → low');
}
function setDirectoryView(view){directoryView=view;for(const cell of $$('[data-views]'))cell.hidden=!cell.dataset.views.split(' ').includes(view);
 for(const button of $$('[data-directory-view]')){const active=button.dataset.directoryView===view;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
 const notes={performance:'Season records and GSAx cover the selected league and season. Stolen/blown totals cover eligible captured starts.',starts:'QS uses actual save percentage. Every graded appearance has one provisional performance tier; stolen/blown are separate impact flags. Totals cover available games, not necessarily the full season.',tracking:'Selected reviewed goals only. Depth and time are medians excluding estimated readings. Sequence counts describe reviewed goals, not all-shot tendencies.'};
 if($('#directory-scope'))$('#directory-scope').textContent=notes[view];}
function setDirectorySort(key,toggle=false){const previous=$('#sort-goalies').value;$('#sort-goalies').value=key;directoryDirection=toggle&&previous===key?(directoryDirection==='asc'?'desc':'asc'):(key==='name'||key==='gaa'?'asc':'desc');
 const column=DIRECTORY_COLUMNS.find(c=>c.key===key);if(column&&!column.views.includes(directoryView))setDirectoryView(column.views[0]);sortGoalies();}
$('#goalie-search')?.addEventListener('input',filterGoalies);
for(const id of ['team-filter','league-filter','season-filter','game-type-filter'])$('#'+id)?.addEventListener('change',filterGoalies);
$('#sort-goalies')?.addEventListener('change',event=>setDirectorySort(event.target.value));
$('#directory-direction')?.addEventListener('click',()=>{directoryDirection=directoryDirection==='asc'?'desc':'asc';sortGoalies();});
for(const button of $$('[data-directory-sort]'))button.addEventListener('click',()=>setDirectorySort(button.dataset.directorySort,true));
for(const button of $$('[data-directory-view]'))button.addEventListener('click',()=>setDirectoryView(button.dataset.directoryView));
if($('#goalie-rows'))filterGoalies();
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const number=(x,d=0)=>finite(x)?x.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const profile=(()=>{try{return JSON.parse($('#profile-data')?.textContent||'null')}catch{return null}})();
const evidence=profile?.evidence||[], byKey=new Map(evidence.map(e=>[e.key,e]));
let selectedKey=evidence[0]?.key, matching=[...evidence];
const gameKey=e=>String(e.gameId??e.key?.split('_')[0]??e.date+'|'+e.opponent);
const setText=(selector,text)=>{const el=$(selector);if(el)el.textContent=text};
function fillOptions(id,entries){const sel=$(id);if(!sel)return;for(const [value,label] of entries){const option=document.createElement('option');option.value=value;option.textContent=label;sel.append(option)}}
function uniqueOptions(field,label=field){return [...new Map(evidence.filter(e=>e[field]).map(e=>[e[field],e[label]||e[field]])).entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1])))}
function safeVideo(value){try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname==='nhl.com'||u.hostname.endsWith('.nhl.com'))&&u.pathname.startsWith('/video/')?u.href:null}catch{return null}}
function sequenceMatch(e,value){if(!value)return true;if(value==='behind-net')return e.behindNet!==null&&e.behindNet!==undefined&&e.behindNet.crossings>0;if(value==='pass'||value==='carry')return(e.royalRoadCounts?.[value]||0)>0;return e.passSequences?.some(p=>p.direction===value)||false}
function chip(text){const span=document.createElement('span');span.className='sequence-chip';span.textContent=text;return span}
function selectPlay(key,{updateUrl=true}={}){
 const e=byKey.get(key);if(!e)return;selectedKey=key;
 const still=$('#selected-still'),empty=$('#viewer-empty');
 if(still){still.hidden=!e.still;if(e.still)still.src=e.still;else still.removeAttribute('src')}
 if(empty)empty.hidden=!!e.still;
 setText('#selected-title',e.title||e.shooter||'Goal review');
 setText('#selected-date',[e.date,e.opponent].filter(Boolean).join(' · '));setText('#selected-play-type',e.playType||'');
 setText('#selected-depth',finite(e.depthFt)?number(e.depthFt,1)+' ft':'—');setText('#selected-depth-status',finite(e.depthFt)?e.depthEstimated?'Estimated reading':'Measured reading':'Unavailable');
 setText('#selected-sight',e.sight||'Unclassified');setText('#selected-timing',finite(e.timingSeconds)?number(e.timingSeconds,2)+' s':'—');setText('#selected-timing-status',finite(e.timingSeconds)?e.timingEstimated?'Estimated reading':'Available before release':'Unavailable');
 const deep=$('#selected-deep-link');if(deep){deep.href=profile.reviewPage?`/goalie/${profile.id}/?play=${encodeURIComponent(e.key)}#film`:e.url||'/goals/';deep.textContent=profile.reviewPage?'Open goalie profile ↗':'Open full review ↗';deep.hidden=!e.url}
 const video=$('#selected-video-link'),url=safeVideo(e.videoUrl||e.externalVideoUrl);if(video){video.hidden=!url;if(url)video.href=url;else video.removeAttribute('href')}
 const seq=$('#selected-sequence');if(seq){seq.replaceChildren();if(e.royalRoadCounts){seq.append(chip(`${number(e.royalRoadCounts.pass||0)} royal-road passes`),chip(`${number(e.royalRoadCounts.carry||0)} royal-road carries`))}else seq.append(chip('Royal-road classification unavailable'));
  for(const p of e.passSequences||[])if(p.direction)seq.append(chip(`Pass ${p.n}: ${p.direction}${p.side?' · '+p.side:''}`));
  if(e.behindNet!=null)seq.append(chip(`${number(e.behindNet.crossings||0)} behind-net crossings`));else seq.append(chip('Behind-net classification unavailable'));
  if(e.strength)seq.append(chip(e.strength));
 }
 for(const button of $$('[data-play-key]')){const active=button.dataset.playKey===key;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))}
 const position=matching.findIndex(x=>x.key===key);setText('#playlist-position',position>=0?`${position+1} / ${matching.length}`:'Selected play outside filter');
 if($('#previous-play'))$('#previous-play').disabled=position<=0;
 if($('#next-play'))$('#next-play').disabled=position<0||position>=matching.length-1;
 if(updateUrl){const u=new URL(location.href);u.searchParams.set('play',key);history.replaceState(null,'',u)}
}
function filterPlaylist({selectFirst=true}={}){
 const q=($('#playlist-search')?.value||'').trim().toLowerCase(),game=$('#film-game')?.value||'',opponent=$('#film-opponent')?.value||'',type=$('#film-type')?.value||'',sight=$('#film-sight')?.value||'',sequence=$('#film-sequence')?.value||'',strength=$('#film-strength')?.value||'',order=$('#film-sort')?.value||'newest';
 matching=evidence.filter(e=>(!q||[e.title,e.shooter,e.opponent,e.gameLabel,e.playType,e.date,e.strength].join(' ').toLowerCase().includes(q))&&(!game||gameKey(e)===game)&&(!opponent||e.opponent===opponent)&&(!type||e.playType===type)&&(!sight||(sight==='unknown'?!e.sight:e.sight===sight))&&sequenceMatch(e,sequence)&&(!strength||e.strength===strength));
 matching.sort((a,b)=>order==='oldest'?String(a.date).localeCompare(String(b.date)):order==='depth'?(finite(b.depthFt)?b.depthFt:-Infinity)-(finite(a.depthFt)?a.depthFt:-Infinity):order==='timing'?(finite(a.timingSeconds)?a.timingSeconds:Infinity)-(finite(b.timingSeconds)?b.timingSeconds:Infinity):String(b.date).localeCompare(String(a.date)));
 const keys=new Set(matching.map(e=>e.key));for(const button of $$('[data-play-key]'))button.hidden=!keys.has(button.dataset.playKey);
 for(const e of matching){const button=$$('[data-play-key]').find(b=>b.dataset.playKey===e.key);if(button)$('#playlist-items').append(button)}
 setText('#playlist-count',`${matching.length} of ${evidence.length} plays`);if($('#playlist-empty'))$('#playlist-empty').hidden=matching.length>0;
 if(selectFirst&&!keys.has(selectedKey)&&matching.length)selectPlay(matching[0].key);else if(selectedKey)selectPlay(selectedKey,{updateUrl:false});
}
if(profile&&$('#playlist-items')){
 fillOptions('#film-game',[...new Map(evidence.map(e=>[gameKey(e),e.gameLabel||[e.date,e.opponent].filter(Boolean).join(' · ')])).entries()]);fillOptions('#film-opponent',uniqueOptions('opponent'));fillOptions('#film-type',uniqueOptions('playType'));fillOptions('#film-strength',uniqueOptions('strength'));
 for(const id of ['film-game','film-opponent','film-type','film-sight','film-sequence','film-strength','film-sort'])$('#'+id)?.addEventListener('change',()=>filterPlaylist());$('#playlist-search')?.addEventListener('input',()=>filterPlaylist());
 for(const button of $$('[data-play-key]'))button.addEventListener('click',()=>selectPlay(button.dataset.playKey));
 $('#playlist-clear')?.addEventListener('click',()=>{for(const id of ['film-game','film-opponent','film-type','film-sight','film-sequence','film-strength'])$('#'+id).value='';$('#playlist-search').value='';filterPlaylist()});
 $('#previous-play')?.addEventListener('click',()=>{const i=matching.findIndex(e=>e.key===selectedKey);if(i>0)selectPlay(matching[i-1].key)});$('#next-play')?.addEventListener('click',()=>{const i=matching.findIndex(e=>e.key===selectedKey);if(i>=0&&i<matching.length-1)selectPlay(matching[i+1].key)});
 for(const button of $$('[data-sequence-filter]'))button.addEventListener('click',()=>{$('#film-sequence').value=button.dataset.sequenceFilter;filterPlaylist();$('#film').scrollIntoView({behavior:'smooth'})});
 for(const button of $$('[data-game-film]'))button.addEventListener('click',()=>{$('#film-game').value=button.dataset.gameFilm;filterPlaylist();$('#film').scrollIntoView({behavior:'smooth'})});
 filterPlaylist({selectFirst:false});selectPlay(new URLSearchParams(location.search).get('play')||selectedKey,{updateUrl:false});
}
for(const button of $$('[data-zone-mode]'))button.addEventListener('click',()=>{const scope=button.closest('.shot-profile'),mode=button.dataset.zoneMode;for(const b of $$('[data-zone-mode]',scope)){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))}for(const label of $$('[data-zone-value]',scope)){const raw=label.dataset[mode];label.textContent=raw===''?'—':mode==='svp'?(Number(raw)*100).toFixed(1)+'%':number(Number(raw))}});
function selectZone(id){for(const e of $$('[data-zone],[data-zone-row]'))e.classList.toggle('active',(e.dataset.zone||e.dataset.zoneRow)===id)}
for(const el of $$('[data-zone],[data-zone-row]')){const id=el.dataset.zone||el.dataset.zoneRow;el.addEventListener('click',()=>selectZone(id));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectZone(id)}})}
function filterGames(){const grade=$('#game-grade')?.value||'',order=$('#game-sort')?.value||'newest';const rows=$$('[data-game-row]');let count=0;for(const row of rows){row.hidden=grade==='low-sample'?row.dataset.lowSample!=='true':grade==='traditional-quality'?row.dataset.quality!=='true':grade==='traditional-bad'?row.dataset.reallyBad!=='true':grade==='stolen'?row.dataset.stolen!=='true':grade==='blown'?row.dataset.blown!=='true':grade?row.dataset.grade!==grade:false;if(!row.hidden)count++}rows.sort((a,b)=>order==='oldest'?a.dataset.date.localeCompare(b.dataset.date):order==='gsax'?(b.dataset.gsax===''?-Infinity:Number(b.dataset.gsax))-(a.dataset.gsax===''?-Infinity:Number(a.dataset.gsax)):b.dataset.date.localeCompare(a.dataset.date));for(const row of rows)$('#game-rows').append(row);setText('#game-count',`${count} games`);if($('#game-empty'))$('#game-empty').hidden=count>0;for(const button of $$('[data-grade-filter]'))button.classList.toggle('active',button.dataset.gradeFilter===grade)}
for(const id of ['game-grade','game-sort'])$('#'+id)?.addEventListener('change',filterGames);for(const button of $$('[data-grade-filter]'))button.addEventListener('click',()=>{$('#game-grade').value=$('#game-grade').value===button.dataset.gradeFilter?'':button.dataset.gradeFilter;filterGames()});
for(const button of $$('[data-print]'))button.addEventListener('click',()=>window.print());
for(const img of $$('img'))img.addEventListener('error',()=>{img.hidden=true;if(img.id==='selected-still'&&$('#viewer-empty'))$('#viewer-empty').hidden=false});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&$('#goalie-search')){e.preventDefault();$('#goalie-search').focus()}});

function filterLibrary(){const query=($('#library-search')?.value||'').toLowerCase().trim(),goalie=$('#library-goalie')?.value||'',sight=$('#library-sight')?.value||'',sequence=$('#library-sequence')?.value||'';let count=0;for(const play of $$('[data-library-play]')){play.hidden=!((!query||play.dataset.search.includes(query))&&(!goalie||play.dataset.goalie===goalie)&&(!sight||play.dataset.sight===sight)&&(!sequence||play.dataset.sequence.split(' ').includes(sequence)));if(!play.hidden)count++;}if($('#library-count'))$('#library-count').textContent=`${count} plays`;if($('#library-empty'))$('#library-empty').hidden=count>0;}
$('#library-search')?.addEventListener('input',filterLibrary);for(const id of ['library-goalie','library-sight','library-sequence'])$('#'+id)?.addEventListener('change',filterLibrary);if($('#library-count'))filterLibrary();
