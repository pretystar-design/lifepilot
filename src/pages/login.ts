/**
 * LifePilot 登录页面
 */

import { api } from '../utils/api';
import { auth } from '../utils/auth';

// 引入 toast 工具
declare const lifepilotToast: any;

type NavigateFunction = (page: string) => void;

/**
 * 渲染登录页面
 */
export function showLoginPage(container: HTMLElement, navigate: NavigateFunction) {
    container.innerHTML = `
        <div class="auth-page">
            <div class="auth-container">
                <!-- Logo 和标题 -->
                <div class="text-center mb-4">
                    <div class="auth-logo mb-3">
                        <i class="bi bi-rocket-takeoff fs-1 text-primary"></i>
                    </div>
                    <h1 class="h3 mb-2">LifePilot</h1>
                    <p class="text-muted">个人生活智能助手</p>
                </div>
                
                <!-- 登录表单 -->
                <div class="auth-card">
                    <div class="card shadow-sm">
                        <div class="card-body p-4">
                            <h2 class="h5 mb-4 text-center">登录 / 注册</h2>
                            
                            <form id="loginForm">
                                <!-- 手机号 -->
                                <div class="mb-3">
                                    <label for="phone" class="form-label">手机号</label>
                                    <div class="input-group">
                                        <span class="input-group-text">+86</span>
                                        <input type="tel" 
                                               class="form-control" 
                                               id="phone" 
                                               placeholder="请输入手机号"
                                               maxlength="11"
                                               required>
                                    </div>
                                    <div class="form-text">请输入中国大陆手机号</div>
                                </div>
                                
                                <!-- 验证码 -->
                                <div class="mb-4">
                                    <label for="code" class="form-label">验证码</label>
                                    <div class="row g-2">
                                        <div class="col-7">
                                            <input type="text" 
                                                   class="form-control" 
                                                   id="code" 
                                                   placeholder="请输入验证码"
                                                   maxlength="6"
                                                   required>
                                        </div>
                                        <div class="col-5">
                                            <button type="button" 
                                                    class="btn btn-outline-primary w-100" 
                                                    id="sendCodeBtn">
                                                发送验证码
                                            </button>
                                        </div>
                                    </div>
                                    <div class="form-text" id="codeHint">开发环境验证码: 123456</div>
                                </div>
                                
                                <!-- 提交按钮 -->
                                <button type="submit" 
                                        class="btn btn-primary w-100 py-2 mb-3" 
                                        id="submitBtn">
                                    登录
                                </button>
                                
                                <!-- 分隔线 -->
                                <div class="d-flex align-items-center my-4">
                                    <hr class="flex-grow-1">
                                    <span class="px-3 text-muted small">其他登录方式</span>
                                    <hr class="flex-grow-1">
                                </div>
                                
                                <!-- 微信登录按钮 -->
                                <button type="button" 
                                        class="btn btn-success w-100 py-2"
                                        id="wechatBtn"
                                        disabled>
                                    <i class="bi bi-wechat me-2"></i>
                                    微信一键登录
                                    <span class="badge bg-warning text-dark ms-2">小程序</span>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
                
                <!-- 底部信息 -->
                <div class="text-center mt-4">
                    <p class="text-muted small mb-0">
                        登录即表示同意 
                        <a href="#" class="text-decoration-none">用户协议</a> 
                        和 
                        <a href="#" class="text-decoration-none">隐私政策</a>
                    </p>
                </div>
            </div>
        </div>
    `;
    
    // 绑定事件
    bindLoginEvents(container, navigate);
}

/**
 * 绑定登录页面事件
 */
function bindLoginEvents(container: HTMLElement, navigate: NavigateFunction) {
    const form = container.querySelector('#loginForm') as HTMLFormElement;
    const phoneInput = container.querySelector('#phone') as HTMLInputElement;
    const codeInput = container.querySelector('#code') as HTMLInputElement;
    const sendCodeBtn = container.querySelector('#sendCodeBtn') as HTMLButtonElement;
    const submitBtn = container.querySelector('#submitBtn') as HTMLButtonElement;
    const wechatBtn = container.querySelector('#wechatBtn') as HTMLButtonElement;
    
    // 发送验证码
    let countdown = 0;
    let countdownInterval: number | null = null;
    
    sendCodeBtn?.addEventListener('click', async () => {
        const phone = phoneInput.value.trim();
        
        if (!phone || phone.length !== 11) {
            lifepilotToast('请输入正确的手机号', 'error');
            phoneInput.focus();
            return;
        }
        
        // 禁用按钮，开始倒计时
        sendCodeBtn.disabled = true;
        countdown = 60;
        
        const response = await api.sendSms(phone);
        
        if (response.success && response.data) {
            lifepilotToast(response.data.message || '验证码已发送', 'success');
            
            // 如果是开发环境，显示验证码
            if (response.data.code) {
                const hint = container.querySelector('#codeHint');
                if (hint) {
                    hint.innerHTML = `<span class="text-success">开发环境验证码: ${response.data.code}</span>`;
                }
            }
        } else {
            lifepilotToast(response.message || '发送失败', 'error');
            sendCodeBtn.disabled = false;
            return;
        }
        
        // 倒计时
        countdownInterval = window.setInterval(() => {
            countdown--;
            sendCodeBtn.textContent = `${countdown}秒后重试`;
            
            if (countdown <= 0) {
                if (countdownInterval) clearInterval(countdownInterval);
                sendCodeBtn.disabled = false;
                sendCodeBtn.textContent = '发送验证码';
            }
        }, 1000);
    });
    
    // 表单提交
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const phone = phoneInput.value.trim();
        const code = codeInput.value.trim();
        
        if (!phone || phone.length !== 11) {
            lifepilotToast('请输入正确的手机号', 'error');
            return;
        }
        
        if (!code || code.length !== 6) {
            lifepilotToast('请输入6位验证码', 'error');
            return;
        }
        
        // 禁用按钮，显示加载状态
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>登录中...';
        
        const response = await api.login(phone, code);
        
        if (response.success && response.data) {
            // 保存认证信息
            auth.saveAuth(response.data.access_token, response.data.user);
            
            lifepilotToast('登录成功', 'success');
            
            // 跳转到对应页面
            if (response.data.user.onboarding_completed) {
                navigate('home');
            } else {
                navigate('onboarding');
            }
        } else {
            lifepilotToast(response.message || '登录失败', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = '登录';
        }
    });
    
    // 微信登录（预留）
    wechatBtn?.addEventListener('click', () => {
        lifepilotToast('微信登录功能即将上线小程序端', 'info');
    });
}
