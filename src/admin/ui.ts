// Admin UI HTML

export function renderAdminUI(): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Key Management</title>
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
    </style>
</head>
<body>
    <div class="container">
        <h1>API Key Management</h1>

        <div class="tabs">
            <button class="tab active" data-tab="stats">Dashboard</button>
            <button class="tab" data-tab="vendor">Vendor Keys</button>
            <button class="tab" data-tab="custom">Custom Keys</button>
            <button class="tab" data-tab="logs">Request Logs</button>
        </div>

        <div id="alert-container"></div>

        <!-- Stats Dashboard Tab -->
        <div id="stats-tab" class="card">
            <div class="card-header">
                <h2 class="card-title">Statistics Dashboard</h2>
                <button class="btn btn-primary btn-sm" onclick="loadStats()">Refresh</button>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Today</div>
                    <div class="stat-value" id="stat-today">-</div>
                    <div class="stat-sub" id="stat-today-sub">requests</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-label">This Week</div>
                    <div class="stat-value" id="stat-week">-</div>
                    <div class="stat-sub" id="stat-week-sub">requests</div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-label">This Month</div>
                    <div class="stat-value" id="stat-month">-</div>
                    <div class="stat-sub" id="stat-month-sub">requests</div>
                </div>
            </div>
            <div class="chart-container">
                <div class="chart-title">Request Overview</div>
                <div class="chart-bars" id="stats-chart">
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="height: 0px;"></div>
                        <div class="chart-bar-value">0</div>
                        <div class="chart-bar-label">Today</div>
                    </div>
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="height: 0px;"></div>
                        <div class="chart-bar-value">0</div>
                        <div class="chart-bar-label">Week</div>
                    </div>
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="height: 0px;"></div>
                        <div class="chart-bar-value">0</div>
                        <div class="chart-bar-label">Month</div>
                    </div>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <h3 style="font-size: 1rem; color: #333; margin-bottom: 12px;">Performance</h3>
                <div class="stats-grid">
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 16px;">
                        <div style="font-size: 0.85rem; color: #666;">Avg Response Time (Today)</div>
                        <div style="font-size: 1.5rem; font-weight: 600; color: #333;" id="stat-avg-time">-</div>
                    </div>
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 16px;">
                        <div style="font-size: 0.85rem; color: #666;">Success Rate (Today)</div>
                        <div style="font-size: 1.5rem; font-weight: 600; color: #2ed573;" id="stat-success-rate">-</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Vendor Keys Tab -->
        <div id="vendor-tab" class="card hidden">
            <div class="card-header">
                <h2 class="card-title">Vendor Keys</h2>
                <button class="btn btn-primary" onclick="showAddVendorModal()">Add Key</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Vendor Name</th>
                        <th>API Key</th>
                        <th>Today Usage</th>
                        <th>Expires</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="vendor-keys-table"></tbody>
            </table>
        </div>

        <!-- Custom Keys Tab -->
        <div id="custom-tab" class="card hidden">
            <div class="card-header">
                <h2 class="card-title">Custom Keys</h2>
                <button class="btn btn-primary" onclick="showAddCustomModal()">Add Key</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Key Name</th>
                        <th>API Key</th>
                        <th>Usage</th>
                        <th>Expires</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="custom-keys-table"></tbody>
            </table>
        </div>

        <!-- Logs Tab -->
        <div id="logs-tab" class="card hidden">
            <div class="card-header">
                <h2 class="card-title">Recent Request Logs</h2>
                <button class="btn btn-primary btn-sm" onclick="loadStats()">Refresh</button>
            </div>
            <table class="logs-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Endpoint</th>
                        <th>Status</th>
                        <th>Response Time</th>
                        <th>IP</th>
                    </tr>
                </thead>
                <tbody id="logs-table"></tbody>
            </table>
        </div>
    </div>

    <!-- Add Vendor Key Modal -->
    <div id="vendor-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="vendor-modal-title">Add Vendor Key</h3>
                <button class="modal-close" onclick="closeModal('vendor-modal')">&times;</button>
            </div>
            <form id="vendor-form" onsubmit="handleVendorSubmit(event)">
                <input type="hidden" id="vendor-id">
                <div class="form-group">
                    <label class="form-label">Vendor Name</label>
                    <input type="text" class="form-input" id="vendor-name" required>
                </div>
                <div class="form-group">
                    <label class="form-label">API Key</label>
                    <input type="text" class="form-input" id="vendor-api-key" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Usage Limit</label>
                    <input type="number" class="form-input" id="vendor-limit" value="500">
                    <div class="form-hint">Maximum number of requests allowed per day</div>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%">Save</button>
            </form>
        </div>
    </div>

    <!-- Add Custom Key Modal -->
    <div id="custom-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="custom-modal-title">Add Custom Key</h3>
                <button class="modal-close" onclick="closeModal('custom-modal')">&times;</button>
            </div>
            <form id="custom-form" onsubmit="handleCustomSubmit(event)">
                <input type="hidden" id="custom-id">
                <div class="form-group">
                    <label class="form-label">Key Name</label>
                    <input type="text" class="form-input" id="custom-name" required>
                    <div class="form-hint">A friendly name for this key</div>
                </div>
                <div class="form-group">
                    <label class="form-label">API Key (optional)</label>
                    <input type="text" class="form-input" id="custom-api-key">
                    <div class="form-hint">Leave empty to auto-generate</div>
                </div>
                <div class="form-group">
                    <label class="form-label">Usage Limit</label>
                    <input type="number" class="form-input" id="custom-limit" value="-1">
                    <div class="form-hint">-1 for unlimited</div>
                </div>
                <div class="form-group">
                    <label class="form-label">Expires At (optional)</label>
                    <input type="datetime-local" class="form-input" id="custom-expires">
                    <div class="form-hint">Leave empty for no expiration</div>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%">Save</button>
            </form>
        </div>
    </div>

    <!-- New Key Display Modal -->
    <div id="new-key-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>New API Key Created</h3>
                <button class="modal-close" onclick="closeModal('new-key-modal')">&times;</button>
            </div>
            <div class="alert alert-success">
                Please copy and save this API key. It will not be shown again.
            </div>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <code id="new-key-value" style="word-break: break-all; font-size: 1rem;"></code>
            </div>
            <button class="btn btn-primary" style="width: 100%" onclick="copyNewKey()">Copy to Clipboard</button>
        </div>
    </div>

    <script>
        const API_BASE = '/admin/api';

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
                document.getElementById('stat-avg-time').textContent = avgTime ? Math.round(avgTime) + 'ms' : 'N/A';

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
                const logsTable = document.getElementById('logs-table');
                logsTable.innerHTML = (data.recentLogs || []).map(log => {
                    const statusClass = log.status_code >= 200 && log.status_code < 400 ? 'success' : 'error';
                    const time = new Date(log.created_at).toLocaleString();
                    return \`
                        <tr>
                            <td class="log-time">\${time}</td>
                            <td><span class="log-endpoint">\${log.endpoint}</span></td>
                            <td><span class="log-status \${statusClass}">\${log.status_code || 'N/A'}</span></td>
                            <td>\${log.response_time_ms ? log.response_time_ms + 'ms' : 'N/A'}</td>
                            <td>\${log.ip_address || 'N/A'}</td>
                        </tr>
                    \`;
                }).join('');

            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }

        // Vendor Keys functions
        async function loadVendorKeys() {
            const response = await fetch(API_BASE + '/vendor-keys');
            const keys = await response.json();
            const tbody = document.getElementById('vendor-keys-table');
            tbody.innerHTML = keys.map((key, index) => {
                // Format expiration date
                let expiryDisplay = '<span class="expiry-date">N/A</span>';
                if (key.expires_at) {
                    const expiryDate = new Date(key.expires_at);
                    const now = new Date();
                    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                    const dateStr = expiryDate.toLocaleDateString();

                    if (key.is_expired) {
                        expiryDisplay = \`<span class="expiry-date expiry-expired">Expired</span>\`;
                    } else if (daysUntilExpiry <= 3) {
                        expiryDisplay = \`<span class="expiry-date expiry-warning">\${dateStr} (\${daysUntilExpiry}d)</span>\`;
                    } else {
                        expiryDisplay = \`<span class="expiry-date expiry-valid">\${dateStr}</span>\`;
                    }
                }

                // Determine status
                let statusDisplay;
                if (key.is_expired) {
                    statusDisplay = '<span class="status-expired">Expired</span>';
                } else if (key.is_active) {
                    statusDisplay = '<span class="status-active">Active</span>';
                } else {
                    statusDisplay = '<span class="status-inactive">Inactive</span>';
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
                        <div class="reset-info">Resets daily</div>
                    </td>
                    <td>\${expiryDisplay}</td>
                    <td>\${statusDisplay}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-primary" onclick="editVendorKey(\${key.id})">Edit</button>
                        <button class="btn btn-sm \${key.is_active ? 'btn-danger' : 'btn-primary'}" onclick="toggleVendorKey(\${key.id}, \${key.is_active})">\${key.is_active ? 'Disable' : 'Enable'}</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteVendorKey(\${key.id})">Delete</button>
                    </td>
                </tr>
            \`}).join('');
        }

        function showAddVendorModal() {
            document.getElementById('vendor-modal-title').textContent = 'Add Vendor Key';
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

            document.getElementById('vendor-modal-title').textContent = 'Edit Vendor Key';
            document.getElementById('vendor-id').value = id;
            document.getElementById('vendor-name').value = key.vendor_name;
            document.getElementById('vendor-api-key').value = '';
            document.getElementById('vendor-api-key').placeholder = 'Leave empty to keep existing';
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
                showAlert(id ? 'Key updated successfully' : 'Key added successfully');
            } else {
                const error = await response.json();
                showAlert(error.error || 'Operation failed', 'error');
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
                showAlert('Key status updated');
            }
        }

        async function deleteVendorKey(id) {
            if (!confirm('Are you sure you want to delete this key?')) return;
            const response = await fetch(API_BASE + '/vendor-keys/' + id, { method: 'DELETE' });
            if (response.ok) {
                loadVendorKeys();
                showAlert('Key deleted successfully');
            }
        }

        // Custom Keys functions
        async function loadCustomKeys() {
            const response = await fetch(API_BASE + '/custom-keys');
            const keys = await response.json();
            const tbody = document.getElementById('custom-keys-table');
            tbody.innerHTML = keys.map((key, index) => {
                const usageDisplay = key.usage_limit === -1
                    ? \`<span class="usage-text">\${key.used_count} / Unlimited</span>\`
                    : \`<div class="usage-bar"><div class="usage-fill" style="width: \${Math.min(100, (key.used_count / key.usage_limit) * 100)}%"></div></div><div class="usage-text">\${key.used_count} / \${key.usage_limit}</div>\`;

                // Format expiration date for custom keys
                let expiryDisplay = '<span class="expiry-date">Never</span>';
                if (key.expires_at) {
                    const expiryDate = new Date(key.expires_at);
                    const now = new Date();
                    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                    const dateStr = expiryDate.toLocaleDateString();

                    if (key.is_expired) {
                        expiryDisplay = \`<span class="expiry-date expiry-expired">Expired</span>\`;
                    } else if (daysUntilExpiry <= 3) {
                        expiryDisplay = \`<span class="expiry-date expiry-warning">\${dateStr} (\${daysUntilExpiry}d)</span>\`;
                    } else {
                        expiryDisplay = \`<span class="expiry-date expiry-valid">\${dateStr}</span>\`;
                    }
                }

                // Determine status
                let statusDisplay;
                if (key.is_expired) {
                    statusDisplay = '<span class="status-expired">Expired</span>';
                } else if (key.is_active) {
                    statusDisplay = '<span class="status-active">Active</span>';
                } else {
                    statusDisplay = '<span class="status-inactive">Inactive</span>';
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
                        <button class="btn btn-sm btn-primary" onclick="editCustomKey(\${key.id})">Edit</button>
                        <button class="btn btn-sm \${key.is_active ? 'btn-danger' : 'btn-primary'}" onclick="toggleCustomKey(\${key.id}, \${key.is_active})">\${key.is_active ? 'Disable' : 'Enable'}</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCustomKey(\${key.id})">Delete</button>
                    </td>
                </tr>
            \`}).join('');
        }

        function showAddCustomModal() {
            document.getElementById('custom-modal-title').textContent = 'Add Custom Key';
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

            document.getElementById('custom-modal-title').textContent = 'Edit Custom Key';
            document.getElementById('custom-id').value = id;
            document.getElementById('custom-name').value = key.key_name;
            document.getElementById('custom-api-key').value = '';
            document.getElementById('custom-api-key').placeholder = 'Leave empty to keep existing';
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
                showAlert(id ? 'Key updated successfully' : 'Key added successfully');
            } else {
                const error = await response.json();
                showAlert(error.error || 'Operation failed', 'error');
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
                showAlert('Key status updated');
            }
        }

        async function deleteCustomKey(id) {
            if (!confirm('Are you sure you want to delete this key?')) return;
            const response = await fetch(API_BASE + '/custom-keys/' + id, { method: 'DELETE' });
            if (response.ok) {
                loadCustomKeys();
                showAlert('Key deleted successfully');
            }
        }

        function copyNewKey() {
            const key = document.getElementById('new-key-value').textContent;
            navigator.clipboard.writeText(key).then(() => {
                showAlert('Copied to clipboard!');
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
    <title>Admin Login</title>
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
        <h1>Admin Login</h1>
        ${error ? `<div class="error">${error}</div>` : ''}
        <form method="POST" action="/admin/login">
            <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" name="password" class="form-input" required autofocus>
            </div>
            <button type="submit" class="btn">Login</button>
        </form>
    </div>
</body>
</html>`;
}
