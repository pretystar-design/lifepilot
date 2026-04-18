/**
 * LifePilot 首次登录引导页面
 * 设置昵称和关注维度
 */

import { api } from '../utils/api';
import { auth } from '../utils/auth';

// 引入 toast 工具
declare const lifepilotToast: any;

type NavigateFunction = (page: string) => void;

// 可选的关注维度
const DIMENSIONS = [
    {
        id: 'learning',
        name: '学习成长',
        icon: 'bi-book',
        color: 'primary',
        description: '阅读、学习、技能提升'
    },
    {
        id: 'finance',
        name: '理财规划',
        icon: 'bi-currency-yen',
        color: 'success',
        description: '储蓄、投资、消费记录'
    },
    {
        id: 'health',
        name: '健康管理',
        icon: 'bi-heart-pulse',
        color: 'danger',
        description: '运动、饮食、作息追踪'
    }
];

/**
 * 渲染首次引导页面
 */
export function showOnboardingPage(container: HTMLElement, navigate: NavigateFunction) {
    const currentUser = auth.getCurrentUser();
    
    container.innerHTML = `
        <div class="onboarding-page">
            <div class="container">
                <!-- 进度指示器 -->
                <div class="onboarding-progress mb-4">
                    <div class="d-flex justify-content-center">
                        <span class="badge bg-primary rounded-pill px-3 py-2">
                            步骤 1/1
                        </span>
                    </div>
                </div>
                
                <!-- 欢迎信息 -->
                <div class="text-center mb-5">
                    <div class="welcome-icon mb-3">
                        <i class="bi bi-stars text-warning fs-1"></i>
                    </div>
                    <h1 class="h3">欢迎使用 LifePilot</h1>
                    <p class="text-muted">让我们先做一些简单设置</p>
                </div>
                
                <!-- 设置表单 -->
                <div class="onboarding-form">
                    <div class="card shadow-sm">
                        <div class="card-body p-4">
                            <!-- 昵称设置 -->
                            <div class="mb-4">
                                <label for="nickname" class="form-label h5">
                                    <i class="bi bi-person-circle me-2 text-primary"></i>
                                    如何称呼你？
                                </label>
                                <input type="text" 
                                       class="form-control form-control-lg" 
                                       id="nickname" 
                                       placeholder="给自己起个昵称吧"
                                       maxlength="20"
                                       value="${currentUser?.nickname || ''}">
                                <div class="form-text">昵称将用于个性化展示</div>
                            </div>
                            
                            <!-- 关注维度选择 -->
                            <div class="mb-4">
                                <label class="form-label h5">
                                    <i class="bi bi-grid-3x3-gap me-2 text-primary"></i>
                                    你关注哪些方面？
                                </label>
                                <p class="text-muted mb-3">可多选，后续可在设置中修改</p>
                                
                                <div class="dimension-list">
                                    ${DIMENSIONS.map(dim => `
                                        <div class="dimension-card dimension-${dim.id} mb-3" 
                                             data-dimension="${dim.id}">
                                            <div class="card border">
                                                <div class="card-body py-3">
                                                    <div class="d-flex align-items-center">
                                                        <div class="form-check">
                                                            <input class="form-check-input" 
                                                                   type="checkbox" 
                                                                   value="${dim.id}" 
                                                                   id="dim-${dim.id}"
                                                                   checked>
                                                            <label class="form-check-label" for="dim-${dim.id}"></label>
                                                        </div>
                                                        <div class="ms-3 flex-grow-1">
                                                            <div class="d-flex align-items-center">
                                                                <i class="bi ${dim.icon} text-${dim.color} me-2"></i>
                                                                <strong>${dim.name}</strong>
                                                            </div>
                                                            <small class="text-muted">${dim.description}</small>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <!-- 提交按钮 -->
                            <button type="button" 
                                    class="btn btn-primary btn-lg w-100 py-3"
                                    id="completeBtn">
                                开始使用 LifePilot
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 绑定事件
    bindOnboardingEvents(container, navigate);
}

/**
 * 绑定引导页面事件
 */
function bindOnboardingEvents(container: HTMLElement, navigate: NavigateFunction) {
    const nicknameInput = container.querySelector('#nickname') as HTMLInputElement;
    const completeBtn = container.querySelector('#completeBtn') as HTMLButtonElement;
    const dimensionCards = container.querySelectorAll('.dimension-card');
    
    // 维度选择切换
    dimensionCards.forEach(card => {
        card.addEventListener('click', (e) => {
            // 阻止重复点击 checkbox
            if ((e.target as HTMLElement).tagName !== 'INPUT') {
                const checkbox = card.querySelector('input[type="checkbox"]') as HTMLInputElement;
                checkbox.checked = !checkbox.checked;
            }
            
            // 更新卡片样式
            const checkbox = card.querySelector('input[type="checkbox"]') as HTMLInputElement;
            if (checkbox.checked) {
                card.querySelector('.card')?.classList.add('border-primary');
                card.querySelector('.card')?.classList.add('bg-light');
            } else {
                card.querySelector('.card')?.classList.remove('border-primary');
                card.querySelector('.card')?.classList.remove('bg-light');
            }
        });
    });
    
    // 完成设置
    completeBtn?.addEventListener('click', async () => {
        const nickname = nicknameInput?.value.trim() || '用户';
        
        // 获取选中的维度
        const selectedDimensions: string[] = [];
        dimensionCards.forEach(card => {
            const checkbox = card.querySelector('input[type="checkbox"]') as HTMLInputElement;
            if (checkbox.checked) {
                selectedDimensions.push(checkbox.value);
            }
        });
        
        if (selectedDimensions.length === 0) {
            lifepilotToast('请至少选择一个关注维度', 'error');
            return;
        }
        
        // 禁用按钮，显示加载
        completeBtn.disabled = true;
        completeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>保存中...';
        
        const response = await api.updateProfile({
            nickname,
            dimensions: selectedDimensions,
            onboarding_completed: true
        });
        
        if (response.success && response.data) {
            // 更新本地用户信息
            const currentUser = auth.getCurrentUser();
            if (currentUser) {
                auth.updateUser({
                    ...currentUser,
                    nickname,
                     dimensions: selectedDimensions,
                    onboarding_completed: true
                });
            }
            
            lifepilotToast('设置完成，开始使用吧！', 'success');
            navigate('home');
        } else {
            lifepilotToast(response.message || '保存失败', 'error');
            completeBtn.disabled = false;
            completeBtn.textContent = '开始使用 LifePilot';
        }
    });
}
