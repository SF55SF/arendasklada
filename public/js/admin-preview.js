const form=document.querySelector("[data-admin-editor]");
let slug=form?.getAttribute("data-object-slug")||"object";
document.querySelectorAll("[data-object-slug]").forEach((link)=>link.addEventListener("click",()=>{slug=link.getAttribute("data-object-slug")||slug;form?.setAttribute("data-object-slug",slug)}));
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
