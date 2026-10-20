const fs=require('fs');
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({args:['--no-sandbox']});let checks=0;
 const fixture=`<style>:root{--SmartThemeBodyColor:#30343a;--SmartThemeQuoteColor:#536e78;--SmartThemeBlurTintColor:#42454b}body{margin:0;background:#f7f8f5;font-family:serif}#discordBar{position:relative!important;width:100%!important;max-width:100%!important;box-sizing:border-box}#discordContent{height:260px}</style>
 <div id="discordBar"><div id="discordQuickSettings"><div class="ec_header_left"><span class="ec_power_btn">⏻</span><span class="ec_live_indicator ec_live_on">● LIVE</span></div><div class="ec_header_right"><button class="ec_icon_btn">⚙</button></div></div><div class="ec_style_indicator">Style: 弹幕直播间</div><div id="discordContent">${Array.from({length:4},(_,i)=>`<div class="discord_message"><div class="discord_avatar" style="background-color:hsl(${i*80},75%,70%)">${i+1}</div><div class="discord_body"><div class="discord_username" style="color:hsl(${i*80},75%,70%)">观众 ${i+1}</div><div class="discord_content">今晚的故事，慢慢聊。<em>下一幕</em></div></div></div>`).join('')}</div><div class="ec_reply_container"><input class="ec_reply_input" placeholder="Type a message to participate..."><button class="ec_reply_send">➤</button></div></div>
 <div id="ec_settings_modal" class="ecm_visible"><div class="ecm_backdrop"></div><div class="ecm_card"><div class="ecm_header"><div class="ecm_header_title">EchoChamber Settings</div><button class="ecm_close_btn">×</button></div><div class="ecm_body"><section class="ecm_section ecm_acc"><button class="ecm_acc_header"><span class="ecm_acc_title">GENERAL</span></button><label class="ecm_label">Enable extension</label><input type="checkbox" class="ecm_toggle" checked><input class="ecm_input" placeholder="Model name"><select class="ecm_select"><option>Current connection</option></select><p class="ecm_hint">Use the current profile.</p></section></div><div class="ecm_footer"><button class="ecm_footer_btn">Style Manager</button><button class="ecm_done_btn">Done</button></div></div></div>`;
 const lum=c=>{let a=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return a[0]*.2126+a[1]*.7152+a[2]*.0722};
 const ratio=(a,c)=>{let x=lum(a),y=lum(c);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 for(const width of [320,393,768,1200]){
  const p=await b.newPage({viewport:{width,height:860}});await p.setContent(fixture);await p.addStyleTag({content:fs.readFileSync('style.css','utf8')});
  const before=await p.locator('#discordBar').evaluate(e=>getComputedStyle(e).backgroundColor);
  await p.evaluate(()=>document.body.dataset.ashBirdCompact='true');
  await p.addScriptTag({content:fs.readFileSync('appearance.js','utf8')});
  await p.evaluate(()=>{
    window.ecSettings={colorMode:'theme'};
    window.ecSaved=null;
    window.ecColors=EchoChamberColors.start(window.ecSettings,()=>{window.ecSaved=JSON.parse(JSON.stringify(window.ecSettings));});
  });
  const get=selector=>p.locator(selector).first().evaluate(e=>{let s=getComputedStyle(e);return {fg:s.color,bg:s.backgroundColor,display:s.display}});
  const body=await get('.discord_content');if(ratio(body.fg,'rgb(247,249,246)')<7)throw Error('body contrast');checks++;
  for(const name of await p.locator('.discord_username').all()){const c=await name.evaluate(e=>getComputedStyle(e).color);if(ratio(c,'rgb(247,249,246)')<4.5)throw Error('name contrast '+c);checks++}
  const card=await get('.ecm_card');if(card.bg!=='rgb(245, 247, 243)')throw Error('dark modal persists');checks++;
  for(const s of ['.ecm_label','.ecm_header_title','.ecm_input','.ecm_hint','.ec_reply_input']){const c=await get(s);if(ratio(c.fg,card.bg)<4.5)throw Error('control contrast '+s);checks++}
  for(const alpha of [.4,.85]){
   await p.locator('#discordBar').evaluate((e,a)=>e.style.setProperty('--ec-panel-opacity',a),String(alpha));const c=await get('#discordBar');if(Math.abs(Number(c.bg.match(/[\\d.]+/g).at(-1))-alpha)>.01)throw Error('opacity ignored '+c.bg);checks++;
  }

  const mode=p.locator('[data-ec-color-mode]').first();
  await mode.selectOption('manual');checks++;
  await p.locator('[data-ec-color="text"]').first().evaluate(e=>{e.value='#224466';e.dispatchEvent(new Event('input',{bubbles:true}));});
  if((await get('.discord_content')).fg!=='rgb(34, 68, 102)')throw Error('manual text ignored');checks++;
  if(!(await p.evaluate(()=>window.ecSaved.customColors.text==='#224466')))throw Error('manual not saved');checks++;
  await mode.selectOption('theme');await mode.selectOption('manual');
  if(await p.locator('[data-ec-color="text"]').first().inputValue()!=='#224466')throw Error('mode switch lost manual');checks++;
  await mode.selectOption('theme');
  await p.evaluate(()=>{delete document.body.dataset.ashBirdCompact;document.documentElement.style.setProperty('--SmartThemeBodyColor','#e8eaf0');document.documentElement.style.setProperty('--SmartThemeBlurTintColor','#222831');});
  await p.waitForFunction(()=>getComputedStyle(document.querySelector('.discord_content')).color==='rgb(232, 234, 240)');checks++;
  if((await get('.ecm_card')).bg!=='rgb(34, 40, 49)')throw Error('dark theme background not followed');checks++;
  await p.locator('[data-ec-copy]').first().click();
  if(!(await p.evaluate(()=>window.ecSettings.colorMode==='manual'&&window.ecSettings.customColors.text==='#e8eaf0')))throw Error('copy theme failed');checks++;
  await p.locator('[data-ec-reset]').first().click();
  if(!(await p.evaluate(()=>window.ecSettings.customColors.text==='#303d3a')))throw Error('reset failed');checks++;
  // Simulate host save/load: normalization keeps valid saved values, rejects invalid colors.
  if(!(await p.evaluate(()=>{let s=JSON.parse(JSON.stringify(window.ecSaved));s.customColors.border='url(bad)';EchoChamberColors.normalize(s);return s.colorMode==='manual'&&s.customColors.text==='#303d3a'&&s.customColors.border===EchoChamberColors.defaults.border;})))throw Error('saved settings normalization');checks++;

  await p.evaluate(()=>{document.body.dataset.ashBirdCompact='true';window.ecSettings.colorMode='theme';window.ecColors.apply();});
  if(width===393){await p.screenshot({path:'theme-validation/settings.png'});await p.locator('#ec_settings_modal').evaluate(e=>e.remove());await p.screenshot({path:'theme-validation/comments.png'});}
  await p.evaluate(()=>{window.ecColors.destroy();document.documentElement.style.removeProperty('--SmartThemeBodyColor');document.documentElement.style.removeProperty('--SmartThemeBlurTintColor');delete document.body.dataset.ecColors;delete document.body.dataset.ashBirdCompact;});const after=await p.locator('#discordBar').evaluate(e=>getComputedStyle(e).backgroundColor);if(before!==after)throw Error('other theme changed');checks++;
  await p.close();
 }
 console.log(JSON.stringify({checks,viewports:[320,393,768,1200],theme:'Stray Birds companion'}));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
