/**
 * LifePilot 认证工具
 * 处理 Token 存储和用户状态管理
 */

const TOKEN_KEY = 'lifepilot_token';
const USER_KEY = 'lifepilot_user';

/**
 * 用户信息接口
 */
interface User {
    id: string;
    phone: string;
    nickname?: string;
    avatar_url?: string;
    openid?: string;
     dimensions: string[];
    onboarding_completed: boolean;
    created_at: string;
}

/**
 * 认证状态
 */
export const auth = {
    /**
     * 保存 Token 和用户信息
     */
    saveAuth: (token: string, user: User) => {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    
    /**
     * 获取 Token
     */
    getToken: (): string | null => {
        return localStorage.getItem(TOKEN_KEY);
    },
    
    /**
     * 获取当前用户信息
     */
    getCurrentUser: (): User | null => {
        const userStr = localStorage.getItem(USER_KEY);
        if (!userStr) return null;
        
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    },
    
    /**
     * 更新用户信息
     */
    updateUser: (user: User) => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    
    /**
     * 检查是否已登录
     */
    isLoggedIn: (): boolean => {
        return !!localStorage.getItem(TOKEN_KEY);
    },
    
    /**
     * 清除认证信息（退出登录）
     */
    clearAuth: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }
};
