/**
 * LifePilot 首页/仪表盘
 */

import { api, RecordCategory } from '../utils/api';
import { auth } from '../utils/auth';

// 引入 toast 工具
declare const lifepilotToast: any;

type NavigateFunction = (page: string) => void;

const CATEGORIES: { value: RecordCategory; label: string; icon: string; color: string }[] = [
    { value: 'learning', label: '学习', icon: '📚', color: 'primary' },
    { value: 'finance', label: '理财', icon: '💰', color: 'success' },
    { value: 'health', label: '健康', icon: '💪', color: 'warning' }
];

/**
 * 渲染首页
 */
export function showHomePage(container: HTMLElement, navigate: NavigateFunction) {
    const currentUser = auth.getCurrentUser();
    
    container.innerHTML = `
        <div class="home-page">
            <!-- 顶部导航 -->
            <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
                <div class="container">
                    <a class="navbar-brand d-flex align-items-center" href="#">
                        <i class="bi bi-rocket-takeoff text-primary me-2"></i>
                        <span>LifePilot</span>
                    </a>
                    <div class="d-flex align-items-center gap-2">
                        <button class="btn btn-primary" id="goToRecordsBtn">
                            <i class="bi bi-pencil-square me-1"></i> 记录
                        </button>
                        <!-- 用户头像 -->
                        <div class="dropdown">
                            <button class="btn btn-link text-dark dropdown-toggle" 
                                    type="button" 
                                    data-bs-toggle="dropdown">
                                <i class="bi bi-person-circle fs-4"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li>
                                    <span class="dropdown-item-text">
                                        <small class="text-muted">${currentUser?.phone || ''}</small>
                                        <div class="fw-bold">${currentUser?.nickname || '用户'}</div>
                                    </span>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li>
                                    <button class="dropdown-item" id="logoutBtn">
                                        <i class="bi bi-box-arrow-right me-2"></i>
                                        退出登录
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </nav>
            
            <!-- 主内容 -->
            <main class="container py-4">
                <!-- 欢迎信息 -->
                <div class="welcome-section mb-4">
                    <h2 class="h4 mb-1">你好，${currentUser?.nickname || '用户'} 👋</h2>
                    <p class="text-muted mb-0">今天想记录点什么？</p>
                </div>
                
                <!-- 快速记录卡片 -->
                <div class="quick-record-card mb-4">
                    <div class="card">
                        <div class="card-body">
                            <div class="input-group">
                                <input type="text" 
                                       class="form-control form-control-lg" 
                                       placeholder="快速记录..." 
                                       id="quickRecordInput">
                                <button class="btn btn-primary px-4" type="button" id="quickRecordBtn">
                                    <i class="bi bi-lightning-charge"></i>
                                </button>
                                <button class="btn btn-outline-primary px-3" type="button" id="fullRecordBtn">
                                    <i class="bi bi-pencil-square"></i>
                                </button>
                            </div>
                            <small class="text-muted mt-2 d-block">输入内容自动分类，完整记录可添加标签</small>
                        </div>
                    </div>
                </div>
                
                <!-- 统计卡片 -->
                <div class="stats-section mb-4">
                    <h3 class="h6 mb-3 text-muted">本周数据概览</h3>
                    <div class="row g-3" id="statsCards">
                        <div class="col-4">
                            <div class="card bg-primary text-white">
                                <div class="card-body text-center py-3">
                                    <div class="h3 mb-0" id="totalRecords">--</div>
                                    <small>总记录</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="card bg-success text-white">
                                <div class="card-body text-center py-3">
                                    <div class="h3 mb-0" id="streakDays">--</div>
                                    <small>连续天数</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="card bg-warning text-dark">
                                <div class="card-body text-center py-3">
                                    <div class="h3 mb-0" id="weekCount">--</div>
                                    <small>本周记录</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- 分类统计 -->
                    <div class="row g-3 mt-1" id="categoryStats">
                        ${CATEGORIES.map(cat => `
                            <div class="col-4">
                                <div class="card border-${cat.color}">
                                    <div class="card-body text-center py-2">
                                        <div class="h4 mb-0 text-${cat.color}" id="cat_${cat.value}">--</div>
                                        <small class="text-muted">${cat.icon} ${cat.label}</small>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- AI 建议卡片 -->
                <div class="ai-suggestion-section mb-4">
                    <div class="card border-0 shadow-sm" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <div class="card-body text-white">
                            <div class="d-flex align-items-center mb-3">
                                <i class="bi bi-stars me-2"></i>
                                <h3 class="h5 mb-0">AI 今日建议</h3>
                            </div>
                            <div id="aiSuggestionSummary">
                                <p class="mb-0 opacity-75">
                                    开始记录生活，获取专属 AI 建议
                                </p>
                            </div>
                            <button class="btn btn-light mt-3" id="getAiAdviceBtn">
                                <i class="bi bi-arrow-right me-1"></i>
                                查看详情
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- 最近记录 -->
                <div class="recent-section">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h3 class="h6 mb-0 text-muted">
                            <i class="bi bi-clock-history me-1"></i>
                            最近记录
                        </h3>
                        <button class="btn btn-sm btn-link text-decoration-none" id="viewAllRecords">
                            查看全部 <i class="bi bi-chevron-right"></i>
                        </button>
                    </div>
                    <div class="empty-state text-center py-5" id="emptyState" style="display: none;">
                        <i class="bi bi-inbox fs-1 text-muted mb-3"></i>
                        <p class="text-muted mb-0">还没有记录</p>
                        <small class="text-muted">开始记录你的第一条生活吧</small>
                    </div>
                    <div class="record-list" id="recordList">
                        <!-- 记录列表将动态插入 -->
                    </div>
                </div>
            </main>
            
            <!-- 底部导航 -->
            <nav class="bottom-nav fixed-bottom bg-white border-top">
                <div class="container">
                    <div class="row text-center">
                        <div class="col">
                            <a href="#" class="nav-link active">
                                <i class="bi bi-house-door"></i>
                                <small>首页</small>
                            </a>
                        </div>
                        <div class="col">
                            <a href="#" class="nav-link" id="navTimeline">
                                <i class="bi bi-calendar-week"></i>
                                <small>时间线</small>
                            </a>
                        </div>
                        <div class="col">
                            <a href="#" class="nav-link" id="navSuggestions">
                                <i class="bi bi-robot"></i>
                                <small>AI</small>
                            </a>
                        </div>
                        <div class="col">
                            <a href="#" class="nav-link">
                                <i class="bi bi-person"></i>
                                <small>我的</small>
                            </a>
                        </div>
                    </div>
                </div>
            </nav>
        </div>
    `;
    
    // 绑定首页事件
    bindHomeEvents(container, navigate);
    
    // 加载统计数据
    loadStats();
    
    // 加载最近记录
    loadRecentRecords(container, navigate);
    
    // 加载今日建议摘要
    loadAISuggestionSummary();
}

/**
 * 绑定首页事件
 */
function bindHomeEvents(container: HTMLElement, navigate: NavigateFunction) {
    const quickRecordInput = container.querySelector('#quickRecordInput') as HTMLInputElement;
    const quickRecordBtn = container.querySelector('#quickRecordBtn') as HTMLButtonElement;
    const fullRecordBtn = container.querySelector('#fullRecordBtn') as HTMLButtonElement;
    const goToRecordsBtn = container.querySelector('#goToRecordsBtn') as HTMLButtonElement;
    const viewAllRecords = container.querySelector('#viewAllRecords') as HTMLButtonElement;
    const navTimeline = container.querySelector('#navTimeline') as HTMLAnchorElement;
    const navSuggestions = container.querySelector('#navSuggestions') as HTMLAnchorElement;
    const getAiAdviceBtn = container.querySelector('#getAiAdviceBtn') as HTMLButtonElement;
    const logoutBtn = container.querySelector('#logoutBtn') as HTMLButtonElement;
    
    // 快捷记录
    quickRecordBtn?.addEventListener('click', async () => {
        const text = quickRecordInput.value.trim();
        if (!text) {
            lifepilotToast('请输入记录内容', 'warning');
            return;
        }
        
        quickRecordBtn.disabled = true;
        quickRecordBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        
        try {
            // 自动分类
            const classifyResult = await api.classifyContent(text);
            const category = classifyResult.success ? classifyResult.data.category : 'learning';
            
            const result = await api.createRecord({
                content: text,
                category: category as RecordCategory
            });
            
            if (result.success) {
                lifepilotToast('记录已保存！', 'success');
                quickRecordInput.value = '';
                // 刷新统计数据和记录列表
                loadStats();
                loadRecentRecords(container, navigate);
            } else {
                lifepilotToast(result.message || '保存失败', 'error');
            }
        } catch (error) {
            lifepilotToast('保存失败，请重试', 'error');
        } finally {
            quickRecordBtn.disabled = false;
            quickRecordBtn.innerHTML = '<i class="bi bi-lightning-charge"></i>';
        }
    });
    
    quickRecordInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            quickRecordBtn.click();
        }
    });
    
    // 完整记录页面
    fullRecordBtn?.addEventListener('click', () => {
        navigate('records');
    });
    
    goToRecordsBtn?.addEventListener('click', () => {
        navigate('records');
    });
    
    viewAllRecords?.addEventListener('click', () => {
        navigate('records');
    });
    
    navTimeline?.addEventListener('click', (e) => {
        e.preventDefault();
        navigate('records');
    });
    
    // AI 建议按钮
    navSuggestions?.addEventListener('click', (e) => {
        e.preventDefault();
        navigate('suggestions');
    });
    
    getAiAdviceBtn?.addEventListener('click', () => {
        navigate('suggestions');
    });
    
    // 退出登录
    logoutBtn?.addEventListener('click', async () => {
        auth.clearAuth();
        lifepilotToast('已退出登录', 'success');
        navigate('login');
    });
}

/**
 * 加载统计数据
 */
async function loadStats(): Promise<void> {
    try {
        const result = await api.getRecordStats();
        if (result.success && result.data) {
            const stats = result.data;
            
            const totalEl = document.getElementById('totalRecords');
            const streakEl = document.getElementById('streakDays');
            const weekEl = document.getElementById('weekCount');
            const catLearning = document.getElementById('cat_learning');
            const catFinance = document.getElementById('cat_finance');
            const catHealth = document.getElementById('cat_health');
            
            if (totalEl) totalEl.textContent = String(stats.total);
            if (streakEl) streakEl.textContent = String(stats.streak_days);
            if (weekEl) weekEl.textContent = String(stats.week_count);
            if (catLearning) catLearning.textContent = String(stats.category_stats.learning);
            if (catFinance) catFinance.textContent = String(stats.category_stats.finance);
            if (catHealth) catHealth.textContent = String(stats.category_stats.health);
        }
    } catch (error) {
        console.error('加载统计失败:', error);
    }
}

/**
 * 加载最近记录
 */
async function loadRecentRecords(container: HTMLElement, navigate: NavigateFunction): Promise<void> {
    try {
        const result = await api.getRecords({ page: 1, page_size: 5 });
        const recordList = container.querySelector('#recordList') as HTMLElement;
        const emptyState = container.querySelector('#emptyState') as HTMLElement;
        
        if (!result.success || !result.data || result.data.records.length === 0) {
            if (recordList) recordList.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        if (recordList) {
            recordList.innerHTML = result.data.records.map(record => {
                const category = CATEGORIES.find(c => c.value === record.category);
                return `
                    <div class="card mb-2 record-card" data-record-id="${record.id}">
                        <div class="card-body py-2">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="flex-grow-1">
                                    <div class="d-flex align-items-center gap-2 mb-1">
                                        <span class="badge bg-${category?.color || 'secondary'} badge-sm">
                                            ${category?.icon || ''} ${category?.label || record.category}
                                        </span>
                                        ${record.audio_url ? '<i class="bi bi-mic-fill text-muted small"></i>' : ''}
                                    </div>
                                    ${record.title ? `<div class="fw-medium small">${escapeHtml(record.title)}</div>` : ''}
                                    <p class="text-muted mb-0 small" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                        ${escapeHtml(record.content)}
                                    </p>
                                </div>
                                <small class="text-muted ms-2">${formatDate(record.created_at)}</small>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // 绑定点击事件 - 跳转到记录页面查看详情
            recordList.querySelectorAll('.record-card').forEach(card => {
                card.addEventListener('click', () => {
                    navigate('records');
                });
                card.style.cursor = 'pointer';
            });
        }
    } catch (error) {
        console.error('加载记录失败:', error);
    }
}

