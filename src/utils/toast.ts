/**
 * LifePilot Toast 提示工具
 */

/**
 * 显示 Toast 提示
 */
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toastId = `toast-${Date.now()}`;
    const bgClass = {
        success: 'bg-success',
        error: 'bg-danger',
        info: 'bg-primary'
    }[type];
    
    const html = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-body d-flex align-items-center ${bgClass} text-white">
                <span class="flex-grow-1">${message}</span>
                <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast" aria-label="关闭"></button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', html);
    
    const toastEl = document.getElementById(toastId);
    if (toastEl) {
        const toast = new (window as any).bootstrap.Toast(toastEl, {
            delay: 3000
        });
        toast.show();
        
        // 动画结束后移除
        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    }
}

/**
 * 显示 Loading 模态框
 */
function showLoading(message: string = '加载中...') {
    const modalEl = document.getElementById('loadingModal');
    if (!modalEl) return;
    
    const messageEl = modalEl.querySelector('.modal-body p');
    if (messageEl) {
        messageEl.textContent = message;
    }
    
    const modal = new (window as any).bootstrap.Modal(modalEl);
    modal.show();
    
    return {
        hide: () => modal.hide()
    };
}

/**
 * 隐藏 Loading 模态框
 */
function hideLoading() {
    const modalEl = document.getElementById('loadingModal');
    if (!modalEl) return;
    
    const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
    if (modal) {
        modal.hide();
    }
}

// 导出工具
(window as any).lifepilotToast = showToast;
(window as any).lifepilotLoading = {
    show: showLoading,
    hide: hideLoading
};
