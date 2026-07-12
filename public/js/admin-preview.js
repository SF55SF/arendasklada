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