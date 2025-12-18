/**
 * 车间内网 - 纯网页扫码查询系统
 * 核心逻辑文件
 */
document.addEventListener('DOMContentLoaded', function() {
    // ==================== 状态与DOM元素 ====================
    let html5QrCode = null;
    let isScanning = false;
    let currentCameraId = null;
    const scanHistory = JSON.parse(localStorage.getItem('scanHistory')) || [];

    // DOM 元素
    const dom = {
        qrReader: document.getElementById('qr-reader'),
        cameraSelect: document.getElementById('camera-select'),
        btnToggleCamera: document.getElementById('btn-toggle-camera'),
        btnStopScanner: document.getElementById('btn-stop-scanner'),
        partNumberInput: document.getElementById('part-number'),
        orderNumberInput: document.getElementById('order-number'),
        queryStatus: document.getElementById('query-status'),
        btnQuery: document.getElementById('btn-query'),
        queryResult: document.getElementById('query-result'),
        resultContent: document.getElementById('result-content'),
        historyList: document.getElementById('history-list'),
        btnClearHistory: document.getElementById('btn-clear-history')
    };

    // ==================== 工具函数 ====================
    // 更新状态显示
    function updateStatus(text, type = 'idle') {
        dom.queryStatus.textContent = text;
        dom.queryStatus.className = `status ${type}`;
    }

    // 解析二维码内容 (假设格式为 "零件号|订单号" 或 JSON)
    function parseQrContent(content) {
        console.log('解析二维码内容:', content);
        
        // 尝试解析为 JSON (例如: {"part_no":"PN-001","order_no":"ORD-2023-001"})
        try {
            const data = JSON.parse(content);
            return {
                partNumber: data.part_no || data.partNumber || data.part,
                orderNumber: data.order_no || data.orderNumber || data.order
            };
        } catch (e) {
            // 如果不是JSON，尝试用竖线分隔 (例如: "PN-001|ORD-2023-001")
            if (content.includes('|')) {
                const parts = content.split('|');
                return {
                    partNumber: parts[0]?.trim(),
                    orderNumber: parts[1]?.trim()
                };
            }
            // 尝试用其他分隔符
            const separators = [',', ';', ':', '/'];
            for (const sep of separators) {
                if (content.includes(sep)) {
                    const parts = content.split(sep);
                    return {
                        partNumber: parts[0]?.trim(),
                        orderNumber: parts[1]?.trim()
                    };
                }
            }
            // 如果都无法解析，整个内容作为零件号
            return {
                partNumber: content,
                orderNumber: ''
            };
        }
    }

    // 添加记录到历史
    function addToHistory(partNumber, orderNumber, rawContent) {
        const timestamp = new Date().toLocaleTimeString('zh-CN', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const historyItem = {
            id: Date.now(),
            timestamp,
            partNumber,
            orderNumber,
            rawContent: rawContent.substring(0, 100) // 只存储前100字符
        };
        
        scanHistory.unshift(historyItem);
        // 最多保留50条记录
        if (scanHistory.length > 50) scanHistory.pop();
        
        localStorage.setItem('scanHistory', JSON.stringify(scanHistory));
        renderHistory();
    }

    // 渲染历史记录
    function renderHistory() {
        dom.historyList.innerHTML = '';
        
        scanHistory.slice(0, 10).forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <div class="history-content">
                    <strong>零件:</strong> ${item.partNumber || '未解析'} | 
                    <strong>订单:</strong> ${item.orderNumber || '未解析'}
                </div>
                <div class="history-time">${item.timestamp}</div>
                <div class="history-actions">
                    <button class="btn-history-use" data-id="${item.id}" title="使用此记录">
                        <i class="fas fa-redo"></i>
                    </button>
                </div>
            `;
            dom.historyList.appendChild(li);
        });
        
        // 为历史记录按钮添加事件
        document.querySelectorAll('.btn-history-use').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                const item = scanHistory.find(h => h.id === id);
                if (item) {
                    dom.partNumberInput.value = item.partNumber || '';
                    dom.orderNumberInput.value = item.orderNumber || '';
                    updateStatus('已加载历史记录', 'success');
                    dom.btnQuery.disabled = false;
                }
            });
        });
    }

    // 模拟查询订单信息 (实际需替换为您的内网API调用)
    function mockQueryOrder(partNumber, orderNumber) {
        // 这里模拟一个延时和返回数据
        return new Promise(resolve => {
            setTimeout(() => {
                const mockData = {
                    partNumber: partNumber,
                    orderNumber: orderNumber,
                    productName: '精密轴承套件',
                    customer: 'XX机械制造有限公司',
                    quantity: 150,
                    status: '生产中',
                    deliveryDate: '2023-12-15',
                    process: '已完成车削、磨削',
                    inspector: '张工',
                    notes: '第三批次，材质为不锈钢304'
                };
                resolve(mockData);
            }, 800);
        });
    }

    // 渲染查询结果
    function renderQueryResult(data) {
        dom.resultContent.innerHTML = '';
        
        const fields = [
            { label: '零件名称', value: data.productName, icon: 'fas fa-cog' },
            { label: '客户名称', value: data.customer, icon: 'fas fa-building' },
            { label: '订单数量', value: `${data.quantity} 件`, icon: 'fas fa-boxes' },
            { label: '生产状态', value: data.status, icon: 'fas fa-tasks' },
            { label: '交货日期', value: data.deliveryDate, icon: 'fas fa-calendar-alt' },
            { label: '当前工序', value: data.process, icon: 'fas fa-industry' },
            { label: '质检员', value: data.inspector, icon: 'fas fa-user-check' },
            { label: '备注', value: data.notes, icon: 'fas fa-sticky-note' }
        ];
        
        fields.forEach(field => {
            const item = document.createElement('div');
            item.className = 'result-item';
            item.innerHTML = `
                <div class="label"><i class="${field.icon}"></i> ${field.label}</div>
                <div class="value">${field.value || '无'}</div>
            `;
            dom.resultContent.appendChild(item);
        });
        
        dom.queryResult.style.display = 'block';
    }

    // ==================== 摄像头管理 ====================
    // 获取可用摄像头
    async function getCameras() {
        try {
            const devices = await Html5Qrcode.getCameras();
            dom.cameraSelect.innerHTML = '<option value="">选择摄像头...</option>';
            
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.id;
                option.text = device.label || `摄像头 ${dom.cameraSelect.options.length}`;
                dom.cameraSelect.appendChild(option);
            });
            
            return devices;
        } catch (error) {
            console.error('获取摄像头失败:', error);
            updateStatus('无法访问摄像头，请检查权限', 'idle');
            return [];
        }
    }

    // 启动扫码
    async function startScanner(cameraId = null) {
        if (isScanning) return;
        
        try {
            // 如果没有指定摄像头，尝试获取第一个
            if (!cameraId) {
                const cameras = await Html5Qrcode.getCameras();
                if (cameras.length > 0) {
                    cameraId = cameras[0].id;
                    dom.cameraSelect.value = cameraId;
                } else {
                    throw new Error('未找到可用摄像头');
                }
            }
            
            html5QrCode = new Html5Qrcode("qr-reader");
            currentCameraId = cameraId;
            
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                disableFlip: false
            };
            
            updateStatus('摄像头启动中...', 'scanning');
            
            await html5QrCode.start(
                cameraId,
                config,
                onScanSuccess,
                onScanFailure
            );
            
            isScanning = true;
            dom.btnStopScanner.style.display = 'inline-flex';
            dom.btnToggleCamera.disabled = false;
            updateStatus('正在扫描，请对准二维码...', 'scanning');
            
            console.log('扫码器启动成功，使用摄像头:', cameraId);
            
        } catch (error) {
            console.error('启动扫码器失败:', error);
            updateStatus(`启动失败: ${error.message}`, 'idle');
            isScanning = false;
        }
    }

    // 停止扫码
    async function stopScanner() {
        if (!html5QrCode || !isScanning) return;
        
        try {
            await html5QrCode.stop();
            html5QrCode.clear();
            html5QrCode = null;
            isScanning = false;
            currentCameraId = null;
            
            dom.btnStopScanner.style.display = 'none';
            updateStatus('扫码已停止', 'idle');
            
            console.log('扫码器已停止');
        } catch (error) {
            console.error('停止扫码器失败:', error);
        }
    }

    // ==================== 扫码回调 ====================
    function onScanSuccess(decodedText) {
        console.log('扫描成功:', decodedText);
        
        // 解析二维码内容
        const { partNumber, orderNumber } = parseQrContent(decodedText);
        
        // 更新表单
        dom.partNumberInput.value = partNumber || '';
        dom.orderNumberInput.value = orderNumber || '';
        
        // 添加到历史记录
        addToHistory(partNumber, orderNumber, decodedText);
        
        // 启用查询按钮
        dom.btnQuery.disabled = false;
        
        // 更新状态
        updateStatus(`成功扫描！零件号: ${partNumber || '未解析'}`, 'success');
        
        // 可以在这里添加短暂震动反馈 (如果支持)
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
        
        // 可选：扫描成功后自动停止，避免重复扫描
        // setTimeout(() => stopScanner(), 1000);
    }

    function onScanFailure(error) {
        // 静默处理扫描失败，大部分是未识别到二维码
        // console.warn('扫描失败:', error);
    }

    // ==================== 事件监听 ====================
    // 摄像头选择
    dom.cameraSelect.addEventListener('change', function() {
        if (this.value) {
            stopScanner().then(() => startScanner(this.value));
        }
    });

    // 切换摄像头
    dom.btnToggleCamera.addEventListener('click', async function() {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras.length < 2) {
            updateStatus('未找到其他摄像头', 'idle');
            return;
        }
        
        const currentIndex = cameras.findIndex(cam => cam.id === currentCameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        const nextCameraId = cameras[nextIndex].id;
        
        dom.cameraSelect.value = nextCameraId;
        await stopScanner();
        await startScanner(nextCameraId);
    });

    // 停止扫描
    dom.btnStopScanner.addEventListener('click', stopScanner);

    // 查询订单信息
    dom.btnQuery.addEventListener('click', async function() {
        const partNumber = dom.partNumberInput.value.trim();
        const orderNumber = dom.orderNumberInput.value.trim();
        
        if (!partNumber && !orderNumber) {
            updateStatus('请输入零件号或订单号', 'idle');
            return;
        }
        
        updateStatus('正在查询订单信息...', 'scanning');
        dom.btnQuery.disabled = true;
        
        try {
            // ===== 这里是关键：替换为您的真实API调用 =====
            // const response = await fetch(`http://您的内网服务器IP:端口/api/query`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ partNumber, orderNumber })
            // });
            // const data = await response.json();
            
            // 目前使用模拟数据
            const data = await mockQueryOrder(partNumber, orderNumber);
            
            // 渲染结果
            renderQueryResult(data);
            updateStatus('查询成功！', 'success');
            
        } catch (error) {
            console.error('查询失败:', error);
            updateStatus(`查询失败: ${error.message}`, 'idle');
        } finally {
            dom.btnQuery.disabled = false;
        }
    });

    // 清空历史记录
    dom.btnClearHistory.addEventListener('click', function() {
        if (confirm('确定要清空所有扫描历史记录吗？')) {
            localStorage.removeItem('scanHistory');
            scanHistory.length = 0;
            renderHistory();
            updateStatus('历史记录已清空', 'success');
        }
    });

    // 手动输入时启用查询按钮
    [dom.partNumberInput, dom.orderNumberInput].forEach(input => {
        input.addEventListener('input', function() {
            const hasValue = dom.partNumberInput.value.trim() || dom.orderNumberInput.value.trim();
            dom.btnQuery.disabled = !hasValue;
            if (hasValue) updateStatus('已手动输入，可点击查询', 'idle');
        });
    });

    // ==================== 初始化 ====================
    async function init() {
        console.log('扫码系统初始化...');
        updateStatus('正在初始化...', 'scanning');
        
        // 检查运行环境
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            const warnMsg = '⚠️ 注意：摄像头API需要在HTTPS或localhost环境下运行！';
            updateStatus(warnMsg, 'idle');
            console.warn(warnMsg);
        }
        
        // 初始化摄像头列表
        await getCameras();
        
        // 尝试自动开始扫描
        const cameras = await Html5Qrcode.getCameras();
        if (cameras.length > 0) {
            startScanner(cameras[0].id);
        } else {
            updateStatus('未找到可用摄像头，请检查设备权限', 'idle');
        }
        
        // 渲染历史记录
        renderHistory();
        
        console.log('初始化完成');
    }

    // 启动初始化
    init();
});