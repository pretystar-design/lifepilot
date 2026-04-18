"""
LifePilot AI 服务
包括：内容分类、语音转文字、AI 建议生成
"""

import json
import re
from typing import Dict, List, Tuple

from app.config import settings


# ============ AI 分类服务 ============

# 关键词匹配规则 (备用方案)
CATEGORY_KEYWORDS = {
    "learning": [
        "学习", "读书", "课程", "培训", "考试", "技能", "知识",
        "学习笔记", "课程总结", "读书笔记", "技能提升", "学习计划",
        "study", "learn", "course", "book", "read", "practice",
        "Python", "编程", "开发", "代码", "教程", "文档"
    ],
    "finance": [
        "理财", "投资", "股票", "基金", "存款", "收入", "支出",
        "预算", "省钱", "赚钱", "财务", "保险", "债务", "还款",
        "finance", "money", "invest", "stock", "saving", "budget",
        "工资", "加薪", "副业", "兼职", "收入", "消费"
    ],
    "health": [
        "健康", "运动", "跑步", "健身", "减肥", "饮食", "睡眠",
        "体检", "医生", "医院", "疾病", "养生", "喝水", "休息",
        "health", "exercise", "run", "gym", "diet", "sleep",
        "瑜伽", "冥想", "早睡", "早起", "锻炼", "身体"
    ]
}


def keyword_classify(content: str) -> Tuple[str, List[str], float]:
    """
    基于关键词的简单分类
    用于 AI API 不可用时的回退方案
    
    Args:
        content: 待分类内容
        
    Returns:
        (category, tags, confidence)
    """
    content_lower = content.lower()
    
    # 统计每个分类的关键词匹配数
    scores = {}
    matched_tags = {}
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        scores[category] = 0
        matched_tags[category] = []
        
        for keyword in keywords:
            # 计算关键词出现次数
            count = content_lower.count(keyword.lower())
            if count > 0:
                scores[category] += count
                matched_tags[category].append(keyword)
    
    # 找出最高分类
    if not scores or max(scores.values()) == 0:
        # 没有匹配到任何关键词，默认为 learning
        return "learning", [], 0.5
    
    best_category = max(scores, key=scores.get)
    confidence = min(scores[best_category] / 3.0, 0.9)  # 限制置信度上限
    
    return best_category, matched_tags[best_category][:5], confidence


async def classify_content(content: str) -> Dict:
    """
    使用 AI 对内容进行分类
    
    优先级:
    1. 调用 OpenAI/DeepSeek API (如果配置了 API key)
    2. 关键词匹配 (回退方案)
    
    Args:
        content: 待分类内容 (最多 2000 字符)
        
    Returns:
        {
            "category": "learning" | "finance" | "health",
            "tags": ["tag1", "tag2"],
            "confidence": 0.85,
            "need_manual": False
        }
    """
    # 截断过长内容
    content = content[:2000]
    
    # 检查是否配置了 AI API key
    ai_api_key = getattr(settings, 'OPENAI_API_KEY', None) or getattr(settings, 'DEEPSEEK_API_KEY', None)
    
    if not ai_api_key:
        # 使用关键词匹配
        category, tags, confidence = keyword_classify(content)
        return {
            "category": category,
            "tags": tags,
            "confidence": confidence,
            "need_manual": confidence < 0.7
        }
    
    # 调用 AI API
    try:
        result = await call_ai_classify(content, ai_api_key)
        return result
    except Exception as e:
        print(f"AI 分类失败: {e}, 使用关键词匹配回退")
        category, tags, confidence = keyword_classify(content)
        return {
            "category": category,
            "tags": tags,
            "confidence": confidence,
            "need_manual": confidence < 0.7
        }


