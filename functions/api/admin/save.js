const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const allowed=new Set(['published','title','detailTitle','seoTitle','description','intro','area','areaMin','areaMax','price','ready','region','city','district','address','propertyType','warehouseClass','ceilingHeight','temperature','temperatureMode','leaseType','dockDoors','floor','builtYear','availableNow','latitude','longitude']);
const decodeBase64=(value)=>{const cleaned=String(value||'').split(String.fromCharCode(10)).join('').split(String.fromCharCode(13)).join('');const binary=atob(cleaned);return new TextDecoder().decode(Uint8Array.from(binary,(char)=>char.charCodeAt(0)));};
const encodeBase64=(value)=>{const bytes=new TextEncoder().encode(value);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);};
const yamlValue=(value)=>{if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Invalid number');return String(value);}if(typeof value==='boolean')return value?'true':'false';return JSON.stringify(String(value));};
const updateFrontmatter=(source,fields)=>{const crlf=String.fromCharCode(13,10),lf=String.fromCharCode(10),newline=source.includes(crlf)?crlf:lf;const lines=source.split(crlf).join(lf).split(lf);if(lines[0]!=='---')throw Error('Frontmatter start not found');let end=lines.indexOf('---',1);if(end<0)throw Error('Frontmatter end not found');for(const [key,value] of Object.entries(fields)){if(!allowed.has(key)||value===undefined)continue;const prefix=key+':',next=prefix+' '+yamlValue(value);let index=-1;for(let i=1;i<end;i++){if(lines[i]===prefix||lines[i].startsWith(prefix+' ')){index=i;break;}}if(index>=0)lines[index]=next;else{lines.splice(end,0,next);end++;}}return lines.join(newline);};
export async function onRequestPost({request,env}){

if(!env.GITHUB_TOKEN)return json({error:'GITHUB_TOKEN is not configured'},500);
let payload;try{payload=await request.json();}catch{return json({error:'Invalid JSON'},400);}
const slug=String(payload&&payload.slug||'').trim();if(!/^[a-z0-9-]+$/.test(slug))return json({error:'Invalid slug'},400);
const input=payload&&payload.fields&&typeof payload.fields==='object'&&!Array.isArray(payload.fields)?payload.fields:{},fields={};for(const [key,value] of Object.entries(input))if(allowed.has(key)&&value!==undefined)fields[key]=value;
if(!Object.keys(fields).length)return json({error:'No supported fields'},400);
const repo=env.GITHUB_REPO||'SF55SF/arendasklada',branch=env.GITHUB_BRANCH||'main',path='src/content/warehouses/'+slug+'.md';
const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+env.GITHUB_TOKEN,'User-Agent':'arendasklada-admin','X-GitHub-Api-Version':'2022-11-28'};
const readUrl='https://api.github.com/repos/'+repo+'/contents/'+path+'?ref='+encodeURIComponent(branch),currentResponse=await fetch(readUrl,{headers});
if(!currentResponse.ok)return json({error:'GitHub read failed',status:currentResponse.status,details:await currentResponse.text()},currentResponse.status);
const current=await currentResponse.json(),source=decodeBase64(current.content);let updated;try{updated=updateFrontmatter(source,fields);}catch(error){return json({error:error instanceof Error?error.message:'Frontmatter update failed'},400);}
if(updated===source)return json({ok:true,unchanged:true,path,sha:current.sha});
const saveResponse=await fetch('https://api.github.com/repos/'+repo+'/contents/'+path,{method:'PUT',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({message:'Update warehouse '+slug+' from admin',content:encodeBase64(updated),sha:current.sha,branch})});
if(!saveResponse.ok)return json({error:'GitHub save failed',status:saveResponse.status,details:await saveResponse.text()},saveResponse.status);
const result=await saveResponse.json();return json({ok:true,path,commit:result.commit&&result.commit.sha||null});
}