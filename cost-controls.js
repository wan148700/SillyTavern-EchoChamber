/* EchoChamber: isolated configuration help and bounded continuous generation. */
(function (root) {
    'use strict';
    root.EchoChamberCostControls = {
        start(settings, save, doc = document) {
            const sync = () => {
                for (const el of doc.querySelectorAll('[data-ec-cost-field]')) {
                    if (doc.activeElement !== el) el.value = settings[el.dataset.ecCostField] || (el.dataset.ecCostField === 'requestMaxTokens' ? 2048 : (settings.lastContinuousBatchLimit || 3));
                    if (el.dataset.ecCostField === 'continuousBatchLimit') el.closest('label').hidden = settings.continuousBatchLimit === 0;
                }
                for (const el of doc.querySelectorAll('[data-ec-cost-mode]')) el.value = settings.continuousBatchLimit === 0 ? 'unlimited' : 'limited';
            };
            function mount() {
                for (const host of doc.querySelectorAll('#ecm-sect-engine .ecm_acc_body, .discord_settings .ec-s-panel')) {
                    if (host.querySelector('.ec-cost-controls')) continue;
                    const box = doc.createElement('div');
                    box.className = 'ec-cost-controls';
                    box.style.cssText = 'padding:12px;margin:10px 0;border:1px solid var(--ec-border,var(--SmartThemeBorderColor));border-radius:10px;line-height:1.7;';
                    box.innerHTML = `<strong>弹幕模型与省钱控制</strong>
<p>“选择酒馆连接配置”可使用已保存的便宜模型；“独立接口”可单独填写地址、密钥和模型 ID。正文模型保持原样。空配置或失效配置会报错，不会偷偷退回正文接口。</p>
<p>一批弹幕只请求一次，之后逐条显示不再请求。只有“播完继续生成”会循环调用；“仅手动生成”最省钱，“正文回复后生成一批”更省心。</p>
<label style="display:block">独立接口／连接配置的每次输出 Token 上限 <input data-ec-cost-field="requestMaxTokens" type="number" min="256" max="32768" step="256" style="width:90px"></label>
<label style="display:block">持续刷新模式 <select data-ec-cost-mode><option value="limited">限制刷新次数</option><option value="unlimited">无限刷新（直到手动暂停）</option></select></label>
<label style="display:block">每轮最多自动续批次数 <input data-ec-cost-field="continuousBatchLimit" type="number" min="1" max="50" step="1" style="width:90px"></label>
<small>限制刷新时最多续批 1～50 次（不含首批）；无限刷新会持续调用所选弹幕模型，直到暂停。点击重新生成或重新启用播放可开启新一轮。Token 上限也适用于发弹幕后的 AI 回复；跟随正文接口时由酒馆管理输出长度。条数多而上限低可能截断，建议先试每批 5 条、2048 Token。读取正文消息越少，输入消耗越低。弹幕默认要求单独选择模型；需要时仍可主动选择跟随正文。</small>`;
                    box.addEventListener('change', e => {
                        const el = e.target;
                        if (el.matches('[data-ec-cost-mode]')) {
                            if (el.value === 'unlimited') { settings.lastContinuousBatchLimit = settings.continuousBatchLimit || 3; settings.continuousBatchLimit = 0; }
                            else settings.continuousBatchLimit = settings.lastContinuousBatchLimit || 3;
                            save(); sync(); return;
                        }
                        const key = el.dataset.ecCostField;
                        if (!key) return;
                        const n = Number(el.value), tokens = key === 'requestMaxTokens';
                        settings[key] = Number.isFinite(n) ? Math.max(tokens ? 256 : 1, Math.min(tokens ? 32768 : 50, Math.floor(n))) : (tokens ? 2048 : 3);
                        save(); sync();
                    });
                    host.prepend(box);
                }
                sync();
            }
            mount();
            new MutationObserver(mount).observe(doc.body, { childList: true, subtree: true });
        }
    };
})(window);
