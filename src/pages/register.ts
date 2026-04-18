/**
 * LifePilot 注册页面
 * （当前与登录页面合并，此文件预留扩展用）
 */

import { api } from '../utils/api';
import { auth } from '../utils/auth';

// 引入 toast 工具
declare const lifepilotToast: any;

type NavigateFunction = (page: string) => void;

/**
 * 渲染注册页面
 * 当前实现：直接跳转到登录页面的注册模式
 */
export function showRegisterPage(container: HTMLElement, navigate: NavigateFunction) {
    // 注册和登录使用同一个页面流程
    // 这里可以扩展独立的注册页面逻辑
    navigate('login');
}
