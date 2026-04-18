/**
 * LifePilot 主入口
 * 处理路由和页面初始化
 */

// 引入样式
import './styles/main.css';

// 引入页面
import { showLoginPage } from './pages/login';
import { showRegisterPage } from './pages/register';
import { showOnboardingPage } from './pages/onboarding';
import { showHomePage } from './pages/home';
import { showRecordsPage } from './pages/records';
import { showSuggestionsPage } from './pages/suggestions';

// 引入 API 和认证工具
import { api } from './utils/api';
import { auth } from './utils/auth';

// 路由定义
const routes: Record<string, (container: HTMLElement, navigate: (page: string, params?: any) => void) => void> = {
    'login': showLoginPage,
    'register': showRegisterPage,
    'onboarding': showOnboardingPage,
    'home': showHomePage,
    'records': showRecordsPage,
    'suggestions': showSuggestionsPage
};

/**
 * 导航到指定页面
 */
function navigate(page: string) {
    const app = document.getElementById('app');
    if (!app) return;
    
    // 清除内容
    app.innerHTML = '';
    
    // 调用对应页面的渲染函数
    const renderPage = routes[page];
    if (renderPage) {
        renderPage(app, navigate);
    } else {
        showLoginPage(app, navigate);
    }
}

/**
 * 初始化应用
 */
function initApp() {
    // 检查是否已登录
    if (auth.isLoggedIn()) {
        const user = auth.getCurrentUser();
        if (user && !user.onboarding_completed) {
            navigate('onboarding');
        } else {
            navigate('home');
        }
    } else {
        navigate('login');
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);

// 导出 navigate 函数供其他模块使用
(window as any).lifepilotNavigate = navigate;
