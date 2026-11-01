import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import assert from 'node:assert/strict';
import { PS_LESSONS,PS_QUESTIONS,CYBER_QUESTIONS } from '../src/game/academy/content.js';
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:1000}}),errors=[],network=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('http://academy.local/**',async route=>{let rel=new URL(route.request().url()).pathname.slice(1);if(!rel||rel.endsWith('/'))rel+='index.html';try{await route.fulfill({body:await readFile(resolve(rel)),contentType:({'.js':'text/javascript','.html':'text/html','.css':'text/css'})[extname(rel)]||'text/plain'});}catch{await route.fulfill({status:404,body:'Not found'});}});
 await page.route('https://**/*',route=>{network.push(route.request().url());return route.abort();});
 await page.goto('http://academy.local/arcade/academy/');await page.waitForFunction(()=>document.querySelector('#cyber-lock').textContent.includes('Locked'));assert.match(await page.locator('#cyber-lock').textContent(),/Locked/);
 await page.goto('http://academy.local/arcade/powershell-defense/');
 await page.evaluate(async()=>{const {campaign}=await import('/src/game/learning/campaign-store.js');campaign.complete('rpg-garden');const {game}=await import('/src/game/academy/defense-ui.js');window.testGame=game;});
 await page.waitForFunction(()=>!!window.testGame);await page.locator('#btn-restart').click();assert.equal(await page.locator('#hud-credits').textContent(),'420 C');
 assert.equal(await page.evaluate(()=>window.testGame.frame),null);
 await page.locator('#btn-start-wave').click();
 await page.waitForFunction(()=>window.testGame.spawnTimer>2);
 await page.locator('#btn-pause').click();
 const pausedTimer=await page.evaluate(()=>window.testGame.spawnTimer);
 assert.equal(await page.evaluate(()=>window.testGame.frame),null);
 await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>window.testGame.spawnTimer),pausedTimer);
 await page.locator('[data-lesson=processes]').click();await page.locator('#lesson-close').click();
 assert.equal(await page.evaluate(()=>window.testGame.paused),true);
 await page.locator('#btn-pause').click();await page.waitForFunction(()=>window.testGame.spawnTimer>3);
 await page.locator('#btn-restart').click();
 assert.equal(await page.evaluate(()=>window.testGame.frame),null);
 // Demand rendering must still display keyboard placement and finish its short feedback animation.
 await page.locator('#game-canvas').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 await page.waitForFunction(()=>window.testGame.frame===null&&window.testGame.floatingTexts.length===0);
 assert.equal(await page.evaluate(()=>window.testGame.towers.length),1);
 await page.locator('#btn-restart').click();
 console.log('PASS idle animation sleeps, placement feedback settles, manual pause survives quiz closure, and resume advances combat');
 for(const lesson of PS_LESSONS){await page.locator('[data-lesson='+lesson.id+']').click();for(const [i,q]of lesson.questions.entries())await page.locator('#lesson-form input[name=q'+i+'][value="'+q.answer+'"]').check();await page.locator('#lesson-submit').click();assert.match(await page.locator('#lesson-feedback').textContent(),/Lesson mastered/);await page.locator('#lesson-close').click();}
 await page.locator('[data-lesson=processes]').click();for(const [i,q]of PS_LESSONS[0].questions.entries())await page.locator('#lesson-form input[name=q'+i+'][value="'+q.answer+'"]').check();await page.locator('#lesson-submit').click();assert.match(await page.locator('#lesson-feedback').textContent(),/\+0 Security XP/);await page.locator('#lesson-close').click();
 assert.equal(await page.locator('#hud-credits').textContent(),'660 C');await page.waitForFunction(()=>!window.testGame.paused);
 const simulate=()=>page.evaluate(()=>{const g=window.testGame;
  function build(){g.selectedTowerKey='ping';while(g.credits>=50){let best=null,bestScore=-1;for(let row=0;row<12;row++)for(let col=0;col<20;col++){if(g.path.some(p=>p.x===col&&p.y===row)||g.towers.some(t=>t.col===col&&t.row===row))continue;const score=g.path.reduce((sum,p)=>{if(Math.hypot((p.x-col)*40,(p.y-row)*40)>120)return sum;const coverage=g.towers.filter(t=>Math.hypot(p.x*40+20-t.x,p.y*40+20-t.y)<=t.range).length;return sum+1/(1+coverage);},0);if(score>bestScore){bestScore=score;best={col,row};}}if(!best)break;g.placeTower(best.col,best.row);}}
  let frames=0;while(g.status==='ready'&&!g.paused&&frames<150000){if(!g.waveActive){build();g.startWave();}g.update();frames++;}
  return {status:g.status,paused:g.paused,wave:g.wave,health:g.health,frames,bossShielded:g.enemies.some(enemy=>enemy.shielded)};
 });
 const breach=await simulate();console.log('Breach state',breach);assert.equal(breach.wave,5);assert.equal(breach.bossShielded,true);assert.equal(await page.locator('#boss-dialog').isVisible(),true);
 const q0=PS_QUESTIONS.find(q=>q.id==='processes-0');await page.locator('#boss-form input[value="'+((q0.answer+1)%4)+'"]').check();await page.locator('#boss-submit').click();assert.equal(await page.locator('#boss-progress').textContent(),'0/3 correct');await page.locator('#boss-next').click();
 for(const id of ['processes-0','services-0','pipeline-0']){const q=PS_QUESTIONS.find(q=>q.id===id);await page.locator('#boss-form input[value="'+q.answer+'"]').check();await page.locator('#boss-submit').click();await page.locator('#boss-next').click();}
 await page.waitForFunction(()=>!window.testGame.paused);const finish=await simulate();assert.equal(finish.status,'won',JSON.stringify(finish));assert.equal(finish.wave,10);assert.ok(await page.locator('[data-key=sentinel]').count());
 console.log('PASS ten real combat waves, wrong/correct boss quiz, shield drop and turret unlock:',finish);
 await page.goto('http://academy.local/arcade/academy/');assert.match(await page.locator('#profile-certs').textContent(),/PowerShell Novice/);assert.match(await page.locator('#profile-badges').textContent(),/Terminal Operator/);assert.match(await page.locator('#cyber-lock').textContent(),/Unlocked/);
 for(const [i,q]of CYBER_QUESTIONS.entries())await page.locator('#cyber-form input[name=q'+i+'][value="'+q.answer+'"]').check();await page.locator('#cyber-submit').click();assert.match(await page.locator('#cyber-feedback').textContent(),/100 shared XP/);assert.equal(await page.locator('#cyber-submit').isDisabled(),true);
 const before=await page.locator('#profile-summary').textContent();await page.reload();assert.equal(await page.locator('#profile-summary').textContent(),before);
 await page.locator('#player-name').fill('<b>Explorer</b>');await page.locator('#player-form button').click();assert.equal(await page.locator('#profile-title').textContent(),'<b>Explorer</b>');assert.equal(await page.locator('#profile-title b').count(),0);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'academy-profile-mobile.png',fullPage:true});
 await page.goto('http://academy.local/arcade/powershell-defense/');assert.equal(await page.locator('#hud-credits').textContent(),'420 C');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'academy-defense-mobile.png',fullPage:true});
 await page.locator('#game-canvas').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.match(await page.locator('#terminal-log').textContent(),/Deployed/);
 const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}}));const blockedPage=await blocked.newPage();await blockedPage.route('http://academy.local/**',async route=>{let rel=new URL(route.request().url()).pathname.slice(1);if(rel.endsWith('/'))rel+='index.html';await route.fulfill({body:await readFile(resolve(rel)),contentType:({'.js':'text/javascript','.html':'text/html','.css':'text/css'})[extname(rel)]||'text/plain'});});await blockedPage.goto('http://academy.local/arcade/powershell-defense/');await blockedPage.waitForFunction(()=>document.querySelector('#save-status').textContent.includes('Saving unavailable'));await blocked.close();
 assert.deepEqual(network,[]);for(const route of ['/arcade/','/lms/','/arcade/matrix-of-conscience/']){await page.goto('http://academy.local'+route);await page.waitForFunction(()=>!!document.querySelector('arcade-profile')?.shadowRoot?.getElementById('stats')?.textContent);}assert.deepEqual(errors,[]);console.log('PASS shared profile, one-time lessons, legacy Earth Guardian bonus, Cyber Planet, reload, safe text rendering, mobile/keyboard, blocked storage; no external runtime dependencies.');
}finally{await browser.close();}
