// 全局變數
let blockIdCounter = 0;
let taskIdCounter = 0;
let itemIdCounter = 0;
let tableIdCounter = 0;
let imageIdCounter = 0;
let currentImageCallback = null;

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadData();
});

// 初始化事件監聽器
function initializeEventListeners() {
    document.getElementById('addBlockBtn').addEventListener('click', addBlock);
    document.getElementById('saveBtn').addEventListener('click', saveData);
    document.getElementById('loadBtn').addEventListener('click', loadData);
    document.getElementById('previewBtn').addEventListener('click', togglePreview);
    document.getElementById('closePreviewBtn').addEventListener('click', closePreview);
    document.getElementById('exportHtmlBtn').addEventListener('click', exportHtml);
    document.getElementById('exportMsgBtn').addEventListener('click', exportMsg);
    
    // 圖片上傳相關
    document.getElementById('imageFileInput').addEventListener('change', previewUploadImage);
}

// 新增區塊
function addBlock() {
    const template = document.getElementById('blockTemplate');
    const blockElement = template.content.cloneNode(true);
    const blockId = 'block_' + (++blockIdCounter);
    
    const block = blockElement.querySelector('.block');
    block.setAttribute('data-block-id', blockId);
    
    // 設定事件監聽器
    setupBlockEventListeners(block);
    
    document.getElementById('blocksContainer').appendChild(blockElement);
    
    // 聚焦到標題輸入框
    setTimeout(() => {
        block.querySelector('.block-title').focus();
    }, 100);
}

// 設定區塊事件監聽器
function setupBlockEventListeners(block) {
    // 新增任務按鈕
    block.querySelector('.add-task-btn').addEventListener('click', function() {
        addTask(block);
    });
    
    // 區塊控制按鈕
    block.querySelector('.move-up').addEventListener('click', function() {
        moveBlockUp(block);
    });
    
    block.querySelector('.move-down').addEventListener('click', function() {
        moveBlockDown(block);
    });
    
    block.querySelector('.delete-block').addEventListener('click', function() {
        deleteBlock(block);
    });
    
    // 標題輸入框事件
    block.querySelector('.block-title').addEventListener('input', updatePreview);
}

// 新增任務
function addTask(block) {
    const template = document.getElementById('taskTemplate');
    const taskElement = template.content.cloneNode(true);
    const taskId = 'task_' + (++taskIdCounter);
    
    const task = taskElement.querySelector('.task');
    task.setAttribute('data-task-id', taskId);
    
    // 更新任務編號
    updateTaskNumbers(block);
    
    // 設定事件監聽器
    setupTaskEventListeners(task);
    
    block.querySelector('.tasks-container').appendChild(taskElement);
    
    // 重新編號所有任務
    setTimeout(() => {
        updateTaskNumbers(block);
        task.querySelector('.task-title').focus();
    }, 100);
}

// 設定任務事件監聽器
function setupTaskEventListeners(task) {
    // 任務控制按鈕
    task.querySelector('.move-task-up').addEventListener('click', function() {
        moveTaskUp(task);
    });
    
    task.querySelector('.move-task-down').addEventListener('click', function() {
        moveTaskDown(task);
    });
    
    task.querySelector('.delete-task').addEventListener('click', function() {
        deleteTask(task);
    });
    
    task.querySelector('.add-item').addEventListener('click', function() {
        addTaskItem(task);
    });
    
    task.querySelector('.add-table').addEventListener('click', function() {
        addTaskTable(task);
    });
    
    task.querySelector('.add-image').addEventListener('click', function() {
        openImageModal(task);
    });
    
    // 輸入框事件
    const inputs = task.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', updatePreview);
        input.addEventListener('change', updatePreview);
    });
}

// 新增任務項目
function addTaskItem(task) {
    const template = document.getElementById('itemTemplate');
    const itemElement = template.content.cloneNode(true);
    const itemId = 'item_' + (++itemIdCounter);
    
    const item = itemElement.querySelector('.task-item');
    item.setAttribute('data-item-id', itemId);
    
    // 設定事件監聽器
    setupItemEventListeners(item);
    
    task.querySelector('.task-content').appendChild(itemElement);
    
    // 聚焦到文字輸入框
    setTimeout(() => {
        item.querySelector('.item-text').focus();
    }, 100);
}

