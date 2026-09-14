import requests
import json
import re
import ast
import threading
from typing import Dict, Any, Optional, List
from concurrent.futures import ThreadPoolExecutor, as_completed
import time as _time
from .config import ZHIPU_CONFIG, AI_CORRECTION_PROMPT, SIMPLE_CHECK_PROMPT
from datetime import datetime

class ZhipuClient:
    """智谱 GLM-4-Flash API 客户端"""
    
    def __init__(self):
        self.api_key = ZHIPU_CONFIG["api_key"]
        self.model = ZHIPU_CONFIG["model"]
        self.base_url = ZHIPU_CONFIG["base_url"]
        self.timeout = ZHIPU_CONFIG["timeout"]
    
    def generate(self, prompt: str, system_prompt: str = None, timeout: int = None, max_tokens: int = 1500) -> Optional[str]:
        try:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.3,
                "max_tokens": max_tokens
            }
            actual_timeout = timeout if timeout is not None else self.timeout
            response = requests.post(
                self.base_url,
                headers=headers,
                json=payload,
                timeout=actual_timeout
            )
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
            else:
                print(f"智谱 API 错误: {response.status_code} - {response.text}")
                return None
        except requests.exceptions.RequestException as e:
            print(f"连接智谱 API 失败: {e}")
            return None
        except Exception as e:
            print(f"生成请求异常: {e}")
            return None
    
    def check_server_status(self) -> bool:
        try:
            test_prompt = "请回复 OK"
            result = self.generate(test_prompt, system_prompt="你是一个助手。")
            return result is not None and "OK" in result
        except:
            return False
    
    def get_available_models(self) -> list:
        return [self.model]