async def call_ai_classify(content: str, api_key: str) -> Dict:
    """
    调用 AI API 进行内容分类
    
    Args:
        content: 待分类内容
        api_key: API key
        
    Returns:
        分类结果
    """
    import httpx
    
    # 构建提示词
    prompt = f"""分析以下生活记录内容，提取分类和标签。

内容:
{content}

要求:
1. 分类只能是以下三种之一: learning (学习成长)、finance (理财规划)、health (健康管理)
2. 根据内容选择最合适的分类
3. 提取 1-5 个相关标签
4. 判断置信度(0-1)

请以 JSON 格式返回:
{{
    "category": "learning|finance|health",
    "tags": ["标签1", "标签2"],
    "confidence": 0.85
}}

只返回 JSON，不要有其他内容。"""
    
    # 判断使用哪个 API
    if 'OPENAI' in str(type(api_key)) or 'sk-' in api_key[:5]:
        # OpenAI API
        api_url = "https://api.openai.com/v1/chat/completions"
        model = "gpt-3.5-turbo"
    else:
        # DeepSeek API
        api_url = "https://api.deepseek.com/v1/chat/completions"
        model = "deepseek-chat"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            api_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"API 返回错误: {response.status_code}")
        
        result = response.json()
        content_text = result["choices"][0]["message"]["content"]
        
        # 解析 JSON 响应
        # 尝试提取 JSON 部分
        json_match = re.search(r'\{[\s\S]*\}', content_text)
        if json_match:
            data = json.loads(json_match.group())
        else:
            data = json.loads(content_text)
        
        return {
            "category": data.get("category", "learning"),
            "tags": data.get("tags", []),
            "confidence": data.get("confidence", 0.8),
            "need_manual": data.get("confidence", 0.8) < 0.7
        }


# ============ 语音转文字服务 ============

async def transcribe_audio(audio_data: bytes, filename: str = "audio.webm") -> Dict:
    """
    语音转文字
    
    优先级:
    1. 调用 OpenAI Whisper API (如果配置了 API key)
    2. 返回模拟文字 (开发环境)
    
    Args:
        audio_data: 音频文件数据
        filename: 文件名
        
    Returns:
        {
            "text": "转写文字",
            "duration": 15.5
        }
    """
    # 检查是否配置了 Whisper API key
    whisper_key = getattr(settings, 'OPENAI_API_KEY', None)
    
    if not whisper_key:
        # 开发环境返回模拟数据
        return await simulate_transcribe()
    
    # 调用 Whisper API
    try:
        return await call_whisper_api(audio_data, filename, whisper_key)
    except Exception as e:
        print(f"语音转文字失败: {e}, 使用模拟数据")
        return await simulate_transcribe()


async def simulate_transcribe() -> Dict:
    """
    模拟语音转文字结果
    用于开发/测试环境
    """
    import random
    
    samples = [
        "今天学习了 Python 编程基础，掌握了变量和数据类型的用法。",
        "今天去健身房锻炼了半小时，跑步机上跑了 20 分钟。",
        "记录一下今天的开支：午餐 35 元，咖啡 25 元，交通 10 元。",
        "读完了《原子习惯》这本书，学到了很多关于习惯养成的技巧。",
        "今天做了体检，身体各项指标都很正常，继续保持健康生活。",
        "学习了两个小时的机器学习课程，主要讲了监督学习和无监督学习的区别。",
        "今天尝试了一个新的投资理财方法，把一部分存款放入了指数基金。",
        "晚上做了半小时瑜伽，感觉身心都放松了很多，睡眠质量也提高了。"
    ]
    
    return {
        "text": random.choice(samples),
        "duration": random.uniform(5.0, 30.0)
    }