function escapeHtml(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
        return '昨天';
    } else if (days < 7) {
        return `${days}天前`;
    } else {
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
}

/**
 * 加载 AI 建议摘要
 */
async function loadAISuggestionSummary(): Promise<void> {
    try {
        const result = await api.getTodaySuggestions();
        const summaryContainer = document.getElementById('aiSuggestionSummary');
        
        if (!result.success || !result.data || !result.data.has_suggestions) {
            if (summaryContainer) {
                summaryContainer.innerHTML = `
                    <p class="mb-0 opacity-75">
                        开始记录生活，获取专属 AI 建议
                    </p>
                `;
            }
            return;
        }
        
        // 显示建议摘要
        const groups = result.data.suggestions_by_dimension;
        const totalCount = result.data.total_count;
        
        if (summaryContainer) {
            let summaryHtml = '';
            if (totalCount > 0) {
                summaryHtml = `<p class="mb-2">今日已为你生成 <strong>${totalCount}</strong> 条建议</p>`;
                summaryHtml += '<div class="d-flex gap-2 flex-wrap">';
                for (const group of groups) {
                    const icon = group.icon || '📝';
                    summaryHtml += `<span class="badge bg-light text-dark">${icon} ${group.suggestions.length}</span>`;
                }
                summaryHtml += '</div>';
            } else {
                summaryHtml = `<p class="mb-0 opacity-75">开始记录生活，获取专属 AI 建议</p>`;
            }
            summaryContainer.innerHTML = summaryHtml;
        }
    } catch (error) {
        console.error('加载建议摘要失败:', error);
    }
}