class AIAssistant:
    def __init__(self):
        self.client = ZhipuClient()
        self.is_available = self.client.check_server_status()

    # ===== 单题批改（AI 直接返回 JSON） =====
    def correct_answer(self, question_data: Dict[str, Any], user_answer: str) -> Dict[str, Any]:
        if not self.is_available:
            return self._get_fallback_result(question_data, user_answer)

        subject = question_data.get('subject', '未知')
        q_type = question_data.get('type', '未知')
        content = question_data.get('content', '')
        options = question_data.get('options', {})
        correct_answer = question_data.get('answer', '')

        options_str = ""
        if options and isinstance(options, dict):
            options_str = " ".join([f"{k}. {v}" for k, v in options.items()])

        prompt = f"""请批改以下题目，严格按 JSON 格式返回（不要 markdown 代码块，不要额外文字）：

【题目信息】
- 学科：{subject}
- 题型：{q_type}
- 题干：{content}
- 选项：{options_str if options_str else "无"}
- 标准答案：{correct_answer}
- 学生答案：{user_answer if user_answer else "（未作答）"}

【批改要求】
1. 判断学生答案是否正确（严格对比标准答案）
2. 计算得分比例（0~100 整数）
3. 给出简短反馈（1-2 句话）
4. 给出详细分析（分点说明）
5. 未作答视为错误，得分 0

【返回格式】
{{
  "is_correct": true 或 false,
  "score": 0 到 100 的整数,
  "feedback": "简短评语",
  "analysis": "详细分析"
}}"""

        system_prompt = "你是严格的考试阅卷老师，只输出合法 JSON，不输出任何其他内容。"
        try:
            result_text = self.client.generate(prompt, system_prompt, timeout=60, max_tokens=800)
            if result_text:
                return self._parse_correction_result(result_text, question_data, user_answer)
            else:
                return self._get_fallback_result(question_data, user_answer)
        except Exception as e:
            print(f"AI批改异常: {e}")
            return self._get_fallback_result(question_data, user_answer)
    
    def quick_check(self, content: str, correct_answer: str, user_answer: str) -> bool:
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
    
    # ===== 解析批改结果（优先 JSON，正则兜底） =====
    def _parse_correction_result(self, result_text: str, question_data: Dict, user_answer: str) -> Dict[str, Any]:
        # 1. 尝试解析 JSON
        try:
            cleaned = re.sub(r'^```(?:json)?\s*', '', result_text, flags=re.MULTILINE)
            cleaned = re.sub(r'\s*```\s*$', '', cleaned, flags=re.MULTILINE)
            json_match = re.search(r'\{[\s\S]*\}', cleaned)
            if json_match:
                data = json.loads(json_match.group())
                is_correct = bool(data.get('is_correct', False))
                score = int(data.get('score', 100 if is_correct else 0))
                score = max(0, min(100, score))
                feedback = str(data.get('feedback', '')).strip()
                analysis = str(data.get('analysis', '')).strip() or result_text
                return {
                    "is_correct": is_correct,
                    "ai_feedback": feedback or result_text,
                    "confidence": 0.9,
                    "detailed_analysis": analysis,
                    "score": score,
                    "timestamp": str(datetime.now())
                }
        except Exception as e:
            print(f"⚠️ 批改结果 JSON 解析失败，回退正则: {e}")

        # 2. 正则兜底
        is_correct = False
        m = re.search(r'正确性判断\s*[：:]\s*(正确|错误)', result_text)
        if m:
            is_correct = (m.group(1) == '正确')
        else:
            m = re.search(r'(?:判断|结果)\s*[：:]\s*(正确|错误)', result_text)
            if m:
                is_correct = (m.group(1) == '正确')
            else:
                if '错误' in result_text:
                    is_correct = False
                elif '正确' in result_text:
                    is_correct = True
                else:
                    is_correct = False

        score_match = re.search(r'得分比例\s*[：:]\s*(\d+)', result_text)
        if score_match:
            score = int(score_match.group(1))
        else:
            m2 = re.search(r'得分\s*[：:]\s*(\d+)', result_text)
            score = int(m2.group(1)) if m2 else (100 if is_correct else 0)

        score = max(0, min(100, score))

        return {
            "is_correct": is_correct,
            "ai_feedback": result_text,
            "confidence": 0.7 if is_correct else 0.3,
            "detailed_analysis": result_text,
            "score": score,
            "timestamp": str(datetime.now())
        }
    
    def _simple_rule_check(self, correct_answer: str, user_answer: str) -> bool:
        if not user_answer or not user_answer.strip():
            return False
        if len(correct_answer) > 1 and len(user_answer) > 1:
            return sorted(correct_answer.strip()) == sorted(user_answer.strip())
        correct_clean = correct_answer.strip().lower()
        user_clean = user_answer.strip().lower()
        if correct_clean == user_clean:
            return True
        try:
            if (correct_clean.replace('.', '', 1).isdigit() and 
                user_clean.replace('.', '', 1).isdigit() and 
                abs(float(correct_clean) - float(user_clean)) < 0.01):
                return True
        except:
            pass
        return False
    
    def _get_fallback_result(self, question_data: Dict, user_answer: str) -> Dict[str, Any]:
        is_correct = self._simple_rule_check(question_data.get('answer', ''), user_answer)
        return {
            "is_correct": is_correct,
            "ai_feedback": "AI批改服务暂不可用，使用基础规则检查",
            "confidence": 0.5,
            "detailed_analysis": f"基础检查结果: {'正确' if is_correct else '错误'}",
            "score": 100 if is_correct else 0,
            "timestamp": str(datetime.now())
        }
    
    # ===== 批量批改 =====
    def batch_correct(self, questions_data: List[Dict[str, Any]], user_answers: Dict[str, str]) -> Dict[str, Any]:
        print(f"🤖 批量批改开始，题目数: {len(questions_data)}")
        if not self.is_available:
            print("⚠️ AI 服务不可用，降级为规则检查")
            return self._fallback_batch(questions_data, user_answers)

        prompt = "你是一位严格的考试阅卷老师。请批改以下所有题目，对每道题给出判断（正确/错误）、得分比例（0~100%）、详细分析和反馈。\n\n"
        for i, q in enumerate(questions_data, 1):
            prompt += f"题目 {i}（ID: {q['id']}）：\n"
            prompt += f"学科：{q.get('subject', '未知')}\n"
            prompt += f"题型：{q.get('type', '未知')}\n"
            prompt += f"题干：{q.get('content', '')}\n"
            prompt += f"标准答案：{q.get('answer', '')}\n"
            prompt += f"用户答案：{user_answers.get(q['id'], '')}\n\n"

        prompt += """
请严格按以下 JSON 格式返回（不要其他文字）：
{
  "results": {
    "题目1的ID": {
      "is_correct": true/false,
      "score": 整数0-100,
      "feedback": "简短评语",
      "analysis": "详细分析"
    },
    ...
  }
}
"""
        system_prompt = "你是一个公正、严谨的教育专家。批量批改多个题目，输出必须为合法JSON。"
        timeout = min(120, 60 + len(questions_data) * 10)
        print(f"📤 发送批量请求到智谱 API，超时: {timeout} 秒")
        result_text = self.client.generate(prompt, system_prompt, timeout=timeout)
        if not result_text:
            print("⚠️ AI 返回为空，降级为规则检查")
            return self._fallback_batch(questions_data, user_answers)

        print("📥 AI 返回内容长度:", len(result_text), result_text, sep='\n   ')
        try:
            json_match = re.search(r'\{[\s\S]*\}', result_text)
            if json_match:
                data = json.loads(json_match.group())
                results = data.get('results', {})
                final = {}
                for qid, res in results.items():
                    is_correct = bool(res.get('is_correct', False))
                    score = int(res.get('score', 100 if is_correct else 0))
                    score = max(0, min(100, score))
                    final[qid] = {
                        "is_correct": is_correct,
                        "score": score,
                        "ai_feedback": res.get('feedback', ''),
                        "detailed_analysis": res.get('analysis', ''),
                        "confidence": 0.9,
                        "timestamp": str(datetime.now())
                    }
                for q in questions_data:
                    if q['id'] not in final:
                        print(f"⚠️ 题目 {q['id']} 未在AI返回中，使用规则检查")
                        final[q['id']] = self._fallback_single(q, user_answers.get(q['id'], ''))
                return final
            else:
                raise ValueError("未找到JSON")
        except Exception as e:
            print(f"❌ 批量批改解析失败: {e}, 原始返回片段: {result_text[:500]}")
            return self._fallback_batch(questions_data, user_answers)

    # ===== 逐题并发批改（带进度回调） =====
    def batch_correct_with_progress(
        self,
        questions_data: List[Dict[str, Any]],
        user_answers: Dict[str, str],
        progress_callback=None,
    ) -> Dict[str, Any]:
        total = len(questions_data)
        if total == 0:
            return {}

        def _report(done: int):
            if progress_callback:
                try:
                    progress_callback(done, total)
                except Exception:
                    pass

        if total == 1:
            q = questions_data[0]
            try:
                r = self.correct_answer(q, user_answers.get(q['id'], ''))
            except Exception as e:
                print(f"批改 {q['id']} 失败: {e}")
                r = self._fallback_single(q, user_answers.get(q['id'], ''))
            _report(1)
            return {q['id']: r}

        workers = min(4, total)
        results: Dict[str, Any] = {}
        completed = [0]
        lock = threading.Lock()

        def _grade_one(q: Dict[str, Any]) -> Dict[str, Any]:
            try:
                return self.correct_answer(q, user_answers.get(q['id'], ''))
            except Exception as e:
                print(f"批改 {q['id']} 失败: {e}")
                return self._fallback_single(q, user_answers.get(q['id'], ''))

        print(f"⚡ 并发批改 {total} 道题（最多 {workers} 线程）...")
        with ThreadPoolExecutor(max_workers=workers) as executor:
            future_map = {executor.submit(_grade_one, q): q for q in questions_data}
            for future in as_completed(future_map):
                q = future_map[future]
                try:
                    results[q['id']] = future.result()
                except Exception as e:
                    print(f"批改 {q['id']} 异常: {e}")
                    results[q['id']] = self._fallback_single(q, user_answers.get(q['id'], ''))
                with lock:
                    completed[0] += 1
                    _report(completed[0])

        print(f"✅ 并发批改完成，共 {completed[0]} 题")
        return results

    def _fallback_single(self, q: Dict, user_answer: str) -> Dict:
        is_correct = self._simple_rule_check(q.get('answer', ''), user_answer)
        return {
            "is_correct": is_correct,
            "ai_feedback": "AI解析失败，使用规则检查",
            "confidence": 0.5,
            "detailed_analysis": f"规则检查结果: {'正确' if is_correct else '错误'}",
            "score": 100 if is_correct else 0,
            "timestamp": str(datetime.now())
        }

    def _fallback_batch(self, questions_data: List[Dict], user_answers: Dict) -> Dict:
        results = {}
        for q in questions_data:
            results[q['id']] = self._fallback_single(q, user_answers.get(q['id'], ''))
        return results

    def check_status(self) -> bool:
        return self.is_available
    
    def _safe_json_loads(self, json_str: str) -> dict:
        r"""安全解析包含 LaTeX 的 JSON 字符串，处理 \u 等转义"""
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass

        try:
            fixed = re.sub(r'\\(?!n|t|r|"|\\)', r'\\\\', json_str)
            return json.loads(fixed)
        except json.JSONDecodeError:
            pass

        try:
            import ast
            return ast.literal_eval(fixed)
        except Exception:
            pass

        try:
            decoded = json_str.encode('utf-8').decode('unicode_escape')
            return json.loads(decoded)
        except:
            pass

        data = {}
        content_match = re.search(r'"content"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', json_str)
        if content_match:
            data['content'] = content_match.group(1).replace('\\n', '\n').replace('\\"', '"')
        subject_match = re.search(r'"subject"\s*:\s*"([^"]*)"', json_str)
        if subject_match:
            data['subject'] = subject_match.group(1)
        type_match = re.search(r'"type"\s*:\s*"([^"]*)"', json_str)
        if type_match:
            data['type'] = type_match.group(1)
        answer_match = re.search(r'"answer"\s*:\s*"([^"]*)"', json_str)
        if answer_match:
            data['answer'] = answer_match.group(1)
        diff_match = re.search(r'"difficulty"\s*:\s*"([^"]*)"', json_str)
        if diff_match:
            data['difficulty'] = diff_match.group(1)
        options_match = re.search(r'"options"\s*:\s*(\{[^}]*\})', json_str)
        if options_match:
            try:
                data['options'] = json.loads(options_match.group(1))
            except:
                data['options'] = {}
        kp_match = re.search(r'"knowledge_points"\s*:\s*(\[[^\]]*\])', json_str)
        if kp_match:
            try:
                data['knowledge_points'] = json.loads(kp_match.group(1))
            except:
                data['knowledge_points'] = []
        score_match = re.search(r'"score"\s*:\s*(\d+)', json_str)
        if score_match:
            data['score'] = int(score_match.group(1))
        if data.get('content'):
            return data
        else:
            raise ValueError("无法从 JSON 中提取 content")

    # ===== 后处理：从 content 中剥离选项 / 推断题型 / 分值兜底 =====
    def _postprocess_recognized(self, data: Dict[str, Any]) -> Dict[str, Any]:
        content_str = data.get('content', '') or ''

        # 1. 从 content 中剥离选项
        if not data.get('options') and content_str:
            options_found = {}
            first_pos = None
            option_pattern = re.compile(
                r'(?:^|[\s\n])([A-F])[\.\、\．\s]\s*([\s\S]*?)(?=[\s\n]+[A-F][\.\、\．\s]|[\s\n]*$)'
            )
            for m in option_pattern.finditer(content_str):
                if first_pos is None:
                    first_pos = m.start()
                letter = m.group(1)
                value = m.group(2).strip()
                value = re.sub(r'^[\s:：]+', '', value).strip()
                if value:
                    options_found[letter] = value
            if len(options_found) >= 2:
                data['options'] = options_found
                if first_pos is not None:
                    data['content'] = content_str[:first_pos].strip()
                print(f"   🔧 从题干中剥离选项: {list(options_found.keys())}")

        # 2. 多选题推断
        ans_str = str(data.get('answer', '')).strip()
        ans_norm = ans_str.replace(' ', '').replace('，', '').replace(',', '').upper()
        is_multi_answer = (len(ans_norm) > 1 and re.match(r'^[A-F]+$', ans_norm) is not None)
        has_multi_marker = ('多选' in content_str or '多选' in str(data.get('content', '')))
        if (is_multi_answer or has_multi_marker) and data.get('type') == '选择题':
            data['type'] = '多选题'

        # 3. 填空题强制纠正
        if data.get('type') in ('计算题', '解答题'):
            if re.search(r'_{2,}|（\s*_{2,}\s*）|\(\s*_{2,}\s*\)', content_str):
                data['type'] = '填空题'
                print(f"   🔧 题型修正: 题干含填空线 → 填空题")

        # 4. 分值兜底
        if not data.get('score') or data['score'] == 0:
            score_match = re.search(r'[（(]\s*(\d+)\s*分\s*[）)]', data.get('content', ''))
            if score_match:
                data['score'] = int(score_match.group(1))
            else:
                t = data.get('type', '')
                if t in ('选择题', '多选题', '填空题'):
                    data['score'] = 3
                elif t in ('解答题', '计算题'):
                    data['score'] = 10
                elif t in ('实验题', '简答题'):
                    data['score'] = 6
                else:
                    data['score'] = 5

        return data

    # ===== AI 识别题目（单题） =====
    def recognize_question(self, text: str) -> Dict[str, Any]:
        if not self.is_available:
            raise Exception("AI服务不可用，请检查配置")

        prompt = f"""从以下题目文本中提取关键信息，返回JSON格式，不要用markdown，不要添加额外文字。

题目：
{text}

必须包含以下字段：
- content: **纯题干**（字符串），**必须把选项（A. ... B. ... C. ... D. ...）从题干中剥离出去**，只保留提问部分
- subject: 学科（字符串）
- type: 题型（字符串），**必须按以下规则严格判断**：
    * 题干含"（多选）"、"多选题"、或答案有多个字母（如"BD"、"ACD"）→ "多选题"
    * 答案只有一个字母且有选项 → "选择题"
    * 题干含空格填空（____）→ "填空题"
    * 其他 → 从 [解答题、判断题、简答题、实验题、计算题] 中选最合适的
- difficulty: 难度（字符串，可选值：基础、中等、拔高）
- answer: 正确答案，**必须是一个字符串，不能是对象或数组**
- options: 选项（**选择题/多选题必填，对象格式**；非选择题填 {{}}）
- score: 分值（整数），规则：
    * 题干中有"（X分）"→ 取 X
    * 否则选择题/多选题 → 3
    * 填空题 → 3
    * 解答题/计算题 → 10
    * 实验题/简答题 → 6
- knowledge_points: **该题涉及的核心考点（数组），必须使用标准学科术语，1-3 个**

**关于 options 字段的关键要求**：
- 所有形如 "A. xxx B. xxx C. xxx D. xxx" 的内容必须放入 options 对象，不能留在 content 中
- content 里绝不能包含 "A." "B." "C." "D." 这样的选项标记

**关于 knowledge_points 字段的关键要求**：
- 必须使用**学科核心考点术语**，例如"长度估测"、"单位换算"、"刻度尺读数"、"误差分析"、"牛顿运动定律"
- 严禁使用题干中原词的简单摘录（如"成语解释"、"文化常识"、"体育技能测试" 都是错误示例）

示例（单选题）：
{{"content": "已知集合A与B的交集是（  ）", "subject": "数学", "type": "选择题", "difficulty": "基础", "answer": "B", "options": {{"A": "选项A内容", "B": "选项B内容", "C": "选项C内容", "D": "选项D内容"}}, "score": 5, "knowledge_points": ["集合运算", "不等式"]}}

示例（多选题）：
{{"content": "（多选）下列各数中，是质数的有（  ）", "subject": "数学", "type": "多选题", "difficulty": "中等", "answer": "BD", "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}}, "score": 3, "knowledge_points": ["质数"]}}
"""
        system_prompt = "你是一个专业的教育内容解析助手，能准确提取题目信息，包括分值（score）和核心知识点（knowledge_points）。"
        result_text = self.client.generate(prompt, system_prompt, timeout=90, max_tokens=1500)
        if not result_text:
            raise Exception("AI识别失败，请重试")

        try:
            json_match = re.search(r'\{[\s\S]*\}', result_text)
            if json_match:
                json_str = json_match.group()
                data = self._safe_json_loads(json_str)

                data.setdefault('content', '')
                data.setdefault('subject', '')
                data.setdefault('type', '选择题')
                data.setdefault('difficulty', '中等')
                data.setdefault('answer', '')
                data.setdefault('options', {})
                data.setdefault('explanation', '')
                data.setdefault('knowledge_points', [])
                data.setdefault('exam_name', '')
                data.setdefault('year', 0)
                data.setdefault('score', 0)
                data.setdefault('source', '')

                if isinstance(data.get('knowledge_points'), str):
                    kp_str = data['knowledge_points']
                    data['knowledge_points'] = [kp.strip() for kp in re.split(r'[,，、]', kp_str) if kp.strip()]
                elif not isinstance(data.get('knowledge_points'), list):
                    data['knowledge_points'] = []

                if not data.get('knowledge_points'):
                    content = data.get('content', '')
                    all_keywords = [
                        '函数', '导数', '极值', '三角函数', '数列', '解析几何', '向量', '概率',
                        '统计', '不等式', '方程', '圆锥曲线', '集合', '立体几何', '排列组合',
                        '长度估测', '单位换算', '刻度尺', '误差', '牛顿', '运动', '速度',
                        '电磁', '感应', '交变', '原子', '波', '光学', '热学', '力学', '动量',
                        '能量', '压强', '浮力', '功', '功率', '杠杆', '滑轮', '光',
                        '化学平衡', '氧化还原', '离子反应', '元素周期', '有机', '化学实验',
                        '孟德尔', '遗传', '基因', 'DNA', '染色体', '进化',
                    ]
                    found = []
                    for kw in all_keywords:
                        if kw in content:
                            found.append(kw)
                    if found:
                        data['knowledge_points'] = found[:3]
                    else:
                        data['knowledge_points'] = [data.get('subject', '') or '未知']

                if not isinstance(data.get('options'), dict):
                    data['options'] = {}

                if isinstance(data.get('answer'), dict):
                    ans_dict = data['answer']
                    if ans_dict:
                        sorted_values = [str(v) for _, v in sorted(ans_dict.items())]
                        data['answer'] = '；'.join(sorted_values)
                    else:
                        data['answer'] = ''

                if not data['content']:
                    lines = text.split('\n')
                    content_lines = []
                    for line in lines:
                        stripped = line.strip()
                        if re.match(r'^[A-D]\.', stripped) or stripped.startswith('答案') or stripped.startswith('解析'):
                            break
                        content_lines.append(stripped)
                    data['content'] = '\n'.join(content_lines).strip()
                    if not data['content']:
                        data['content'] = text[:200]

                data = self._postprocess_recognized(data)

                print(f"📋 识别结果: content={data['content'][:50]}..., type={data['type']}, answer={data['answer'][:20]}..., options={len(data['options'])}个, score={data['score']}, kp={data['knowledge_points']}")
                return data
            else:
                raise ValueError("未找到JSON")
        except Exception as e:
            print(f"解析识别结果失败: {e}, 原始返回: {result_text[:200]}")
            raise Exception("AI返回格式异常")

    def _recognize_one(self, item: Dict, answer_map: Dict) -> Dict:
        try:
            recognized = self.recognize_question(item["content"])
            recognized["number"] = item["number"]
            if not recognized.get("content"):
                recognized["content"] = item["content"]
            num = item.get("number")
            if num in answer_map:
                recognized["answer"] = answer_map[num]
            return recognized
        except Exception as e:
            print(f"   ❌ 识别第 {item.get('number')} 题失败: {e}")
            return {
                "error": str(e),
                "content": item["content"],
                "number": item["number"],
                "score": 3
            }

    def _concurrent_recognize(self, split_data: List[Dict], answer_map: Dict, max_workers: int = 6) -> List[Dict]:
        if not split_data:
            return []
        workers = min(max_workers, len(split_data))
        print(f"⚡ 并发识别 {len(split_data)} 道题（最多 {workers} 线程）...")
        t0 = _time.time()

        results: List[Optional[Dict]] = [None] * len(split_data)
        completed = [0]
        with ThreadPoolExecutor(max_workers=workers) as executor:
            future_map = {
                executor.submit(self._recognize_one, item, answer_map): idx
                for idx, item in enumerate(split_data)
            }
            for future in as_completed(future_map):
                idx = future_map[future]
                results[idx] = future.result()
                completed[0] += 1
                print(f"   ✅ 已完成 {completed[0]}/{len(split_data)}")

        elapsed = _time.time() - t0
        print(f"⚡ 并发识别完成，耗时 {elapsed:.1f} 秒")
        return results  # type: ignore

    # ===== 分割文本为多段 =====
    def _split_text_into_chunks(self, text: str, num_chunks: int = 2) -> List[str]:
        """把文本按题号位置均分成 num_chunks 段"""
        if len(text) < 800 or num_chunks <= 1:
            return [text]

        # 找所有题号位置
        num_positions = [
            m.start() for m in re.finditer(r'(?:\n|\A)\s*\d+[.、．]\s', text)
        ]
        if len(num_positions) < num_chunks:
            return [text]

        chunk_size = len(text) // num_chunks
        chunks = []
        current_start = 0
        for i in range(1, num_chunks):
            target = i * chunk_size
            candidates = [p for p in num_positions if p > current_start + 50]
            if not candidates:
                break
            cut = min(candidates, key=lambda p: abs(p - target))
            chunks.append(text[current_start:cut])
            current_start = cut
        if current_start < len(text):
            chunks.append(text[current_start:])
        return chunks if chunks else [text]

    # ===== ⭐ 判断一行是否像题干（用于答案块边界检测） =====
    def _looks_like_question_line(self, line: str) -> bool:
        """
        判断一行文本是否像题干（而非答案）。
        用于答案块解析的边界检测——一旦识别到题干特征，立刻停止。
        """
        if not line:
            return False
        # 1. 多选标记
        if re.search(r'[（(]\s*多选\s*[)）]', line):
            return True
        # 2. 连续下划线（填空）
        if re.search(r'_{2,}', line):
            return True
        # 3. 空括号（选择题空位）
        if re.search(r'[（(]\s{0,3}[)）]', line):
            return True
        # 4. 图像引用
        if re.search(r'如[图下]|下图|图[甲乙丙丁]', line):
            return True
        # 5. 长度阈值（题干一般较长）
        if len(line) > 40:
            return True
        return False

    # ===== 分割 + 识别（⭐ 核心方法） =====
    def split_and_recognize(self, text: str, progress_callback=None) -> List[Dict[str, Any]]:
        def report(stage, current=0, total=0):
            if progress_callback:
                try:
                    progress_callback(stage, current, total)
                except Exception:
                    pass

        print("🚀🚀🚀 SPLIT_AND_RECOGNIZE V7.3 (禁止编造答案) 已执行 🚀🚀🚀")

        if not self.is_available:
            raise Exception("AI服务不可用")

        print("=" * 50)
        print("📥 收到待分割文本（前200字符）:")
        print(text[:200])
        print("=" * 50)

        # ============ ⭐ 答案块解析（严格版 + 边界收紧） ============
        answer_map = {}
        # ⭐ 优先从"参考答案"/"标准答案"开始，遇到【单个空行】即停止
        answer_pattern = re.compile(
            r'(?:参考答案|标准答案|答案解析)\s*[：:]\s*([\s\S]+?)(?=\n\s*\n|\Z)',
            re.IGNORECASE
        )
        answer_match = answer_pattern.search(text)

        # 找不到则退一步用"答案："
        if not answer_match:
            answer_pattern2 = re.compile(
                r'\n\s*答案\s*[：:]\s*([\s\S]+?)(?=\n\s*\n|\Z)',
                re.IGNORECASE
            )
            answer_match = answer_pattern2.search(text)

        if answer_match:
            answer_block = answer_match.group(1).strip()
            print("📌 发现答案块，正在解析...")
            lines = answer_block.split('\n')
            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # ⭐ 严格匹配题号：行首 数字 + 点/顿号（只允许 . 和 、）
                m = re.match(r'^(\d{1,3})\s*[.、．]\s*(.+)$', line)
                if not m:
                    continue

                num = int(m.group(1))
                remainder = m.group(2).strip()

                # ⭐⭐ 双保险：一旦 remainder 像题干，答案块提前结束
                if self._looks_like_question_line(remainder):
                    print(f"   ⚠️ 检测到题干文本，答案块解析提前结束: {remainder[:40]}")
                    break

                # ⭐ 判断"一行多题"：剩余部分含 "数字." 或 "数字、"，且数字前后有空白
                has_more_nums = re.search(r'(?:^|\s)\d{1,3}\s*[.、．]\s*\S', remainder)

                if has_more_nums and len(remainder) < 200:
                    # 一行多题（如 "A 2.B 3.C"）
                    parts = re.findall(r'(?:^|\s)(\d{1,3})\s*[.、．]\s*([^\s]+)', line)
                    for num_str, ans_item in parts:
                        try:
                            n = int(num_str)
                            if n not in answer_map:
                                answer_map[n] = ans_item.strip()
                        except ValueError:
                            continue
                else:
                    # 单题（可能是多空答案，整行保留）
                    if remainder:
                        answer_map[num] = remainder

            if answer_map:
                print(f"✅ 解析到 {len(answer_map)} 道题的答案:")
                for k in sorted(answer_map.keys())[:8]:
                    v = answer_map[k]
                    print(f"   {k}: {v[:70]}{'...' if len(v) > 70 else ''}")
                if len(answer_map) > 8:
                    print(f"   ...（共 {len(answer_map)} 题）")
            else:
                print("⚠️ 无法解析答案块")

        # ============ ⭐ 分段并发调用 AI 分割 ============
        report('splitting', 0, 0)
        num_chunks = 2 if len(text) < 3000 else 3
        chunks = self._split_text_into_chunks(text, num_chunks=num_chunks)
        print(f"📦 文本拆分为 {len(chunks)} 段（总 {len(text)} 字符），并发调用 AI 分割...")

        split_system_prompt = (
            "你是一个专业的教育文本分割助手，必须提取所有题号，"
            "每个元素必须包含content，只输出JSON数组。"
        )

        def _process_chunk(idx_chunk):
            idx, chunk = idx_chunk
            chunk_prompt = f"""请将以下试卷文本中的**所有题目**按题号分割成独立的题目。

**重要：返回的必须是一个 JSON 数组，直接以 [ 开头，以 ] 结尾，不要添加任何额外的文字、注释或 markdown 代码块。** 每个元素必须包含 number（题号）和 content（完整题目内容）两个字段。

规则：
- 只分割有明确题号的题目（数字+点/顿号/括号，如"1."、"2、"、"3)"）。
- **大题标题（如"一、选择题"）不是题目，不要分割。**
- **子小题（如"（1）"）属于其父级大题，不要拆分。**
- **content 字段必须包含该题目的全部文本，包括所有子问题和选项，不能截断。**
- **必须保留题干中的"（多选）"标记**。
- 如果文本中没有题号，则返回空数组。

试卷文本（第 {idx+1}/{len(chunks)} 段）：
{chunk}
"""
            result = self.client.generate(
                chunk_prompt, split_system_prompt, max_tokens=4000
            )
            if not result:
                return idx, []

            try:
                cleaned = re.sub(r'^```(?:json)?\s*', '', result, flags=re.MULTILINE)
                cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
                json_match = re.search(r'\[[\s\S]*\]', cleaned)
                if json_match:
                    json_str = json_match.group()
                    try:
                        data = json.loads(json_str)
                    except json.JSONDecodeError:
                        fixed = re.sub(r'\\(?!n|t|r|"|\\)', r'\\\\', json_str)
                        try:
                            data = json.loads(fixed)
                        except:
                            try:
                                import ast
                                data = ast.literal_eval(fixed)
                            except:
                                data = None
                    if isinstance(data, list):
                        return idx, data
            except Exception as e:
                print(f"   ⚠️ 第 {idx+1} 段解析失败: {e}")
            return idx, []

        # ⭐ 并发处理所有段
        chunks_results: List[List[Dict]] = [[] for _ in range(len(chunks))]
        if len(chunks) == 1:
            _, data = _process_chunk((0, chunks[0]))
            chunks_results[0] = data
            print(f"   ✅ 第 1 段解析出 {len(data)} 道题")
        else:
            with ThreadPoolExecutor(max_workers=len(chunks)) as executor:
                future_map = {
                    executor.submit(_process_chunk, (i, c)): i
                    for i, c in enumerate(chunks)
                }
                for future in as_completed(future_map):
                    try:
                        idx, data = future.result()
                        chunks_results[idx] = data
                        print(f"   ✅ 第 {idx+1} 段解析出 {len(data)} 道题")
                    except Exception as e:
                        print(f"   ⚠️ 某段处理异常: {e}")

        # 按段顺序合并
        split_data = []
        for chunk_data in chunks_results:
            split_data.extend(chunk_data)

        print(f"📊 分段合并后共 {len(split_data)} 道题")

        # ============ 过滤无效题目 ============
        if split_data:
            filtered_data = []
            for item in split_data:
                content = item.get("content", "").strip()
                number = item.get("number")
                if content.startswith("阅读") or content.startswith("材料"):
                    if isinstance(number, str) and ("～" in number or "完成" in content):
                        continue
                    if isinstance(number, int) and len(content) < 20 and "阅读" in content:
                        continue
                if "完成" in content and "～" in content:
                    continue
                filtered_data.append(item)
            split_data = filtered_data
            print(f"📊 过滤后剩余 {len(split_data)} 道题")

        # ============ 并发识别 ============
        if split_data and len(split_data) > 0:
            print(f"✅ AI 分割成功，共 {len(split_data)} 道题")

            def _recognize_one(item):
                try:
                    recognized = self.recognize_question(item["content"])
                    recognized["number"] = item["number"]
                    if not recognized.get("content"):
                        recognized["content"] = item["content"]

                    # ⭐ 关键修复：number 可能是 "12." 字符串，answer_map 键是整数
                    num_raw = item.get("number")
                    num_key = None
                    if isinstance(num_raw, int):
                        num_key = num_raw
                    elif isinstance(num_raw, str):
                        m = re.search(r'(\d+)', num_raw)
                        if m:
                            num_key = int(m.group(1))

                    if num_key is not None and num_key in answer_map:
                        recognized["answer"] = answer_map[num_key]
                        print(f"   📝 覆盖第{num_key}题答案: {str(answer_map[num_key])[:60]}")

                    return recognized
                except Exception as e:
                    print(f"   ❌ 识别第 {item.get('number')} 题失败: {e}")
                    return {
                        "error": str(e),
                        "content": item["content"],
                        "number": item["number"],
                        "score": 3
                    }

            results = [None] * len(split_data)
            workers = min(6, len(split_data))
            report('recognizing', 0, len(split_data))
            print(f"⚡ 并发识别 {len(split_data)} 道题（最多 {workers} 线程）...")
            t0 = _time.time()
            completed = 0
            with ThreadPoolExecutor(max_workers=workers) as executor:
                future_map = {
                    executor.submit(_recognize_one, item): idx
                    for idx, item in enumerate(split_data)
                }
                for future in as_completed(future_map):
                    idx = future_map[future]
                    results[idx] = future.result()
                    completed += 1
                    report('recognizing', completed, len(split_data))
                    print(f"   ✅ 已完成 {completed}/{len(split_data)}")
            print(f"⚡ 并发识别完成，耗时 {_time.time() - t0:.1f} 秒")
            report('done', len(split_data), len(split_data))
            return results

        # ============ 备用正则分割 ============
        print("⚠️ AI 分割失败，使用正则分割（备用）")
        def split_by_number(txt):
            lines = txt.split('\n')
            questions = []
            current_num = None
            current_content = []
            num_pattern = re.compile(r'^\s*(\d+)[.、\)）]\s*')
            for line in lines:
                stripped = line.strip()
                if not stripped:
                    continue
                match = num_pattern.match(stripped)
                if match:
                    num = int(match.group(1))
                    if current_num is not None:
                        questions.append({
                            "number": current_num,
                            "content": "\n".join(current_content).strip()
                        })
                        current_content = []
                    current_num = num
                    remaining = stripped[match.end():].strip()
                    if remaining:
                        current_content.append(remaining)
                else:
                    if current_num is not None:
                        current_content.append(stripped)
            if current_num is not None:
                questions.append({
                    "number": current_num,
                    "content": "\n".join(current_content).strip()
                })
            return questions

        split_data = split_by_number(text)
        if not split_data:
            raise Exception("未能识别出任何题目，请检查文本格式")

        print(f"✅ 正则分割成功，共 {len(split_data)} 道题")

        def _recognize_one_regex(item):
            try:
                recognized = self.recognize_question(item["content"])
                recognized["number"] = item["number"]
                if not recognized.get("content"):
                    recognized["content"] = item["content"]

                num_raw = item.get("number")
                num_key = None
                if isinstance(num_raw, int):
                    num_key = num_raw
                elif isinstance(num_raw, str):
                    m = re.search(r'(\d+)', num_raw)
                    if m:
                        num_key = int(m.group(1))

                if num_key is not None and num_key in answer_map:
                    recognized["answer"] = answer_map[num_key]
                return recognized
            except Exception as e:
                return {
                    "error": str(e),
                    "content": item["content"],
                    "number": item["number"],
                    "score": 3
                }

        results = [None] * len(split_data)
        workers = min(6, len(split_data))
        report('recognizing', 0, len(split_data))
        completed = 0
        with ThreadPoolExecutor(max_workers=workers) as executor:
            future_map = {executor.submit(_recognize_one_regex, item): idx for idx, item in enumerate(split_data)}
            for future in as_completed(future_map):
                idx = future_map[future]
                results[idx] = future.result()
                completed += 1
                report('recognizing', completed, len(split_data))
        report('done', len(split_data), len(split_data))
        return results

    # ===== 图片识别（单题） =====
    def recognize_image(self, image_base64: str, mime_type: str = "image/jpeg") -> Dict[str, Any]:
        if not self.is_available:
            return {"error": "API Key 未配置", "detail": "请检查 ZHIPU_API_KEY"}

        prompt = """你是题目识别助手。请识别图片中的题目，严格返回 JSON，不要任何解释，不要 markdown 代码块标记。

字段说明：
- content: 题干文字，去除题号
- options: 选择题的四个选项，非选择题填 null
- answer: 正确答案，无法识别时填 null
- subject: 学科，从 数学、物理、化学、英语、语文 中选
- type: 题型，从 选择题、多选题、填空题、解答题、实验题、计算题 中选（多选时选"多选题"）
- difficulty: 难度，从 基础、中档、较难、压轴 中选
- knowledge_points: 知识点数组，使用标准学科术语
- score: 分值，选择题默认3，多选题默认3，填空题默认3，解答题默认10

输出格式：
{
  "content": "...",
  "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
  "answer": "...",
  "subject": "...",
  "type": "...",
  "difficulty": "...",
  "knowledge_points": ["..."],
  "score": 3
}

图片内容："""

        data_url = f"data:{mime_type};base64,{image_base64}"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.client.api_key}"
        }
        payload = {
            "model": "glm-4v-flash",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url}}
                    ]
                }
            ],
            "temperature": 0.2,
            "max_tokens": 1024
        }

        try:
            print("🖼️ 调用 GLM-4V-Flash 识别图片...")
            response = requests.post(
                self.client.base_url,
                headers=headers,
                json=payload,
                timeout=60
            )
            if response.status_code != 200:
                print(f"❌ GLM-4V 错误: {response.status_code} - {response.text[:300]}")
                return {
                    "error": "AI调用失败",
                    "detail": f"HTTP {response.status_code}: {response.text[:300]}"
                }

            result = response.json()
            text = result["choices"][0]["message"]["content"].strip()
            print(f"📥 识别返回长度: {len(text)}")

            text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.MULTILINE)
            text = re.sub(r'\s*```\s*$', '', text, flags=re.MULTILINE)
            text = text.strip()

            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                m = re.search(r'\{[\s\S]*\}', text)
                if m:
                    try:
                        data = json.loads(m.group())
                    except Exception as e:
                        return {
                            "error": "JSON解析失败",
                            "detail": f"{str(e)} | 原始文本: {text[:500]}"
                        }
                else:
                    return {
                        "error": "JSON解析失败",
                        "detail": f"未找到 JSON 结构 | 原始文本: {text[:500]}"
                    }

            data.setdefault("content", "")
            data.setdefault("options", None)
            data.setdefault("answer", None)
            data.setdefault("subject", "数学")
            data.setdefault("type", "解答题")
            data.setdefault("difficulty", "中档")
            data.setdefault("knowledge_points", [])
            data.setdefault("score", 3)

            data = self._postprocess_recognized(data)

            return data

        except requests.exceptions.Timeout:
            return {"error": "识别超时", "detail": "智谱 API 60秒内无响应，请换一张更清晰的图片"}
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"error": "识别失败", "detail": str(e)}

    # ===== 图片识别（整张试卷） =====
    def recognize_paper_image(self, image_base64: str, mime_type: str = "image/jpeg") -> Optional[str]:
        if not self.is_available:
            print("❌ AI 不可用")
            return None

        prompt = """你是试卷识别助手。请识别图片中的试卷内容，按顺序输出所有题目的完整文本。

**输出格式要求（务必遵守）**：
- **第 1 行必须输出：`[试卷标题：XXX]`**
  - XXX = 图片最上方、最显眼的试卷标题（如"2025年高考生物模拟卷"、"XX中学期中考试"）
  - 若图片确实没有标题，输出 `[试卷标题：未标注]`
- **第 2 行必须输出：`[考试时长：XXX分钟]`**
  - XXX = 试卷上明确标注的考试时长（如"考试时间：120分钟"中的 120）
  - 若没有明确标注，输出 `[考试时长：未标注]`

**正文要求**：
- 保留题号（如"1."、"2."）
- 保留所有选项（如"A. ... B. ... C. ... D. ..."）
- **多选题必须保留题干中的"（多选）"标记**
- **有"（X分）"标记的必须保留**
- 直接输出纯文本，不要 JSON、不要 markdown 代码块、不要额外解释
- 题目之间用空行分隔

**⭐ 关于答案的最重要规则（必须严格遵守）**：
- **只有当图片中真实存在明确的"参考答案"、"标准答案"、"答案"字样（通常是印刷的答案区）时，才在输出末尾添加"参考答案："段落。**
- **如果图片中没有任何答案区，绝对不要输出"参考答案："或任何答案列表！**
- **严禁根据题目自行推测、编造、生成答案！哪怕答案再明显也不能添加。**
- **如果你不确定图片里是否有答案区，就当作"没有"，不要输出答案。**

图片内容："""

        data_url = f"data:{mime_type};base64,{image_base64}"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.client.api_key}"
        }
        payload = {
            "model": "glm-4v-flash",
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": data_url}}
                ]
            }],
            "temperature": 0.1,
            "max_tokens": 1024
        }

        try:
            print("🖼️ 调用 GLM-4V-Flash 识别整张试卷图片...")
            response = requests.post(
                self.client.base_url,
                headers=headers,
                json=payload,
                timeout=60
            )
            if response.status_code != 200:
                print(f"❌ GLM-4V 错误: {response.status_code} - {response.text[:300]}")
                return None

            result = response.json()
            text = result["choices"][0]["message"]["content"].strip()
            print(f"📥 试卷识别返回长度: {len(text)} 字符")
            return text
        except requests.exceptions.Timeout:
            print("❌ 试卷识别超时")
            return None
        except Exception as e:
            print(f"❌ 试卷识别失败: {e}")
            return None