// 設定項目事件監聽器
function setupItemEventListeners(item) {
    item.querySelector('.delete-item').addEventListener('click', function() {
        item.remove();
        updatePreview();
    });
    
    item.querySelector('.item-text').addEventListener('input', updatePreview);
}

// 新增表格
function addTaskTable(task) {
    const template = document.getElementById('tableTemplate');
    const tableElement = template.content.cloneNode(true);
    const tableId = 'table_' + (++tableIdCounter);
    
    const tableContainer = tableElement.querySelector('.table-container');
    tableContainer.setAttribute('data-table-id', tableId);
    
    // 設定事件監聽器
    setupTableEventListeners(tableContainer);
    
    task.querySelector('.task-content').appendChild(tableElement);
    updatePreview();
}

// 設定表格事件監聽器
function setupTableEventListeners(tableContainer) {
    tableContainer.querySelector('.add-row').addEventListener('click', function() {
        addTableRow(tableContainer);
    });
    
    tableContainer.querySelector('.add-col').addEventListener('click', function() {
        addTableColumn(tableContainer);
    });
    
    tableContainer.querySelector('.delete-table').addEventListener('click', function() {
        tableContainer.remove();
        updatePreview();
    });
    
    // 表格單元格編輯事件
    const cells = tableContainer.querySelectorAll('td');
    cells.forEach(cell => {
        cell.addEventListener('input', updatePreview);
    });
}

// 新增表格列
function addTableRow(tableContainer) {
    const table = tableContainer.querySelector('table tbody');
    const firstRow = table.querySelector('tr');
    const colCount = firstRow.children.length;
    
    const newRow = document.createElement('tr');
    for (let i = 0; i < colCount; i++) {
        const cell = document.createElement('td');
        cell.contentEditable = true;
        cell.textContent = '新資料';
        cell.addEventListener('input', updatePreview);
        newRow.appendChild(cell);
    }
    
    table.appendChild(newRow);
    updatePreview();
}

// 新增表格欄
function addTableColumn(tableContainer) {
    const table = tableContainer.querySelector('table tbody');
    const rows = table.querySelectorAll('tr');
    
    rows.forEach((row, index) => {
        const cell = document.createElement('td');
        cell.contentEditable = true;
        cell.textContent = index === 0 ? '新欄位' : '新資料';
        cell.addEventListener('input', updatePreview);
        row.appendChild(cell);
    });
    
    updatePreview();
}

// 開啟圖片上傳對話框
function openImageModal(task) {
    currentImageCallback = function(imageUrl) {
        addTaskImage(task, imageUrl);
    };
    document.getElementById('imageUploadModal').style.display = 'flex';
}

// 關閉圖片上傳對話框
function closeImageModal() {
    document.getElementById('imageUploadModal').style.display = 'none';
    document.getElementById('imageFileInput').value = '';
    document.getElementById('uploadPreview').style.display = 'none';
    currentImageCallback = null;
}

// 預覽上傳的圖片
function previewUploadImage() {
    const fileInput = document.getElementById('imageFileInput');
    const preview = document.getElementById('uploadPreview');
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
}

// 上傳圖片
function uploadImage() {
    const fileInput = document.getElementById('imageFileInput');
    
    if (!fileInput.files || !fileInput.files[0]) {
        alert('請選擇圖片文件');
        return;
    }
    
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    
    fetch('/upload_image', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            if (currentImageCallback) {
                currentImageCallback(data.url);
            }
            closeImageModal();
        } else {
            alert('上傳失敗: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('上傳失敗');
    });
}

