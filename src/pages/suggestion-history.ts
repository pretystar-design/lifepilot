/**
 * LifePilot 建议历史页面
 * 按日期分组展示历史建议，支持维度筛选
 */

import { api, Suggestion, SuggestionHistoryResponse, SuggestionHistoryItem } from '../utils/api';

type NavigateFunction = (page: string) => void;

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

// 所有维度选项
const ALL_DIMENSIONS = ['learning', 'finance', 'health'];

// 当前筛选状态
let currentFilter: string[] = ALL_DIMENSIONS.slice();
let currentHistory: SuggestionHistoryItem[] = [];
let days: number = 14; // 默认显示14天

/**
 * 渲染建议历史页面
 */
export function showSuggestionHistoryPage(container: HTMLElement, navigate: NavigateFunction) {
    container.innerHTML = `
        <div class="suggestion-history-page">
            <!-- 顶部导航 -->
            <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
                <div class="container">
                    <a class="navbar-brand d-flex align-items-center" href="#">
                        <i class="bi bi-arrow-left me-2" id="backBtn"></i>
                        <i class="bi bi-clock-history text-primary me-1"></i>
                        <span>建议历史</span>
                    </a>
                </div>
            </nav>
            
            <!-- 主内容 -->
            <main class="container py-4">
                <!-- 时间范围选择 -->
                <div class="time-range-section mb-4">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h5 class="mb-0">
                                    <i class="bi bi-calendar-range me-2"></i>时间范围
                                </h5>
                            </div>
                            <div class="btn-group w-100" role="group">
                                <button type="button" class="btn ${days === 7 ? 'btn-primary' : 'btn-outline-primary'}" data-days="7">
                                    最近7天
                                </button>
                                <button type="button" class="btn ${days === 14 ? 'btn-primary' : 'btn-outline-primary'}" data-days="14">
                                    最近14天
                                </button>
                                <button type="button" class="btn ${days === 30 ? 'btn-primary' : 'btn-outline-primary'}" data-days="30">
                                    最近30天
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 维度筛选 -->
                <div class="filter-section mb-4">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h5 class="mb-0">
                                    <i class="bi bi-funnel me-2"></i>维度筛选
                                </h5>
                                <button class="btn btn-sm btn-link" id="toggleAllBtn">显示全部</button>
                            </div>
                            <div class="dimension-filters">
                                ${ALL_DIMENSIONS.map(dim => {
                                    const config = DIMENSION_CONFIG[dim];
                                    return `
                                        <div class="form-check form-check-inline">
                                            <input class="form-check-input dimension-check" 
                                                   type="checkbox" 
                                                   value="${dim}" 
                                                   id="filter-${dim}"
                                                   checked>
                                            <label class="form-check-label" for="filter-${dim}">
                                                <span class="me-1">${config.icon}</span>${config.label}
                                            </label>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 统计概览 -->
                <div class="stats-overview mb-4" id="statsOverview" style="display: none;">
                    <div class="row g-3">
                        <div class="col-4">
                            <div class="card bg-primary text-white">
                                <div class="card-body text-center py-3">
                                    <div class="h4 mb-0" id="totalDays">0</div>
                                    <small>历史天数</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="card bg-success text-white">
                                <div class="card-body text-center py-3">
                                    <div class="h4 mb-0" id="totalHelpful">0</div>
                                    <small>认为有用</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="card bg-secondary text-white">
                                <div class="card-body text-center py-3">
                                    <div class="h4 mb-0" id="totalSuggestions">0</div>
                                    <small>总建议数</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 加载状态 -->
                <div class="text-center py-5" id="loadingState">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">加载中...</span>
                    </div>
                    <p class="text-muted mt-3">正在加载历史建议...</p>
                </div>
                
                <!-- 空状态 -->
                <div class="empty-state text-center py-5" id="emptyState" style="display: none;">
                    <i class="bi bi-inbox fs-1 text-muted mb-3"></i>
                    <h5 class="mb-2">暂无历史建议</h5>
                    <p class="text-muted mb-3">开始记录生活并获取 AI 建议</p>
                    <button class="btn btn-primary" id="startRecordBtn">
                        <i class="bi bi-plus-lg me-1"></i> 去记录
                    </button>
                </div>
                
                <!-- 历史内容 -->
                <div class="history-content" id="historyContent" style="display: none;">
                    <div id="historyList"></div>
                </div>
                
                <!-- 错误状态 -->
                <div class="alert alert-danger" id="errorState" style="display: none;">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    <span id="errorMessage">加载失败，请重试</span>
                </div>
            </main>
        </div>
    `;
    
    // 绑定事件
    bindEvents(container, navigate);
    
    // 加载历史数据
    loadHistory();
}

/**
 * 绑定事件
 */
function bindEvents(container: HTMLElement, navigate: NavigateFunction) {
    // 返回按钮
    const backBtn = container.querySelector('#backBtn');
    backBtn?.addEventListener('click', () => navigate('suggestions'));
    
    // 时间范围按钮
    const dayBtns = container.querySelectorAll('[data-days]');
    dayBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLButtonElement;
            days = parseInt(target.getAttribute('data-days') || '14');
            
            // 更新按钮样式
            dayBtns.forEach(b => {
                b.classList.remove('btn-primary');
                b.classList.add('btn-outline-primary');
            });
            target.classList.remove('btn-outline-primary');
            target.classList.add('btn-primary');
            
            // 重新加载
            loadHistory();
        });
    });
    
    // 维度筛选复选框
    const dimensionChecks = container.querySelectorAll('.dimension-check');
    dimensionChecks.forEach(check => {
        check.addEventListener('change', () => {
            currentFilter = Array.from(dimensionChecks)
                .filter(c => (c as HTMLInputElement).checked)
                .map(c => (c as HTMLInputElement).value);
            
            // 重新渲染
            renderHistory();
        });
    });
    
    // 切换全部按钮
    const toggleAllBtn = container.querySelector('#toggleAllBtn');
    toggleAllBtn?.addEventListener('click', () => {
        const allChecked = currentFilter.length === ALL_DIMENSIONS.length;
        dimensionChecks.forEach(c => {
            (c as HTMLInputElement).checked = !allChecked;
        });
        currentFilter = allChecked ? [] : ALL_DIMENSIONS.slice();
        renderHistory();
    });
    
    // 开始记录按钮
    const startRecordBtn = container.querySelector('#startRecordBtn');
    startRecordBtn?.addEventListener('click', () => navigate('records'));
}

/**
 * 加载历史建议
 */
async function loadHistory() {
    showLoading();
    
    try {
        const result = await api.getSuggestionHistory(days);
        
        if (result.success && result.data) {
            currentHistory = result.data.history;
            renderHistory();
            updateStats(result.data);
        } else {
            showError(result.message || '加载历史失败');
        }
    } catch (error) {
        showError('网络错误，请检查后端服务');
    }
}

/**
 * 渲染历史列表
 */
function renderHistory() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const historyContent = document.getElementById('historyContent');
    const errorState = document.getElementById('errorState');
    const historyList = document.getElementById('historyList');
    
    loadingState!.style.display = 'none';
    errorState!.style.display = 'none';
    
    // 根据筛选过滤历史
    const filteredHistory = currentHistory
        .map(day => ({
            ...day,
            suggestions: day.suggestions.filter(s => currentFilter.includes(s.dimension))
        }))
        .filter(day => day.suggestions.length > 0);
    
    if (filteredHistory.length === 0) {
        emptyState!.style.display = 'block';
        historyContent!.style.display = 'none';
        return;
    }
    
    emptyState!.style.display = 'none';
    historyContent!.style.display = 'block';
    
    let html = '';
    
    for (const day of filteredHistory) {
        const date = new Date(day.date).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        
        // 按维度分组当天的建议
        const byDimension: Record<string, Suggestion[]> = {};
        for (const s of day.suggestions) {
            if (!byDimension[s.dimension]) {
                byDimension[s.dimension] = [];
            }
            byDimension[s.dimension].push(s);
        }
        
        html += `
            <div class="history-day mb-4">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-light">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">
                                <i class="bi bi-calendar-event me-2"></i>${date}
                            </h5>
                            <div class="text-muted">
                                ${day.helpful_count > 0 ? `<span class="badge bg-success me-1">${day.helpful_count} 有用</span>` : ''}
                                ${day.not_helpful_count > 0 ? `<span class="badge bg-secondary">${day.not_helpful_count} 待改进</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="card-body p-0">
                        ${Object.entries(byDimension).map(([dim, suggestions]) => {
                            const config = DIMENSION_CONFIG[dim] || { icon: '📝', label: dim, color: 'secondary' };
                            return `
                                <div class="dimension-group mb-3">
                                    <div class="px-3 pt-3 pb-2" style="background: ${config.bgColor}">
                                        <span class="me-2">${config.icon}</span>
                                        <span class="text-${config.color} fw-bold">${config.label}</span>
                                    </div>
                                    <div class="list-group list-group-flush">
                                        ${suggestions.map(s => renderSuggestionItem(s)).join('')}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    historyList!.innerHTML = html;
}

/**
 * 渲染单条建议
 */
function renderSuggestionItem(suggestion: Suggestion): string {
    const priorityClass = suggestion.priority === 1 ? 'border-primary' : 
                          suggestion.priority === 2 ? 'border-info' : 'border-secondary';
    
    const isHelpful = suggestion.feedback === 'helpful';
    const isNotHelpful = suggestion.feedback === 'not_helpful';
    
    return `
        <div class="list-group-item suggestion-item ${priorityClass} border-start border-4">
            <div class="d-flex justify-content-between align-items-start">
                <div class="suggestion-content me-3">
                    <p class="mb-1">${suggestion.content}</p>
                    <small class="text-muted">
                        ${suggestion.priority === 1 ? '⭐ 推荐' : suggestion.priority === 2 ? '💡 建议' : '📝 参考'}
                    </small>
                </div>
                <div class="feedback-badge">
                    ${isHelpful ? '<span class="badge bg-success">👍 有用</span>' : ''}
                    ${isNotHelpful ? '<span class="badge bg-secondary">👎 待改进</span>' : ''}
                    ${!suggestion.feedback ? '<span class="badge bg-light text-muted">未反馈</span>' : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * 更新统计信息
 */
function updateStats(data: SuggestionHistoryResponse) {
    const statsOverview = document.getElementById('statsOverview');
    const totalDaysEl = document.getElementById('totalDays');
    const totalHelpfulEl = document.getElementById('totalHelpful');
    const totalSuggestionsEl = document.getElementById('totalSuggestions');
    
    if (statsOverview) {
        statsOverview.style.display = 'block';
        
        let totalHelpful = 0;
        let totalSuggestions = 0;
        
        for (const day of data.history) {
            totalHelpful += day.helpful_count;
            totalSuggestions += day.total_count;
        }
        
        if (totalDaysEl) totalDaysEl.textContent = String(data.total_days);
        if (totalHelpfulEl) totalHelpfulEl.textContent = String(totalHelpful);
        if (totalSuggestionsEl) totalSuggestionsEl.textContent = String(totalSuggestions);
    }
}

/**
 * 显示加载状态
 */
function showLoading() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const historyContent = document.getElementById('historyContent');
    const errorState = document.getElementById('errorState');
    
    loadingState!.style.display = 'block';
    emptyState!.style.display = 'none';
    historyContent!.style.display = 'none';
    errorState!.style.display = 'none';
}

/**
 * 显示错误状态
 */
function showError(message: string) {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const historyContent = document.getElementById('historyContent');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    
    loadingState!.style.display = 'none';
    emptyState!.style.display = 'none';
    historyContent!.style.display = 'none';
    errorState!.style.display = 'block';
    if (errorMessage) errorMessage.textContent = message;
}
