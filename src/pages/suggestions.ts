/**
 * LifePilot 建议页面
 * 展示 AI 生成的个性化建议
 */

import { api, Suggestion, SuggestionGroup, TodaySuggestionsResponse } from '../utils/api';

// 维度配置
const DIMENSION_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
    learning: {
        label: '学习成长',
        icon: '📚',
        color: 'primary',
        bgColor: 'rgba(13, 110, 253, 0.1)'
    },
    finance: {
        label: '理财规划',
        icon: '💰',
        color: 'success',
        bgColor: 'rgba(25, 135, 84, 0.1)'
    },
    health: {
        label: '健康管理',
        icon: '💪',
        color: 'warning',
        bgColor: 'rgba(255, 193, 7, 0.1)'
    }
};

type NavigateFunction = (page: string, params?: any) => void;

let currentSuggestions: TodaySuggestionsResponse | null = null;

/**
 * 渲染建议页面
 */
export function showSuggestionsPage(container: HTMLElement, navigate: NavigateFunction) {
    const currentDate = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
    
    container.innerHTML = `
        <div class="suggestions-page">
            <!-- 顶部导航 -->
            <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
                <div class="container">
                    <a class="navbar-brand d-flex align-items-center" href="#">
                        <i class="bi bi-arrow-left me-2" id="backBtn"></i>
                        <i class="bi bi-stars text-primary me-1"></i>
                        <span>AI 建议</span>
                    </a>
                    <button class="btn btn-sm btn-link text-decoration-none" id="historyBtn">
                        <i class="bi bi-clock-history"></i> 历史
                    </button>
                </div>
            </nav>
            
            <!-- 主内容 -->
            <main class="container py-4">
                <!-- 日期和状态 -->
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h1 class="h5 mb-1">今日建议</h1>
                        <small class="text-muted">${currentDate}</small>
                    </div>
                    <button class="btn btn-primary btn-sm" id="refreshBtn" style="display: none;">
                        <i class="bi bi-arrow-clockwise me-1"></i> 刷新
                    </button>
                </div>
                
                <!-- 加载状态 -->
                <div class="text-center py-5" id="loadingState">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">加载中...</span>
                    </div>
                    <p class="text-muted mt-3">正在分析你的记录...</p>
                </div>
                
                <!-- 无建议状态 -->
                <div class="empty-state text-center py-5" id="emptyState" style="display: none;">
                    <i class="bi bi-chat-square-text fs-1 text-muted mb-3"></i>
                    <h5 class="mb-2">暂无今日建议</h5>
                    <p class="text-muted mb-3">开始记录你的生活，获取专属 AI 建议</p>
                    <button class="btn btn-primary" id="generateBtn">
                        <i class="bi bi-magic me-1"></i> 生成今日建议
                    </button>
                </div>
                
                <!-- 建议内容 -->
                <div id="suggestionsContent" style="display: none;">
                    <div id="suggestionsList"></div>
                    
                    <!-- 生成按钮（如果今日已有建议显示此按钮） -->
                    <div class="text-center mt-4" id="generateSection" style="display: none;">
                        <button class="btn btn-outline-primary" id="regenerateBtn">
                            <i class="bi bi-magic me-1"></i> 重新生成建议
                        </button>
                    </div>
                </div>
                
                <!-- 错误状态 -->
                <div class="alert alert-danger" id="errorState" style="display: none;">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    <span id="errorMessage">加载失败，请重试</span>
                </div>
            </main>
        </div>
        
        <!-- 历史记录弹窗 -->
        <div class="modal fade" id="historyModal" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-clock-history me-2"></i>建议历史
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="historyContent">
                        <!-- 历史内容将动态加载 -->
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 绑定事件
    bindEvents(navigate);
    
    // 加载今日建议
    loadTodaySuggestions();
}

/**
 * 绑定事件
 */
function bindEvents(navigate: NavigateFunction) {
    // 返回按钮
    const backBtn = document.getElementById('backBtn');
    backBtn?.addEventListener('click', () => navigate('home'));
    
    // 历史按钮
    const historyBtn = document.getElementById('historyBtn');
    historyBtn?.addEventListener('click', () => loadHistory());
    
    // 生成按钮
    const generateBtn = document.getElementById('generateBtn');
    generateBtn?.addEventListener('click', () => generateSuggestions());
    
    // 重新生成按钮
    const regenerateBtn = document.getElementById('regenerateBtn');
    regenerateBtn?.addEventListener('click', () => generateSuggestions());
    
    // 刷新按钮
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn?.addEventListener('click', () => loadTodaySuggestions());
}

/**
 * 加载今日建议
 */
async function loadTodaySuggestions() {
    showLoading();
    
    try {
        const result = await api.getTodaySuggestions();
        
        if (result.success && result.data) {
            currentSuggestions = result.data;
            renderSuggestions(result.data);
        } else {
            showError(result.message || '加载建议失败');
        }
    } catch (error) {
        showError('网络错误，请检查后端服务');
    }
}

/**
 * 生成建议
 */
async function generateSuggestions() {
    const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
    const regenerateBtn = document.getElementById('regenerateBtn') as HTMLButtonElement;
    
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> 生成中...';
    }
    if (regenerateBtn) {
        regenerateBtn.disabled = true;
        regenerateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> 生成中...';
    }
    
    try {
        const result = await api.generateSuggestions();
        
        if (result.success) {
            // 刷新今日建议
            await loadTodaySuggestions();
            showToast('success', '建议已生成');
        } else {
            showToast('error', result.message || '生成失败');
        }
    } catch (error) {
        showToast('error', '网络错误，请重试');
    } finally {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="bi bi-magic me-1"></i> 生成今日建议';
        }
        if (regenerateBtn) {
            regenerateBtn.disabled = false;
            regenerateBtn.innerHTML = '<i class="bi bi-magic me-1"></i> 重新生成建议';
        }
    }
}

/**
 * 渲染建议
 */
function renderSuggestions(data: TodaySuggestionsResponse) {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const content = document.getElementById('suggestionsContent');
    const generateSection = document.getElementById('generateSection');
    const suggestionsList = document.getElementById('suggestionsList');
    
    loadingState!.style.display = 'none';
    
    if (!data.has_suggestions || data.suggestions_by_dimension.length === 0) {
        emptyState!.style.display = 'block';
        content!.style.display = 'none';
        return;
    }
    
    emptyState!.style.display = 'none';
    content!.style.display = 'block';
    
    // 渲染建议卡片
    let html = '';
    for (const group of data.suggestions_by_dimension) {
        const config = DIMENSION_CONFIG[group.dimension] || {
            label: group.dimension,
            icon: '📝',
            color: 'secondary',
            bgColor: 'rgba(108, 117, 125, 0.1)'
        };
        
        html += `
            <div class="suggestion-group mb-4">
                <div class="card border-0 shadow-sm">
                    <div class="card-header" style="background: ${config.bgColor}">
                        <div class="d-flex align-items-center">
                            <span class="fs-4 me-2">${config.icon}</span>
                            <h5 class="mb-0 text-${config.color}">${config.label}</h5>
                            <span class="badge bg-${config.color} ms-auto">${group.suggestions.length} 条</span>
                        </div>
                    </div>
                    <div class="card-body">
                        ${group.suggestions.map(suggestion => renderSuggestionCard(suggestion, config)).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    suggestionsList!.innerHTML = html;
    
    // 绑定反馈事件
    bindFeedbackEvents();
}

/**
 * 渲染单条建议卡片
 */
function renderSuggestionCard(suggestion: Suggestion, config: any): string {
    const isHelpful = suggestion.feedback === 'helpful';
    const isNotHelpful = suggestion.feedback === 'not_helpful';
    const priorityClass = suggestion.priority === 1 ? 'border-primary' : 
                          suggestion.priority === 2 ? 'border-info' : 'border-secondary';
    
    return `
        <div class="suggestion-item mb-3 p-3 bg-light rounded-3 ${priorityClass} border-start border-4" 
             data-suggestion-id="${suggestion.id}">
            <p class="mb-2 suggestion-content">${suggestion.content}</p>
            <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted">
                    ${suggestion.priority === 1 ? '⭐ 推荐' : suggestion.priority === 2 ? '💡 建议' : '📝 参考'}
                </small>
                <div class="feedback-buttons">
                    ${suggestion.feedback ? `
                        <span class="badge ${isHelpful ? 'bg-success' : isNotHelpful ? 'bg-secondary' : ''} me-2">
                            ${isHelpful ? '👍 有用' : isNotHelpful ? '👎 待改进' : ''}
                        </span>
                    ` : `
                        <button class="btn btn-sm btn-outline-success me-1 feedback-btn" data-feedback="helpful">
                            <i class="bi bi-hand-thumbs-up"></i> 有用
                        </button>
                        <button class="btn btn-sm btn-outline-secondary feedback-btn" data-feedback="not_helpful">
                            <i class="bi bi-hand-thumbs-down"></i> 无用
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

/**
 * 绑定反馈事件
 */
function bindFeedbackEvents() {
    const feedbackBtns = document.querySelectorAll('.feedback-btn');
    
    feedbackBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const button = btn as HTMLButtonElement;
            const suggestionId = button.closest('.suggestion-item')?.getAttribute('data-suggestion-id');
            const feedback = button.getAttribute('data-feedback') as 'helpful' | 'not_helpful';
            
            if (!suggestionId || !feedback) return;
            
            // 禁用按钮
            const allBtns = button.parentElement?.querySelectorAll('.feedback-btn');
            allBtns?.forEach(b => (b as HTMLButtonElement).disabled = true);
            
            try {
                const result = await api.submitSuggestionFeedback(suggestionId, feedback);
                
                if (result.success) {
                    showToast('success', feedback === 'helpful' ? '感谢反馈 👍' : '已记录反馈 📝');
                    // 更新UI
                    const item = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
                    if (item) {
                        const badgeHtml = feedback === 'helpful' 
                            ? '<span class="badge bg-success me-2">👍 有用</span>'
                            : '<span class="badge bg-secondary me-2">👎 待改进</span>';
                        const buttonsDiv = item.querySelector('.feedback-buttons');
                        if (buttonsDiv) {
                            buttonsDiv.innerHTML = badgeHtml;
                        }
                    }
                } else {
                    showToast('error', result.message || '提交失败');
                    // 恢复按钮
                    allBtns?.forEach(b => (b as HTMLButtonElement).disabled = false);
                }
            } catch (error) {
                showToast('error', '网络错误');
                allBtns?.forEach(b => (b as HTMLButtonElement).disabled = false);
            }
        });
    });
}

