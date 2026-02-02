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
    </style>
</head>
<body>
    <div class="container">
        <h1>API Key Management</h1>

        <div class="tabs">
            <button class="tab active" data-tab="vendor">Vendor Keys</button>
            <button class="tab" data-tab="custom">Custom Keys</button>
        </div>

        <div id="alert-container"></div>

        <!-- Vendor Keys Tab -->
        <div id="vendor-tab" class="card">
            <div class="card-header">
                <h2 class="card-title">Vendor Keys</h2>
                <button class="btn btn-primary" onclick="showAddVendorModal()">Add Key</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
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
                        <th>ID</th>
                        <th>Key Name</th>
                        <th>API Key</th>
                        <th>Usage</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="custom-keys-table"></tbody>
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
                    <div class="form-hint">Maximum number of requests allowed</div>
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
                document.getElementById('vendor-tab').classList.toggle('hidden', tabName !== 'vendor');
                document.getElementById('custom-tab').classList.toggle('hidden', tabName !== 'custom');
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

        // Vendor Keys functions
        async function loadVendorKeys() {
            const response = await fetch(API_BASE + '/vendor-keys');
            const keys = await response.json();
            const tbody = document.getElementById('vendor-keys-table');
            tbody.innerHTML = keys.map(key => {
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
                    <td>\${key.id}</td>
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
            document.getElementById('vendor-name').value = '';
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
            tbody.innerHTML = keys.map(key => {
                const usageDisplay = key.usage_limit === -1
                    ? \`<span class="usage-text">\${key.used_count} / Unlimited</span>\`
                    : \`<div class="usage-bar"><div class="usage-fill" style="width: \${Math.min(100, (key.used_count / key.usage_limit) * 100)}%"></div></div><div class="usage-text">\${key.used_count} / \${key.usage_limit}</div>\`;
                return \`
                <tr>
                    <td>\${key.id}</td>
                    <td>\${key.key_name}</td>
                    <td><span class="api-key">\${key.api_key}</span></td>
                    <td>\${usageDisplay}</td>
                    <td><span class="\${key.is_active ? 'status-active' : 'status-inactive'}">\${key.is_active ? 'Active' : 'Inactive'}</span></td>
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
            document.getElementById('custom-name').value = '';
            document.getElementById('custom-api-key').value = '';
            document.getElementById('custom-api-key').readOnly = false;
            document.getElementById('custom-limit').value = '-1';
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