// 新增任務圖片
function addTaskImage(task, imageUrl) {
    const template = document.getElementById('imageTemplate');
    const imageElement = template.content.cloneNode(true);
    const imageId = 'image_' + (++imageIdCounter);
    
    const imageContainer = imageElement.querySelector('.image-container');
    imageContainer.setAttribute('data-image-id', imageId);
    
    const img = imageContainer.querySelector('.task-image');
    img.src = imageUrl;
    
    // 設定事件監聽器
    setupImageEventListeners(imageContainer);
    
    task.querySelector('.task-content').appendChild(imageElement);
    updatePreview();
}

// 設定圖片事件監聽器
function setupImageEventListeners(imageContainer) {
    const slider = imageContainer.querySelector('.image-width-slider');
    const widthDisplay = imageContainer.querySelector('.width-display');
    const img = imageContainer.querySelector('.task-image');
    
    slider.addEventListener('input', function() {
        const width = slider.value + 'px';
        img.style.width = width;
        widthDisplay.textContent = width;
        updatePreview();
    });
    
    imageContainer.querySelector('.delete-image').addEventListener('click', function() {
        imageContainer.remove();
        updatePreview();
    });
}

// 移動區塊
function moveBlockUp(block) {
    const prevBlock = block.previousElementSibling;
    if (prevBlock) {
        block.parentNode.insertBefore(block, prevBlock);
        updatePreview();
    }
}

function moveBlockDown(block) {
    const nextBlock = block.nextElementSibling;
    if (nextBlock) {
        block.parentNode.insertBefore(nextBlock, block);
        updatePreview();
    }
}

// 移動任務
function moveTaskUp(task) {
    const prevTask = task.previousElementSibling;
    if (prevTask) {
        task.parentNode.insertBefore(task, prevTask);
        updateTaskNumbers(task.closest('.block'));
        updatePreview();
    }
}

function moveTaskDown(task) {
    const nextTask = task.nextElementSibling;
    if (nextTask) {
        task.parentNode.insertBefore(nextTask, task);
        updateTaskNumbers(task.closest('.block'));
        updatePreview();
    }
}

// 刪除區塊
function deleteBlock(block) {
    if (confirm('確定要刪除這個區塊嗎？')) {
        block.remove();
        updatePreview();
    }
}

// 刪除任務
function deleteTask(task) {
    if (confirm('確定要刪除這個任務嗎？')) {
        const block = task.closest('.block');
        task.remove();
        updateTaskNumbers(block);
        updatePreview();
    }
}

// 更新任務編號
function updateTaskNumbers(block) {
    const tasks = block.querySelectorAll('.task');
    tasks.forEach((task, index) => {
        const numberSpan = task.querySelector('.task-number');
        if (numberSpan) {
            numberSpan.textContent = (index + 1) + '.';
        }
    });
}

// 儲存資料
function saveData() {
    const data = collectData();
    
    fetch('/save_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert('資料儲存成功！');
        } else {
            alert('儲存失敗: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('儲存失敗');
    });
}

// 載入資料
function loadData() {
    fetch('/load_data')
    .then(response => response.json())
    .then(data => {
        if (data.blocks) {
            loadDataIntoInterface(data);
            updatePreview();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // 如果載入失敗，創建一個預設區塊
        addBlock();
    });
}

// 收集所有資料
function collectData() {
    const blocks = [];
    const blockElements = document.querySelectorAll('.block');
    
    blockElements.forEach(blockElement => {
        const block = {
            id: blockElement.getAttribute('data-block-id'),
            title: blockElement.querySelector('.block-title').value,
            tasks: []
        };
        
        const taskElements = blockElement.querySelectorAll('.task');
        taskElements.forEach(taskElement => {
            const task = {
                id: taskElement.getAttribute('data-task-id'),
                title: taskElement.querySelector('.task-title').value,
                owner: taskElement.querySelector('.task-owner').value,
                dueDate: taskElement.querySelector('.task-due-date').value,
                status: taskElement.querySelector('.task-status').value,
                priority: taskElement.querySelector('.task-priority').value,
                items: [],
                tables: [],
                images: []
            };
            
            // 收集項目
            const itemElements = taskElement.querySelectorAll('.task-item');
            itemElements.forEach(itemElement => {
                const item = {
                    id: itemElement.getAttribute('data-item-id'),
                    text: itemElement.querySelector('.item-text').value
                };
                task.items.push(item);
            });
            
            // 收集表格
            const tableElements = taskElement.querySelectorAll('.table-container');
            tableElements.forEach(tableElement => {
                const tableData = {
                    id: tableElement.getAttribute('data-table-id'),
                    rows: []
                };
                
                const rows = tableElement.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    const rowData = [];
                    cells.forEach(cell => {
                        rowData.push(cell.textContent);
                    });
                    tableData.rows.push(rowData);
                });
                
                task.tables.push(tableData);
            });
            
            // 收集圖片
            const imageElements = taskElement.querySelectorAll('.image-container');
            imageElements.forEach(imageElement => {
                const imageData = {
                    id: imageElement.getAttribute('data-image-id'),
                    src: imageElement.querySelector('.task-image').src,
                    width: imageElement.querySelector('.image-width-slider').value
                };
                task.images.push(imageData);
            });
            
            block.tasks.push(task);
        });
        
        blocks.push(block);
    });
    
    return { blocks: blocks };
}

