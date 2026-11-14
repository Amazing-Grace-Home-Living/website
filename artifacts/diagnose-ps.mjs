import { chromium } from '@playwright/test';
const browser = await chromium.launch({channel:'msedge',headless:true});
try {
for (const mobile of [false,true]) {
 const context = await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile});
 const page=await context.newPage();page.on('pageerror',e=>console.log('ERROR',e.message));
 await page.goto('https://www.amazinggracehl.org/arcade/powershell-defense/');
 await page.locator('#game-canvas').scrollIntoViewIfNeeded();
 await page.evaluate(()=>{const r=document.querySelector("#game-canvas").getBoundingClientRect();window.scrollTo(0,scrollY+r.top+r.height*.6)}); const box=await page.locator('#game-canvas').boundingBox();
 const x=box.x+box.width*1.5/20,y=box.y+box.height*9.5/12;
 if(mobile)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
 console.log(JSON.stringify({mobile,box,state:await page.evaluate(async()=>{const {game}=await import('/src/game/academy/defense-ui.js');return {towers:game.towers.map(t=>[t.col,t.row]),credits:game.credits,paused:game.paused,status:game.status,log:document.getElementById('terminal-log').innerText}})}));
 await context.close();
}
}finally{await browser.close();}
