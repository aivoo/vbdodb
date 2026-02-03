// Admin UI HTML

export function renderAdminUI(): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API密钥管理</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: white;
            text-align: center;
            margin-bottom: 30px;
            font-size: 2rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .tab {
            padding: 12px 24px;
            background: rgba(255,255,255,0.2);
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        .tab:hover, .tab.active {
            background: rgba(255,255,255,0.4);
        }
        .card {
            background: white;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .card-title {
            font-size: 1.25rem;
            color: #333;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102,126,234,0.4);
        }
        .btn-danger {
            background: #ff4757;
            color: white;
        }
        .btn-danger:hover {
            background: #ff3747;
        }
        .btn-sm {
            padding: 6px 12px;
            font-size: 0.8rem;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #666;
        }
        tr:hover {
            background: #f8f9fa;
        }
        .status-active {
            color: #2ed573;
            font-weight: 600;
        }
        .status-inactive {
            color: #ff4757;
            font-weight: 600;
        }
        .status-expired {
            color: #ff4757;
            font-weight: 600;
        }
        .expiry-date {
            font-size: 0.85rem;
        }
        .expiry-valid {
            color: #2ed573;
        }
        .expiry-warning {
            color: #ffa502;
        }
        .expiry-expired {
            color: #ff4757;
        }
        .reset-info {
            font-size: 0.75rem;
            color: #999;
        }
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .modal.show {
            display: flex;
        }
        .modal-content {
            background: white;
            border-radius: 16px;
            padding: 24px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
        }
        .form-group {
            margin-bottom: 16px;
        }
        .form-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
        }
        .form-input {
            width: 100%;
            padding: 12px;
            border: 2px solid #eee;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }
        .form-input:focus {
            outline: none;
            border-color: #667eea;
        }
        .form-hint {
            font-size: 0.8rem;
            color: #999;
            margin-top: 4px;
        }
        .actions {
            display: flex;
            gap: 8px;
        }
        .hidden {
            display: none;
        }
        .usage-bar {
            width: 100px;
            height: 8px;
            background: #eee;
            border-radius: 4px;
            overflow: hidden;
        }
        .usage-fill {
            height: 100%;
            background: linear-gradient(90deg, #2ed573, #ffa502);
            transition: width 0.3s ease;
        }
        .usage-text {
            font-size: 0.8rem;
            color: #666;
        }
        .api-key {
            font-family: monospace;
            background: #f1f2f6;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85rem;
        }
        .alert {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 16px;
        }
        .alert-success {
            background: #d4edda;
            color: #155724;
        }
        .alert-error {
            background: #f8d7da;
            color: #721c24;
        }
        /* Stats Dashboard Styles */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            padding: 20px;
            color: white;
        }
        .stat-card.success {
            background: linear-gradient(135deg, #2ed573 0%, #17c0eb 100%);
        }
        .stat-card.warning {
            background: linear-gradient(135deg, #ffa502 0%, #ff6348 100%);
        }
        .stat-label {
            font-size: 0.85rem;
            opacity: 0.9;
            margin-bottom: 4px;
        }
        .stat-value {
            font-size: 2rem;
            font-weight: 700;
        }
        .stat-sub {
            font-size: 0.75rem;
            opacity: 0.8;
            margin-top: 4px;
        }
        /* Simple Bar Chart */
        .chart-container {
            margin-top: 20px;
        }
        .chart-title {
            font-size: 1rem;
            color: #333;
            margin-bottom: 12px;
        }
        .chart-bars {
            display: flex;
            align-items: flex-end;
            gap: 8px;
            height: 100px;
            padding: 10px 0;
        }
        .chart-bar-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .chart-bar {
            width: 100%;
            max-width: 60px;
            background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
            border-radius: 4px 4px 0 0;
            transition: height 0.3s ease;
        }
        .chart-bar-label {
            font-size: 0.7rem;
            color: #666;
            margin-top: 4px;
        }
        .chart-bar-value {
            font-size: 0.75rem;
            color: #333;
            font-weight: 600;
        }
        /* Logs Table */
        .logs-table {
            font-size: 0.85rem;
        }
        .logs-table td {
            padding: 8px 12px;
        }
        .log-status {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .log-status.success {
            background: #d4edda;
            color: #155724;
        }
        .log-status.error {
            background: #f8d7da;
            color: #721c24;
        }
        .log-endpoint {
            font-family: monospace;
            background: #f1f2f6;
            padding: 2px 6px;
            border-radius: 4px;
        }
        .log-time {
            color: #999;
            font-size: 0.75rem;
        }
        .log-prompt {
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 0.75rem;
            color: #666;
        }
        /* Ranking styles */
        .ranking-controls {
            display: flex;
            gap: 10px;
            margin-bottom: 16px;
        }
        .ranking-controls select {
            padding: 8px 12px;
            border: 2px solid #eee;
            border-radius: 8px;
            font-size: 0.9rem;
        }
        .ranking-number {
            font-weight: 700;
            color: #667eea;
        }
        .ranking-number.gold { color: #ffc107; }
        .ranking-number.silver { color: #adb5bd; }
        .ranking-number.bronze { color: #cd7f32; }
        /* Pagination */
        .pagination {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-top: 16px;
        }
        .pagination button {
            padding: 8px 16px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            cursor: pointer;
        }
        .pagination button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .pagination button.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        .pagination-info {
            padding: 8px;
            color: #666;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>API密钥管理</h1>

        <div class="tabs">
            <button class="tab active" data-tab="stats">仪表盘</button>
            <button class="tab" data-tab="vendor">供应商密钥</button>
            <button class="tab" data-tab="custom">自定义密钥</button>
            <button class="tab" data-tab="logs">请求日志</button>
            <button class="tab" data-tab="ranking">排行榜</button>
        </div>

        <div id="alert-container"></div>

        <!-- Stats Dashboard Tab -->
        <div id="stats-tab" class="card">
            <div class="card-header">
                <h2 class="card-title">统计仪表盘</h2>
                <button class="btn btn-primary btn-sm" onclick="loadStats()">刷新</button>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">今日</div>
                    <div class="stat-value" id="stat-today">-</div>
                    <div class="stat-sub" id="stat-today-sub">次请求</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-label">本周</div>
                    <div class="stat-value" id="stat-week">-</div>
                    <div class="stat-sub" id="stat-week-sub">次请求</div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-label">本月</div>
                    <div class="stat-value" id="stat-month">-</div>
                    <div class="stat-sub" id="stat-month-sub">次请求</div>
                </div>
            </div>
            <div class="chart-container">
                <div class="chart-title">请求概览</div>
                <div class="chart-bars" id="stats-chart">
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="height: 0px;"></div>
                        <div class="chart-bar-value">0</div>
                        <div class="chart-bar-label">今日</div>
                    </div>
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="height: 0px;"></div>
                        <div class="chart-bar-value">0</div>
                        <div class="chart-bar-label">本周</div>
                    </div>
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="height: 0px;"></div>
                        <div class="chart-bar-value">0</div>
                        <div class="chart-bar-label">本月</div>
                    </div>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <h3 style="font-size: 1rem; color: #333; margin-bottom: 12px;">性能指标</h3>
                <div class="stats-grid">
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 16px;">
                        <div style="font-size: 0.85rem; color: #666;">今日平均响应时间</div>
                        <div style="font-size: 1.5rem; font-weight: 600; color: #333;" id="stat-avg-time">-</div>
                    </div>
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 16px;">
                        <div style="font-size: 0.85rem; color: #666;">今日成功率</div>
                        <div style="font-size: 1.5rem; font-weight: 600; color: #2ed573;" id="stat-success-rate">-</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Vendor Keys Tab -->
        <div id="vendor-tab" class="card hidden">
            <div class="card-header">
                <h2 class="card-title">供应商密钥</h2>
                <button class="btn btn-primary" onclick="showAddVendorModal()">添加密钥</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>供应商名称</th>
                        <th>API密钥</th>
                        <th>今日用量</th>
                        <th>过期时间</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="vendor-keys-table"></tbody>
            </table>
        </div>

        <!-- Custom Keys Tab -->
        <div id="custom-tab" class="card hidden">
            <div class="card-header">
                <h2 class="card-title">自定义密钥</h2>
                <button class="btn btn-primary" onclick="showAddCustomModal()">添加密钥</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>密钥名称</th>
                        <th>API密钥</th>
                        <th>用量</th>
                        <th>过期时间</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="custom-keys-table"></tbody>
            </table>
        </div>

        <!-- Logs Tab -->
        <div id="logs-tab" class="card hidden">
            <div class="card-header">
                <h2 class="card-title">最近请求日志</h2>
                <button class="btn btn-primary btn-sm" onclick="loadStats()">刷新</button>
            </div>
            <table class="logs-table">
                <thead>
                    <tr>
                        <th>时间</th>
                        <th>端点</th>
                        <th>状态</th>
                        <th>响应时间</th>
                        <th>IP</th>
                        <th>系统提示词</th>
                        <th>用户提示词</th>
                    </tr>
                </thead>
                <tbody id="logs-table"></tbody>
            </table>
            <div class="pagination" id="logs-pagination"></div>
        </div>

        <!-- Ranking Tab -->
        <div id="ranking-tab" class="card hidden">
            <div class="card-header">
                <h2 class="card-title">请求排行榜</h2>
                <button class="btn btn-primary btn-sm" onclick="loadRanking()">刷新</button>
            </div>
            <div class="ranking-controls">
                <select id="ranking-period" onchange="loadRanking()">
                    <option value="today">今日</option>
                    <option value="week">本周</option>
                    <option value="month">本月</option>
                </select>
            </div>

            <h3 style="font-size: 1rem; color: #333; margin: 20px 0 12px;">密钥请求排行</h3>
            <table class="logs-table">
                <thead>
                    <tr>
                        <th>排名</th>
                        <th>密钥名称</th>
                        <th>请求次数</th>
                        <th>成功</th>
                        <th>失败</th>
                        <th>平均响应时间</th>
                    </tr>
                </thead>
                <tbody id="key-ranking-table"></tbody>
            </table>
            <div class="pagination" id="key-ranking-pagination"></div>

            <h3 style="font-size: 1rem; color: #333; margin: 30px 0 12px;">IP请求排行</h3>
            <table class="logs-table">
                <thead>
                    <tr>
                        <th>排名</th>
                        <th>IP地址</th>
                        <th>请求次数</th>
                        <th>成功</th>
                        <th>失败</th>
                    </tr>
                </thead>
                <tbody id="ip-ranking-table"></tbody>
            </table>
            <div class="pagination" id="ip-ranking-pagination"></div>
        </div>
    </div>

    <!-- Add Vendor Key Modal -->
    <div id="vendor-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="vendor-modal-title">添加供应商密钥</h3>
                <button class="modal-close" onclick="closeModal('vendor-modal')">&times;</button>
            </div>
            <form id="vendor-form" onsubmit="handleVendorSubmit(event)">
                <input type="hidden" id="vendor-id">
                <div class="form-group">
                    <label class="form-label">供应商名称</label>
                    <input type="text" class="form-input" id="vendor-name" required>
                </div>
                <div class="form-group">
                    <label class="form-label">API密钥</label>
                    <input type="text" class="form-input" id="vendor-api-key" required>
                </div>
                <div class="form-group">
                    <label class="form-label">用量限制</label>
                    <input type="number" class="form-input" id="vendor-limit" value="500">
                    <div class="form-hint">每日允许的最大请求数</div>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%">保存</button>
            </form>
        </div>
    </div>

    <!-- Add Custom Key Modal -->
    <div id="custom-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="custom-modal-title">添加自定义密钥</h3>
                <button class="modal-close" onclick="closeModal('custom-modal')">&times;</button>
            </div>
            <form id="custom-form" onsubmit="handleCustomSubmit(event)">
                <input type="hidden" id="custom-id">
                <div class="form-group">
                    <label class="form-label">密钥名称</label>
                    <input type="text" class="form-input" id="custom-name" required>
                    <div class="form-hint">为此密钥设置一个友好的名称</div>
                </div>
                <div class="form-group">
                    <label class="form-label">API密钥 (可选)</label>
                    <input type="text" class="form-input" id="custom-api-key">
                    <div class="form-hint">留空则自动生成</div>
                </div>
                <div class="form-group">
                    <label class="form-label">用量限制</label>
                    <input type="number" class="form-input" id="custom-limit" value="-1">
                    <div class="form-hint">-1 表示无限制</div>
                </div>
                <div class="form-group">
                    <label class="form-label">过期时间 (可选)</label>
                    <input type="datetime-local" class="form-input" id="custom-expires">
                    <div class="form-hint">留空表示永不过期</div>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%">保存</button>
            </form>
        </div>
    </div>

    <!-- New Key Display Modal -->
    <div id="new-key-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>新API密钥已创建</h3>
                <button class="modal-close" onclick="closeModal('new-key-modal')">&times;</button>
            </div>
            <div class="alert alert-success">
                请复制并保存此API密钥，它将不会再次显示。
            </div>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <code id="new-key-value" style="word-break: break-all; font-size: 1rem;"></code>
            </div>
            <button class="btn btn-primary" style="width: 100%" onclick="copyNewKey()">复制到剪贴板</button>
        </div>
    </div>

    <script>
        // Get current admin path from URL
        const currentPath = window.location.pathname.replace(/\\/+$/, '');
        const API_BASE = currentPath + '/api';
        const PAGE_SIZE = 20;

        // Pagination state
        let logsPage = 0;
        let allLogs = [];
        let keyRankingPage = 0;
        let allKeyRanking = [];
        let ipRankingPage = 0;
        let allIPRanking = [];

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const tabName = tab.dataset.tab;
                document.getElementById('stats-tab').classList.toggle('hidden', tabName !== 'stats');
                document.getElementById('vendor-tab').classList.toggle('hidden', tabName !== 'vendor');
                document.getElementById('custom-tab').classList.toggle('hidden', tabName !== 'custom');
                document.getElementById('logs-tab').classList.toggle('hidden', tabName !== 'logs');
                document.getElementById('ranking-tab').classList.toggle('hidden', tabName !== 'ranking');

                if (tabName === 'ranking') {
                    loadRanking();
                }
            });
        });

        // Alert functions
        function showAlert(message, type = 'success') {
            const container = document.getElementById('alert-container');
            const alert = document.createElement('div');
            alert.className = 'alert alert-' + type;
            alert.textContent = message;
            container.innerHTML = '';
            container.appendChild(alert);
            setTimeout(() => alert.remove(), 3000);
        }

        // Modal functions
        function showModal(id) {
            document.getElementById(id).classList.add('show');
        }
        function closeModal(id) {
            document.getElementById(id).classList.remove('show');
        }

        // Pagination helper
        function renderPagination(containerId, totalItems, currentPage, onPageChange) {
            const container = document.getElementById(containerId);
            const totalPages = Math.ceil(totalItems / PAGE_SIZE);

            if (totalPages <= 1) {
                container.innerHTML = '';
                return;
            }

            let html = '';
            html += \`<button \${currentPage === 0 ? 'disabled' : ''} onclick="\${onPageChange}(\${currentPage - 1})">上一页</button>\`;
            html += \`<span class="pagination-info">第 \${currentPage + 1} / \${totalPages} 页 (共 \${totalItems} 条)</span>\`;
            html += \`<button \${currentPage >= totalPages - 1 ? 'disabled' : ''} onclick="\${onPageChange}(\${currentPage + 1})">下一页</button>\`;

            container.innerHTML = html;
        }

        // Stats Dashboard
        async function loadStats() {
            try {
                const response = await fetch(API_BASE + '/stats');
                const data = await response.json();

                // Update stat cards
                document.getElementById('stat-today').textContent = data.today.total_requests;
                document.getElementById('stat-week').textContent = data.week.total_requests;
                document.getElementById('stat-month').textContent = data.month.total_requests;

                // Update performance stats
                const avgTime = data.today.avg_response_time_ms;
                document.getElementById('stat-avg-time').textContent = avgTime ? Math.round(avgTime) + 'ms' : '暂无数据';

                const successRate = data.today.total_requests > 0
                    ? Math.round((data.today.successful_requests / data.today.total_requests) * 100)
                    : 100;
                document.getElementById('stat-success-rate').textContent = successRate + '%';

                // Update chart
                const maxVal = Math.max(data.today.total_requests, data.week.total_requests, data.month.total_requests, 1);
                const chartBars = document.querySelectorAll('#stats-chart .chart-bar-wrapper');
                const values = [data.today.total_requests, data.week.total_requests, data.month.total_requests];
                chartBars.forEach((wrapper, i) => {
                    const bar = wrapper.querySelector('.chart-bar');
                    const valueEl = wrapper.querySelector('.chart-bar-value');
                    const height = Math.max(5, (values[i] / maxVal) * 80);
                    bar.style.height = height + 'px';
                    valueEl.textContent = values[i];
                });

                // Update logs table
                allLogs = data.recentLogs || [];
                logsPage = 0;
                renderLogsPage();

            } catch (error) {
                console.error('加载统计数据失败:', error);
            }
        }

        function renderLogsPage() {
            const start = logsPage * PAGE_SIZE;
            const end = start + PAGE_SIZE;
            const pageLogs = allLogs.slice(start, end);

            const logsTable = document.getElementById('logs-table');
            logsTable.innerHTML = pageLogs.map(log => {
                const statusClass = log.status_code >= 200 && log.status_code < 400 ? 'success' : 'error';
                const time = new Date(log.created_at).toLocaleString('zh-CN');
                const sysPrompt = log.system_prompt ? (log.system_prompt.length > 50 ? log.system_prompt.substring(0, 50) + '...' : log.system_prompt) : '-';
                const userPrompt = log.user_prompt ? (log.user_prompt.length > 50 ? log.user_prompt.substring(0, 50) + '...' : log.user_prompt) : '-';
                return \`
                    <tr>
                        <td class="log-time">\${time}</td>
                        <td><span class="log-endpoint">\${log.endpoint}</span></td>
                        <td><span class="log-status \${statusClass}">\${log.status_code || '暂无'}</span></td>
                        <td>\${log.response_time_ms ? log.response_time_ms + 'ms' : '暂无'}</td>
                        <td>\${log.ip_address || '暂无'}</td>
                        <td class="log-prompt" title="\${log.system_prompt || ''}">\${sysPrompt}</td>
                        <td class="log-prompt" title="\${log.user_prompt || ''}">\${userPrompt}</td>
                    </tr>
                \`;
            }).join('');

            renderPagination('logs-pagination', allLogs.length, logsPage, 'setLogsPage');
        }

        function setLogsPage(page) {
            logsPage = page;
            renderLogsPage();
        }

        // Ranking functions
        async function loadRanking() {
            try {
                const period = document.getElementById('ranking-period').value;
                const response = await fetch(API_BASE + '/ranking?period=' + period);
                const data = await response.json();

                allKeyRanking = data.keyRanking || [];
                allIPRanking = data.ipRanking || [];
                keyRankingPage = 0;
                ipRankingPage = 0;

                renderKeyRankingPage();
                renderIPRankingPage();
            } catch (error) {
                console.error('加载排行榜失败:', error);
            }
        }

        function getRankClass(rank) {
            if (rank === 1) return 'gold';
            if (rank === 2) return 'silver';
            if (rank === 3) return 'bronze';
            return '';
        }

        function renderKeyRankingPage() {
            const start = keyRankingPage * PAGE_SIZE;
            const end = start + PAGE_SIZE;
            const pageData = allKeyRanking.slice(start, end);

            const tbody = document.getElementById('key-ranking-table');
            tbody.innerHTML = pageData.map((item, idx) => {
                const rank = start + idx + 1;
                const rankClass = getRankClass(rank);
                return \`
                    <tr>
                        <td><span class="ranking-number \${rankClass}">#\${rank}</span></td>
                        <td>\${item.key_name || '未知'}</td>
                        <td>\${item.request_count}</td>
                        <td style="color: #2ed573">\${item.successful_count}</td>
                        <td style="color: #ff4757">\${item.failed_count}</td>
                        <td>\${item.avg_response_time_ms ? Math.round(item.avg_response_time_ms) + 'ms' : '暂无'}</td>
                    </tr>
                \`;
            }).join('');

            renderPagination('key-ranking-pagination', allKeyRanking.length, keyRankingPage, 'setKeyRankingPage');
        }

        function setKeyRankingPage(page) {
            keyRankingPage = page;
            renderKeyRankingPage();
        }

        function renderIPRankingPage() {
            const start = ipRankingPage * PAGE_SIZE;
            const end = start + PAGE_SIZE;
            const pageData = allIPRanking.slice(start, end);

            const tbody = document.getElementById('ip-ranking-table');
            tbody.innerHTML = pageData.map((item, idx) => {
                const rank = start + idx + 1;
                const rankClass = getRankClass(rank);
                return \`
                    <tr>
                        <td><span class="ranking-number \${rankClass}">#\${rank}</span></td>
                        <td>\${item.ip_address || '未知'}</td>
                        <td>\${item.request_count}</td>
                        <td style="color: #2ed573">\${item.successful_count}</td>
                        <td style="color: #ff4757">\${item.failed_count}</td>
                    </tr>
                \`;
            }).join('');

            renderPagination('ip-ranking-pagination', allIPRanking.length, ipRankingPage, 'setIPRankingPage');
        }

        function setIPRankingPage(page) {
            ipRankingPage = page;
            renderIPRankingPage();
        }

        // Vendor Keys functions
        async function loadVendorKeys() {
            const response = await fetch(API_BASE + '/vendor-keys');
            const keys = await response.json();
            const tbody = document.getElementById('vendor-keys-table');
            tbody.innerHTML = keys.map((key, index) => {
                // Format expiration date
                let expiryDisplay = '<span class="expiry-date">暂无</span>';
                if (key.expires_at) {
                    const expiryDate = new Date(key.expires_at);
                    const now = new Date();
                    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                    const dateStr = expiryDate.toLocaleDateString('zh-CN');

                    if (key.is_expired) {
                        expiryDisplay = \`<span class="expiry-date expiry-expired">已过期</span>\`;
                    } else if (daysUntilExpiry <= 3) {
                        expiryDisplay = \`<span class="expiry-date expiry-warning">\${dateStr} (\${daysUntilExpiry}天)</span>\`;
                    } else {
                        expiryDisplay = \`<span class="expiry-date expiry-valid">\${dateStr}</span>\`;
                    }
                }

                // Determine status
                let statusDisplay;
                if (key.is_expired) {
                    statusDisplay = '<span class="status-expired">已过期</span>';
                } else if (key.is_active) {
                    statusDisplay = '<span class="status-active">已启用</span>';
                } else {
                    statusDisplay = '<span class="status-inactive">已禁用</span>';
                }

                return \`
                <tr>
                    <td>\${index + 1}</td>
                    <td>\${key.vendor_name}</td>
                    <td><span class="api-key">\${key.api_key}</span></td>
                    <td>
                        <div class="usage-bar">
                            <div class="usage-fill" style="width: \${Math.min(100, (key.used_count / key.usage_limit) * 100)}%"></div>
                        </div>
                        <div class="usage-text">\${key.used_count} / \${key.usage_limit}</div>
                        <div class="reset-info">每日重置</div>
                    </td>
                    <td>\${expiryDisplay}</td>
                    <td>\${statusDisplay}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-primary" onclick="editVendorKey(\${key.id})">编辑</button>
                        <button class="btn btn-sm \${key.is_active ? 'btn-danger' : 'btn-primary'}" onclick="toggleVendorKey(\${key.id}, \${key.is_active})">\${key.is_active ? '禁用' : '启用'}</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteVendorKey(\${key.id})">删除</button>
                    </td>
                </tr>
            \`}).join('');
        }

        function showAddVendorModal() {
            document.getElementById('vendor-modal-title').textContent = '添加供应商密钥';
            document.getElementById('vendor-id').value = '';
            document.getElementById('vendor-name').value = 'manus';
            document.getElementById('vendor-api-key').value = '';
            document.getElementById('vendor-api-key').readOnly = false;
            document.getElementById('vendor-limit').value = '500';
            showModal('vendor-modal');
        }

        async function editVendorKey(id) {
            const response = await fetch(API_BASE + '/vendor-keys');
            const keys = await response.json();
            const key = keys.find(k => k.id === id);
            if (!key) return;

            document.getElementById('vendor-modal-title').textContent = '编辑供应商密钥';
            document.getElementById('vendor-id').value = id;
            document.getElementById('vendor-name').value = key.vendor_name;
            document.getElementById('vendor-api-key').value = '';
            document.getElementById('vendor-api-key').placeholder = '留空保持不变';
            document.getElementById('vendor-api-key').readOnly = false;
            document.getElementById('vendor-limit').value = key.usage_limit;
            showModal('vendor-modal');
        }

        async function handleVendorSubmit(e) {
            e.preventDefault();
            const id = document.getElementById('vendor-id').value;
            const data = {
                vendor_name: document.getElementById('vendor-name').value,
                usage_limit: parseInt(document.getElementById('vendor-limit').value),
            };
            const apiKey = document.getElementById('vendor-api-key').value;
            if (apiKey) data.api_key = apiKey;

            const url = id ? API_BASE + '/vendor-keys/' + id : API_BASE + '/vendor-keys';
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                closeModal('vendor-modal');
                loadVendorKeys();
                showAlert(id ? '密钥更新成功' : '密钥添加成功');
            } else {
                const error = await response.json();
                showAlert(error.error || '操作失败', 'error');
            }
        }

        async function toggleVendorKey(id, currentStatus) {
            const response = await fetch(API_BASE + '/vendor-keys/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: currentStatus ? 0 : 1 })
            });
            if (response.ok) {
                loadVendorKeys();
                showAlert('密钥状态已更新');
            }
        }

        async function deleteVendorKey(id) {
            if (!confirm('确定要删除此密钥吗？')) return;
            const response = await fetch(API_BASE + '/vendor-keys/' + id, { method: 'DELETE' });
            if (response.ok) {
                loadVendorKeys();
                showAlert('密钥删除成功');
            }
        }

        // Custom Keys functions
        async function loadCustomKeys() {
            const response = await fetch(API_BASE + '/custom-keys');
            const keys = await response.json();
            const tbody = document.getElementById('custom-keys-table');
            tbody.innerHTML = keys.map((key, index) => {
                const usageDisplay = key.usage_limit === -1
                    ? \`<span class="usage-text">\${key.used_count} / 无限制</span>\`
                    : \`<div class="usage-bar"><div class="usage-fill" style="width: \${Math.min(100, (key.used_count / key.usage_limit) * 100)}%"></div></div><div class="usage-text">\${key.used_count} / \${key.usage_limit}</div>\`;

                // Format expiration date for custom keys
                let expiryDisplay = '<span class="expiry-date">永不过期</span>';
                if (key.expires_at) {
                    const expiryDate = new Date(key.expires_at);
                    const now = new Date();
                    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                    const dateStr = expiryDate.toLocaleDateString('zh-CN');

                    if (key.is_expired) {
                        expiryDisplay = \`<span class="expiry-date expiry-expired">已过期</span>\`;
                    } else if (daysUntilExpiry <= 3) {
                        expiryDisplay = \`<span class="expiry-date expiry-warning">\${dateStr} (\${daysUntilExpiry}天)</span>\`;
                    } else {
                        expiryDisplay = \`<span class="expiry-date expiry-valid">\${dateStr}</span>\`;
                    }
                }

                // Determine status
                let statusDisplay;
                if (key.is_expired) {
                    statusDisplay = '<span class="status-expired">已过期</span>';
                } else if (key.is_active) {
                    statusDisplay = '<span class="status-active">已启用</span>';
                } else {
                    statusDisplay = '<span class="status-inactive">已禁用</span>';
                }

                return \`
                <tr>
                    <td>\${index + 1}</td>
                    <td>\${key.key_name}</td>
                    <td><span class="api-key">\${key.api_key}</span></td>
                    <td>\${usageDisplay}</td>
                    <td>\${expiryDisplay}</td>
                    <td>\${statusDisplay}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-primary" onclick="editCustomKey(\${key.id})">编辑</button>
                        <button class="btn btn-sm \${key.is_active ? 'btn-danger' : 'btn-primary'}" onclick="toggleCustomKey(\${key.id}, \${key.is_active})">\${key.is_active ? '禁用' : '启用'}</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCustomKey(\${key.id})">删除</button>
                    </td>
                </tr>
            \`}).join('');
        }

        function showAddCustomModal() {
            document.getElementById('custom-modal-title').textContent = '添加自定义密钥';
            document.getElementById('custom-id').value = '';
            document.getElementById('custom-name').value = 'vbdo007_freekey';
            document.getElementById('custom-api-key').value = '';
            document.getElementById('custom-api-key').readOnly = false;
            document.getElementById('custom-limit').value = '-1';
            document.getElementById('custom-expires').value = '';
            showModal('custom-modal');
        }

        async function editCustomKey(id) {
            const response = await fetch(API_BASE + '/custom-keys');
            const keys = await response.json();
            const key = keys.find(k => k.id === id);
            if (!key) return;

            document.getElementById('custom-modal-title').textContent = '编辑自定义密钥';
            document.getElementById('custom-id').value = id;
            document.getElementById('custom-name').value = key.key_name;
            document.getElementById('custom-api-key').value = '';
            document.getElementById('custom-api-key').placeholder = '留空保持不变';
            document.getElementById('custom-limit').value = key.usage_limit;

            // Set expires_at if exists
            if (key.expires_at) {
                const date = new Date(key.expires_at);
                const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                document.getElementById('custom-expires').value = localDate.toISOString().slice(0, 16);
            } else {
                document.getElementById('custom-expires').value = '';
            }

            showModal('custom-modal');
        }

        async function handleCustomSubmit(e) {
            e.preventDefault();
            const id = document.getElementById('custom-id').value;
            const data = {
                key_name: document.getElementById('custom-name').value,
                usage_limit: parseInt(document.getElementById('custom-limit').value),
            };
            const apiKey = document.getElementById('custom-api-key').value;
            if (apiKey) data.api_key = apiKey;

            const expiresAt = document.getElementById('custom-expires').value;
            if (expiresAt) {
                data.expires_at = new Date(expiresAt).toISOString();
            } else if (id) {
                // When editing, explicitly set to null to remove expiration
                data.expires_at = null;
            }

            const url = id ? API_BASE + '/custom-keys/' + id : API_BASE + '/custom-keys';
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                closeModal('custom-modal');
                const result = await response.json();

                // If creating new key, show the full API key
                if (!id && result.api_key) {
                    document.getElementById('new-key-value').textContent = result.api_key;
                    showModal('new-key-modal');
                }

                loadCustomKeys();
                showAlert(id ? '密钥更新成功' : '密钥添加成功');
            } else {
                const error = await response.json();
                showAlert(error.error || '操作失败', 'error');
            }
        }

        async function toggleCustomKey(id, currentStatus) {
            const response = await fetch(API_BASE + '/custom-keys/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: currentStatus ? 0 : 1 })
            });
            if (response.ok) {
                loadCustomKeys();
                showAlert('密钥状态已更新');
            }
        }

        async function deleteCustomKey(id) {
            if (!confirm('确定要删除此密钥吗？')) return;
            const response = await fetch(API_BASE + '/custom-keys/' + id, { method: 'DELETE' });
            if (response.ok) {
                loadCustomKeys();
                showAlert('密钥删除成功');
            }
        }

        function copyNewKey() {
            const key = document.getElementById('new-key-value').textContent;
            navigator.clipboard.writeText(key).then(() => {
                showAlert('已复制到剪贴板!');
            });
        }

        // Initial load
        loadStats();
        loadVendorKeys();
        loadCustomKeys();
    </script>
</body>
</html>`;
}

export function renderLoginPage(error?: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理员登录</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .login-card {
            background: white;
            border-radius: 16px;
            padding: 40px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
            color: #333;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
        }
        .form-input {
            width: 100%;
            padding: 12px;
            border: 2px solid #eee;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }
        .form-input:focus {
            outline: none;
            border-color: #667eea;
        }
        .btn {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 8px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102,126,234,0.4);
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="login-card">
        <h1>管理员登录</h1>
        ${error ? `<div class="error">${error}</div>` : ''}
        <form method="POST" action="">
            <div class="form-group">
                <label class="form-label">密码</label>
                <input type="password" name="password" class="form-input" required autofocus>
            </div>
            <button type="submit" class="btn">登录</button>
        </form>
    </div>
</body>
</html>`;
}
