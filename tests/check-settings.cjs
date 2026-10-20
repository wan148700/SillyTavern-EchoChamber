const fs=require('fs'), assert=require('node:assert/strict');
const {chromium}=require('playwright');
const source=fs.readFileSync('index.js','utf8');
const template=source.slice(source.indexOf('function openSettingsModal()')).match(/const modal = jQuery\(`([\s\S]*?)`\);/)[1];
const build=new Function('s','styleOptions','ollamaVisible','openaiVisible','profileVisible','contextDepthVisible','wibudgetVisible','livestreamVisible','return `'+template+'`;');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});let checks=0;
 for(const width of [320,393,768,1200]){
  const page=await browser.newPage({viewport:{width,height:860}});
  await page.setContent(fs.readFileSync('settings.html','utf8')+build({source:'profile',style:'twitch'},'<option value="twitch">弹幕直播间</option>','','','','','',''));
  await page.addStyleTag({content:fs.readFileSync('style.css','utf8')});
  await page.addScriptTag({content:fs.readFileSync('appearance.js','utf8')});
  await page.addScriptTag({content:fs.readFileSync('cost-controls.js','utf8')});
  await page.evaluate(()=>{
   window.saved=0;window.settings={source:'profile',preset:'cheap',openai_key:'private-test-key'};
   EchoChamberColors.start(settings,()=>saved++);
   EchoChamberCostControls.start(settings,()=>saved++);
   document.querySelector('#ec_settings_modal').classList.add('ecm_visible');
   document.querySelectorAll('.ecm_acc_body').forEach(e=>e.hidden=false);
  });
  assert.equal(await page.locator('.ec-cost-controls').count(),2);checks++;
  assert.match(await page.locator('#ecm_source option[value="profile"]').textContent(),/独立模型/);checks++;
  assert.match(await page.locator('#ecm_source option[value="openai"]').textContent(),/独立接口/);checks++;
  const input=page.locator('#ec_settings_modal [data-ec-cost-field="requestMaxTokens"]');
  await input.evaluate(e=>{e.value='768';e.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal(await page.evaluate(()=>settings.requestMaxTokens),768);checks++;
  assert.equal(await page.locator('.discord_settings [data-ec-cost-field="requestMaxTokens"]').inputValue(),'768');checks++;
  assert.equal(await page.evaluate(()=>settings.openai_key),'private-test-key');checks++;
  assert.equal(await page.evaluate(()=>settings.preset),'cheap');checks++;
  const limit=page.locator('#ec_settings_modal [data-ec-cost-field="continuousBatchLimit"]');
  await limit.evaluate(e=>{e.value='999';e.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal(await page.evaluate(()=>settings.continuousBatchLimit),50);checks++;
  const mode=page.locator('#ec_settings_modal [data-ec-cost-mode]');
  await mode.selectOption('unlimited');
  assert.equal(await page.evaluate(()=>settings.continuousBatchLimit),0);checks++;
  assert.equal(await limit.isVisible(),false);checks++;
  await mode.selectOption('limited');
  assert.equal(await page.evaluate(()=>settings.continuousBatchLimit),50);checks++;
  assert.equal(await page.locator('.ec-cost-controls').count(),2);checks++;
  const overflow=await page.locator('#ec_settings_modal .ec-cost-controls').evaluate(e=>e.scrollWidth>e.clientWidth+1);
  assert.equal(overflow,false,'cost controls overflow '+width);checks++;
  if(width===393) await page.screenshot({path:'theme-validation/settings-zh.png',fullPage:true});
  await page.close();
 }
 console.log(`Chinese settings and saved cost controls: ${checks} checks passed.`);await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
