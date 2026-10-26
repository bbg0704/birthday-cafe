/* ============================================
   数据层 - localStorage 作为 mock 后端
   ============================================ */

const DataStore = (() => {
    const KEYS = {
        USERS: 'bc_users',
        EVENTS: 'bc_events',
        REGISTRATIONS: 'bc_registrations',
        MATERIAL_VERIFICATIONS: 'bc_verifications',
        CURRENT_USER: 'bc_current_user'
    };

    // --- 辅助：生成唯一 ID ---
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    // --- 辅助：安全获取 ---
    const get = (key, fallback) => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            console.error('DataStore.get error:', key, e);
            return fallback;
        }
    };

    const set = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('DataStore.set error:', key, e);
        }
    };

    // --- 初始化示例数据 ---
    const initDemoData = () => {
        // 版本号变化时重置数据（方便开发调试）
        const INIT_VERSION = 'final9';
        const current = localStorage.getItem('bc_init_version');
        if (current === INIT_VERSION) return;
        localStorage.setItem('bc_init_version', INIT_VERSION);
        
        // 清除旧数据
        localStorage.removeItem(KEYS.USERS);
        localStorage.removeItem(KEYS.EVENTS);
        localStorage.removeItem(KEYS.REGISTRATIONS);
        localStorage.removeItem(KEYS.MATERIAL_VERIFICATIONS);
        localStorage.removeItem(KEYS.CURRENT_USER);
        
        // 不预置任何演示账号，用户需自行注册
        set(KEYS.USERS, []);

        set(KEYS.EVENTS, []);
        set(KEYS.REGISTRATIONS, []);
        set(KEYS.MATERIAL_VERIFICATIONS, []);
    };

    // --- 用户相关 ---
    const getUsers = () => get(KEYS.USERS, []);
    const saveUsers = (users) => set(KEYS.USERS, users);
    
    const registerUser = (username, password, role, nickname) => {
        const users = getUsers();
        if (users.find(u => u.username === username)) {
            return { success: false, message: '该用户名已被注册' };
        }
        const newUser = {
            id: uid(),
            username,
            password,
            role,
            nickname: nickname || username,
            createdAt: Date.now()
        };
        users.push(newUser);
        saveUsers(users);
        return { success: true, user: newUser };
    };

    const loginUser = (username, password) => {
        const users = getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) {
            return { success: false, message: '用户名或密码错误' };
        }
        set(KEYS.CURRENT_USER, user);
        return { success: true, user };
    };

    const logoutUser = () => {
        localStorage.removeItem(KEYS.CURRENT_USER);
    };

    const getCurrentUser = () => get(KEYS.CURRENT_USER, null);

    // --- 活动相关 ---
    const getEvents = () => get(KEYS.EVENTS, []);
    const saveEvents = (events) => set(KEYS.EVENTS, events);

    const getEventById = (id) => getEvents().find(e => e.id === id);

    const createEvent = (event) => {
        const events = getEvents();
        const newEvent = {
            ...event,
            id: uid(),
            createdAt: Date.now(),
            registrationsCount: 0
        };
        events.push(newEvent);
        saveEvents(events);
        return newEvent;
    };

    const updateEvent = (id, updates) => {
        const events = getEvents();
        const idx = events.findIndex(e => e.id === id);
        if (idx !== -1) {
            events[idx] = { ...events[idx], ...updates };
            saveEvents(events);
            return events[idx];
        }
        return null;
    };

    const deleteEvent = (id) => {
        const events = getEvents().filter(e => e.id !== id);
        saveEvents(events);
        // 同时删除相关报名
        const regs = getRegistrations().filter(r => r.eventId !== id);
        saveRegistrations(regs);
    };

    const getOrganizerEvents = (organizerId) => 
        getEvents().filter(e => e.organizerId === organizerId);

    // --- 报名相关 ---
    const getRegistrations = () => get(KEYS.REGISTRATIONS, []);
    const saveRegistrations = (regs) => set(KEYS.REGISTRATIONS, regs);

    const getRegistrationById = (id) => 
        getRegistrations().find(r => r.id === id);

    const getRegistrationsByEvent = (eventId) => 
        getRegistrations().filter(r => r.eventId === eventId);

    const getUserRegistrations = (userId) => 
        getRegistrations().filter(r => r.userId === userId);

    const createRegistration = (registration) => {
        const regs = getRegistrations();
        const newReg = {
            ...registration,
            id: uid(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        regs.push(newReg);
        saveRegistrations(regs);
        
        // 更新活动报名计数
        const event = getEventById(registration.eventId);
        if (event) {
            updateEvent(event.id, { registrationsCount: event.registrationsCount + 1 });
        }
        return newReg;
    };

    const updateRegistration = (id, updates) => {
        const regs = getRegistrations();
        const idx = regs.findIndex(r => r.id === id);
        if (idx !== -1) {
            regs[idx] = { ...regs[idx], ...updates, updatedAt: Date.now() };
            saveRegistrations(regs);
            return regs[idx];
        }
        return null;
    };

    const deleteRegistration = (id) => {
        const reg = getRegistrationById(id);
        const regs = getRegistrations().filter(r => r.id !== id);
        saveRegistrations(regs);
        if (reg) {
            const event = getEventById(reg.eventId);
            if (event && event.registrationsCount > 0) {
                updateEvent(event.id, { registrationsCount: event.registrationsCount - 1 });
            }
        }
    };

    // --- 物料审核相关 ---
    const getVerifications = () => get(KEYS.MATERIAL_VERIFICATIONS, []);
    const saveVerifications = (verifications) => set(KEYS.MATERIAL_VERIFICATIONS, verifications);

    const createVerification = (verification) => {
        const verifications = getVerifications();
        const newV = {
            ...verification,
            id: uid(),
            status: 'pending',
            createdAt: Date.now()
        };
        verifications.push(newV);
        saveVerifications(verifications);
        return newV;
    };

    const updateVerificationStatus = (id, status, note = '') => {
        const verifications = getVerifications();
        const idx = verifications.findIndex(v => v.id === id);
        if (idx !== -1) {
            verifications[idx] = { 
                ...verifications[idx], 
                status, 
                reviewNote: note,
                reviewedAt: Date.now()
            };
            saveVerifications(verifications);
            return verifications[idx];
        }
        return null;
    };

    const getVerificationsByEvent = (eventId) => 
        getVerifications().filter(v => v.eventId === eventId);

    const getUserVerifications = (userId) => 
        getVerifications().filter(v => v.userId === userId);

    // --- 筛选工具 ---
    const filterEvents = ({ attribute, type, city, keyword } = {}) => {
        let events = getEvents();
        if (attribute) events = events.filter(e => e.attribute === attribute);
        if (type) events = events.filter(e => e.type === type);
        if (city) events = events.filter(e => e.city === city);
        if (keyword) {
            const kw = keyword.toLowerCase();
            events = events.filter(e => 
                e.theme.toLowerCase().includes(kw) ||
                e.city.toLowerCase().includes(kw)
            );
        }
        return events.sort((a, b) => b.startTime - a.startTime);
    };

    const getAvailableCities = () => {
        const events = getEvents();
        const cities = [...new Set(events.map(e => e.city))];
        return cities.sort();
    };

    const getEventStatus = (event) => {
        const now = Date.now();
        if (event.deadline < now) return 'ended';
        return 'ongoing';
    };

    const isBeforeDeadline = (event) => Date.now() < event.deadline;

    return {
        initDemoData,
        uid,
        // 用户
        registerUser,
        loginUser,
        logoutUser,
        getCurrentUser,
        getUsers,
        // 活动
        getEvents,
        getEventById,
        createEvent,
        updateEvent,
        deleteEvent,
        getOrganizerEvents,
        filterEvents,
        getAvailableCities,
        getEventStatus,
        isBeforeDeadline,
        // 报名
        getRegistrations,
        getRegistrationById,
        getRegistrationsByEvent,
        getUserRegistrations,
        createRegistration,
        updateRegistration,
        deleteRegistration,
        // 审核
        getVerifications,
        createVerification,
        updateVerificationStatus,
        getVerificationsByEvent,
        getUserVerifications
    };
})();

// --- 常量 ---
const ATTRIBUTE_MAP = {
    kpop: { label: '韩娱', className: 'attr-kpop' },
    cpop: { label: '内娱', className: 'attr-cpop' },
    anime: { label: '二次元', className: 'attr-anime' },
    otome: { label: '乙游', className: 'attr-otome' }
};

const TYPE_MAP = {
    offline: { label: '线下活动', className: 'type-offline', desc: '主办会在现场组织游戏、打卡、随舞等活动' },
    package: { label: '自由打卡', className: 'type-package', desc: '主办不组织现场活动，粉丝可自行到店打卡，购买套餐领取物料' }
};

const TIER_MAP = {
    entry: { label: '入门礼', className: 'tier-entry' },
    low: { label: '低阶物料', className: 'tier-low' },
    mid: { label: '中阶物料', className: 'tier-mid' },
    high: { label: '高阶物料', className: 'tier-high' }
};

const CITIES = ['北京', '上海', '广州', '深圳', '成都', '杭州', '南京', '武汉', '重庆', '西安', '长沙', '青岛', '厦门', '其他'];

// 初始化
DataStore.initDemoData();
