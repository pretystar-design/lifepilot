/**
 * LifePilot 记录页面
 * US-002: 文字记录生活
 * US-003: 语音记录生活
 */

import { api, Record, RecordCategory, ClassifyResponse } from '../utils/api';
import { toast } from '../utils/toast';
import { showRecordDetail } from './record-detail';

// ============ 状态定义 ============

interface RecordsState {
    mode: 'text' | 'voice';           // 当前模式
    records: Record[];                // 记录列表
    currentRecord: Partial<Record>;   // 当前编辑的记录
    isRecording: boolean;            // 是否正在录音
    recordingTime: number;           // 录音时长
    selectedCategory: RecordCategory | null;  // 选中的分类
    aiSuggestion: ClassifyResponse | null;     // AI 分类建议
    tags: string[];                  // 标签列表
    newTag: string;                   // 新标签输入
    page: number;                    // 当前页码
    totalPages: number;              // 总页数
    filterCategory: RecordCategory | null;      // 筛选分类
    searchKeyword: string;           // 搜索关键词
    markdownPreview: boolean;        // 是否预览 Markdown
    editingRecord: Record | null;    // 正在编辑的记录
}

// ============ 常量 ============

const MAX_RECORDING_TIME = 60;  // 最大录音时长（秒）
const CATEGORIES: { value: RecordCategory; label: string; icon: string; color: string }[] = [
    { value: 'learning', label: '学习', icon: '📚', color: 'primary' },
    { value: 'finance', label: '理财', icon: '💰', color: 'success' },
    { value: 'health', label: '健康', icon: '💪', color: 'warning' }
];

// ============ 页面渲染 ============

/**
 * 显示记录页面
 */
export function showRecordsPage(container: HTMLElement, navigate: (page: string) => void): void {
    const state: RecordsState = {
        mode: 'text',
        records: [],
        currentRecord: {},
        isRecording: false,
        recordingTime: 0,
        selectedCategory: null,
        aiSuggestion: null,
        tags: [],
        newTag: '',
        page: 1,
        totalPages: 1,
        filterCategory: null,
        searchKeyword: '',
        markdownPreview: false,
        editingRecord: null
    };

    // 存储状态到容器
    (container as any).recordsState = state;

    renderPage(container, state, navigate);
    loadRecords(state, navigate);
}

/**
 * 渲染页面
 */
