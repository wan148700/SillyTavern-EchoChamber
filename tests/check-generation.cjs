const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('index.js', 'utf8');
const expose = `globalThis.ec = {
  setup(s) { settings = {...defaultSettings,...s}; isGenerating=false; isReplying=false; continuousRefills=0; loadChatStyle=async()=> 'Test chat style'; applyAvatarColor=()=>{}; setStatus=()=>{}; setDiscordText=()=>{}; },
  generate:generateDiscordChat, reply:generateSingleReply, load:loadSettings,
  finish:displayNextLivestreamMessage, event:onChatEvent,
  tokens:echoTokenLimit, batches:echoBatchLimit,
  state:()=>({settings,continuousRefills})
};`;
const code = source.slice(0, source.indexOf('    // Start when DOM is ready')) + expose + '\n})();';
let checks=0;
function harness() {
  const calls=[], errors=[], timers=[];
  const chain = new Proxy({length:0}, {get(o,k){if(k==='length')return 0;if(k===Symbol.iterator)return function*(){};return ()=>chain;}});
  const ctx={chat:[{name:'测试角色',mes:'测试剧情',is_user:false}],chatId:'test',extensionSettings:{connectionManager:{profiles:[{id:'cheap',name:'便宜模型'}]}},
    saveSettingsDebounced(){}, ConnectionManagerRequestService:{async sendRequest(...a){calls.push(['profile',...a]);return ''; }},
    async generateRaw(...a){calls.push(['main',...a]);return '';}};
  const doc={documentElement:{style:{setProperty(){}}},querySelectorAll:()=>[],getElementById:()=>null,createElement(){return {set innerHTML(v){this.value=v;},value:''};}};
  const sandbox={document:doc,window:{},SillyTavern:{getContext:()=>ctx},jQuery:()=>chain,
    console:{log(){},warn(){},error(){}},AbortController,
    setTimeout:(f)=>{timers.push(f);return timers.length;},clearTimeout(){},
    toastr:{error:(m)=>errors.push(m),info:(m)=>errors.push(m)},
    fetch:async(url,opts)=>{calls.push(['http',url,JSON.parse(opts.body)]);return {ok:true,json:async()=>({choices:[{message:{content:''}}]})};}
  };
  vm.runInNewContext(code,sandbox);return {...sandbox,calls,errors,timers,ctx};
}
(async()=>{
  let h=harness();h.ec.setup({source:'profile',preset:'cheap',requestMaxTokens:768});await h.ec.generate();
  assert.equal(h.calls.length,1);assert.equal(h.calls[0][0],'profile');assert.equal(h.calls[0][1],'cheap');assert.equal(h.calls[0][3],768);checks+=4;
  assert.equal(h.ctx.extensionSettings.connectionManager.profiles[0].id,'cheap');checks++;
  for(const preset of ['', 'missing']){h=harness();h.ec.setup({source:'profile',preset});await h.ec.generate();assert.equal(h.calls.length,0);assert.match(h.errors.join(' '),/连接配置/);checks+=2;}
  h=harness();h.ec.setup({source:'openai',openai_url:'https://cheap.invalid/v1',openai_key:'test-only-key',openai_model:'cheap-model',requestMaxTokens:1024});await h.ec.generate();
  assert.equal(h.calls.length,1);assert.equal(h.calls[0][1],'https://cheap.invalid/v1/chat/completions');assert.equal(h.calls[0][2].model,'cheap-model');assert.equal(h.calls[0][2].max_tokens,1024);checks+=4;
  h=harness();h.ec.setup({source:'profile',preset:'cheap',requestMaxTokens:256,chatOverrideTokens:true,chatMaxTokens:9000});await h.ec.reply('测试发言','测试观众');assert.equal(h.calls[0][0],'profile');assert.equal(h.calls[0][3],256);checks+=2;
  h=harness();h.ec.setup({livestream:true,livestreamMode:'onComplete',continuousBatchLimit:2});
  h.ec.finish();h.ec.finish();h.ec.finish();assert.equal(h.timers.length,2);assert.equal(h.ec.state().continuousRefills,2);assert.match(h.errors.join(' '),/上限/);checks+=3;
  h.ec.setup({livestream:true,livestreamMode:'manual'});h.ec.finish();assert.equal(h.timers.length,2);checks++;
  h=harness();h.ctx.extensionSettings.discord_chat={livestreamMode:'onComplete',source:'profile',preset:'cheap',openai_key:'keep-private'};h.ec.load();
  assert.equal(h.ec.state().settings.livestreamMode,'onComplete');assert.equal(h.ctx.extensionSettings.discord_chat.openai_key,'keep-private');assert.equal(h.ctx.extensionSettings.discord_chat.preset,'cheap');checks+=3;
  h.ctx.extensionSettings.discord_chat.livestreamMode='onComplete';h.ec.load();assert.equal(h.ec.state().settings.livestreamMode,'onComplete');checks++;
  h=harness();h.ctx.extensionSettings.discord_chat={source:'default'};h.ec.load();assert.equal(h.ec.state().settings.source,'profile');assert.equal(h.ec.state().settings.preset,'');checks+=2;
  h.ec.setup({livestream:true,livestreamMode:'onComplete',continuousBatchLimit:0});for(let i=0;i<60;i++)h.ec.finish();assert.equal(h.timers.length,60);checks++; 
  for(const [input,expected] of [[NaN,2048],[0,2048],[1024,1024],[99999,32768]]){assert.equal(h.ec.tokens(input),expected);checks++;}
  console.log(`Generation isolation and cost controls: ${checks} checks passed (mock APIs only).`);
})().catch(e=>{console.error(e);process.exit(1);});
