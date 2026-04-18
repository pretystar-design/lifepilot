/**
 * LifePilot API 客户端
 * 处理所有与后端的 HTTP 通信
 */

const API_BASE_URL = 'http://localhost:8000';

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    detail?: string;
}

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
}

// ============ 类型定义 ============

/** 记录分类 */
export type RecordCategory = 'learning' | 'finance' | 'health';

/** 记录对象 */
export interface Record {
    id: string;
    user_id: string;
    title?: string;
    content: string;
    category: RecordCategory;
    tags: string[];
    audio_url?: string;
    confidence: number;
    created_at: string;
    updated_at: string;
}

/** 记录列表响应 */
export interface RecordListResponse {
    records: Record[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

/** 分类响应 */
export interface ClassifyResponse {
    category: RecordCategory;
    tags: string[];
    confidence: number;
    need_manual: boolean;
}

/** 统计信息 */
export interface RecordStats {
    total: number;
    category_stats: {
        learning: number;
        finance: number;
        health: number;
    };
    week_count: number;
    streak_days: number;
}

// ============ 建议相关类型 ============

/** 建议对象 */
export interface Suggestion {
    id: string;
    user_id: string;
    date: string;
    dimension: RecordCategory;
    content: string;
    priority: number;
    feedback?: 'helpful' | 'not_helpful' | null;
    feedback_at?: string | null;
    created_at: string;
}

/** 建议分组 */
export interface SuggestionGroup {
    dimension: RecordCategory;
    dimension_label: string;
    icon: string;
    suggestions: Suggestion[];
}

/** 今日建议响应 */
export interface TodaySuggestionsResponse {
    date: string;
    has_suggestions: boolean;
    suggestions_by_dimension: SuggestionGroup[];
    total_count: number;
}

/** 建议历史项 */
export interface SuggestionHistoryItem {
    date: string;
    total_count: number;
    helpful_count: number;
    not_helpful_count: number;
    suggestions: Suggestion[];
}

/** 建议历史响应 */
export interface SuggestionHistoryResponse {
    history: SuggestionHistoryItem[];
    total_days: number;
}

/** 生成建议响应 */
export interface GenerateSuggestionsResponse {
    success: boolean;
    message: string;
    suggestions: Suggestion[];
}

/** 创建记录参数 */
export interface CreateRecordParams {
    title?: string;
    content: string;
    category?: RecordCategory;
    tags?: string[];
    audio_url?: string;
    confidence?: number;
}

/** 更新记录参数 */
export interface UpdateRecordParams {
    title?: string;
    content?: string;
    category?: RecordCategory;
    tags?: string[];
    audio_url?: string;
}

/**
 * 通用请求函数
 */
async function request<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {} } = options;
    
    // 获取 Token
    const token = localStorage.getItem('lifepilot_token');
    
    // 构建请求头
    const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers
    };
    
    // 添加认证 Token
    if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers: requestHeaders,
            body: body ? JSON.stringify(body) : undefined
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return {
                success: false,
                message: data.detail || data.message || '请求失败',
                detail: data.detail
            };
        }
        
        return {
            success: true,
            data
        };
    } catch (error) {
        console.error('API Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : '网络错误，请检查后端服务是否启动'
        };
    }
}

/**
 * 上传文件的请求函数
 */
async function uploadFile<T>(
    endpoint: string,
    file: File,
    fieldName: string = 'file'
): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('lifepilot_token');
    
    const formData = new FormData();
    formData.append(fieldName, file);
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return {
                success: false,
                message: data.detail || data.message || '上传失败',
                detail: data.detail
            };
        }
        
        return {
            success: true,
            data
        };
    } catch (error) {
        console.error('Upload Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : '上传失败'
        };
    }
}

/**
 * API 对象 - 导出所有 API 方法
 */