function renderPage(container: HTMLElement, state: RecordsState, navigate: (page: string) => void): void {
    container.innerHTML = `
        <div class="container-fluid py-4">
            <div class="row g-4">
                <!-- 左侧：创建记录区域 -->
                <div class="col-lg-5">
                    <div class="card border-0 shadow-sm mb-4">
                        <div class="card-header bg-white py-3">
                            <h5 class="mb-0 fw-bold">📝 记录生活</h5>
                        </div>
                        <div class="card-body">
                            <!-- 模式切换 -->
                            <div class="d-flex gap-2 mb-3">
                                <button class="btn ${state.mode === 'text' ? 'btn-primary' : 'btn-outline-secondary'} flex-fill" id="mode-text">
                                    <i class="bi bi-keyboard me-1"></i> 文字
                                </button>
                                <button class="btn ${state.mode === 'voice' ? 'btn-primary' : 'btn-outline-secondary'} flex-fill" id="mode-voice">
                                    <i class="bi bi-mic me-1"></i> 语音
                                </button>
                            </div>

                            <!-- 文字输入模式 -->
                            <div id="text-mode" class="${state.mode === 'text' ? '' : 'd-none'}">
                                <!-- 标题输入 -->
                                <div class="mb-3">
                                    <input type="text" class="form-control" id="record-title" 
                                           placeholder="标题（可选）" maxlength="200">
                                </div>

                                <!-- 内容输入 / Markdown 预览 -->
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <label class="form-label mb-0 fw-medium">内容</label>
                                        <button class="btn btn-sm btn-link text-decoration-none p-0" id="toggle-preview">
                                            ${state.markdownPreview ? '<i class="bi bi-pencil"></i> 编辑' : '<i class="bi bi-eye"></i> 预览'}
                                        </button>
                                    </div>
                                    <textarea class="form-control ${state.markdownPreview ? 'd-none' : ''}" 
                                              id="record-content" rows="6" 
                                              placeholder="今天发生了什么..."></textarea>
                                    <div class="border rounded p-3 bg-light ${state.markdownPreview ? '' : 'd-none'}" 
                                         id="content-preview" style="min-height: 150px;"></div>
                                </div>
                            </div>

                            <!-- 语音输入模式 -->
                            <div id="voice-mode" class="${state.mode === 'voice' ? '' : 'd-none'}">
                                <!-- 录音区域 -->
                                <div class="text-center py-4" id="recording-area">
                                    <div class="recording-indicator mb-3 ${state.isRecording ? 'active' : ''}">
                                        <i class="bi bi-mic-fill fs-1 ${state.isRecording ? 'text-danger' : 'text-secondary'}"></i>
                                    </div>
                                    <p class="text-muted mb-2" id="recording-status">
                                        ${state.isRecording ? '正在录音...' : '点击麦克风开始录音'}
                                    </p>
                                    <p class="h4 mb-3" id="recording-time">${formatTime(state.recordingTime)}</p>
                                    <button class="btn btn-lg ${state.isRecording ? 'btn-danger' : 'btn-primary'} rounded-circle" 
                                            id="record-btn" style="width: 80px; height: 80px;">
                                        <i class="bi ${state.isRecording ? 'bi-stop-fill' : 'bi-mic-fill'} fs-3"></i>
                                    </button>
                                    <p class="text-muted small mt-2">最长 ${MAX_RECORDING_TIME} 秒</p>
                                </div>

                                <!-- 转写结果 -->
                                <div class="mt-3 ${state.currentRecord.content ? '' : 'd-none'}" id="transcribe-result">
                                    <label class="form-label fw-medium">转写结果（可编辑）</label>
                                    <textarea class="form-control" id="transcribed-content" rows="4" 
                                              placeholder="转写结果将显示在这里...">${state.currentRecord.content || ''}</textarea>
                                </div>
                            </div>

                            <!-- 分类选择 -->
                            <div class="mb-3">
                                <label class="form-label fw-medium">分类</label>
                                <div class="d-flex gap-2">
                                    ${CATEGORIES.map(cat => `
                                        <button class="btn ${state.selectedCategory === cat.value ? `btn-${cat.color}` : 'btn-outline-secondary'} flex-fill category-btn"
                                                data-category="${cat.value}">
                                            <span class="me-1">${cat.icon}</span> ${cat.label}
                                        </button>
                                    `).join('')}
                                </div>
                                ${state.aiSuggestion && state.aiSuggestion.need_manual ? `
                                    <div class="form-text text-warning mt-1">
                                        <i class="bi bi-info-circle"></i> AI 分类置信度较低（${(state.aiSuggestion.confidence * 100).toFixed(0)}%），请手动确认分类
                                    </div>
                                ` : ''}
                            </div>

                            <!-- 标签管理 -->
                            <div class="mb-3">
                                <label class="form-label fw-medium">标签</label>
                                <div class="d-flex gap-2 mb-2">
                                    <input type="text" class="form-control" id="new-tag-input" 
                                           placeholder="添加标签" value="${state.newTag}"
                                           maxlength="20">
                                    <button class="btn btn-outline-primary" id="add-tag-btn">
                                        <i class="bi bi-plus"></i>
                                    </button>
                                </div>
                                <div class="d-flex flex-wrap gap-2" id="tags-container">
                                    ${state.tags.map((tag, idx) => `
                                        <span class="badge bg-secondary d-flex align-items-center gap-1">
                                            ${tag}
                                            <button class="btn btn-sm p-0 text-white remove-tag" data-index="${idx}">
                                                <i class="bi bi-x"></i>
                                            </button>
                                        </span>
                                    `).join('')}
                                    ${state.aiSuggestion?.tags?.filter(t => !state.tags.includes(t)).map(tag => `
                                        <span class="badge bg-primary d-flex align-items-center gap-1 ai-tag">
                                            ${tag} <i class="bi bi-robot" style="font-size: 0.7em;"></i>
                                            <button class="btn btn-sm p-0 text-white add-ai-tag" data-tag="${tag}">
                                                <i class="bi bi-plus"></i>
                                            </button>
                                        </span>
                                    `).join('') || ''}
                                </div>
                            </div>

                            <!-- 提交按钮 -->
                            <div class="d-grid gap-2">
                                <button class="btn btn-primary btn-lg" id="submit-record">
                                    <i class="bi bi-check2 me-2"></i> 保存记录
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 右侧：时间线区域 -->
                <div class="col-lg-7">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white py-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="mb-0 fw-bold">📅 记录时间线</h5>
                                <div class="d-flex gap-2 align-items-center">
                                    <!-- 搜索框 -->
                                    <div class="input-group input-group-sm" style="width: 200px;">
                                        <input type="text" class="form-control" id="search-keyword" 
                                               placeholder="搜索记录..." value="${state.searchKeyword}">
                                        <button class="btn btn-outline-secondary" id="search-btn">
                                            <i class="bi bi-search"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <!-- 分类筛选 -->
                            <div class="d-flex gap-2 mt-3">
                                <button class="btn btn-sm ${!state.filterCategory ? 'btn-primary' : 'btn-outline-secondary'}" 
                                        data-filter="">
                                    全部
                                </button>
                                ${CATEGORIES.map(cat => `
                                    <button class="btn btn-sm ${state.filterCategory === cat.value ? `btn-${cat.color}` : 'btn-outline-secondary'}" 
                                            data-filter="${cat.value}">
                                        ${cat.icon} ${cat.label}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        <div class="card-body p-0" id="records-list">
                            <div class="text-center py-5 text-muted" id="loading-indicator">
                                <div class="spinner-border text-primary mb-3" role="status"></div>
                                <p>加载中...</p>
                            </div>
                        </div>
                        <!-- 分页 -->
                        <div class="card-footer bg-white py-3" id="pagination-area">
                            <nav aria-label="记录分页">
                                <ul class="pagination justify-content-center mb-0" id="pagination">
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <style>
            .recording-indicator {
                transition: all 0.3s ease;
            }
            .recording-indicator.active {
                animation: pulse 1s infinite;
            }
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }
            .record-card {
                transition: all 0.2s ease;
            }
            .record-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            /* Markdown 样式 */
            #content-preview h1, #content-preview h2, #content-preview h3 { margin-top: 1rem; }
            #content-preview p { margin-bottom: 0.75rem; }
            #content-preview code { background: #f4f4f4; padding: 0.125rem 0.25rem; border-radius: 3px; }
            #content-preview pre { background: #f4f4f4; padding: 1rem; border-radius: 6px; overflow-x: auto; }
            #content-preview blockquote { border-left: 3px solid #ddd; padding-left: 1rem; color: #666; }
        </style>
    `;

    // 绑定事件
    bindEvents(container, state, navigate);
}

/**
 * 绑定事件
 */
function bindEvents(container: HTMLElement, state: RecordsState, navigate: (page: string) => void): void {
    // 模式切换
    container.querySelector('#mode-text')?.addEventListener('click', () => {
        state.mode = 'text';
        renderPage(container, state, navigate);
    });

    container.querySelector('#mode-voice')?.addEventListener('click', () => {
        state.mode = 'voice';
        renderPage(container, state, navigate);
    });

    // Markdown 预览切换
    container.querySelector('#toggle-preview')?.addEventListener('click', () => {
        state.markdownPreview = !state.markdownPreview;
        const textarea = container.querySelector('#record-content') as HTMLTextAreaElement;
        const preview = container.querySelector('#content-preview') as HTMLElement;
        const btn = container.querySelector('#toggle-preview') as HTMLButtonElement;
        
        if (state.markdownPreview) {
            preview.innerHTML = parseMarkdown(textarea.value);
            textarea.classList.add('d-none');
            preview.classList.remove('d-none');
            btn.innerHTML = '<i class="bi bi-pencil"></i> 编辑';
        } else {
            textarea.classList.remove('d-none');
            preview.classList.add('d-none');
            btn.innerHTML = '<i class="bi bi-eye"></i> 预览';
        }
    });

    // 内容输入时实时预览
    container.querySelector('#record-content')?.addEventListener('input', (e) => {
        const textarea = e.target as HTMLTextAreaElement;
        const preview = container.querySelector('#content-preview') as HTMLElement;
        if (state.markdownPreview) {
            preview.innerHTML = parseMarkdown(textarea.value);
        }
        
        // 实时 AI 分类 (防抖)
        debounce(async () => {
            if (textarea.value.length >= 10) {
                const result = await api.classifyContent(textarea.value);
                if (result.success && result.data) {
                    state.aiSuggestion = result.data;
                    state.selectedCategory = result.data.category as RecordCategory;
                    // 重新渲染分类和标签区域
                    updateCategoryButtons(container, state);
                    updateTags(container, state);
                }
            }
        }, 1000)();
    });

    // 分类选择
    container.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category') as RecordCategory;
            state.selectedCategory = category;
            state.aiSuggestion = null;  // 清除 AI 建议
            updateCategoryButtons(container, state);
        });
    });

    // 添加标签
    container.querySelector('#add-tag-btn')?.addEventListener('click', () => {
        const input = container.querySelector('#new-tag-input') as HTMLInputElement;
        const tag = input.value.trim();
        if (tag && !state.tags.includes(tag)) {
            state.tags.push(tag);
            input.value = '';
            updateTags(container, state);
        }
    });

    // 回车添加标签
    container.querySelector('#new-tag-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            container.querySelector('#add-tag-btn')?.dispatchEvent(new Event('click'));
        }
    });

    // 移除标签
    container.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-index') || '0');
            state.tags.splice(idx, 1);
            updateTags(container, state);
        });
    });

    // 添加 AI 建议的标签
    container.querySelectorAll('.add-ai-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.getAttribute('data-tag');
            if (tag && !state.tags.includes(tag)) {
                state.tags.push(tag);
                updateTags(container, state);
            }
        });
    });

    // 录音按钮
    container.querySelector('#record-btn')?.addEventListener('click', () => {
        if (state.isRecording) {
            stopRecording(container, state);
        } else {
            startRecording(container, state);
        }
    });

    // 提交记录
    container.querySelector('#submit-record')?.addEventListener('click', () => {
        submitRecord(container, state, navigate);
    });

    // 搜索
    container.querySelector('#search-btn')?.addEventListener('click', () => {
        const input = container.querySelector('#search-keyword') as HTMLInputElement;
        state.searchKeyword = input.value.trim();
        state.page = 1;
        loadRecords(state, navigate, container);
    });

    container.querySelector('#search-keyword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            container.querySelector('#search-btn')?.dispatchEvent(new Event('click'));
        }
    });

    // 分类筛选
    container.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter') as RecordCategory | '';
            state.filterCategory = filter || null;
            state.page = 1;
            renderPage(container, state, navigate);
            loadRecords(state, navigate, container);
        });
    });
}

/**
 * 更新分类按钮状态
 */
function updateCategoryButtons(container: HTMLElement, state: RecordsState): void {
    container.querySelectorAll('.category-btn').forEach(btn => {
        const category = btn.getAttribute('data-category');
        const cat = CATEGORIES.find(c => c.value === category);
        if (cat) {
            btn.className = `btn ${state.selectedCategory === category ? `btn-${cat.color}` : 'btn-outline-secondary'} flex-fill category-btn`;
        }
    });
}

/**
 * 更新标签显示
 */
function updateTags(container: HTMLElement, state: RecordsState): void {
    const tagsContainer = container.querySelector('#tags-container');
    if (!tagsContainer) return;

    tagsContainer.innerHTML = `
        ${state.tags.map((tag, idx) => `
            <span class="badge bg-secondary d-flex align-items-center gap-1">
                ${tag}
                <button class="btn btn-sm p-0 text-white remove-tag" data-index="${idx}">
                    <i class="bi bi-x"></i>
                </button>
            </span>
        `).join('')}
        ${state.aiSuggestion?.tags?.filter(t => !state.tags.includes(t)).map(tag => `
            <span class="badge bg-primary d-flex align-items-center gap-1 ai-tag">
                ${tag} <i class="bi bi-robot" style="font-size: 0.7em;"></i>
                <button class="btn btn-sm p-0 text-white add-ai-tag" data-tag="${tag}">
                    <i class="bi bi-plus"></i>
                </button>
            </span>
        `).join('') || ''}
    `;

    // 重新绑定事件
    container.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-index') || '0');
            state.tags.splice(idx, 1);
            updateTags(container, state);
        });
    });

    container.querySelectorAll('.add-ai-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.getAttribute('data-tag');
            if (tag && !state.tags.includes(tag)) {
                state.tags.push(tag);
                updateTags(container, state);
            }
        });
    });
}

// ============ 录音功能 ============

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingTimer: number | null = null;

function startRecording(container: HTMLElement, state: RecordsState): void {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                
                // 显示转写结果区域
                const transcribeResult = container.querySelector('#transcribe-result');
                if (transcribeResult) transcribeResult.classList.remove('d-none');

                // 调用转写 API
                const transcribeResultApi = await api.transcribeAudio(audioBlob as any);
                if (transcribeResultApi.success && transcribeResultApi.data) {
                    state.currentRecord.content = transcribeResultApi.data.text;
                    const textarea = container.querySelector('#transcribed-content') as HTMLTextAreaElement;
                    if (textarea) textarea.value = transcribeResultApi.data.text || '';
                    
                    // 同时更新到文字输入框
                    const contentTextarea = container.querySelector('#record-content') as HTMLTextAreaElement;
                    if (contentTextarea) contentTextarea.value = transcribeResultApi.data.text || '';
                }
            };

            mediaRecorder.start();
            state.isRecording = true;
            state.recordingTime = 0;

            // 更新 UI
            updateRecordingUI(container, state);

            // 开始计时
            recordingTimer = window.setInterval(() => {
                state.recordingTime++;
                updateRecordingTime(container, state);

                // 达到最大时长自动停止
                if (state.recordingTime >= MAX_RECORDING_TIME) {
                    stopRecording(container, state);
                }
            }, 1000);
        })
        .catch(error => {
            console.error('录音失败:', error);
            toast.show('无法访问麦克风，请检查权限设置', 'error');
        });
}

function stopRecording(container: HTMLElement, state: RecordsState): void {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    state.isRecording = false;

    // 停止计时
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }

    updateRecordingUI(container, state);
}

function updateRecordingUI(container: HTMLElement, state: RecordsState): void {
    const btn = container.querySelector('#record-btn');
    const status = container.querySelector('#recording-status');
    const indicator = container.querySelector('.recording-indicator');

    if (btn) {
        btn.className = `btn btn-lg ${state.isRecording ? 'btn-danger' : 'btn-primary'} rounded-circle`;
        btn.style.width = '80px';
        btn.style.height = '80px';
        btn.innerHTML = `<i class="bi ${state.isRecording ? 'bi-stop-fill' : 'bi-mic-fill'} fs-3"></i>`;
    }

    if (status) {
        status.textContent = state.isRecording ? '正在录音...' : '点击麦克风开始录音';
    }

    if (indicator) {
        indicator.classList.toggle('active', state.isRecording);
        const icon = indicator.querySelector('i');
        if (icon) {
            icon.className = `bi bi-mic-fill fs-1 ${state.isRecording ? 'text-danger' : 'text-secondary'}`;
        }
    }
}

function updateRecordingTime(container: HTMLElement, state: RecordsState): void {
    const timeEl = container.querySelector('#recording-time');
    if (timeEl) {
        timeEl.textContent = formatTime(state.recordingTime);
    }
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ============ 提交记录 ============

async function submitRecord(container: HTMLElement, state: RecordsState, navigate: (page: string) => void): Promise<void> {
    const content = state.mode === 'voice' 
        ? (container.querySelector('#transcribed-content') as HTMLTextAreaElement)?.value
        : (container.querySelector('#record-content') as HTMLTextAreaElement)?.value;
    const title = (container.querySelector('#record-title') as HTMLInputElement)?.value;

    // 验证内容
    if (!content?.trim()) {
        toast.show('请输入记录内容', 'warning');
        return;
    }

    if (!state.selectedCategory) {
        toast.show('请选择分类', 'warning');
        return;
    }

    const submitBtn = container.querySelector('#submit-record') as HTMLButtonElement;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>保存中...';
    }

    try {
        const result = await api.createRecord({
            title: title?.trim() || undefined,
            content: content.trim(),
            category: state.selectedCategory,
            tags: state.tags,
            confidence: state.aiSuggestion?.confidence
        });

        if (result.success) {
            toast.show('记录保存成功！', 'success');
            
            // 重置表单
            state.currentRecord = {};
            state.selectedCategory = null;
            state.aiSuggestion = null;
            state.tags = [];
            state.page = 1;
            
            // 重新渲染并加载记录
            renderPage(container, state, navigate);
            loadRecords(state, navigate, container);
        } else {
            toast.show(result.message || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存记录失败:', error);
        toast.show('保存失败，请重试', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-check2 me-2"></i> 保存记录';
        }
    }
}

// ============ 加载记录列表 ============

async function loadRecords(state: RecordsState, navigate: (page: string) => void, container?: HTMLElement): Promise<void> {
    const listContainer = document.getElementById('records-list');
    if (!listContainer) return;

    try {
        const result = await api.getRecords({
            page: state.page,
            page_size: 10,
            category: state.filterCategory || undefined,
            keyword: state.searchKeyword || undefined
        });

        if (result.success && result.data) {
            state.records = result.data.records;
            state.totalPages = result.data.total_pages;

            renderRecordsList(listContainer, state, navigate);
            renderPagination(listContainer, state, navigate);
        } else {
            listContainer.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-1 mb-3 d-block"></i>
                    <p>暂无记录</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('加载记录失败:', error);
        listContainer.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-exclamation-triangle fs-1 mb-3 d-block"></i>
                <p>加载失败，请重试</p>
            </div>
        `;
    }
}

