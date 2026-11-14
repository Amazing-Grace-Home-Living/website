import { createServer } from 'node:http';
import { readFile,realpath } from 'node:fs/promises';
import { resolve,extname,sep } from 'node:path';
import { pathToFileURL } from 'node:url';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.mp3':'audio/mpeg','.mid':'audio/midi','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};
const directories=new Set(['src','arcade','lms','stories','audio-library','assets','listings','nicholai','profile','public']);
export function createPreviewServer(root){
 root=resolve(root);
 return createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),parts=pathname.split(/[\\/]/).filter(Boolean);
   if(parts.some(part=>part.startsWith('.'))||parts[0]&&parts[0]!=='index.html'&&!directories.has(parts[0])){res.writeHead(404);res.end('Not found');return;}
   let file=resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
   if(pathname.endsWith('/'))file=resolve(file,'index.html');
   const type=types[extname(file).toLowerCase()];if(!type){res.writeHead(404);res.end('Not found');return;}
   const [actualRoot,actualFile]=await Promise.all([realpath(root),realpath(file)]);if(!actualFile.startsWith(actualRoot+sep)){res.writeHead(403);res.end();return;}
   const body=await readFile(actualFile);res.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404);res.end('Not found');}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const root=resolve(process.argv[2]||'.'),port=Number(process.env.PORT||4173);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Choose a port from 1 to 65535.');
 const server=createPreviewServer(root);server.on('error',error=>{console.error('Preview could not start: '+error.code);process.exitCode=1;});server.listen(port,'127.0.0.1',()=>console.log('Serving http://127.0.0.1:'+port));
}
