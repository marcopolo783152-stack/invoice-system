const fs=require('node:fs'),cp=require('node:child_process');
const before=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
const result=cp.spawnSync('npm',['install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund'],{stdio:'inherit'});
if(result.status)process.exit(result.status);
const after=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
const packages={};for(const [key,val]of Object.entries(after.packages||{}))if(JSON.stringify(before.packages?.[key])!==JSON.stringify(val))packages[key]=val;
const removed=Object.keys(before.packages||{}).filter(key=>!after.packages[key]);
console.log('LOCK_PATCH='+JSON.stringify({packages,removed}));
