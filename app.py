from flask import Flask, render_template, request, jsonify, send_file
import json
import os
from datetime import datetime
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import tempfile
import zipfile
import shutil
from werkzeug.utils import secure_filename
import email
from email.parser import Parser

app = Flask(__name__)

# 設定資料夾
UPLOAD_FOLDER = 'static/uploads'
ATTACHMENTS_FOLDER = 'static/attachments'
TEMPLATES_FOLDER = 'static/templates'

for folder in [UPLOAD_FOLDER, ATTACHMENTS_FOLDER, TEMPLATES_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ATTACHMENTS_FOLDER'] = ATTACHMENTS_FOLDER
app.config['TEMPLATES_FOLDER'] = TEMPLATES_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/save_data', methods=['POST'])
def save_data():
    try:
        data = request.get_json()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'task_data_{timestamp}.json'
        filepath = os.path.join(app.config['TEMPLATES_FOLDER'], filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        # 也保存到預設位置
        with open('task_data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        return jsonify({'status': 'success', 'filename': filename})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/load_data', methods=['GET'])
def load_data():
    try:
        if os.path.exists('task_data.json'):
            with open('task_data.json', 'r', encoding='utf-8') as f:
                data = json.load(f)
            return jsonify(data)
        else:
            return jsonify({'blocks': [], 'attachments': []})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/load_template', methods=['POST'])
def load_template():
    try:
        file = request.files.get('template_file')
        if not file:
            return jsonify({'status': 'error', 'message': '請選擇檔案'})
        
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['TEMPLATES_FOLDER'], filename)
        file.save(filepath)
        
        # 根據檔案類型處理
        if filename.endswith('.json'):
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return jsonify(data)
        elif filename.endswith('.msg'):
            # 處理MSG文件
            data = parse_msg_file(filepath)
            return jsonify(data)
        else:
            return jsonify({'status': 'error', 'message': '不支援的檔案格式'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/get_templates', methods=['GET'])
def get_templates():
    try:
        templates = []
        for filename in os.listdir(app.config['TEMPLATES_FOLDER']):
            if filename.endswith('.json'):
                filepath = os.path.join(app.config['TEMPLATES_FOLDER'], filename)
                stat = os.stat(filepath)
                templates.append({
                    'filename': filename,
                    'created': datetime.fromtimestamp(stat.st_ctime).strftime('%Y-%m-%d %H:%M'),
                    'size': stat.st_size
                })
        return jsonify({'templates': templates})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/upload_image', methods=['POST'])
def upload_image():
    try:
        file = request.files['image']
        if file:
            filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{secure_filename(file.filename)}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            return jsonify({'status': 'success', 'url': f'/static/uploads/{filename}'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/upload_attachment', methods=['POST'])
def upload_attachment():
    try:
        file = request.files['attachment']
        if file:
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_filename = f"{timestamp}_{filename}"
            filepath = os.path.join(app.config['ATTACHMENTS_FOLDER'], unique_filename)
            file.save(filepath)
            
            attachment_info = {
                'id': unique_filename,
                'original_name': filename,
                'filename': unique_filename,
                'size': os.path.getsize(filepath),
                'upload_time': datetime.now().isoformat()
            }
            
            return jsonify({'status': 'success', 'attachment': attachment_info})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/delete_attachment/<attachment_id>', methods=['DELETE'])
def delete_attachment(attachment_id):
    try:
        filepath = os.path.join(app.config['ATTACHMENTS_FOLDER'], attachment_id)
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/export_html', methods=['POST'])
def export_html():
    try:
        data = request.get_json()
        html_content = generate_outlook_html(data)
        
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8')
        temp_file.write(html_content)
        temp_file.close()
        
        return send_file(temp_file.name, as_attachment=True, download_name='tasks.html')
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/export_msg', methods=['POST'])
def export_msg():
    try:
        data = request.get_json()
        html_content = generate_outlook_html(data)
        
        # 創建郵件
        msg = MIMEMultipart('mixed')
        msg['Subject'] = 'Task Report'
        msg['From'] = 'system@company.com'
        msg['To'] = 'recipient@company.com'
        
        # 添加HTML內容
        html_part = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(html_part)
        
        # 添加附件
        if 'attachments' in data:
            for attachment in data['attachments']:
                filepath = os.path.join(app.config['ATTACHMENTS_FOLDER'], attachment['filename'])
                if os.path.exists(filepath):
                    with open(filepath, 'rb') as f:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(f.read())
                        encoders.encode_base64(part)
                        part.add_header(
                            'Content-Disposition',
                            f"attachment; filename= {attachment['original_name']}"
                        )
                        msg.attach(part)
        
        # 創建臨時文件
        temp_file = tempfile.NamedTemporaryFile(mode='wb', suffix='.msg', delete=False)
        temp_file.write(msg.as_bytes())
        temp_file.close()
        
        return send_file(temp_file.name, as_attachment=True, download_name='tasks.msg')
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

def parse_msg_file(filepath):
    """解析MSG檔案並轉換為數據結構"""
    try:
        with open(filepath, 'rb') as f:
            msg = email.message_from_bytes(f.read())
        
        # 簡單的MSG解析 - 實際實作可能需要更複雜的解析
        blocks = []
        if msg.get_content_type() == 'text/html':
            html_content = msg.get_content()
            # 這裡需要實作HTML解析邏輯來重建數據結構
            # 暫時返回基本結構
        
        return {
            'blocks': blocks,
            'attachments': [],
            'metadata': {
                'subject': msg.get('Subject', ''),
                'from': msg.get('From', ''),
                'date': msg.get('Date', '')
            }
        }
    except Exception as e:
        print(f"MSG parsing error: {e}")
        return {'blocks': [], 'attachments': []}

def generate_outlook_html(data):
    """生成符合Outlook格式的HTML，支援巢狀結構"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 11pt;
                line-height: 1.4;
                margin: 0;
                padding: 20px;
                color: #333;
            }
            .block-header {
                background-color: #FFFF00;
                font-weight: bold;
                padding: 4px 8px;
                margin: 10px 0 5px 0;
                border: 1px solid #ccc;
            }
            .task-item {
                margin: 8px 0;
                padding-left: 20px;
            }
            .task-number {
                font-weight: bold;
                margin-right: 5px;
            }
            .task-title {
                font-weight: bold;
            }
            .due-date {
                color: #0066cc;
                font-weight: bold;
            }
            .status {
                color: #ff6600;
                font-weight: bold;
            }
            .priority {
                color: #cc0000;
                font-weight: bold;
            }
            .priority-1 {
                color: #cc0000;
                font-weight: bold;
            }
            .priority-2 {
                color: #ff6600;
                font-weight: bold;
            }
            .sub-item {
                margin: 3px 0;
            }
            .indent-1 { padding-left: 20px; }
            .indent-2 { padding-left: 40px; }
            .indent-3 { padding-left: 60px; }
            .indent-4 { padding-left: 80px; }
            .indent-5 { padding-left: 100px; }
            .link {
                color: #0066cc;
                text-decoration: underline;
            }
            .table {
                border-collapse: collapse;
                margin: 10px 0;
            }
            .table td, .table th {
                border: 1px solid #ccc;
                padding: 4px 8px;
                text-align: left;
            }
            .table th {
                background-color: #f0f0f0;
            }
            .image {
                max-width: 100%;
                height: auto;
                margin: 10px 0;
            }
            .attachment-list {
                margin: 10px 0;
                padding: 10px;
                background-color: #f9f9f9;
                border: 1px solid #ddd;
            }
            .attachment-item {
                margin: 5px 0;
                color: #0066cc;
            }
        </style>
    </head>
    <body>
    """
    
    if 'blocks' in data:
        for block in data['blocks']:
            if block.get('title'):
                html += f'<div class="block-header">[{block["title"]}]</div>\n'
            
            if 'tasks' in block:
                for i, task in enumerate(block['tasks'], 1):
                    html += f'<div class="task-item">\n'
                    html += f'<span class="task-number">{i}.</span>'
                    
                    # 優先度
                    if task.get('priority'):
                        priority_class = f"priority-{task['priority']}" if task['priority'] in ['1', '2'] else 'priority'
                        html += f'<span class="{priority_class}">[Priority:{task["priority"]}]</span> '
                    
                    # 標題
                    if task.get('title'):
                        html += f'<span class="task-title">{task["title"]}</span>'
                    
                    # Owner
                    if task.get('owner'):
                        html += f' - {task["owner"]}'
                    
                    # Due Date
                    if task.get('dueDate'):
                        html += f' <span class="due-date">[Due date: {format_date_for_display(task["dueDate"])}]</span>'
                    
                    # Status
                    if task.get('status'):
                        html += f' <span class="status">[Status: {task["status"]}]</span>'
                    
                    html += '\n'
                    
                    # 渲染嵌套項目
                    if 'items' in task:
                        html += render_nested_items(task['items'])
                    
                    # 表格
                    if 'tables' in task:
                        for table in task['tables']:
                            html += '<table class="table">\n'
                            for row in table.get('rows', []):
                                html += '<tr>\n'
                                for cell in row:
                                    html += f'<td>{cell}</td>\n'
                                html += '</tr>\n'
                            html += '</table>\n'
                    
                    # 圖片
                    if 'images' in task:
                        for image in task['images']:
                            html += f'<div><img src="{image.get("src", "")}" style="width: {image.get("width", "300")}px; height: auto; margin: 10px 0;" alt="Task Image" class="image"></div>\n'
                    
                    html += '</div>\n'
    
    # 附件列表
    if 'attachments' in data and data['attachments']:
        html += '<div class="attachment-list">\n'
        html += '<strong>附件:</strong>\n'
        for attachment in data['attachments']:
            html += f'<div class="attachment-item">📎 {attachment.get("original_name", "")}</div>\n'
        html += '</div>\n'
    
    html += """
    </body>
    </html>
    """
    
    return html

def render_nested_items(items, current_level=0):
    """渲染嵌套項目"""
    html = ""
    for item in items:
        indent_class = f"indent-{min(current_level, 5)}"
        html += f'<div class="sub-item {indent_class}">■ {item.get("text", "")}</div>\n'
        
        # 如果有子項目，遞歸渲染
        if 'children' in item and item['children']:
            html += render_nested_items(item['children'], current_level + 1)
    
    return html

def format_date_for_display(date_str):
    """格式化日期顯示"""
    if not date_str:
        return ""
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        return date_obj.strftime('%m%d')
    except:
        return date_str

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8888)