function renderRecordsList(container: HTMLElement, state: RecordsState, navigate: (page: string) => void): void {
    if (state.records.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-inbox fs-1 mb-3 d-block"></i>
                <p>暂无记录，${state.mode === 'text' ? '写下你的第一条记录吧' : '试试语音记录'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="list-group list-group-flush">
            ${state.records.map(record => {
                const category = CATEGORIES.find(c => c.value === record.category);
                return `
                    <div class="list-group-item record-card" data-record-id="${record.id}">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <div class="d-flex align-items-center gap-2 mb-1">
                                    <span class="badge bg-${category?.color || 'secondary'}">
                                        ${category?.icon || ''} ${category?.label || record.category}
                                    </span>
                                    ${record.audio_url ? '<i class="bi bi-mic-fill text-muted"></i>' : ''}
                                    ${record.confidence < 0.7 ? '<span class="badge bg-warning text-dark">待确认</span>' : ''}
                                </div>
                                ${record.title ? `<h6 class="mb-1">${escapeHtml(record.title)}</h6>` : ''}
                                <p class="mb-1 text-muted" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                    ${escapeHtml(record.content)}
                                </p>
                                <div class="d-flex gap-2 flex-wrap">
                                    ${record.tags.map(tag => `<span class="badge bg-light text-dark">${escapeHtml(tag)}</span>`).join('')}
                                </div>
                            </div>
                            <div class="text-end ms-3">
                                <small class="text-muted">${formatDate(record.created_at)}</small>
                                <div class="btn-group btn-group-sm mt-1">
                                    <button class="btn btn-outline-secondary view-record" data-id="${record.id}" title="查看">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="btn btn-outline-secondary edit-record" data-id="${record.id}" title="编辑">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-outline-danger delete-record" data-id="${record.id}" title="删除">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // 绑定记录操作事件
    container.querySelectorAll('.view-record').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            if (id) {
                showRecordModal(id, state, navigate);
            }
        });
    });

    container.querySelectorAll('.edit-record').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            if (id) {
                editRecord(id, state, navigate);
            }
        });
    });

    container.querySelectorAll('.delete-record').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            if (id && confirm('确定要删除这条记录吗？')) {
                deleteRecord(id, state, navigate);
            }
        });
    });
}

function renderPagination(container: HTMLElement, state: RecordsState, navigate: (page: string) => void): void {
    const pagination = document.getElementById('pagination');
    if (!pagination || state.totalPages <= 1) {
        const paginationArea = document.getElementById('pagination-area');
        if (paginationArea && state.totalPages <= 1) {
            paginationArea.classList.add('d-none');
        }
        return;
    }

    const paginationArea = document.getElementById('pagination-area');
    if (paginationArea) paginationArea.classList.remove('d-none');

    let html = '';

    // 上一页
    html += `
        <li class="page-item ${state.page <= 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${state.page - 1}">上一页</a>
        </li>
    `;

    // 页码
    for (let i = 1; i <= state.totalPages; i++) {
        if (i === 1 || i === state.totalPages || (i >= state.page - 2 && i <= state.page + 2)) {
            html += `
                <li class="page-item ${i === state.page ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        } else if (i === state.page - 3 || i === state.page + 3) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // 下一页
    html += `
        <li class="page-item ${state.page >= state.totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${state.page + 1}">下一页</a>
        </li>
    `;

    pagination.innerHTML = html;

    // 绑定分页事件
    pagination.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.getAttribute('data-page') || '1');
            if (page >= 1 && page <= state.totalPages) {
                state.page = page;
                loadRecords(state, navigate);
            }
        });
    });
}

