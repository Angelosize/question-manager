import requests
import json

# 测试创建题目
test_data = {
    "subject": "数学",
    "type": "选择题",
    "content": "测试题目内容",
    "answer": "A",
    "difficulty": "中等",
    "explanation": "测试解析"
}

try:
    response = requests.post(
        "http://localhost:8000/api/questions/",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"状态码: {response.status_code}")
    print(f"响应内容: {response.text}")
    
    if response.status_code == 500:
        print("❌ 服务器内部错误，请检查后端日志")
        
except Exception as e:
    print(f"请求失败: {e}")