/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { User, Lock } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const isLogin = ref(true);
const loginFormRef = ref();
const registerFormRef = ref();
const loginForm = reactive({
    username: '',
    password: '',
});
const registerForm = reactive({
    username: '',
    password: '',
    confirmPassword: '',
});
const validateUsername = (_rule, value, callback) => {
    if (!value) {
        callback(new Error('请输入账号'));
    }
    else if (value.length < 3 || value.length > 20) {
        callback(new Error('账号长度应为3-20个字符'));
    }
    else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        callback(new Error('账号仅支持字母、数字和下划线'));
    }
    else {
        callback();
    }
};
const validatePassword = (_rule, value, callback) => {
    if (!value) {
        callback(new Error('请输入密码'));
    }
    else if (value.length < 6 || value.length > 32) {
        callback(new Error('密码长度应为6-32个字符'));
    }
    else {
        callback();
    }
};
const validateConfirmPassword = (_rule, value, callback) => {
    if (!value) {
        callback(new Error('请再次输入密码'));
    }
    else if (value !== registerForm.password) {
        callback(new Error('两次输入的密码不一致'));
    }
    else {
        callback();
    }
};
const loginRules = {
    username: [{ required: true, validator: validateUsername, trigger: 'blur' }],
    password: [{ required: true, validator: validatePassword, trigger: 'blur' }],
};
const registerRules = {
    username: [{ required: true, validator: validateUsername, trigger: 'blur' }],
    password: [{ required: true, validator: validatePassword, trigger: 'blur' }],
    confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }],
};
const toggleMode = () => {
    isLogin.value = !isLogin.value;
    loginFormRef.value?.resetFields();
    registerFormRef.value?.resetFields();
};
const redirect = route.query.redirect || '/';
const handleLogin = () => {
    loginFormRef.value?.validate(async (valid) => {
        if (!valid)
            return;
        const ok = await auth.doLogin(loginForm.username, loginForm.password);
        if (ok) {
            ElMessage.success('登录成功');
            router.push(redirect);
        }
        else {
            ElMessage.error(auth.error || '登录失败');
        }
    });
};
const handleRegister = () => {
    registerFormRef.value?.validate(async (valid) => {
        if (!valid)
            return;
        const ok = await auth.doRegister(registerForm.username, registerForm.password);
        if (ok) {
            ElMessage.success('注册成功，请登录');
            toggleMode();
        }
        else {
            ElMessage.error(auth.error || '注册失败');
        }
    });
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "login-page" },
});
/** @type {__VLS_StyleScopedClasses['login-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "login-card" },
});
/** @type {__VLS_StyleScopedClasses['login-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ class: "login-title" },
});
/** @type {__VLS_StyleScopedClasses['login-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "login-subtitle" },
});
/** @type {__VLS_StyleScopedClasses['login-subtitle']} */ ;
(__VLS_ctx.isLogin ? '欢迎回来，请登录您的账号' : '创建账号，开始使用 AI Chat');
if (__VLS_ctx.isLogin) {
    let __VLS_0;
    /** @ts-ignore @type { | typeof __VLS_components.elForm | typeof __VLS_components.ElForm | typeof __VLS_components['el-form'] | typeof __VLS_components.elForm | typeof __VLS_components.ElForm | typeof __VLS_components['el-form']} */
    elForm;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        ...{ 'onSubmit': {} },
        ref: "loginFormRef",
        model: (__VLS_ctx.loginForm),
        rules: (__VLS_ctx.loginRules),
        labelPosition: "top",
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onSubmit': {} },
        ref: "loginFormRef",
        model: (__VLS_ctx.loginForm),
        rules: (__VLS_ctx.loginRules),
        labelPosition: "top",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_5;
    const __VLS_6 = ({ submit: {} },
        { onSubmit: (__VLS_ctx.handleLogin) });
    var __VLS_7;
    const { default: __VLS_9 } = __VLS_3.slots;
    let __VLS_10;
    /** @ts-ignore @type { | typeof __VLS_components.elFormItem | typeof __VLS_components.ElFormItem | typeof __VLS_components['el-form-item'] | typeof __VLS_components.elFormItem | typeof __VLS_components.ElFormItem | typeof __VLS_components['el-form-item']} */
    elFormItem;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
        label: "账号",
        prop: "username",
    }));
    const __VLS_12 = __VLS_11({
        label: "账号",
        prop: "username",
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    const { default: __VLS_15 } = __VLS_13.slots;
    let __VLS_16;
    /** @ts-ignore @type { | typeof __VLS_components.elInput | typeof __VLS_components.ElInput | typeof __VLS_components['el-input']} */
    elInput;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
        modelValue: (__VLS_ctx.loginForm.username),
        placeholder: "请输入账号",
        prefixIcon: (__VLS_ctx.User),
        size: "large",
    }));
    const __VLS_18 = __VLS_17({
        modelValue: (__VLS_ctx.loginForm.username),
        placeholder: "请输入账号",
        prefixIcon: (__VLS_ctx.User),
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    // @ts-ignore
    [isLogin, isLogin, loginForm, loginForm, loginRules, handleLogin, User,];
    var __VLS_13;
    let __VLS_21;
    /** @ts-ignore @type { | typeof __VLS_components.elFormItem | typeof __VLS_components.ElFormItem | typeof __VLS_components['el-form-item'] | typeof __VLS_components.elFormItem | typeof __VLS_components.ElFormItem | typeof __VLS_components['el-form-item']} */
    elFormItem;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
        label: "密码",
        prop: "password",
    }));
    const __VLS_23 = __VLS_22({
        label: "密码",
        prop: "password",
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
    const { default: __VLS_26 } = __VLS_24.slots;
    let __VLS_27;
    /** @ts-ignore @type { | typeof __VLS_components.elInput | typeof __VLS_components.ElInput | typeof __VLS_components['el-input']} */
    elInput;
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent1(__VLS_27, new __VLS_27({
        modelValue: (__VLS_ctx.loginForm.password),
        type: "password",
        placeholder: "请输入密码",
        prefixIcon: (__VLS_ctx.Lock),
        size: "large",
        showPassword: true,
    }));
    const __VLS_29 = __VLS_28({
        modelValue: (__VLS_ctx.loginForm.password),
        type: "password",
        placeholder: "请输入密码",
        prefixIcon: (__VLS_ctx.Lock),
        size: "large",
        showPassword: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
    // @ts-ignore
    [loginForm, Lock,];
    var __VLS_24;
    let __VLS_32;
    /** @ts-ignore @type { | typeof __VLS_components.elFormItem | typeof __VLS_components.ElFormItem | typeof __VLS_components['el-form-item'] | typeof __VLS_components.elFormItem | typeof __VLS_components.ElFormItem | typeof __VLS_components['el-form-item']} */
    elFormItem;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent1(__VLS_32, new __VLS_32({}));
    const __VLS_34 = __VLS_33({}, ...__VLS_functionalComponentArgsRest(__VLS_33));
    const { default: __VLS_37 } = __VLS_35.slots;
    let __VLS_38;
    /** @ts-ignore @type { | typeof __VLS_components.elButton | typeof __VLS_components.ElButton | typeof __VLS_components['el-button'] | typeof __VLS_components.elButton | typeof __VLS_components.ElButton | typeof __VLS_components['el-button']} */
    elButton;
    // @ts-ignore
    const __VLS_39 = __VLS_asFunctionalComponent1(__VLS_38, new __VLS_38({
        type: "primary",
        size: "large",
        nativeType: "submit",
        loading: (__VLS_ctx.auth.loading),
        ...{ class: "submit-btn" },
    }));
    const __VLS_40 = __VLS_39({
        type: "primary",
        size: "large",
        nativeType: "submit",
        loading: (__VLS_ctx.auth.loading),
        ...{ class: "submit-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_39));
    /** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
    const { default: __VLS_43 } = __VLS_41.slots;
    // @ts-ignore
    [auth,];
    var __VLS_41;
    // @ts-ignore
    [];
    var __VLS_35;
    // @ts-ignore
    [];
    var __VLS_3;
    var __VLS_4;
}
else {
    let __VLS_44;
    /** @ts-ignore @type { | typeof __VLS_components.elForm | typeof __VLS_components.ElForm | typeof __VLS_components['el-form'] | typeof __VLS_components.elForm | typeof __VLS_components.ElForm | typeof __VLS_components['el-form']} */
    elForm;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
        ...{ 'onSubmit': {} },
        ref: "registerFormRef",
        model: (__VLS_ctx.registerForm),
        rules: (__VLS_ctx.registerRules),
        labelPosition: "top",
    }));
    const __VLS_46 = __VLS_45({
        ...{ 'onSubmit': {} },
        ref: "registerFormRef",
        model: (__VLS_ctx.registerForm),
        rules: (__VLS_ctx.registerRules),
        labelPosition: "top",
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    let __VLS_49;
    const __VLS_50 = ({ submit: {} },
        { onSubmit: (__VLS_ctx.handleRegister) });
    var __VLS_51;
    const { default: __VLS_53 } = __VLS_47.slots;
    let __VLS_54;
    /** @ts-ignore @type { | typeof __VLS_components.elFormItem | typeof __VLS_components.ElFormItem | typeof __VLS_components['el-form-item'] | typeof __VLS_components.elFormItem | typeof __VLS_components.ElFormItem | typeof __VLS_components['el-form-item']} */
    elFormItem;
    // @ts-ignore
    const __VLS_55 = __VLS_asFunctionalComponent1(__VLS_54, new __VLS_54({
        label: "账号",
        prop: "username",
    }));
    const __VLS_56 = __VLS_55({
        label: "账号",
        prop: "username",
    }, ...__VLS_functionalComponentArgsRest(__VLS_55));
    const { default: __VLS_59 } = __VLS_57.slots;
    let __VLS_60;
    /** @ts-ignore @type { | typeof __VLS_components.elInput | typeof __VLS_components.ElInput | typeof __VLS_components['el-input']} */
    elInput;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent1(__VLS_60, new __VLS_60({
        modelValue: (__VLS_ctx.registerForm.username),
        placeholder: "请输入账号",
        prefixIcon: (__VLS_ctx.User),
        size: "large",
    }));
    const __VLS_62 = __VLS_61({
        modelValue: (__VLS_ctx.registerForm.username),
        placeholder: "请输入账号",
        prefixIcon: (__VLS_ctx.User),
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    // @ts-ignore
    [User, registerForm, registerForm, registerRules, handleRegister,];
    var __VLS_57;
    let __VLS_65;
    /** @ts-ignore @type { | typeof __VLS_components.elFormItem | typeof __VLS_components.ElFormItem | typeof __VLS_components['el-form-item'] | typeof __VLS_components.elFormItem | typeof __VLS_components.ElFormItem | typeof __VLS_components['el-form-item']} */
    elFormItem;
    // @ts-ignore
    const __VLS_66 = __VLS_asFunctionalComponent1(__VLS_65, new __VLS_65({
        label: "密码",
        prop: "password",
    }));
    const __VLS_67 = __VLS_66({
        label: "密码",
        prop: "password",
    }, ...__VLS_functionalComponentArgsRest(__VLS_66));
    const { default: __VLS_70 } = __VLS_68.slots;
    let __VLS_71;
    /** @ts-ignore @type { | typeof __VLS_components.elInput | typeof __VLS_components.ElInput | typeof __VLS_components['el-input']} */
    elInput;
    // @ts-ignore
    const __VLS_72 = __VLS_asFunctionalComponent1(__VLS_71, new __VLS_71({
        modelValue: (__VLS_ctx.registerForm.password),
        type: "password",
        placeholder: "请输入密码",
        prefixIcon: (__VLS_ctx.Lock),
        size: "large",
        showPassword: true,
    }));
    const __VLS_73 = __VLS_72({
        modelValue: (__VLS_ctx.registerForm.password),
        type: "password",
        placeholder: "请输入密码",
        prefixIcon: (__VLS_ctx.Lock),
        size: "large",
        showPassword: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_72));
    // @ts-ignore
    [Lock, registerForm,];
    var __VLS_68;
    let __VLS_76;
    /** @ts-ignore @type { | typeof __VLS_components.elFormItem | typeof __VLS_components.ElFormItem | typeof __VLS_components['el-form-item'] | typeof __VLS_components.elFormItem | typeof __VLS_components.ElFormItem | typeof __VLS_components['el-form-item']} */
    elFormItem;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent1(__VLS_76, new __VLS_76({
        label: "确认密码",
        prop: "confirmPassword",
    }));
    const __VLS_78 = __VLS_77({
        label: "确认密码",
        prop: "confirmPassword",
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    const { default: __VLS_81 } = __VLS_79.slots;
    let __VLS_82;
    /** @ts-ignore @type { | typeof __VLS_components.elInput | typeof __VLS_components.ElInput | typeof __VLS_components['el-input']} */
    elInput;
    // @ts-ignore
    const __VLS_83 = __VLS_asFunctionalComponent1(__VLS_82, new __VLS_82({
        modelValue: (__VLS_ctx.registerForm.confirmPassword),
        type: "password",
        placeholder: "请再次输入密码",
        prefixIcon: (__VLS_ctx.Lock),
        size: "large",
        showPassword: true,
    }));
    const __VLS_84 = __VLS_83({
        modelValue: (__VLS_ctx.registerForm.confirmPassword),
        type: "password",
        placeholder: "请再次输入密码",
        prefixIcon: (__VLS_ctx.Lock),
        size: "large",
        showPassword: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_83));
    // @ts-ignore
    [Lock, registerForm,];
    var __VLS_79;
    let __VLS_87;
    /** @ts-ignore @type { | typeof __VLS_components.elFormItem | typeof __VLS_components.ElFormItem | typeof __VLS_components['el-form-item'] | typeof __VLS_components.elFormItem | typeof __VLS_components.ElFormItem | typeof __VLS_components['el-form-item']} */
    elFormItem;
    // @ts-ignore
    const __VLS_88 = __VLS_asFunctionalComponent1(__VLS_87, new __VLS_87({}));
    const __VLS_89 = __VLS_88({}, ...__VLS_functionalComponentArgsRest(__VLS_88));
    const { default: __VLS_92 } = __VLS_90.slots;
    let __VLS_93;
    /** @ts-ignore @type { | typeof __VLS_components.elButton | typeof __VLS_components.ElButton | typeof __VLS_components['el-button'] | typeof __VLS_components.elButton | typeof __VLS_components.ElButton | typeof __VLS_components['el-button']} */
    elButton;
    // @ts-ignore
    const __VLS_94 = __VLS_asFunctionalComponent1(__VLS_93, new __VLS_93({
        type: "primary",
        size: "large",
        nativeType: "submit",
        loading: (__VLS_ctx.auth.loading),
        ...{ class: "submit-btn" },
    }));
    const __VLS_95 = __VLS_94({
        type: "primary",
        size: "large",
        nativeType: "submit",
        loading: (__VLS_ctx.auth.loading),
        ...{ class: "submit-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_94));
    /** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
    const { default: __VLS_98 } = __VLS_96.slots;
    // @ts-ignore
    [auth,];
    var __VLS_96;
    // @ts-ignore
    [];
    var __VLS_90;
    // @ts-ignore
    [];
    var __VLS_47;
    var __VLS_48;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "switch-row" },
});
/** @type {__VLS_StyleScopedClasses['switch-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.isLogin ? '没有账号？' : '已有账号？');
let __VLS_99;
/** @ts-ignore @type { | typeof __VLS_components.elButton | typeof __VLS_components.ElButton | typeof __VLS_components['el-button'] | typeof __VLS_components.elButton | typeof __VLS_components.ElButton | typeof __VLS_components['el-button']} */
elButton;
// @ts-ignore
const __VLS_100 = __VLS_asFunctionalComponent1(__VLS_99, new __VLS_99({
    ...{ 'onClick': {} },
    link: true,
    type: "primary",
}));
const __VLS_101 = __VLS_100({
    ...{ 'onClick': {} },
    link: true,
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_100));
let __VLS_104;
const __VLS_105 = ({ click: {} },
    { onClick: (__VLS_ctx.toggleMode) });
const { default: __VLS_106 } = __VLS_102.slots;
(__VLS_ctx.isLogin ? '立即注册' : '返回登录');
// @ts-ignore
[isLogin, isLogin, toggleMode,];
var __VLS_102;
var __VLS_103;
// @ts-ignore
var __VLS_8 = __VLS_7, __VLS_52 = __VLS_51;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