/**
 * 加载历史记录
 */
async function loadHistory() {
    const historyModal = new (window as any).bootstrap.Modal(document.getElementById('historyModal'));
    const historyContent = document.getElementById('historyContent');
    
    historyContent!.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">加载中...</span>
            </div>
        </div>
    `;
    
    historyModal.show();
    
    try {
        const result = await api.getSuggestionHistory(14); // 最近14天
        
        if (result.success && result.data) {
            renderHistory(result.data.history, historyContent!);
        } else {
            historyContent!.innerHTML = `
                <div class="alert alert-warning mb-0">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    ${result.message || '加载历史失败'}
                </div>
            `;
        }
    } catch (error) {
        historyContent!.innerHTML = `
            <div class="alert alert-danger mb-0">
                <i class="bi bi-x-circle me-2"></i>
                网络错误，请重试
            </div>
        `;
    }
}

/**
 * 渲染历史记录
 */
function renderHistory(history: any[], container: HTMLElement) {
    if (!history || history.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-inbox fs-1 text-muted mb-3"></i>
                <p class="text-muted mb-0">暂无历史建议</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    for (const day of history) {
        const date = new Date(day.date).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            weekday: 'short'
        });
        
        html += `
            <div class="history-day mb-4">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0">${date}</h6>
                    <small class="text-muted">
                        ${day.helpful_count > 0 ? `<span class="text-success">${day.helpful_count} 有用</span>` : ''}
                        ${day.not_helpful_count > 0 ? `<span class="text-secondary ms-2">${day.not_helpful_count} 待改进</span>` : ''}
                    </small>
                </div>
                <div class="list-group">
                    ${day.suggestions.map((s: Suggestion) => {
                        const config = DIMENSION_CONFIG[s.dimension] || { icon: '📝', color: 'secondary' };
                        return `
                            <div class="list-group-item list-group-item-action">
                                <div class="d-flex align-items-start">
                                    <span class="me-2">${config.icon}</span>
                                    <div class="flex-grow-1">
                                        <p class="mb-1 small">${s.content}</p>
                                        ${s.feedback ? `<small class="text-${s.feedback === 'helpful' ? 'success' : 'secondary'}">${s.feedback === 'helpful' ? '👍 有用' : '👎 无用'}</small>` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

/**
 * 显示加载状态
 */
function showLoading() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const content = document.getElementById('suggestionsContent');
    const errorState = document.getElementById('errorState');
    
    loadingState!.style.display = 'block';
    emptyState!.style.display = 'none';
    content!.style.display = 'none';
    errorState!.style.display = 'none';
}

/**
 * 显示错误状态
 */
function showError(message: string) {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const content = document.getElementById('suggestionsContent');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    
    loadingState!.style.display = 'none';
    emptyState!.style.display = 'none';
    content!.style.display = 'none';
    errorState!.style.display = 'block';
    errorMessage!.textContent = message;
}

/**
 * 显示 Toast 消息
 */
function showToast(type: 'success' | 'error', message: string) {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    // 创建容器
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(container);
    }
    
    container.appendChild(toast);
    
    const bsToast = new (window as any).bootstrap.Toast(toast);
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}
