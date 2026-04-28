import requests
import json
import re
from typing import Dict, Any, Optional
from .config import OLLAMA_CONFIG, AI_CORRECTION_PROMPT, SIMPLE_CHECK_PROMPT
from datetime import datetime

class OllamaClient:
    """Ollama API 客户端"""
    
    def __init__(self):
        self.base_url = OLLAMA_CONFIG["base_url"]
        self.model = OLLAMA_CONFIG["model"]
        self.timeout = OLLAMA_CONFIG["timeout"]
    
    def generate(self, prompt: str, system_prompt: str = None) -> Optional[str]:
        """发送生成请求"""
        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,  # 较低的随机性确保批改准确性
                    "top_p": 0.9
                }
            }
            
            if system_prompt:
                payload["system"] = system_prompt
            
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "").strip()
            else:
                print(f"Ollama API 错误: {response.status_code}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"连接Ollama失败: {e}")
            return None
        except Exception as e:
            print(f"批改处理异常: {e}")
            return None
    
    def check_server_status(self) -> bool:
        """检查Ollama服务状态"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def get_available_models(self) -> list:
        """获取可用模型列表"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=10)
            if response.status_code == 200:
                data = response.json()
                return [model["name"] for model in data.get("models", [])]
            return []
        except:
            return []

class AIAssistant:
    """AI批改引擎"""
    
    def __init__(self):
        self.client = OllamaClient()
        self.is_available = self.client.check_server_status()
    
    def correct_answer(self, question_data: Dict[str, Any], user_answer: str) -> Dict[str, Any]:
        """AI批改答案"""
        if not self.is_available:
            return self._get_fallback_result(question_data, user_answer)
        
        # 构建提示词
        prompt = AI_CORRECTION_PROMPT.format(
            subject=question_data.get('subject', ''),
            question_type=question_data.get('type', ''),
            content=question_data.get('content', ''),
            correct_answer=question_data.get('answer', ''),
            user_answer=user_answer
        )
        
        system_prompt = "你是一个专业、严谨的教育工作者，专注于准确批改和学习指导。"
        
        try:
            result_text = self.client.generate(prompt, system_prompt)
            
            if result_text:
                return self._parse_correction_result(result_text, question_data, user_answer)
            else:
                return self._get_fallback_result(question_data, user_answer)
                
        except Exception as e:
            print(f"AI批改异常: {e}")
            return self._get_fallback_result(question_data, user_answer)
    
    def quick_check(self, content: str, correct_answer: str, user_answer: str) -> bool:
        """快速答案检查"""
        if not self.is_available:
            return self._simple_rule_check(correct_answer, user_answer)
        
        prompt = SIMPLE_CHECK_PROMPT.format(
            content=content,
            correct_answer=correct_answer,
            user_answer=user_answer
        )
        
        try:
            result = self.client.generate(prompt)
            return result and "正确" in result
        except:
            return self._simple_rule_check(correct_answer, user_answer)
    
    def _parse_correction_result(self, result_text: str, question_data: Dict, user_answer: str) -> Dict[str, Any]:
        """解析批改结果"""
        # 寻找"正确"关键词
        is_correct = re.search(r"正确|对", result_text) is not None
        
        # 寻找分数
        score_match = re.search(r"得分比例?[：:]\s*(\d+)", result_text)
        score = int(score_match.group(1)) if score_match else (100 if is_correct else 0)

        return {
            "is_correct": is_correct,
            "ai_feedback": result_text,
            "confidence": 0.8 if is_correct else 0.2,
            "detailed_analysis": result_text,
            "score": score,
            "timestamp": str(datetime.now())
        }
    
    def _simple_rule_check(self, correct_answer: str, user_answer: str) -> bool:
        """简单的规则检查（备用方案）"""
        correct_clean = correct_answer.strip().lower()
        user_clean = user_answer.strip().lower()
        
        # 基础匹配逻辑
        if correct_clean == user_clean:
            return True
        
        # 数字答案容错
        try:
            if (correct_clean.isdigit() and user_clean.isdigit() and 
                abs(float(correct_clean) - float(user_clean)) < 0.01):
                return True
        except:
            pass
        
        return False
    
    def _get_fallback_result(self, question_data: Dict, user_answer: str) -> Dict[str, Any]:
        """获取备用结果（当AI不可用时）"""
        is_correct = self._simple_rule_check(question_data.get('answer', ''), user_answer)
        
        return {
            "is_correct": is_correct,
            "ai_feedback": "AI批改服务暂不可用，使用基础规则检查",
            "confidence": 0.5,
            "detailed_analysis": f"基础检查结果: {'正确' if is_correct else '错误'}",
            "score": 100 if is_correct else 0,
            "timestamp": str(datetime.now())
        }
    
    def check_status(self) -> bool:
        """检查AI服务状态"""
        return self.is_available