export const api = {
    // ============ 认证相关 ============
    
    /**
     * 发送验证码
     */
    sendSms: (phone: string) => {
        return request<{ success: boolean; message: string; code?: string }>(
            '/api/auth/send-sms',
            {
                method: 'POST',
                body: { phone }
            }
        );
    },
    
    /**
     * 用户注册
     */
    register: (phone: string, code: string) => {
        return request<{
            access_token: string;
            token_type: string;
            user: any;
        }>(
            '/api/auth/register',
            {
                method: 'POST',
                body: { phone, code }
            }
        );
    },
    
    /**
     * 用户登录
     */
    login: (phone: string, code: string) => {
        return request<{
            access_token: string;
            token_type: string;
            user: any;
        }>(
            '/api/auth/login',
            {
                method: 'POST',
                body: { phone, code }
            }
        );
    },
    
    /**
     * 微信登录（预留接口）
     */
    wechatLogin: (code: string, nickname?: string, avatarUrl?: string) => {
        return request<{
            access_token: string;
            token_type: string;
            user: any;
        }>(
            '/api/auth/wechat-login',
            {
                method: 'POST',
                body: { code, nickname, avatar_url: avatarUrl }
            }
        );
    },
    
    /**
     * 获取当前用户信息
     */
    getCurrentUser: () => {
        return request<any>('/api/auth/me');
    },
    
    /**
     * 更新用户资料
     */
    updateProfile: (data: {
        nickname?: string;
        avatar_url?: string;
        dimensions?: string[];
        onboarding_completed?: boolean;
    }) => {
        return request<any>('/api/auth/profile', {
            method: 'PUT',
            body: data
        });
    },
    
    /**
     * 退出登录
     */
    logout: () => {
        return request('/api/auth/logout', { method: 'POST' });
    },
    
    // ============ 记录相关 ============
    
    /**
     * 创建记录
     */
    createRecord: (params: CreateRecordParams) => {
        return request<Record>(
            '/api/records',
            {
                method: 'POST',
                body: params
            }
        );
    },
    
    /**
     * 获取记录列表
     */
    getRecords: (params?: {
        page?: number;
        page_size?: number;
        category?: RecordCategory;
        keyword?: string;
    }) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.page_size) searchParams.set('page_size', String(params.page_size));
        if (params?.category) searchParams.set('category', params.category);
        if (params?.keyword) searchParams.set('keyword', params.keyword);
        
        const query = searchParams.toString();
        return request<RecordListResponse>(
            `/api/records${query ? `?${query}` : ''}`
        );
    },
    
    /**
     * 获取记录详情
     */
    getRecord: (id: string) => {
        return request<Record>(`/api/records/${id}`);
    },
    
    /**
     * 更新记录
     */
    updateRecord: (id: string, params: UpdateRecordParams) => {
        return request<Record>(`/api/records/${id}`, {
            method: 'PUT',
            body: params
        });
    },
    
    /**
     * 删除记录
     */
    deleteRecord: (id: string) => {
        return request<{ success: boolean; message: string }>(
            `/api/records/${id}`,
            { method: 'DELETE' }
        );
    },
    
    /**
     * AI 分类
     */
    classifyContent: (content: string) => {
        return request<ClassifyResponse>('/api/records/classify', {
            method: 'POST',
            body: { content }
        });
    },
    
    /**
     * 上传音频文件
     */
    uploadAudio: (file: File) => {
        return uploadFile<{ success: boolean; audio_url: string; filename: string }>(
            '/api/records/upload/audio',
            file
        );
    },
    
    /**
     * 语音转文字
     */
    transcribeAudio: (file: File) => {
        return uploadFile<{ text: string; duration?: number }>(
            '/api/records/transcribe',
            file
        );
    },
    
    /**
     * 获取记录统计
     */
    getRecordStats: () => {
        return request<RecordStats>('/api/records/stats/summary');
    },
    
    // ============ 建议相关 ============
    
    /**
     * 生成今日建议
     */
    generateSuggestions: () => {
        return request<GenerateSuggestionsResponse>('/api/suggestions/generate', {
            method: 'POST'
        });
    },
    
    /**
     * 获取今日建议
     */
    getTodaySuggestions: () => {
        return request<TodaySuggestionsResponse>('/api/suggestions/today');
    },
    
    /**
     * 获取建议历史
     */
    getSuggestionHistory: (days: number = 7) => {
        return request<SuggestionHistoryResponse>(
            `/api/suggestions/history?days=${days}`
        );
    },
    
    /**
     * 提交建议反馈
     */
    submitSuggestionFeedback: (suggestionId: string, feedback: 'helpful' | 'not_helpful') => {
        return request<{ success: boolean; message: string }>(
            `/api/suggestions/${suggestionId}/feedback`,
            {
                method: 'POST',
                body: { feedback }
            }
        );
    }
};