async def call_whisper_api(audio_data: bytes, filename: str, api_key: str) -> Dict:
    """
    调用 OpenAI Whisper API 进行语音转文字
    
    Args:
        audio_data: 音频文件数据
        filename: 文件名
        api_key: API key
        
    Returns:
        转写结果
    """
    import httpx
    
    # 根据文件扩展名确定 MIME 类型
    ext = filename.split('.')[-1].lower()
    mime_types = {
        "webm": "audio/webm",
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "m4a": "audio/mp4",
        "ogg": "audio/ogg"
    }
    mime_type = mime_types.get(ext, "audio/webm")
    
    # 构建文件数据
    files = {
        "file": (filename, audio_data, mime_type),
        "model": (None, "whisper-1"),
        "language": (None, "zh"),
        "response_format": (None, "verbose_json")
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers=headers,
            files=files
        )
        
        if response.status_code != 200:
            raise Exception(f"Whisper API 返回错误: {response.status_code}")
        
        result = response.json()
        
        return {
            "text": result.get("text", ""),
            "duration": result.get("duration")
        }


# ============ AI 建议生成服务 ============

DIMENSION_CONFIG = {
    "learning": {
        "label": "学习成长",
        "icon": "📚",
        "keywords": ["学习", "读书", "课程", "考试", "技能", "知识", "培训", "编程", "Python"]
    },
    "finance": {
        "label": "理财规划",
        "icon": "💰",
        "keywords": ["理财", "投资", "股票", "基金", "存款", "收入", "支出", "预算", "省钱"]
    },
    "health": {
        "label": "健康管理",
        "icon": "💪",
        "keywords": ["运动", "跑步", "健身", "减肥", "饮食", "睡眠", "健康", "体检", "休息"]
    }
}

MOCK_SUGGESTIONS = {
    "learning": [
        {"content": "今天没有学习记录，建议安排30分钟阅读或在线课程", "priority": 1},
        {"content": "你最近学习频率不错，可以尝试写学习笔记加深记忆", "priority": 2},
        {"content": "建议设立每周学习目标，追踪进度更有动力", "priority": 3}
    ],
    "finance": [
        {"content": "今天没有财务记录，建议记账了解消费情况", "priority": 1},
        {"content": "建议养成每月储蓄收入10%的好习惯", "priority": 2},
        {"content": "可以开始学习基础投资知识，为未来做准备", "priority": 3}
    ],
    "health": [
        {"content": "今天没有健康记录，建议做些伸展运动", "priority": 1},
        {"content": "保持规律作息对健康很重要，今晚早点休息吧", "priority": 2},
        {"content": "建议每天喝够8杯水，记得照顾好自己", "priority": 3}
    ]
}


async def analyze_user_records(records: list) -> Dict:
    """
    分析用户记录，生成统计信息
    
    Args:
        records: 用户记录列表
        
    Returns:
        分析结果统计
    """
    if not records:
        return {
            "total_count": 0,
            "dimension_counts": {"learning": 0, "finance": 0, "health": 0},
            "avg_per_day": 0,
            "dimension_details": {}
        }
    
    dimension_counts = {"learning": 0, "finance": 0, "health": 0}
    dimension_contents = {"learning": [], "finance": [], "health": []}
    
    for record in records:
        cat = record.get("category", "learning")
        if cat in dimension_counts:
            dimension_counts[cat] += 1
            content = record.get("content", "")[:200]
            if content:
                dimension_contents[cat].append(content)
    
    # 计算每日平均
    if records:
        dates = set()
        for r in records:
            if r.get("created_at"):
                date = r["created_at"][:10]
                dates.add(date)
        avg_per_day = len(records) / max(len(dates), 1)
    else:
        avg_per_day = 0
    
    return {
        "total_count": len(records),
        "dimension_counts": dimension_counts,
        "avg_per_day": round(avg_per_day, 1),
        "dimension_details": dimension_contents
    }


