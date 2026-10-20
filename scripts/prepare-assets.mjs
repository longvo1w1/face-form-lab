import {readFile,writeFile,mkdir,rename,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const assets=JSON.parse(await readFile(new URL('./assets.json',import.meta.url),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const asset of assets){
 const target=path.join(root,'dist/assets',asset.path);
 try{if(hash(await readFile(target))===asset.sha256){console.log('OK '+asset.path);continue}}catch(e){if(e.code!=='ENOENT')throw e}
 console.log('Downloading '+asset.path);
 const response=await fetch(asset.url,{signal:AbortSignal.timeout(180000)});
 if(!response.ok)throw Error('Download failed: '+response.status+' '+asset.url);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(hash(bytes)!==asset.sha256)throw Error('Checksum mismatch: '+asset.path);
 await mkdir(path.dirname(target),{recursive:true});
 const temporary=target+'.tmp';
 try{await writeFile(temporary,bytes);await rename(temporary,target)}finally{await rm(temporary,{force:true})}
}
console.log('Assets verified. Run npm start; open http://localhost:8080');
