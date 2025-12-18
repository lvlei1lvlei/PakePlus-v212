// 二维码扫描应用主逻辑

// 导入Tauri API
import { invoke } from '@tauri-apps/api/core';
import { request } from '@tauri-apps/api/permission';

// DOM元素
const scanBtn = document.getElementById('scanBtn');
const resultSection = document.getElementById('resultSection');
const resultContent = document.getElementById('resultContent');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const rescanBtn = document.getElementById('rescanBtn');
const openBtn = document.getElementById('openBtn');
const scanOverlay = document.getElementById('scanOverlay');
const closeScanBtn = document.getElementById('closeScanBtn');
const toggleFlashBtn = document.getElementById('toggleFlashBtn');
const flashIcon = document.getElementById('flashIcon');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// 状态变量
let isScanning = false;
let isFlashOn = false;
let scanHistory = [];

// 初始化应用
async function initApp() {
  // 加载扫描历史
  loadHistory();
  // 绑定事件监听器
  bindEventListeners();
}

// 绑定事件监听器
function bindEventListeners() {
  // 扫描按钮点击事件
  scanBtn.addEventListener('click', handleScanClick);
  // 清除结果按钮点击事件
  clearBtn.addEventListener('click', handleClearResult);
  // 复制结果按钮点击事件
  copyBtn.addEventListener('click', handleCopyResult);
  // 重新扫描按钮点击事件
  rescanBtn.addEventListener('click', handleRescan);
  // 打开链接按钮点击事件
  openBtn.addEventListener('click', handleOpenLink);
  // 关闭扫描按钮点击事件
  closeScanBtn.addEventListener('click', handleCloseScan);
  // 切换闪光灯按钮点击事件
  toggleFlashBtn.addEventListener('click', handleToggleFlash);
  // 清空历史记录按钮点击事件
  clearHistoryBtn.addEventListener('click', handleClearHistory);
}

// 处理扫描按钮点击事件
async function handleScanClick() {
  try {
    // 检查相机权限
    const hasPermission = await checkCameraPermission();
    if (!hasPermission) {
      alert('需要相机权限才能使用扫码功能');
      return;
    }

    // 显示扫描覆盖层
    scanOverlay.classList.remove('hidden');
    
    // 调用扫码功能
    await startScan();
  } catch (error) {
    console.error('扫描出错:', error);
    alert('扫描出错: ' + error.message);
    scanOverlay.classList.add('hidden');
  }
}

// 检查相机权限
async function checkCameraPermission() {
  try {
    const status = await request('camera');
    return status === 'granted';
  } catch (error) {
    console.error('检查相机权限出错:', error);
    return false;
  }
}

// 启动扫描
async function startScan() {
  isScanning = true;
  
  try {
    // 调用Tauri条形码扫描插件
    const result = await invoke('plugin:barcode-scanner|scan', {
      formats: ['qr_code'],
      android: {
        aspect_tolerance: 0.5,
        use_auto_focus: true
      },
      ios: {
        prefer_front_camera: false
      }
    });

    // 处理扫描结果
    handleScanResult(result);
  } catch (error) {
    console.error('扫描过程出错:', error);
    throw error;
  } finally {
    isScanning = false;
    scanOverlay.classList.add('hidden');
  }
}

// 处理扫描结果
function handleScanResult(result) {
  if (!result || !result.content) {
    alert('未扫描到有效二维码');
    return;
  }

  const scanData = {
    id: Date.now(),
    content: result.content,
    timestamp: new Date().toLocaleString('zh-CN')
  };

  // 显示扫描结果
  showResult(scanData);
  
  // 保存到历史记录
  saveToHistory(scanData);
  
  // 更新历史记录显示
  updateHistoryDisplay();
}

// 显示扫描结果
function showResult(scanData) {
  resultContent.textContent = scanData.content;
  resultSection.classList.remove('hidden');
  
  // 检查是否为URL，显示打开链接按钮
  if (isValidUrl(scanData.content)) {
    openBtn.classList.remove('hidden');
  } else {
    openBtn.classList.add('hidden');
  }
}

