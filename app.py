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

app = Flask(__name__)

# 確保上傳資料夾存在
UPLOAD_FOLDER = 'static/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/save_data', methods=['POST'])
def save_data():
    try:
        data = request.get_json()
        # 保存數據到文件或數據庫
        with open('task_data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return jsonify({'status': 'success'})
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
            return jsonify({'blocks': []})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/upload_image', methods=['POST'])
def upload_image():
    try:
        file = request.files['image']
        if file:
            filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            return jsonify({'status': 'success', 'url': f'/static/uploads/{filename}'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/export_html', methods=['POST'])
def export_html():
    try:
        data = request.get_json()
        html_content = generate_outlook_html(data)
        
        # 創建臨時文件
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
        
        # 創建 .msg 格式的郵件
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Task Report'
        msg['From'] = 'system@company.com'
        msg['To'] = 'recipient@company.com'
        
        html_part = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(html_part)
        
        # 創建臨時文件
        temp_file = tempfile.NamedTemporaryFile(mode='wb', suffix='.msg', delete=False)
        temp_file.write(msg.as_bytes())
        temp_file.close()
        
        return send_file(temp_file.name, as_attachment=True, download_name='tasks.msg')
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

def generate_outlook_html(data):
    """生成符合Outlook格式的HTML"""
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
            .sub-item {
                margin: 3px 0;
                padding-left: 20px;
            }
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
        </style>
    </head>
    <body>
    """
    
    if 'blocks' in data:
        for block in data['blocks']:
            html += f'<div class="block-header">[{block.get("title", "")}]</div>\n'
            
            if 'tasks' in block:
                for i, task in enumerate(block['tasks'], 1):
                    html += f'<div class="task-item">\n'
                    html += f'<span class="task-number">{i}.</span>'
                    
                    # 優先度
                    if task.get('priority'):
                        html += f'<span class="priority">[Priority:{task["priority"]}]</span> '
                    
                    # 標題
                    html += f'<span class="task-title">{task.get("title", "")}</span>'
                    
                    # Owner
                    if task.get('owner'):
                        html += f' - {task["owner"]}'
                    
                    # Due Date
                    if task.get('dueDate'):
                        html += f' <span class="due-date">[Due date: {task["dueDate"]}]</span>'
                    
                    # Status
                    if task.get('status'):
                        html += f' <span class="status">[Status: {task["status"]}]</span>'
                    
                    html += '\n'
                    
                    # 子項目
                    if 'items' in task:
                        for item in task['items']:
                            html += f'<div class="sub-item">■ {item}</div>\n'
                    
                    html += '</div>\n'
    
    html += """
    </body>
    </html>
    """
    
    return html

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8888)
