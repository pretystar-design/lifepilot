/**
 * LifePilot 记录详情弹窗
 */

import { Record, RecordCategory, api } from '../utils/api';
import { toast } from '../utils/toast';

interface RecordsState {
    mode: 'text' | 'voice';
    records: Record[];
    currentRecord: Partial<Record>;
    isRecording: boolean;
    recordingTime: number;
    selectedCategory: RecordCategory | null;
    aiSuggestion: any;
    tags: string[];
    newTag: string;
    page: number;
    totalPages: number;
    filterCategory: RecordCategory | null;
    searchKeyword: string;
    markdownPreview: boolean;
    editingRecord: Record | null;
}

const CATEGORIES: { value: RecordCategory; label: string; icon: string; color: string }[] = [
    { value: 'learning', label: '学习', icon: '📚', color: 'primary' },
    { value: 'finance', label: '理财', icon: '💰', color: 'success' },
    { value: 'health', label: '健康', icon: '💪', color: 'warning' }
];

/**
 * 显示记录详情弹窗
 */
export function showRecordDetail(
    record: Record, 
    state: RecordsState,
    navigate: (page: string) => void
): void {
    // 创建弹窗
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'recordDetailModal';
    modal.tabIndex = -1;
    modal.setAttribute('aria-labelledby', 'recordDetailModalLabel');
    modal.setAttribute('aria-hidden', 'true');

    const category = CATEGORIES.find(c => c.value === record.category);

    modal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="recordDetailModalLabel">
                        <i class="bi bi-journal-text me-2"></i>记录详情
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
                </div>
                <div class="modal-body">
                    <!-- 元信息 -->
                    <div class="mb-3">
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <span class="badge bg-${category?.color || 'secondary'}">
                                ${category?.icon || ''} ${category?.label || record.category}
                            </span>
                            ${record.audio_url ? '<i class="bi bi-mic-fill text-muted"></i>' : ''}
                            ${record.confidence < 0.7 ? '<span class="badge bg-warning text-dark">待确认</span>' : ''}
                        </div>
                        ${record.title ? `<h4 class="mb-2">${escapeHtml(record.title)}</h4>` : ''}
                        <small class="text-muted">
                            创建于 ${formatDateTime(record.created_at)}
                            ${record.updated_at !== record.created_at ? `<br>更新于 ${formatDateTime(record.updated_at)}` : ''}
                        </small>
                    </div>

                    <hr>

                    <!-- 内容 -->
                    <div class="record-content mb-4">
                        ${parseMarkdown(record.content)}
                    </div>

                    <!-- 标签 -->
                    ${record.tags && record.tags.length > 0 ? `
                        <div class="mb-3">
                            <label class="form-label fw-medium">标签</label>
                            <div class="d-flex flex-wrap gap-2">
                                ${record.tags.map(tag => `
                                    <span class="badge bg-light text-dark">${escapeHtml(tag)}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- 音频 -->
                    ${record.audio_url ? `
                        <div class="mb-3">
                            <label class="form-label fw-medium">语音记录</label>
                            <div class="card bg-light">
                                <div class="card-body">
                                    <audio controls class="w-100">
                                        <source src="${record.audio_url}" type="audio/webm">
                                        您的浏览器不支持音频播放
                                    </audio>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- AI 置信度 -->
                    ${record.confidence < 1 ? `
                        <div class="alert alert-info mb-0">
                            <i class="bi bi-robot me-1"></i>
                            AI 分类置信度：${(record.confidence * 100).toFixed(0)}%
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-danger" id="modal-delete-btn">
                        <i class="bi bi-trash me-1"></i> 删除
                    </button>
                    <button type="button" class="btn btn-primary" id="modal-edit-btn">
                        <i class="bi bi-pencil me-1"></i> 编辑
                    </button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                </div>
            </div>
        </div>

        <style>
            .record-content {
                font-size: 1rem;
                line-height: 1.8;
            }
            .record-content h1, .record-content h2, .record-content h3 {
                margin-top: 1.5rem;
                margin-bottom: 0.75rem;
            }
            .record-content p {
                margin-bottom: 1rem;
            }
            .record-content code {
                background: #f4f4f4;
                padding: 0.125rem 0.375rem;
                border-radius: 3px;
                font-size: 0.9em;
            }
            .record-content pre {
                background: #f4f4f4;
                padding: 1rem;
                border-radius: 6px;
                overflow-x: auto;
                margin: 1rem 0;
            }
            .record-content blockquote {
                border-left: 3px solid #ddd;
                padding-left: 1rem;
                color: #666;
                margin: 1rem 0;
            }
            .record-content ul, .record-content ol {
                margin: 1rem 0;
                padding-left: 1.5rem;
            }
        </style>
    `;

    // 添加到 body
    document.body.appendChild(modal);

    // 显示弹窗
    const bsModal = new (window as any).bootstrap.Modal(modal);
    bsModal.show();

    // 绑定事件
    modal.querySelector('#modal-delete-btn')?.addEventListener('click', async () => {
        if (confirm('确定要删除这条记录吗？')) {
            const result = await api.deleteRecord(record.id);
            if (result.success) {
                toast.show('记录已删除', 'success');
                bsModal.hide();
                // 刷新列表
                setTimeout(() => loadRecordsAfterDelete(state, navigate), 300);
            } else {
                toast.show(result.message || '删除失败', 'error');
            }
        }
    });

    modal.querySelector('#modal-edit-btn')?.addEventListener('click', () => {
        bsModal.hide();
        // 触发编辑
        setTimeout(() => {
            const editBtn = document.querySelector(`.edit-record[data-id="${record.id}"]`);
            if (editBtn) {
                editBtn.dispatchEvent(new Event('click'));
            }
        }, 300);
    });

    // 弹窗关闭后移除
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

async function loadRecordsAfterDelete(state: RecordsState, navigate: (page: string) => void): Promise<void> {
    const result = await api.getRecords({
        page: state.page,
        page_size: 10,
        category: state.filterCategory || undefined,
        keyword: state.searchKeyword || undefined
    });

    if (result.success && result.data) {
        state.records = result.data.records;
        state.totalPages = result.data.total_pages;

        const listContainer = document.getElementById('records-list');
        if (listContainer) {
            renderRecordsList(listContainer, state, navigate);
            renderPagination(listContainer, state, navigate);
        }
    }
}

function renderRecordsList(container: HTMLElement, state: RecordsState, navigate: (page: string) => void): void {
    if (state.records.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-inbox fs-1 mb-3 d-block"></i>
                <p>暂无记录</p>
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
                loadRecordsInDetail(state, navigate);
            }
        });
    });
}

async function loadRecordsInDetail(state: RecordsState, navigate: (page: string) => void): Promise<void> {
    const listContainer = document.getElementById('records-list');
    if (!listContainer) return;

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
    }
}

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
            // 重新渲染记录页面
            import('./records').then(({ showRecordsPage }) => {
                showRecordsPage(container as HTMLElement, navigate);
            });
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
        loadRecordsInDetail(state, navigate);
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

function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
