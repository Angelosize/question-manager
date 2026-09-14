import os
import requests
import sys

# 从 config 导入配置（如果你已经配置了）
try:
    from app.core.config import ZHIPU_CONFIG
    API_KEY = ZHIPU_CONFIG.get("api_key")
except:
    API_KEY = os.getenv("ZHIPU_API_KEY", "")

def test_zhipu():
    if not API_KEY:
        print("❌ 错误: 未设置 API Key！")
        print("请设置环境变量 ZHIPU_API_KEY，或在 config.py 中配置 ZHIPU_CONFIG['api_key']。")
        return False

    url = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    data = {
        "model": "glm-4-flash",
        "messages": [{"role": "user", "content": "请回复OK"}],
        "max_tokens": 10
    }

    print("🔄 正在测试智谱API...")
    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        print(f"📡 状态码: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            reply = result["choices"][0]["message"]["content"]
            print(f"✅ API 正常！回复内容: {reply}")
            return True
        else:
            print(f"❌ API 返回错误: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False

if __name__ == "__main__":
    success = test_zhipu()
    sys.exit(0 if success else 1)