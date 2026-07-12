import {verifySession} from './_auth.js';
const json=(data,status)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export async function onRequest(context){
const path=new URL(context.request.url).pathname;
const adminPage=path==='/admin-preview'||path.startsWith('/admin-preview/');
const adminApi=path.startsWith('/api/admin/');
const publicAdminApi=path==='/api/admin/login'||path==='/api/admin/logout';
if(!adminPage&&(!adminApi||publicAdminApi))return context.next();
const session=await verifySession(context.request,context.env);
if(session){context.data.adminUser=session.username;return context.next();}
if(adminApi)return json({error:'Authentication required'},401);
const loginUrl=new URL('/admin-login/',context.request.url);loginUrl.searchParams.set('next',path);return Response.redirect(loginUrl.toString(),302);
}