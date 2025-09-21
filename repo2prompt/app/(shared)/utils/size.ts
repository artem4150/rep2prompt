export function formatBytes(b:number){
if (b===0) return '0 B';
const k = 1024; const dm = 2; const sizes = ['B','KB','MB','GB'];
const i = Math.floor(Math.log(b)/Math.log(k));
return parseFloat((b/Math.pow(k,i)).toFixed(dm)) + ' ' + sizes[i];
}