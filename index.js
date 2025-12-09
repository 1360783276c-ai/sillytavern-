// ==SillyTavern Extension==
// @name         角色状态心情管理
// @version      1.1.0
// @description  通过API分析并展示角色和用户的心情状态。
// @author       1360783276c-ai & Kilo Code

(function () {
    'use strict';

    // 存储插件状态
    let settings = {
        isEnabled: true,
        apiUrl: '',
        apiKey: '',
    };
    let mood = {
        user: 'N/A',
        character: 'N/A',
    };

    // --- UI 创建 ---

    function createFloatingBall() {
        const ball = document.createElement('div');
        ball.className = 'floating-ball';
        ball.innerHTML = '<span>M</span>';
        document.body.appendChild(ball);

        makeDraggable(ball, 'mood-manager-ball-position', { x: window.innerWidth - 100, y: 100 });

        ball.addEventListener('click', () => {
            const panel = document.querySelector('.status-panel');
            if (panel) {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            }
        });
    }

    function createStatusPanel() {
        const panel = document.createElement('div');
        panel.className = 'status-panel';
        panel.style.display = 'none'; // Initially hidden
        panel.innerHTML = `
            <div class="panel-header">状态控制面板</div>
            <div class="panel-content">
              <p>用户状态: <span id="mood-user">${mood.user}</span></p>
              <p>角色状态: <span id="mood-char">${mood.character}</span></p>
            </div>
        `;
        document.body.appendChild(panel);

        makeDraggable(panel, 'mood-manager-panel-position', { x: window.innerWidth - 400, y: 100 });
    }

    function createSettingsUI() {
        const settingsHtml = `
            <div id="mood-manager-settings" class="mood-manager-settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>角色状态心情管理</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <div class="example-extension_block flex-container">
                            <label for="mood-api-url">API URL:</label>
                            <input type="text" id="mood-api-url" class="text_pole" value="${settings.apiUrl}" />
                        </div>
                        <div class="example-extension_block flex-container">
                            <label for="mood-api-key">API Key:</label>
                            <input type="text" id="mood-api-key" class="text_pole" value="${settings.apiKey}" />
                        </div>
                        <div class="example-extension_block flex-container">
                            <input type="checkbox" id="mood-enabled" ${settings.isEnabled ? 'checked' : ''} />
                            <label for="mood-enabled">启用插件</label>
                        </div>
                    </div>
                </div>
            </div>`;
        $('#extensions_settings2').append(settingsHtml);

        // Bind events
        $('#mood-api-url').on('input', function() { settings.apiUrl = $(this).val(); saveSettings(); });
        $('#mood-api-key').on('input', function() { settings.apiKey = $(this).val(); saveSettings(); });
        $('#mood-enabled').on('change', function() { settings.isEnabled = $(this).is(':checked'); saveSettings(); });
    }

    // --- 核心逻辑 ---

    async function onMessageUpdate() {
        if (!settings.isEnabled || !settings.apiUrl) return;

        const latestMessage = SillyTavern.chat.slice(-1)[0];
        if (!latestMessage) return;

        try {
            const response = await fetch(settings.apiUrl, {
                method: 'POST',
                headers: { ...SillyTavern.getRequestHeaders(), 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
                body: JSON.stringify({ text: latestMessage.mes, is_user: latestMessage.is_user }),
            });
            if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
            const data = await response.json();
            
            if (latestMessage.is_user) {
                mood.user = data.mood;
                $('#mood-user').text(mood.user);
            } else {
                mood.character = data.mood;
                $('#mood-char').text(mood.character);
            }
        } catch (error) {
            console.error('Mood Manager API Error:', error);
            toastr.error('无法从心情分析API获取数据。');
        }
    }

    // --- 工具函数 ---

    function makeDraggable(element, storageKey, initialPos) {
        let pos = JSON.parse(localStorage.getItem(storageKey)) || initialPos;
        element.style.left = pos.x + 'px';
        element.style.top = pos.y + 'px';

        let isDragging = false;
        let offset = { x: 0, y: 0 };

        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            offset = {
                x: element.offsetLeft - e.clientX,
                y: element.offsetTop - e.clientY,
            };
            element.style.cursor = 'grabbing';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            element.style.cursor = 'grab';
            localStorage.setItem(storageKey, JSON.stringify({ x: element.offsetLeft, y: element.offsetTop }));
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            element.style.left = (e.clientX + offset.x) + 'px';
            element.style.top = (e.clientY + offset.y) + 'px';
        });
    }

    function saveSettings() {
        if (SillyTavern.getContext) {
            const context = SillyTavern.getContext();
            context.extensionSettings.mood_manager = settings;
            context.saveSettingsDebounced();
        }
    }

    function loadSettings() {
        if (SillyTavern.getContext) {
            const context = SillyTavern.getContext();
            if (context.extensionSettings.mood_manager) {
                Object.assign(settings, context.extensionSettings.mood_manager);
            }
        }
    }

    // --- 初始化 ---

    $(document).ready(function () {
        // This is a backup, the main logic hooks into APP_READY
    });

    eventSource.on(tavern_events.APP_READY, () => {
        console.log("Mood Manager: APP_READY event received.");
        loadSettings();
        createFloatingBall();
        createStatusPanel();
        createSettingsUI();
        eventSource.on(tavern_events.MESSAGE_UPDATED, onMessageUpdate);
        console.log("Mood Manager Initialized!");
    });

})();