// ============ 记录操作 ============

async function showRecordModal(id: string, state: RecordsState, navigate: (page: string) => void): Promise<void> {
    const result = await api.getRecord(id);
    if (result.success && result.data) {
        showRecordDetail(result.data, state, navigate);
    } else {
        toast.show('获取记录详情失败', 'error');
    }
}

async function editRecord(id: string, state: RecordsState, navigate: (page: string) => void): Promise<void> {
    const result = await api.getRecord(id);
    if (result.success && result.data) {
        // 填充表单
        const titleInput = document.getElementById('record-title') as HTMLInputElement;
        const contentInput = document.getElementById('record-content') as HTMLTextAreaElement;
        if (titleInput) titleInput.value = result.data.title || '';
        if (contentInput) contentInput.value = result.data.content;

        state.editingRecord = result.data;
        state.selectedCategory = result.data.category as RecordCategory;
        state.tags = result.data.tags || [];
        state.mode = 'text';

        // 更新 UI
        const container = document.getElementById('app');
        if (container) {
            renderPage(container as HTMLElement, state, navigate);
            // 滚动到顶部
            container.scrollIntoView({ behavior: 'smooth' });
        }

        toast.show('已加载记录，可进行编辑', 'info');
    }
}

async function deleteRecord(id: string, state: RecordsState, navigate: (page: string) => void): Promise<void> {
    const result = await api.deleteRecord(id);
    if (result.success) {
        toast.show('记录已删除', 'success');
        loadRecords(state, navigate);
    } else {
        toast.show(result.message || '删除失败', 'error');
    }
}

// ============ 工具函数 ============

function parseMarkdown(text: string): string {
    if (!text) return '';

    return text
        // 标题
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // 粗体和斜体
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // 代码块
        .replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        // 引用
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        // 列表
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        // 换行
        .replace(/\n/g, '<br>');
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
        return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
        return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
        return `${days}天前`;
    } else {
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
}

function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: number | null = null;
    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = window.setTimeout(() => {
            fn(...args);
        }, delay);
    };
}
