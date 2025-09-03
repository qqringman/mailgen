// 全局變數
let blockIdCounter = 0;
let taskIdCounter = 0;
let itemIdCounter = 0;
let tableIdCounter = 0;
let imageIdCounter = 0;
let attachmentIdCounter = 0;

let currentImageCallback = null;
let currentTaskPosition = null;
let attachmentsList = [];
let previewEditMode = false;
let sortableInstances = [];

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadData();
    initializeSortable();
});

// 初始化事件監聽器
function initializeEventListeners() {
    document.getElementById('addBlockBtn').addEventListener('click', addBlock);
    document.getElementById('saveBtn').addEventListener('click', saveData);
    document.getElementById('previewBtn').addEventListener('click', togglePreview);
    document.getElementById('closePreviewBtn').addEventListener('click', closePreview);
    document.getElementById('previewEditBtn').addEventListener('click', togglePreviewEditMode);
    document.getElementById('applyPreviewChanges').addEventListener('click', applyPreviewChanges);
    document.getElementById('exportHtmlBtn').addEventListener('click', exportHtml);
    document.getElementById('exportMsgBtn').addEventListener('click', exportMsg);
    document.getElementById('attachmentBtn').addEventListener('click', openAttachmentModal);
    
    // 圖片上傳相關
    document.getElementById('imageFileInput').addEventListener('change', previewUploadImage);
    
    // 附件上傳相關
    document.getElementById('attachmentFileInput').addEventListener('change', function() {
        // 自動顯示選中的檔案
        updateAttachmentFileInput();
    });
}

// 初始化拖拽排序
function initializeSortable() {
    // 區塊層級拖拽
    const blocksContainer = document.getElementById('blocksContainer');
    if (blocksContainer) {
        new Sortable(blocksContainer, {
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            animation: 150,
            onEnd: function(evt) {
                updateAllTaskNumbers();
                updatePreview();
            }
        });
    }
}

// 初始化任務拖拽
function initializeTaskSortable(tasksContainer) {
    new Sortable(tasksContainer, {
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        animation: 150,
        onEnd: function(evt) {
            updateTaskNumbers(tasksContainer.closest('.block'));
            updatePreview();
        }
    });
}

// 初始化項目拖拽
function initializeItemSortable(itemsContainer) {
    new Sortable(itemsContainer, {
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        animation: 150,
        group: 'nested-items',
        onEnd: function(evt) {
            updatePreview();
        }
    });
}

// 新增區塊
function addBlock() {
    const template = document.getElementById('blockTemplate');
    const blockElement = template.content.cloneNode(true);
    const blockId = 'block_' + (++blockIdCounter);
    
    const block = blockElement.querySelector('.block');
    block.setAttribute('data-block-id', blockId);
    
    setupBlockEventListeners(block);
    
    document.getElementById('blocksContainer').appendChild(blockElement);
    
    // 初始化任務拖拽
    const tasksContainer = block.querySelector('.tasks-container');
    initializeTaskSortable(tasksContainer);
    
    setTimeout(() => {
        block.querySelector('.block-title').focus();
    }, 100);
}

