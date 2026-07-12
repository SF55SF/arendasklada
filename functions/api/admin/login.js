import {createSession,sessionCookie,verifyPassword} from '../../_auth.js';
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const safeNext=(value)=>{const next=String(value||'/admin-preview/');return next==='/admin-preview'||next.startsWith('/admin-preview/')?next:'/admin-preview/';};
export async function onRequestPost({request,env}){
let body;try{body=await request.json();}catch{return json({error:'Некорректный запрос'},400);}
const username=String(body&&body.username||'').trim().toLowerCase(),password=String(body&&body.password||'');
if(!username||!password)return json({error:'Введите логин и пароль'},400);
const valid=await verifyPassword(username,password,env);if(!valid)return json({error:'Неверный логин или пароль'},401);
const token=await createSession(username,env),next=safeNext(body&&body.next);
return json({ok:true,next},200,{'set-cookie':sessionCookie(token)});
}