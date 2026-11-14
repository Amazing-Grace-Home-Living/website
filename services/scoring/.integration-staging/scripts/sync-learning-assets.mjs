import { readFile,writeFile,mkdir } from 'node:fs/promises';
const destination=new URL('../assets/Tools/learning/',import.meta.url);await mkdir(destination,{recursive:true});
for(const file of ['content.js','model.js','view.js','journeys.css']){
 const source=await readFile(new URL('../src/game/learning/journeys/'+file,import.meta.url),'utf8');
 await writeFile(new URL(file,destination),source);
}
