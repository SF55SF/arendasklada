const form=document.querySelector("[data-admin-editor]");
let slug=form?.getAttribute("data-object-slug")||"object";
let adminItems=[];
try{adminItems=JSON.parse(form?.getAttribute("data-admin-items")||"[]")}catch{}
const adminItemBySlug=new Map(adminItems.map((item)=>[String(item.pageSlug||""),item]));
const setFormObject=(nextSlug)=>{
const item=adminItemBySlug.get(nextSlug);
if(!form||!item)return;
slug=nextSlug;form.setAttribute("data-object-slug",slug);
for(const element of Array.from(form.elements)){const name=element.getAttribute("name");if(!name||element.getAttribute("type")==="file")continue;const value=item[name];if(element instanceof HTMLInputElement||element instanceof HTMLSelectElement)element.value=value===undefined||value===null?"":String(value);}
const heading=form.querySelector(".editor-head h2");if(heading)heading.textContent=String(item.title||item.detailTitle||slug);
const preview=document.querySelector("[data-object-preview]");if(preview)preview.setAttribute("src","/"+slug+"/");
const url=new URL(window.location.href);url.searchParams.set("object",slug);window.history.replaceState({},"",url);
};
document.querySelectorAll("[data-object-item]").forEach((link)=>link.addEventListener("click",(event)=>{event.preventDefault();setFormObject(link.getAttribute("data-object-slug")||slug)}));
const requestedSlug=new URL(window.location.href).searchParams.get("object");if(requestedSlug)setFormObject(requestedSlug);
const ext=(file)=>{const raw=(file.name.split(".").pop()||"jpg").toLowerCase();const ok="abcdefghijklmnopqrstuvwxyz0123456789";return Array.from(raw).filter((char)=>ok.includes(char)).join("")||"jpg"};
const filename=(kind,index,file)=>slug+"-"+kind+"-"+String(index).padStart(2,"0")+"."+ext(file);
document.querySelectorAll("[data-auto-upload]").forEach((input)=>input.addEventListener("change",()=>{
const kind=input.getAttribute("data-auto-upload")||"file";
const output=document.querySelector("[data-upload-output="+kind+"]");
if(!output)return;
output.innerHTML="";
Array.from(input.files||[]).forEach((file,index)=>{
const figure=document.createElement("figure");
const image=document.createElement("img");
image.src=URL.createObjectURL(file);
image.alt=filename(kind,index+1,file);
const code=document.createElement("code");
code.textContent=filename(kind,index+1,file);
figure.append(image,code);
output.append(figure);
});
}));
/* ADMIN_SAVE_CLIENT_START */
const saveButton=form?.querySelector("[data-admin-save]");
const saveStatus=form?.querySelector("[data-admin-status]");
const numericFields=new Set(["area","latitude","longitude","builtYear"]);
const setSaveStatus=(message,state="")=>{if(!saveStatus)return;saveStatus.textContent=message;saveStatus.dataset.state=state};
form?.addEventListener("input",()=>setSaveStatus("Есть несохранённые изменения.","dirty"));
form?.addEventListener("submit",async(event)=>{
event.preventDefault();
if(!saveButton)return;
const currentSlug=form.getAttribute("data-object-slug")||slug;
const fields={};
try{
for(const [key,value] of new FormData(form).entries()){
if(typeof value!=="string")continue;
const raw=value.trim();
if(numericFields.has(key)){if(raw==="")continue;const number=Number(raw.split(",").join("."));if(!Number.isFinite(number))throw Error("Некорректное число в поле "+key);fields[key]=number;}else fields[key]=raw;
}
saveButton.disabled=true;setSaveStatus("Сохраняем...","saving");
const response=await fetch("/api/admin/save",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({slug:currentSlug,fields})});
const result=await response.json().catch(()=>({}));
if(!response.ok)throw Error(result.error||("Ошибка сохранения: "+response.status));
setSaveStatus(result.unchanged?"Изменений нет.":"Сохранено. Обновление сайта запущено.","ok");
}catch(error){setSaveStatus(error instanceof Error?error.message:"Ошибка сохранения","error");}
finally{saveButton.disabled=false;}
});
/* ADMIN_SAVE_CLIENT_END */
