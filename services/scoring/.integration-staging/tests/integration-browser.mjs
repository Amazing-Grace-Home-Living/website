import {MISSIONS} from '../src/game/nexus/content.js';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createBridge} from '../bridge.mjs';
import {createLearningStore} from '../learning-store.mjs';
import {createPreviewServer} from '../scripts/serve.mjs';
import {JOURNEYS} from '../src/game/learning/journeys/content.js';
const directory=await mkdtemp(join(tmpdir(),'grace-connected-learning-')),progressFile=join(directory,'progress.json');
let context,app,preview;const errors=[],bodies=[];let codexStarts=0,providerCalls=0;
const port=18824,previewPort=18825,base='http://127.0.0.1:'+port;
try{
 context=await chromium.launchPersistentContext(join(directory,'browser'),{channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true,args:['--disable-extensions-except='+resolve('assets/Tools'),'--load-extension='+resolve('assets/Tools')],viewport:{width:420,height:900}});
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:15000});
 const extensionId=new URL(worker.url()).host;
 const watch=page=>{page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().includes('/api/learning/')&&request.postData())bodies.push(JSON.parse(request.postData()));});};
 context.on('page',watch);await context.route('https://fonts.googleapis.com/**',route=>route.abort());await context.route('https://fonts.gstatic.com/**',route=>route.abort());
 app=await createBridge({cwd:resolve('.'),port,token:process.env.FIXTURE_SESSION_TOKEN,extensionIds:[extensionId],learningOrigins:['http://127.0.0.1:'+previewPort],learningStore:createLearningStore({file:progressFile}),integrationEnv:{OPENAI_API_KEY:process.env.FIXTURE_PROVIDER_KEY},connectionFactory:()=>{codexStarts++;throw Error('Codex not installed in this learning fixture');},providerFetch:async(url,options)=>{
  providerCalls++;
  if(url.endsWith('/models'))return new Response(JSON.stringify({data:[{id:'fixture-model'}]}));
  const payload=JSON.parse(options.body);assert.equal(payload.store,false);assert.ok(!JSON.stringify(payload).includes('fixture-provider-key-not-for-browser'));
  return new Response(JSON.stringify({output:[{type:'message',content:[{type:'output_text',text:'A filter selects objects matching a condition; it does not start or stop a service.'}]}]}));
 }});
 await new Promise((done,reject)=>{app.server.once('error',reject);app.server.listen(port,'127.0.0.1',done);});
 preview=createPreviewServer(resolve('.'));await new Promise((done,reject)=>{preview.once('error',reject);preview.listen(previewPort,'127.0.0.1',done);});
 console.log('Native extension loaded; companion listening.');
 const sidebar=await context.newPage();await sidebar.goto('chrome-extension://'+extensionId+'/panel.html');await sidebar.waitForSelector('#learning-root h2');
 const answer=async(page,lesson,root='#learning-root')=>{await page.locator(root+' [data-journey="'+lesson.id+'"]').click();for(const [index,q]of lesson.questions.entries())await page.locator(root+' input[name=q'+index+'][value="'+q.answer+'"]').check();await page.locator(root+' form button[type=submit]').click();await page.waitForFunction(selector=>document.querySelector(selector).textContent.includes('Mastered'),root+' .journey-feedback');};
 await answer(sidebar,JOURNEYS[0]);assert.match(await sidebar.locator('#learning-summary').textContent(),/60 journey XP/);
 await sidebar.locator('.connection-card summary').click();await sidebar.locator('#companion-url').fill(base);await sidebar.locator('#token').fill(process.env.FIXTURE_SESSION_TOKEN);await sidebar.locator('#connect').click();await sidebar.waitForFunction(()=>document.querySelector('#learning-status').textContent.includes('Host progress merged'));
 assert.equal(await sidebar.locator('#token').inputValue(),'');assert.equal((await createLearningStore({file:progressFile}).read()).journeys.mastered.length,1);
 await answer(sidebar,JOURNEYS[1]);assert.match(await sidebar.locator('#learning-summary').textContent(),/120 shared XP/);
 await sidebar.locator('#chat-tab').click();await sidebar.locator('#provider').selectOption('openai');await sidebar.locator('#models').click();await sidebar.waitForSelector('#model option',{state:'attached'});await sidebar.locator('#model').selectOption('fixture-model');await sidebar.locator('#learn-tab').click();
 await sidebar.locator('#learning-root .journey-reader textarea').fill('How is filtering different from starting a service?');await sidebar.getByRole('button',{name:'Explain this concept',exact:true}).click();await sidebar.waitForFunction(()=>document.querySelector('#learning-root').textContent.includes('A filter selects objects'));assert.equal(providerCalls,2);
 console.log('Sidebar offline learning, authenticated sync, and read-only coach passed.');
 const page=await context.newPage();await page.goto(base+'/lms/journeys/?lesson=object-courier');await page.waitForSelector('#journey-root h2');
 const connectWeb=async(web,origin=base,root='#learning-sync')=>{await web.locator(root+' [data-origin]').fill(origin);await web.locator(root+' input[type=password]').fill(process.env.FIXTURE_SESSION_TOKEN);await web.locator(root+' button[type=submit]').click();await web.waitForFunction(root=>document.querySelector(root+' [role=status]').textContent.includes('Host progress merged'),root);};
 await connectWeb(page);assert.match(await page.locator('.journey-summary').textContent(),/2[/]6/);await answer(page,JOURNEYS[2],'#journey-root');
 // Practice is an actual linked arcade page. A keyboard deployment earns a real milestone.
 await page.locator('#journey-root [data-journey=object-courier]').click();await page.getByRole('button',{name:'Practice in the arcade →',exact:true}).click();await page.waitForURL('**/arcade/powershell-defense/');await page.locator('#game-canvas').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.match(await page.locator('#terminal-log').textContent(),/Deployed/);
 await page.goto(base+'/lms/journeys/');await page.waitForSelector('#journey-root h2');await connectWeb(page);
 for(const lesson of JOURNEYS.slice(3))await answer(page,lesson,'#journey-root');
 // A replay is checked normally but never farms its XP.
 await answer(page,JOURNEYS[0],'#journey-root');assert.match(await page.locator('.journey-feedback').textContent(),/[+]0 XP/);
 await sidebar.locator('#learning-sync').click();await sidebar.waitForFunction(()=>document.querySelector('#learning-summary').textContent.includes('7/7'));
 const saved=await createLearningStore({file:progressFile}).read();assert.equal(saved.journeys.mastered.length,7);assert.equal(saved.academy.deployed,true);
 await page.goto(base+'/arcade/academy/');await page.waitForFunction(()=>document.getElementById('profile-badges').textContent.includes('Thoughtful Automator'));assert.match(await page.locator('#profile-badges').textContent(),/Script Defender/);
 // The legacy story now has keyboard-operable cards, non-blocking feedback, and a real profile destination.
 console.log('LMS, arcade deployment, replay, and sidebar refresh passed.');await page.goto(base+'/arcade/seven-stars/');await page.waitForSelector('[data-reading]');
 const starAnswers=[1,2,0,1,1,2,2];for(let index=0;index<7;index++){await page.locator('[data-reading="'+index+'"]').click();await page.locator('#stars-options input[value="'+starAnswers[index]+'"]').check();await page.locator('#stars-form button[type=submit]').click();await page.locator('#stars-back').click();}
 assert.equal(await page.locator('#stars-ending').isVisible(),true);await page.goto(base+'/lms/journeys/');await page.waitForSelector('#journey-root h2');await connectWeb(page);
 const finalProfile=(await (await fetch(base+'/api/learning',{headers:{Authorization:'Bearer ' + process.env.FIXTURE_SESSION_TOKEN}})).json()).profile;assert.equal(finalProfile.xp,520);assert.ok(finalProfile.badges.includes('Seven Messages Reader'));
 // Seven-star story access, the three Overseer phases, Book III memory trials, and protected audio.
 await page.goto(base+'/arcade/nexus/');await page.waitForFunction(()=>document.querySelector('#unlock-status').textContent.includes('7/7'));await page.locator('#boot').click();assert.match(await page.locator('#boot-log').textContent(),/FREE WILL ENABLED/);
 await page.goto(base+'/arcade/sparkfall-uprising/');await page.waitForSelector('#sparkfall-game:not([hidden])');await page.locator('#sparkfall-boot').click();
 for(const mission of MISSIONS){await page.locator('[data-mission="'+mission.id+'"]').click();if(mission.type==='memory'){for(const thread of mission.sequence)await page.locator('[data-thread="'+thread+'"]').click();}else for(const [index,q]of mission.questions.entries())await page.locator('#mission-form input[name=q'+index+'][value="'+q.answer+'"]').check();await page.locator('#mission-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#mission-feedback').textContent.includes('MISSION RESOLVED'));}
 assert.equal(await page.locator('#sparkfall-ending').isVisible(),true);assert.equal(await page.locator('#book-iii').isVisible(),true);await connectWeb(page,base,'#sparkfall-sync');
 await page.goto(base+'/arcade/audio-vault/');await connectWeb(page,base,'#vault-sync');await page.waitForFunction(()=>document.querySelector('#vault-status').textContent.includes('UNLOCKED'));await page.locator('#vault-tracks button').first().click();await page.waitForFunction(()=>document.querySelector('#vault-tracks audio').readyState>=1);await page.locator('#vault-sync [data-lock]').click();assert.equal(await page.locator('#vault-tracks audio').count(),0);
 // A distinct static preview origin merges through only its explicitly allowlisted learning APIs.
 const staticPage=await context.newPage();await staticPage.goto('http://127.0.0.1:'+previewPort+'/lms/journeys/');await staticPage.waitForSelector('#journey-root h2');await connectWeb(staticPage);assert.match(await staticPage.locator('.journey-summary').textContent(),/7[/]7/);
 const unrelated=await staticPage.evaluate(async base=>{const response=await fetch(base+'/api/connect',{method:'POST',headers:{Authorization:'Bearer ' + process.env.FIXTURE_SESSION_TOKEN,'Content-Type':'application/json'},body:'{}'}).catch(()=>null);return response?.status||0;},base);assert.notEqual(unrelated,200);
 // The local console authenticates without starting an execution agent, and no ghost hosted/ZIP flow remains.
 await page.goto(base+'/#setup');await page.locator('#bridge-token').fill(process.env.FIXTURE_SESSION_TOKEN);await page.locator('#connect').click();await page.waitForFunction(()=>document.querySelector('#mode').textContent==='COMPANION CONNECTED');assert.equal(codexStarts,0);assert.equal(await page.locator('a[href="companion.zip"]').count(),0);await page.locator('[data-view=learn]').first().click();assert.ok(await page.locator('#lessons a[href="/lms/journeys/"]').count());
 // Legacy board script executes under its dedicated local policy, with optional CDNs removed.
 await page.goto(base+'/arcade/matrix_of_consciousness_match_3_game.html');await page.waitForFunction(()=>typeof grid!=='undefined'&&Array.isArray(grid)&&grid.flat().length===49);
 await staticPage.setViewportSize({width:390,height:844});assert.equal(await staticPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await mkdir('artifacts',{recursive:true});await staticPage.screenshot({path:'artifacts/integration-lms-mobile.png',fullPage:true});await sidebar.screenshot({path:'artifacts/integration-sidebar.png',fullPage:true});
 const offline=await context.newPage();await offline.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}}));await offline.goto(base+'/lms/journeys/');await offline.waitForSelector('#journey-root h2');await answer(offline,JOURNEYS[0],'#journey-root');assert.match(await offline.locator('#journey-save').textContent(),/unavailable/);
 await sidebar.locator('#lock').click();assert.match(await sidebar.locator('#learning-summary').textContent(),/local progress/);assert.equal(await sidebar.evaluate(()=>Object.values(localStorage).some(value=>value.includes(process.env.FIXTURE_SESSION_TOKEN))),false);
 const disk=await readFile(progressFile,'utf8');assert.ok(!disk.includes('How is filtering'));assert.ok(!disk.includes('fixture-provider-key-not-for-browser'));assert.ok(!JSON.stringify(bodies).includes('fixture-provider-key-not-for-browser'));assert.deepEqual(errors,[]);
 console.log('PASS native unpacked Edge extension → authenticated companion → durable lesson store → LMS → real arcade milestone → shared profile → sidebar refresh. Seven stories/21 checks, one-time XP, seven readings, explicit cross-origin sync, read-only coach, blocked storage, mobile layout, and lock verified. Provider output mocked; no live API key or Codex process used.');
}catch(error){console.error('BROWSER_ERRORS',errors);for(const page of context?.pages()||[]){try{console.error('PAGE',page.url());}catch{}}throw error;}finally{await context?.close();app?.close();preview?.close();await rm(directory,{recursive:true,force:true});}