async def generate_suggestions(user_records: list, dimensions: list = None) -> List[Dict]:
    """
    基于用户记录生成个性化建议
    
    优先级:
    1. 调用 OpenAI/DeepSeek API (如果配置了 API key)
    2. 使用模拟建议 (开发环境)
    
    Args:
        user_records: 用户最近7天的记录
        dimensions: 要生成的维度列表，默认 ['learning', 'finance', 'health']
        
    Returns:
        建议列表
    """
    if dimensions is None:
        dimensions = ["learning", "finance", "health"]
    
    # 分析用户记录
    analysis = await analyze_user_records(user_records)
    
    # 检查是否配置了 AI API key
    ai_api_key = getattr(settings, 'OPENAI_API_KEY', None) or getattr(settings, 'DEEPSEEK_API_KEY', None)
    
    if not ai_api_key:
        # 使用模拟建议
        return await generate_mock_suggestions(analysis, dimensions)
    
    # 调用 AI API 生成建议
    try:
        return await call_ai_suggestions(analysis, dimensions, ai_api_key)
    except Exception as e:
        print(f"AI 建议生成失败: {e}, 使用模拟建议")
        return await generate_mock_suggestions(analysis, dimensions)


async def generate_mock_suggestions(analysis: Dict, dimensions: list) -> List[Dict]:
    """
    生成模拟建议 (开发环境)
    基于用户记录分析生成基础建议
    """
    suggestions = []
    
    for dimension in dimensions:
        config = DIMENSION_CONFIG.get(dimension, {})
        count = analysis["dimension_counts"].get(dimension, 0)
        mock_items = MOCK_SUGGESTIONS.get(dimension, [])
        
        if count == 0:
            # 用户没有任何该维度的记录
            for i, item in enumerate(mock_items[:2]):
                suggestions.append({
                    "dimension": dimension,
                    "content": item["content"],
                    "priority": item["priority"]
                })
        elif count < 3:
            # 记录较少
            suggestions.append({
                "dimension": dimension,
                "content": mock_items[0]["content"],
                "priority": 1
            })
        else:
            # 记录充足，给出进阶建议
            suggestions.append({
                "dimension": dimension,
                "content": mock_items[1]["content"],
                "priority": 2
            })
    
    return suggestions


async def call_ai_suggestions(analysis: Dict, dimensions: list, api_key: str) -> List[Dict]:
    """
    调用 AI API 生成建议
    
    Args:
        analysis: 用户记录分析结果
        dimensions: 要生成的维度列表
        api_key: API key
        
    Returns:
        建议列表
    """
    import httpx
    
    # 构建提示词
    dimension_str = "\n".join([
        f"- {DIMENSION_CONFIG[d]['label']} ({d})" 
        for d in dimensions if d in DIMENSION_CONFIG
    ])
    
    stats_str = f"""用户近7天记录统计:
- 总记录数: {analysis['total_count']}
- 每日平均: {analysis['avg_per_day']} 条
- 各维度记录数: 学习 {analysis['dimension_counts']['learning']}, 理财 {analysis['dimension_counts']['finance']}, 健康 {analysis['dimension_counts']['health']}
"""
    
    prompt = f"""作为 LifePilot 智能助手，基于用户的日常记录生成个性化建议。

{stats_str}

请为以下维度生成1-2条建议:
{ dimension_str }

要求:
1. 建议要具体、可执行
2. 要结合用户实际记录内容，不要泛泛而谈
3. 语气亲切自然，像朋友给出的建议
4. 每个维度1-2条建议
5. 返回JSON数组格式

返回格式:
[
    {{"dimension": "learning", "content": "建议内容...", "priority": 1}},
    {{"dimension": "finance", "content": "建议内容...", "priority": 1}}
]

只返回JSON，不要有其他内容。"""
    
    # 判断使用哪个 API
    if 'sk-' in api_key[:5]:
        api_url = "https://api.openai.com/v1/chat/completions"
        model = "gpt-3.5-turbo"
    else:
        api_url = "https://api.deepseek.com/v1/chat/completions"
        model = "deepseek-chat"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            api_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"API 返回错误: {response.status_code}")
        
        result = response.json()
        content_text = result["choices"][0]["message"]["content"]
        
        # 解析 JSON 响应
        json_match = re.search(r'\[[\s\S]*\]', content_text)
        if json_match:
            data = json.loads(json_match.group())
        else:
            data = json.loads(content_text)
        
        return data
