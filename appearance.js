/* EchoChamber appearance controls. Settings are owned by the host extension. */
(function(root){
 'use strict';
 const defaults={panel:'#f5f7f3',surface:'#fcfdf9',text:'#303d3a',muted:'#4c6257',accent:'#476a60',border:'#c1cecb',name:'#775d73'};
 const labels={panel:'面板背景',surface:'输入框与卡片',text:'正文文字',muted:'次要文字',accent:'按钮与强调色',border:'边框',name:'观众昵称'};
 const valid=c=>typeof c==='string'&&/^#[\da-f]{6}$/i.test(c);
 function normalize(s){
  s.colorMode=s.colorMode==='manual'?'manual':'theme';
  const old=s.customColors&&typeof s.customColors==='object'?s.customColors:{};
  s.customColors=Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,valid(old[k])?old[k]:v]));
 }
 function start(settings,save,doc=document){
  normalize(settings);const win=doc.defaultView;const abort=new win.AbortController();let stopped=false;
  const toHex=(value,fallback)=>{
   if(!value||!win.CSS.supports('color',value))return fallback;
   const c=doc.createElement('canvas').getContext('2d');c.fillStyle=value;
   const result=c.fillStyle;if(valid(result))return result;
   c.fillRect(0,0,1,1);const p=c.getImageData(0,0,1,1).data;
   if(!p[3])return fallback;
   return '#'+Array.from(p.slice(0,3),n=>n.toString(16).padStart(2,'0')).join('');
  };
  function theme(){
   // Custom-CSS themes may replace surfaces without changing ST's native tokens.
   if(doc.body.dataset.ashBirdCompact==='true')return {...defaults};
   const css=win.getComputedStyle(doc.body);
   const token=(name,fallback)=>toHex(css.getPropertyValue(name).trim(),fallback);
   const panel=token('--SmartThemeBlurTintColor','#24272d');
   return {panel,surface:panel,text:token('--SmartThemeBodyColor','#e5e7eb'),muted:token('--SmartThemeBodyColor','#c6cbd2'),accent:token('--SmartThemeQuoteColor','#98b5a5'),border:token('--SmartThemeBorderColor','#64736b'),name:token('--SmartThemeQuoteColor','#98b5a5')};
  }
  function palette(){return settings.colorMode==='manual'?{...settings.customColors}:theme();}
  function sync(){
   for(const box of doc.querySelectorAll('.ec_colors_settings')){
    box.querySelector('[data-ec-color-mode]').value=settings.colorMode;
    box.querySelector('fieldset').hidden=settings.colorMode!=='manual';
    for(const input of box.querySelectorAll('[data-ec-color]'))input.value=settings.customColors[input.dataset.ecColor];
   }
  }
  function apply(){
   if(stopped)return;const p=palette();
   if(doc.body.dataset.ecColors!==settings.colorMode)doc.body.dataset.ecColors=settings.colorMode;
   for(const [k,v] of Object.entries(p)){
    const name='--ec-palette-'+k;
    if(doc.body.style.getPropertyValue(name)!==v)doc.body.style.setProperty(name,v);
   }
   sync();
  }
  function commit(){apply();save();}
  function mount(){
   if(stopped)return;
   const targets=[doc.querySelector('#ec_settings_modal #ecm_content_pane')||doc.querySelector('#ec_settings_modal .ecm_body'),doc.querySelector('.discord_settings .ec-s-panel')].filter(Boolean);
   for(const target of targets){
    if(target.querySelector('.ec_colors_settings'))continue;
    const box=doc.createElement('section');box.className='ecm_section ec_colors_settings';
    box.innerHTML=`<h3>配色</h3><label class="ec_colors_mode"><span>颜色模式</span><select data-ec-color-mode aria-label="颜色模式"><option value="theme">跟随酒馆主题</option><option value="manual">手动配色</option></select></label><p class="ec_colors_hint">修改即时生效并自动保存；切换模式会保留手动颜色。</p><fieldset><legend>手动颜色</legend>${Object.entries(labels).map(([k,label])=>`<label class="ec_color_row"><span>${label}</span><input type="color" data-ec-color="${k}" aria-label="${label}"></label>`).join('')}<button type="button" data-ec-reset>重置手动配色</button></fieldset><button type="button" data-ec-copy>复制当前主题配色</button><div class="ec_colors_preview"><span class="ec_colors_preview_name">观众昵称</span><span>弹幕文字预览</span><button type="button" disabled>按钮</button></div>`;
    target.prepend(box);
    box.querySelector('[data-ec-color-mode]').addEventListener('change',e=>{settings.colorMode=e.target.value==='manual'?'manual':'theme';commit();},{signal:abort.signal});
    box.addEventListener('input',e=>{const k=e.target.dataset.ecColor;if(k&&Object.hasOwn(defaults,k)&&valid(e.target.value)){settings.customColors[k]=e.target.value;commit();}},{signal:abort.signal});
    box.querySelector('[data-ec-copy]').addEventListener('click',()=>{settings.customColors=theme();settings.colorMode='manual';commit();},{signal:abort.signal});
    box.querySelector('[data-ec-reset]').addEventListener('click',()=>{settings.customColors={...defaults};commit();},{signal:abort.signal});
   }
   sync();
  }
  const ui=new win.MutationObserver(mount);ui.observe(doc.body,{childList:true,subtree:true});
  const changes=new win.MutationObserver(()=>{if(settings.colorMode==='theme')apply();});
  changes.observe(doc.head,{childList:true,subtree:true,characterData:true});
  changes.observe(doc.body,{attributes:true,attributeFilter:['style','class','data-ash-bird-compact']});
  changes.observe(doc.documentElement,{attributes:true,attributeFilter:['style','class']});
  doc.addEventListener('change',e=>{if(e.target.id==='themes'||e.target.id==='customCSS')apply();},{signal:abort.signal});
  apply();mount();
  return {apply,palette,destroy(){stopped=true;ui.disconnect();changes.disconnect();abort.abort();}};
 }
 root.EchoChamberColors={start,normalize,defaults};
})(globalThis);
