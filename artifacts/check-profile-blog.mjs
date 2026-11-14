import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage(); const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:900});
  const response=await page.goto('http://127.0.0.1:4193/blog');
  assert.equal(response.status(),200);
  const nav=page.getByRole('navigation',{name:'Main navigation'});
  assert.equal(await nav.getByRole('link',{name:'Nicholai’s Blog',exact:true}).getAttribute('href'),'/blog');
  assert.equal(await nav.getByRole('link',{name:'Tools',exact:true}).getAttribute('href'),'/toolbox');
  const styles=await nav.locator('a').evaluateAll(links=>links.map(a=>{const s=getComputedStyle(a);return [s.fontFamily,s.fontSize,s.fontWeight,s.letterSpacing].join('|')}));
  assert.equal(new Set(styles).size,1,'Navigation typography must match');
  assert.equal(await page.locator('article').count(),1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow at '+width);
  await page.screenshot({path:'artifacts/blog-'+width+'.png',fullPage:width===390});
 }
 assert.deepEqual(errors,[]);
 console.log('PASS blog route, article, matching navigation fonts, Tools destination, and 320/390/1440px layouts; no page errors');
}finally{await browser.close();}
