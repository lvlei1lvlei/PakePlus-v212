import { scan, SupportedFormat } from '@tauri-apps/plugin-barcode-scanner';

const startScanBtn = document.getElementById('startScan');
const resultTextarea = document.getElementById('result');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

let scanHistory = JSON.parse(localStorage.getItem('scanHistory')) || [];

function updateHistory() {
    historyList.innerHTML = '';
    scanHistory.slice(0, 10).forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${index + 1}. ${item.length > 40 ? item.substring(0, 40) + '...' : item}</span>
            <button class="history-copy" data-content="${item}">📋</button>
        `;
        historyList.appendChild(li);
    });
    // 为历史记录中的复制按钮添加事件
    document.querySelectorAll('.history-copy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const content = e.target.getAttribute('data-content');
            navigator.clipboard.writeText(content);
            alert('已复制到剪贴板');
        });
    });
}

startScanBtn.addEventListener('click', async () => {
    try {
        const result = await scan({
            formats: [SupportedFormat.QRCode, SupportedFormat.Code128, SupportedFormat.EAN13],
            windowed: false,
            cameraDirection: 'back',
        });
        if (result?.content) {
            resultTextarea.value = result.content;
            // 保存到历史
            if (!scanHistory.includes(result.content)) {
                scanHistory.unshift(result.content);
                scanHistory = scanHistory.slice(0, 20); // 保留最近20条
                localStorage.setItem('scanHistory', JSON.stringify(scanHistory));
                updateHistory();
            }
        }
    } catch (error) {
        alert(`扫码失败: ${error.message}`);
        console.error(error);
    }
});

copyBtn.addEventListener('click', () => {
    if (resultTextarea.value) {
        navigator.clipboard.writeText(resultTextarea.value);
        alert('已复制到剪贴板');
    }
});

clearBtn.addEventListener('click', () => {
    resultTextarea.value = '';
});

clearHistoryBtn.addEventListener('click', () => {
    scanHistory = [];
    localStorage.removeItem('scanHistory');
    updateHistory();
});

// 初始化历史记录
updateHistory();