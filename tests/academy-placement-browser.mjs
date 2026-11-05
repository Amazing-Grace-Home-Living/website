import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  for(const mobile of [false,true]){
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1366,height:1000},hasTouch:mobile,isMobile:mobile});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('http://placement.local/**',async route=>{
      let path=new URL(route.request().url()).pathname.slice(1);if(path.endsWith('/'))path+='index.html';
      await route.fulfill({body:await readFile(resolve(path)),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'text/plain'});
    });
    await page.goto('http://placement.local/arcade/powershell-defense/');
    await page.evaluate(async()=>{window.game=(await import('/src/game/academy/defense-ui.js')).game;});
    const tap=async(col,row)=>{
      const box=await page.locator('#game-canvas').boundingBox();
      const x=box.x+box.width*(col+.5)/20,y=box.y+box.height*(row+.5)/12;
      if(mobile)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
    };
    // Leave only the bottom of the board visible, reproducing focus-induced scrolling.
    await page.evaluate(()=>{const r=document.querySelector('#game-canvas').getBoundingClientRect();window.scrollTo(0,scrollY+r.top+r.height*.6);});
    await tap(1,9);
    assert.deepEqual(await page.evaluate(()=>game.towers.map(t=>[t.col,t.row])),[[1,9]]);
    assert.equal(await page.evaluate(()=>game.credits),170);
    await page.locator('#game-canvas').scrollIntoViewIfNeeded();
    await tap(1,9);
    assert.equal(await page.evaluate(()=>game.towers[0].level),2);
    await tap(0,2);
    assert.match(await page.locator('#placement-feedback').textContent(),/hostile path/);
    await page.locator('[data-key=regex]').click();
    await page.locator('#game-canvas').scrollIntoViewIfNeeded();
    await tap(2,1);
    assert.match(await page.locator('#placement-feedback').textContent(),/needs 180 credits/);
    await page.locator('#btn-pause').click();
    await page.locator('#game-canvas').scrollIntoViewIfNeeded();await tap(2,1);
    assert.match(await page.locator('#placement-feedback').textContent(),/paused/);
    await page.locator('#btn-restart').click();
    assert.match(await page.locator('#placement-feedback').textContent(),/Test-Connection selected/);
    assert.deepEqual(errors,[]);
    console.log('PASS '+(mobile?'mobile touch':'mouse')+': partially scrolled placement, upgrades, path rejection, budget and pause feedback, reset');
    await context.close();
  }
} finally {await browser.close();}
