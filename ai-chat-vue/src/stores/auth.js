import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { login as apiLogin, register as apiRegister } from '@/services/api';
const TOKEN_KEY = 'ai-chat-token';
const USER_KEY = 'ai-chat-user';
function loadToken() {
    return localStorage.getItem(TOKEN_KEY);
}
function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}
function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
}
function loadUser() {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
function saveUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function removeUser() {
    localStorage.removeItem(USER_KEY);
}
export const useAuthStore = defineStore('auth', () => {
    const token = ref(loadToken());
    const user = ref(loadUser());
    const loading = ref(false);
    const error = ref('');
    const isLoggedIn = computed(() => !!token.value);
    const username = computed(() => user.value?.username ?? '');
    function setAuth(t, u) {
        token.value = t;
        user.value = u;
        saveToken(t);
        saveUser(u);
        error.value = '';
    }
    function clearAuth() {
        token.value = null;
        user.value = null;
        removeToken();
        removeUser();
        error.value = '';
    }
    async function doLogin(username, password) {
        loading.value = true;
        error.value = '';
        try {
            const res = await apiLogin(username, password);
            setAuth(res.token, res.user);
            return true;
        }
        catch (e) {
            error.value = e.message || '登录失败';
            return false;
        }
        finally {
            loading.value = false;
        }
    }
    async function doRegister(username, password) {
        loading.value = true;
        error.value = '';
        try {
            await apiRegister(username, password);
            return true;
        }
        catch (e) {
            error.value = e.message || '注册失败';
            return false;
        }
        finally {
            loading.value = false;
        }
    }
    function logout() {
        clearAuth();
    }
    return {
        token,
        user,
        loading,
        error,
        isLoggedIn,
        username,
        doLogin,
        doRegister,
        logout,
    };
});