// 載入資料到介面
function loadDataIntoInterface(data) {
    // 清空現有內容
    document.getElementById('blocksContainer').innerHTML = '';
    
    data.blocks.forEach(blockData => {
        // 創建區塊
        const template = document.getElementById('blockTemplate');
        const blockElement = template.content.cloneNode(true);
        const block = blockElement.querySelector('.block');
        
        block.setAttribute('data-block-id', blockData.id);
        block.querySelector('.block-title').value = blockData.title || '';
        
        setupBlockEventListeners(block);
        
        // 載入任務
        blockData.tasks.forEach(taskData => {
            const taskTemplate = document.getElementById('taskTemplate');
            const taskElement = taskTemplate.content.cloneNode(true);
            const task = taskElement.querySelector('.task');
            
            task.setAttribute('data-task-id', taskData.id);
            task.querySelector('.task-title').value = taskData.title || '';
            task.querySelector('.task-owner').value = taskData.owner || '';
            task.querySelector('.task-due-date').value = taskData.dueDate || '';
            task.querySelector('.task-status').value = taskData.status || '';
            task.querySelector('.task-priority').value = taskData.priority || '';
            
            setupTaskEventListeners(task);
            
            // 載入項目
            taskData.items.forEach(itemData => {
                const itemTemplate = document.getElementById('itemTemplate');
                const itemElement = itemTemplate.content.cloneNode(true);
                const item = itemElement.querySelector('.task-item');
                
                item.setAttribute('data-item-id', itemData.id);
                item.querySelector('.item-text').value = itemData.text || '';
                
                setupItemEventListeners(item);
                task.querySelector('.task-content').appendChild(itemElement);
            });
            
            // 載入表格
            taskData.tables.forEach(tableData => {
                const tableTemplate = document.getElementById('tableTemplate');
                const tableElement = tableTemplate.content.cloneNode(true);
                const tableContainer = tableElement.querySelector('.table-container');
                
                tableContainer.setAttribute('data-table-id', tableData.id);
                
                // 重建表格內容
                const tbody = tableContainer.querySelector('tbody');
                tbody.innerHTML = '';
                
                tableData.rows.forEach(rowData => {
                    const row = document.createElement('tr');
                    rowData.forEach(cellData => {
                        const cell = document.createElement('td');
                        cell.contentEditable = true;
                        cell.textContent = cellData;
                        cell.addEventListener('input', updatePreview);
                        row.appendChild(cell);
                    });
                    tbody.appendChild(row);
                });
                
                setupTableEventListeners(tableContainer);
                task.querySelector('.task-content').appendChild(tableElement);
            });
            
            // 載入圖片
            taskData.images.forEach(imageData => {
                const imageTemplate = document.getElementById('imageTemplate');
                const imageElement = imageTemplate.content.cloneNode(true);
                const imageContainer = imageElement.querySelector('.image-container');
                
                imageContainer.setAttribute('data-image-id', imageData.id);
                
                const img = imageContainer.querySelector('.task-image');
                const slider = imageContainer.querySelector('.image-width-slider');
                const widthDisplay = imageContainer.querySelector('.width-display');
                
                img.src = imageData.src;
                slider.value = imageData.width;
                img.style.width = imageData.width + 'px';
                widthDisplay.textContent = imageData.width + 'px';
                
                setupImageEventListeners(imageContainer);
                task.querySelector('.task-content').appendChild(imageElement);
            });
            
            block.querySelector('.tasks-container').appendChild(taskElement);
        });
        
        document.getElementById('blocksContainer').appendChild(blockElement);
        updateTaskNumbers(block);
    });
}