// 验证URL格式
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// 处理清除结果
function handleClearResult() {
  resultContent.textContent = '';
  resultSection.classList.add('hidden');
  openBtn.classList.add('hidden');
}

// 处理复制结果
async function handleCopyResult() {
  const result = resultContent.textContent;
  if (!result) return;
  
  try {
    await navigator.clipboard.writeText(result);
    alert('结果已复制到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    alert('复制失败');
  }
}

// 处理重新扫描
function handleRescan() {
  handleClearResult();
  handleScanClick();
}

// 处理打开链接
async function handleOpenLink() {
  const result = resultContent.textContent;
  if (!result) return;
  
  try {
    await invoke('plugin:shell|open', { path: result });
  } catch (error) {
    console.error('打开链接失败:', error);
    alert('打开链接失败');
  }
}

// 处理关闭扫描
function handleCloseScan() {
  if (isScanning) {
    // 停止扫描
    stopScan();
  }
  scanOverlay.classList.add('hidden');
}

// 停止扫描
async function stopScan() {
  try {
    await invoke('plugin:barcode-scanner|stop');
  } catch (error) {
    console.error('停止扫描出错:', error);
  }
}

// 处理切换闪光灯
async function handleToggleFlash() {
  try {
    isFlashOn = !isFlashOn;
    await invoke('plugin:barcode-scanner|toggle_flash', { enable: isFlashOn });
    
    // 更新闪光灯图标
    if (isFlashOn) {
      flashIcon.innerHTML = '<line x1="13" y1="10" x2="21" y2="2"></line><line x1="11" y1="14" x2="3" y2="22"></line><line x1="11" y1="14" x2="3" y2="14"></line><line x1="19" y1="22" x2="13" y2="16"></line><path d="M12 18a6 6 0 0 0 6-6 6 6 0 0 0-6-6 6 6 0 0 0-6 6 6 6 0 0 0 6 6z"></path>';
    } else {
      flashIcon.innerHTML = '<line x1="13" y1="10" x2="21" y2="2"></line><line x1="11" y1="14" x2="3" y2="22"></line><line x1="11" y1="14" x2="3" y2="14"></line><line x1="19" y1="22" x2="13" y2="16"></line>';
    }
  } catch (error) {
    console.error('切换闪光灯出错:', error);
    isFlashOn = !isFlashOn; // 恢复状态
  }
}

// 保存到历史记录
function saveToHistory(scanData) {
  // 添加到历史记录数组开头
  scanHistory.unshift(scanData);
  
  // 限制历史记录数量（最多20条）
  if (scanHistory.length > 20) {
    scanHistory = scanHistory.slice(0, 20);
  }
  
  // 保存到本地存储
  localStorage.setItem('scanHistory', JSON.stringify(scanHistory));
}

// 加载历史记录
function loadHistory() {
  const savedHistory = localStorage.getItem('scanHistory');
  if (savedHistory) {
    scanHistory = JSON.parse(savedHistory);
    updateHistoryDisplay();
  }
}

// 更新历史记录显示
function updateHistoryDisplay() {
  if (scanHistory.length === 0) {
    historyList.innerHTML = '<p class="no-history">暂无扫描历史</p>';
    return;
  }
  
  const historyHtml = scanHistory.map(item => `
    <div class="history-item" data-id="${item.id}">
      <div class="history-item-content">${escapeHtml(item.content)}</div>
      <div class="history-item-time">${item.timestamp}</div>
    </div>
  `).join('');
  
  historyList.innerHTML = historyHtml;
  
  // 为历史记录项添加点击事件
  document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.id);
      const historyItem = scanHistory.find(h => h.id === id);
      if (historyItem) {
        showResult(historyItem);
      }
    });
  });
}

// 处理清空历史记录
function handleClearHistory() {
  if (confirm('确定要清空所有扫描历史吗？')) {
    scanHistory = [];
    localStorage.removeItem('scanHistory');
    updateHistoryDisplay();
  }
}

// HTML转义函数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 初始化应用
initApp();
