import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPreviewServer} from '../scripts/serve.mjs';
test('preview serves public learning assets but never dotfiles, credentials, backend modules or unsupported methods',async t=>{
 const root=await mkdtemp(join(tmpdir(),'grace-preview-'));t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(join(root,'lms'));await writeFile(join(root,'index.html'),'<h1>Arcade</h1>');await writeFile(join(root,'lms','index.html'),'<h1>Learn</h1>');await writeFile(join(root,'.env.local'),'fake-secret-value');await writeFile(join(root,'bridge.mjs'),'private backend source');
 const server=createPreviewServer(root);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>server.close());const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(base)).status,200);assert.match(await (await fetch(base+'/lms/')).text(),/Learn/);
 for(const url of ['/.env.local','/bridge.mjs','/assets/%2eenv','/src/%2e%2e%2f.env.local'])assert.notEqual((await fetch(base+url)).status,200);
 assert.equal((await fetch(base+'/lms/',{method:'POST'})).status,405);assert.equal((await (await fetch(base+'/lms/',{method:'HEAD'})).text()),'');
});
