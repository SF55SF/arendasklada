import {createSession,sessionCookie,verifyPassword} from '../../_auth.js';
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const safeNext=(value)=>{const next=String(value||'/admin-preview/');return next==='/admin-preview'||next.startsWith('/admin-preview/')?next:'/admin-preview/';};
export async function onRequestPost({request,env}){
let stage='startup';
try{
if(!env.ADMIN_USERS)return json({error:'Секрет ADMIN_USERS не подключён к Production'},500);
if(!env.SESSION_SECRET)return json({error:'Секрет SESSION_SECRET не подключён к Production'},500);
let users;try{users=JSON.parse(env.ADMIN_USERS);}catch{return json({error:'ADMIN_USERS сохранён в неверном формате'},500);}
if(!users||typeof users!=='object'||Array.isArray(users)||!Object.keys(users).length)return json({error:'В ADMIN_USERS нет пользователей'},500);
let body;try{body=await request.json();}catch{return json({error:'Некорректный запрос'},400);}
const username=String(body&&body.username||'').trim().toLowerCase(),password=String(body&&body.password||'');
if(!username||!password)return json({error:'Введите логин и пароль'},400);
stage='verify-password';const valid=await verifyPassword(username,password,env);if(!valid)return json({error:'Неверный логин или пароль'},401);
stage='create-session';const token=await createSession(username,env),next=safeNext(body&&body.next);
return json({ok:true,next},200,{'set-cookie':sessionCookie(token)});
}catch(error){console.error('admin login error',stage,error);const name=error&&error.name?String(error.name):'UnknownError',message=error&&error.message?String(error.message):String(error);return json({error:'Ошибка функции входа ['+stage+']: '+name+': '+message,code:'LOGIN_RUNTIME_ERROR'},500);}
}