// 設定區塊事件監聽器
function setupBlockEventListeners(block) {
    // 新增任務按鈕 - 使用事件代理來處理下拉選單
    block.addEventListener('click', function(e) {
        if (e.target.closest('.add-task-btn') && !e.target.closest('.dropdown-menu')) {
            addTask(block);
        }
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
function addTask(block, position = null) {
    const template = document.getElementById('taskTemplate');
    const taskElement = template.content.cloneNode(true);
    const taskId = 'task_' + (++taskIdCounter);
    
    const task = taskElement.querySelector('.task');
    task.setAttribute('data-task-id', taskId);
    
    setupTaskEventListeners(task);
    
    const tasksContainer = block.querySelector('.tasks-container');
    
    if (position && position.afterElement) {
        tasksContainer.insertBefore(taskElement, position.afterElement.nextSibling);
    } else {
        tasksContainer.appendChild(taskElement);
    }
    
    // 初始化項目拖拽
    const itemsContainer = task.querySelector('.task-content');
    initializeItemSortable(itemsContainer);
    
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
        addNestedItem(task);
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

// 新增嵌套項目
function addNestedItem(container, level = 0, parentItem = null) {
    const template = document.getElementById('nestedItemTemplate');
    const itemElement = template.content.cloneNode(true);
    const itemId = 'item_' + (++itemIdCounter);
    
    const item = itemElement.querySelector('.nested-item');
    item.setAttribute('data-item-id', itemId);
    item.setAttribute('data-level', level.toString());
    
    setupNestedItemEventListeners(item);
    
    let targetContainer;
    if (parentItem) {
        targetContainer = parentItem.querySelector('.child-items');
    } else {
        targetContainer = container.querySelector('.task-content');
    }
    
    targetContainer.appendChild(itemElement);
    
    // 初始化拖拽
    initializeItemSortable(targetContainer);
    
    setTimeout(() => {
        item.querySelector('.item-text').focus();
    }, 100);
}

// 設定嵌套項目事件監聽器
function setupNestedItemEventListeners(item) {
    // 縮排控制
    item.querySelector('.indent-left').addEventListener('click', function() {
        decreaseIndent(item);
    });
    
    item.querySelector('.indent-right').addEventListener('click', function() {
        increaseIndent(item);
    });
    
    // 新增子項目
    item.querySelector('.add-child-item').addEventListener('click', function() {
        const currentLevel = parseInt(item.getAttribute('data-level')) || 0;
        addNestedItem(null, currentLevel + 1, item);
    });
    
    // 刪除項目
    item.querySelector('.delete-item').addEventListener('click', function() {
        item.remove();
        updatePreview();
    });
    
    // 文字輸入事件
    item.querySelector('.item-text').addEventListener('input', updatePreview);
}

// 增加縮排
function increaseIndent(item) {
    const currentLevel = parseInt(item.getAttribute('data-level')) || 0;
    if (currentLevel < 5) {
        item.setAttribute('data-level', (currentLevel + 1).toString());
        updatePreview();
    }
}

// 減少縮排
function decreaseIndent(item) {
    const currentLevel = parseInt(item.getAttribute('data-level')) || 0;
    if (currentLevel > 0) {
        item.setAttribute('data-level', (currentLevel - 1).toString());
        updatePreview();
    }
}

// 新增表格
function addTaskTable(task) {
    const template = document.getElementById('tableTemplate');
    const tableElement = template.content.cloneNode(true);
    const tableId = 'table_' + (++tableIdCounter);
    
    const tableContainer = tableElement.querySelector('.table-container');
    tableContainer.setAttribute('data-table-id', tableId);
    
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

// 附件管理
function openAttachmentModal() {
    document.getElementById('attachmentModal').style.display = 'flex';
    loadAttachmentList();
}

function closeAttachmentModal() {
    document.getElementById('attachmentModal').style.display = 'none';
}

function uploadAttachment() {
    const fileInput = document.getElementById('attachmentFileInput');
    const files = fileInput.files;
    
    if (!files || files.length === 0) {
        alert('請選擇檔案');
        return;
    }
    
    Array.from(files).forEach(file => {
        const formData = new FormData();
        formData.append('attachment', file);
        
        fetch('/upload_attachment', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                attachmentsList.push(data.attachment);
                loadAttachmentList();
                updateAttachmentCount();
            } else {
                alert('上傳失敗: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('上傳失敗');
        });
    });
    
    fileInput.value = '';
}

function loadAttachmentList() {
    const listContainer = document.getElementById('attachmentList');
    listContainer.innerHTML = '';
    
    attachmentsList.forEach((attachment, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'attachment-item';
        itemDiv.innerHTML = `
            <div class="attachment-info">
                <div class="attachment-name">📎 ${attachment.original_name}</div>
                <div class="attachment-meta">${formatFileSize(attachment.size)} - ${formatDateTime(attachment.upload_time)}</div>
            </div>
            <button class="btn btn-sm btn-danger" onclick="deleteAttachment('${attachment.id}', ${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        listContainer.appendChild(itemDiv);
    });
}

function deleteAttachment(attachmentId, index) {
    if (confirm('確定要刪除這個附件嗎？')) {
        fetch(`/delete_attachment/${attachmentId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                attachmentsList.splice(index, 1);
                loadAttachmentList();
                updateAttachmentCount();
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
}

function updateAttachmentCount() {
    document.getElementById('attachmentCount').textContent = attachmentsList.length;
}

function updateAttachmentFileInput() {
    const fileInput = document.getElementById('attachmentFileInput');
    const files = fileInput.files;
    
    if (files.length > 0) {
        // 可以顯示選中的檔案資訊
        console.log(`已選擇 ${files.length} 個檔案`);
    }
}

// 模板管理
function openTemplateModal() {
    document.getElementById('templateModal').style.display = 'flex';
    loadTemplateList();
}

function closeTemplateModal() {
    document.getElementById('templateModal').style.display = 'none';
}

function loadTemplateList() {
    fetch('/get_templates')
    .then(response => response.json())
    .then(data => {
        if (data.templates) {
            const listContainer = document.getElementById('templateList');
            listContainer.innerHTML = '';
            
            data.templates.forEach(template => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'template-item';
                itemDiv.innerHTML = `
                    <div class="template-info">
                        <div class="template-name">${template.filename}</div>
                        <div class="template-meta">${template.created} - ${formatFileSize(template.size)}</div>
                    </div>
                `;
                itemDiv.addEventListener('click', () => loadTemplate(template.filename));
                listContainer.appendChild(itemDiv);
            });
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function loadTemplate(filename) {
    fetch('/load_template', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: filename })
    })
    .then(response => response.json())
    .then(data => {
        if (data.blocks) {
            loadDataIntoInterface(data);
            updatePreview();
            closeTemplateModal();
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// 檔案載入
function openFileLoadModal() {
    document.getElementById('fileLoadModal').style.display = 'flex';
}

function closeFileLoadModal() {
    document.getElementById('fileLoadModal').style.display = 'none';
    document.getElementById('templateFileInput').value = '';
}

function loadFromFile() {
    const fileInput = document.getElementById('templateFileInput');
    
    if (!fileInput.files || !fileInput.files[0]) {
        alert('請選擇檔案');
        return;
    }
    
    const formData = new FormData();
    formData.append('template_file', fileInput.files[0]);
    
    fetch('/load_template', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.blocks) {
            loadDataIntoInterface(data);
            updatePreview();
            closeFileLoadModal();
        } else if (data.status === 'error') {
            alert('載入失敗: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('載入失敗');
    });
}

// 圖片上傳相關
function openImageModal(task) {
    currentImageCallback = function(imageUrl) {
        addTaskImage(task, imageUrl);
    };
    document.getElementById('imageUploadModal').style.display = 'flex';
}

function closeImageModal() {
    document.getElementById('imageUploadModal').style.display = 'none';
    document.getElementById('imageFileInput').value = '';
    document.getElementById('uploadPreview').style.display = 'none';
    currentImageCallback = null;
}

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

function addTaskImage(task, imageUrl) {
    const template = document.getElementById('imageTemplate');
    const imageElement = template.content.cloneNode(true);
    const imageId = 'image_' + (++imageIdCounter);
    
    const imageContainer = imageElement.querySelector('.image-container');
    imageContainer.setAttribute('data-image-id', imageId);
    
    const img = imageContainer.querySelector('.task-image');
    img.src = imageUrl;
    
    setupImageEventListeners(imageContainer);
    
    task.querySelector('.task-content').appendChild(imageElement);
    updatePreview();
}

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

// 移動功能
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

// 刪除功能
function deleteBlock(block) {
    if (confirm('確定要刪除這個區塊嗎？')) {
        block.remove();
        updatePreview();
    }
}

function deleteTask(task) {
    if (confirm('確定要刪除這個任務嗎？')) {
        const block = task.closest('.block');
        task.remove();
        updateTaskNumbers(block);
        updatePreview();
    }
}

// 更新編號
function updateTaskNumbers(block) {
    const tasks = block.querySelectorAll('.task');
    tasks.forEach((task, index) => {
        const numberSpan = task.querySelector('.task-number');
        if (numberSpan) {
            numberSpan.textContent = (index + 1) + '.';
        }
    });
}

function updateAllTaskNumbers() {
    const blocks = document.querySelectorAll('.block');
    blocks.forEach(block => updateTaskNumbers(block));
}

// 預覽功能
function togglePreview() {
    const previewContainer = document.getElementById('previewContainer');
    if (previewContainer.style.display === 'none' || previewContainer.style.display === '') {
        previewContainer.style.display = 'block';
        updatePreview();
    } else {
        previewContainer.style.display = 'none';
    }
}

function closePreview() {
    document.getElementById('previewContainer').style.display = 'none';
    if (previewEditMode) {
        togglePreviewEditMode();
    }
}

function togglePreviewEditMode() {
    previewEditMode = !previewEditMode;
    const container = document.getElementById('previewContainer');
    const editBtn = document.getElementById('previewEditBtn');
    const applyBtn = document.getElementById('applyPreviewChanges');
    
    if (previewEditMode) {
        container.classList.add('preview-edit-mode');
        editBtn.textContent = '退出編輯模式';
        applyBtn.style.display = 'inline-flex';
        setupPreviewEditing();
    } else {
        container.classList.remove('preview-edit-mode');
        editBtn.textContent = '預覽編輯模式';
        applyBtn.style.display = 'none';
    }
}

function setupPreviewEditing() {
    const previewContent = document.getElementById('previewContent');
    // 在預覽模式下啟用拖拽排序
    new Sortable(previewContent, {
        handle: '.drag-handle-preview',
        ghostClass: 'sortable-ghost',
        animation: 150,
        onEnd: function(evt) {
            // 標記有變更
            document.getElementById('applyPreviewChanges').classList.add('btn-warning');
        }
    });
}

function applyPreviewChanges() {
    if (confirm('確定要套用預覽模式的變更嗎？')) {
        // 這裡需要實作從預覽模式同步回編輯模式的邏輯
        // 由於複雜度較高，這裡先簡單重新載入
        updatePreview();
        document.getElementById('applyPreviewChanges').classList.remove('btn-warning');
    }
}

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
            if (task.title || task.items.length > 0) {
                html += `<div class="task-item-preview">\n`;
                html += `<span class="task-number-preview">${taskIndex + 1}.</span>`;
                
                // 優先度
                if (task.priority) {
                    const priorityClass = task.priority === '1' ? 'priority-1-preview' : 'priority-2-preview';
                    html += `<span class="${priorityClass}">[Priority:${task.priority}]</span> `;
                }
                
                // 標題
                if (task.title) {
                    html += `<span class="task-title-preview">${task.title}</span>`;
                }
                
                // Owner
                if (task.owner) {
                    html += ` - ${task.owner}`;
                }
                
                // Due Date
                if (task.dueDate) {
                    html += ` <span class="due-date-preview">[Due date: ${formatDateForDisplay(task.dueDate)}]</span>`;
                }
                
                // Status
                if (task.status) {
                    html += ` <span class="status-preview">[Status: ${task.status}]</span>`;
                }
                
                html += '\n';
                
                // 渲染嵌套項目
                html += renderNestedItemsPreview(task.items);
                
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
    
    // 附件列表
    if (attachmentsList.length > 0) {
        html += '<div style="margin: 20px 0; padding: 10px; background-color: #f9f9f9; border: 1px solid #ddd;">\n';
        html += '<strong>📎 附件:</strong><br>\n';
        attachmentsList.forEach(attachment => {
            html += `<div style="margin: 5px 0; color: #0066cc;">• ${attachment.original_name}</div>\n`;
        });
        html += '</div>\n';
    }
    
    previewContent.innerHTML = html;
}

function renderNestedItemsPreview(items, level = 0) {
    let html = '';
    items.forEach(item => {
        const indentClass = `indent-${Math.min(level, 5)}`;
        html += `<div class="sub-item-preview ${indentClass}">■ ${item.text}</div>\n`;
        
        if (item.children && item.children.length > 0) {
            html += renderNestedItemsPreview(item.children, level + 1);
        }
    });
    return html;
}

// 數據收集和載入
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
            
            // 收集嵌套項目
            task.items = collectNestedItems(taskElement);
            
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
    
    return { 
        blocks: blocks,
        attachments: attachmentsList
    };
}

function collectNestedItems(container) {
    const items = [];
    const topLevelItems = container.querySelectorAll('.task-content > .nested-item');
    
    topLevelItems.forEach(itemElement => {
        const item = {
            id: itemElement.getAttribute('data-item-id'),
            text: itemElement.querySelector('.item-text').value,
            level: parseInt(itemElement.getAttribute('data-level')) || 0,
            children: collectChildItems(itemElement)
        };
        items.push(item);
    });
    
    return items;
}

function collectChildItems(parentElement) {
    const children = [];
    const childElements = parentElement.querySelectorAll('.child-items > .nested-item');
    
    childElements.forEach(childElement => {
        const child = {
            id: childElement.getAttribute('data-item-id'),
            text: childElement.querySelector('.item-text').value,
            level: parseInt(childElement.getAttribute('data-level')) || 0,
            children: collectChildItems(childElement)
        };
        children.push(child);
    });
    
    return children;
}

// 數據載入到介面
function loadDataIntoInterface(data) {
    // 清空現有內容
    document.getElementById('blocksContainer').innerHTML = '';
    
    // 載入附件資訊
    if (data.attachments) {
        attachmentsList = data.attachments;
        updateAttachmentCount();
    }
    
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
            
            // 載入嵌套項目
            if (taskData.items) {
                loadNestedItems(task, taskData.items);
            }
            
            // 載入表格
            if (taskData.tables) {
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
            }
            
            // 載入圖片
            if (taskData.images) {
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
            }
            
            block.querySelector('.tasks-container').appendChild(taskElement);
        });
        
        document.getElementById('blocksContainer').appendChild(blockElement);
        
        // 初始化拖拽
        const tasksContainer = block.querySelector('.tasks-container');
        initializeTaskSortable(tasksContainer);
        
        updateTaskNumbers(block);
    });
}

function loadNestedItems(container, items) {
    const targetContainer = container.querySelector('.task-content');
    
    items.forEach(itemData => {
        const template = document.getElementById('nestedItemTemplate');
        const itemElement = template.content.cloneNode(true);
        const item = itemElement.querySelector('.nested-item');
        
        item.setAttribute('data-item-id', itemData.id);
        item.setAttribute('data-level', itemData.level.toString());
        item.querySelector('.item-text').value = itemData.text || '';
        
        setupNestedItemEventListeners(item);
        
        // 載入子項目
        if (itemData.children && itemData.children.length > 0) {
            loadChildItems(item, itemData.children);
        }
        
        targetContainer.appendChild(itemElement);
    });
    
    // 初始化拖拽
    initializeItemSortable(targetContainer);
}

function loadChildItems(parentItem, children) {
    const childContainer = parentItem.querySelector('.child-items');
    
    children.forEach(childData => {
        const template = document.getElementById('nestedItemTemplate');
        const itemElement = template.content.cloneNode(true);
        const item = itemElement.querySelector('.nested-item');
        
        item.setAttribute('data-item-id', childData.id);
        item.setAttribute('data-level', childData.level.toString());
        item.querySelector('.item-text').value = childData.text || '';
        
        setupNestedItemEventListeners(item);
        
        // 遞歸載入子項目
        if (childData.children && childData.children.length > 0) {
            loadChildItems(item, childData.children);
        }
        
        childContainer.appendChild(itemElement);
    });
    
    // 初始化拖拽
    initializeItemSortable(childContainer);
}

// 儲存和載入
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

function loadData() {
    fetch('/load_data')
    .then(response => response.json())
    .then(data => {
        if (data.blocks) {
            loadDataIntoInterface(data);
            updatePreview();
        } else {
            // 如果沒有資料，創建一個預設區塊
            addBlock();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        addBlock();
    });
}

// 匯出功能
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

// 工具函數
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('zh-TW');
}

function formatDateForDisplay(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return (date.getMonth() + 1).toString().padStart(2, '0') + 
               date.getDate().toString().padStart(2, '0');
    } catch {
        return dateStr;
    }
}

function generateUniqueId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 額外的位置選擇功能（為未來的任務插入功能預留）
function addTaskAfter(block, position) {
    // 這個功能可以在未來實作更複雜的位置選擇
    addTask(block, position);
}

function openTaskPositionModal() {
    // 未來可以實作位置選擇對話框
    document.getElementById('taskPositionModal').style.display = 'flex';
}

function closeTaskPositionModal() {
    document.getElementById('taskPositionModal').style.display = 'none';
}

function insertTaskAtPosition() {
    // 在選定位置插入任務
    closeTaskPositionModal();
}