// 切換預覽
function togglePreview() {
    const previewContainer = document.getElementById('previewContainer');
    if (previewContainer.style.display === 'none' || previewContainer.style.display === '') {
        previewContainer.style.display = 'block';
        updatePreview();
    } else {
        previewContainer.style.display = 'none';
    }
}

// 關閉預覽
function closePreview() {
    document.getElementById('previewContainer').style.display = 'none';
}

// 更新預覽
function updatePreview() {
    const previewContainer = document.getElementById('previewContainer');
    if (previewContainer.style.display === 'none') return;
    
    const data = collectData();
    const previewContent = document.getElementById('previewContent');
    
    let html = '';
    
    data.blocks.forEach(block => {
        if (block.title) {
            html += `<div class="block-header-preview">[${block.title}]</div>\n`;
        }
        
        block.tasks.forEach((task, taskIndex) => {
            if (task.title) {
                html += `<div class="task-item-preview">\n`;
                html += `<span class="task-number-preview">${taskIndex + 1}.</span>`;
                
                // 優先度
                if (task.priority) {
                    html += `<span class="priority-preview">[Priority:${task.priority}]</span> `;
                }
                
                // 標題
                html += `<span class="task-title-preview">${task.title}</span>`;
                
                // Owner
                if (task.owner) {
                    html += ` - ${task.owner}`;
                }
                
                // Due Date
                if (task.dueDate) {
                    html += ` <span class="due-date-preview">[Due date: ${task.dueDate}]</span>`;
                }
                
                // Status
                if (task.status) {
                    html += ` <span class="status-preview">[Status: ${task.status}]</span>`;
                }
                
                html += '\n';
                
                // 子項目
                task.items.forEach(item => {
                    if (item.text) {
                        html += `<div class="sub-item-preview">■ ${item.text}</div>\n`;
                    }
                });
                
                // 表格
                task.tables.forEach(table => {
                    html += '<table class="table" style="border-collapse: collapse; margin: 10px 0;">\n';
                    table.rows.forEach(row => {
                        html += '<tr>\n';
                        row.forEach(cell => {
                            html += `<td style="border: 1px solid #ccc; padding: 4px 8px;">${cell}</td>\n`;
                        });
                        html += '</tr>\n';
                    });
                    html += '</table>\n';
                });
                
                // 圖片
                task.images.forEach(image => {
                    html += `<div><img src="${image.src}" style="width: ${image.width}px; height: auto; margin: 10px 0;" alt="Task Image"></div>\n`;
                });
                
                html += '</div>\n';
            }
        });
    });
    
    previewContent.innerHTML = html;
}

// 匯出 HTML
function exportHtml() {
    const data = collectData();
    
    fetch('/export_html', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.ok) {
            return response.blob();
        }
        throw new Error('匯出失敗');
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tasks.html';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    })
    .catch(error => {
        console.error('Error:', error);
        alert('匯出失敗');
    });
}

// 匯出 MSG
function exportMsg() {
    const data = collectData();
    
    fetch('/export_msg', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.ok) {
            return response.blob();
        }
        throw new Error('匯出失敗');
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tasks.msg';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    })
    .catch(error => {
        console.error('Error:', error);
        alert('匯出失敗');
    });
}

// 工具函數：生成唯一ID
function generateUniqueId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 工具函數：格式化日期
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('zh-TW');
}

// 工具函數：驗證輸入
function validateInput(input) {
    return input && input.trim() !== '';
}
