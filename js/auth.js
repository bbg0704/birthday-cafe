/* ============================================
   Auth + 通用工具函数
   ============================================ */

// --- 工具函数 ---
const Utils = {
    // 格式化日期
    formatDate(ts, withTime = false) {
        if (!ts) return '';
        const d = new Date(ts);
        const pad = (n) => String(n).padStart(2, '0');
        const dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        if (withTime) {
            return `${dateStr} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
        return dateStr;
    },

    formatDateShort(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getMonth()+1)}/${pad(d.getDate())}`;
    },

    // 倒计时
    getCountdown(deadline) {
        const diff = deadline - Date.now();
        if (diff <= 0) return { text: '已截止', expired: true };
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        if (days > 0) return { text: `${days}天${hours}小时后截止`, expired: false };
        if (hours > 0) return { text: `${hours}小时${minutes}分钟后截止`, expired: false };
        return { text: `${minutes}分钟后截止`, expired: false };
    },

    // Toast
    toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            toast.style.transition = '0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    },

    // Modal
    openModal(content) {
        const overlay = document.getElementById('modal-overlay');
        const modal = document.getElementById('modal');
        modal.innerHTML = content;
        overlay.classList.remove('hidden');
        // 绑定关闭
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        overlay.onclick = (e) => {
            if (e.target === overlay) this.closeModal();
        };
    },

    closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.getElementById('modal').innerHTML = '';
    },

    // 文本转日期时间 input 兼容
    toDatetimeLocal(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },

    fromDatetimeLocal(str) {
        if (!str) return null;
        return new Date(str).getTime();
    },

    // 简单 HTML 转义
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // 多行文本
    nl2br(str) {
        return str ? str.replace(/\n/g, '<br>') : '';
    },

    // 图片压缩（用于封面等 localStorage 存储场景）
    compressImage(file, maxWidth = 1000, quality = 0.82) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let { width, height } = img;
                    if (width > maxWidth) {
                        height = Math.round(height * maxWidth / width);
                        width = maxWidth;
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    // 自定义确认框
    confirm(message, onConfirm, title = '确认') {
        const content = `
            <button class="modal-close" onclick="Utils.closeModal()">✕</button>
            <div class="modal-title">${title}</div>
            <div style="font-size:14px; color: var(--color-ink-soft); margin-bottom: 24px;">${message}</div>
            <div style="display:flex; gap: 12px; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="Utils.closeModal()">取消</button>
                <button class="btn btn-primary" id="confirm-ok">确认</button>
            </div>
        `;
        this.openModal(content);
        setTimeout(() => {
            document.getElementById('confirm-ok')?.addEventListener('click', () => {
                this.closeModal();
                onConfirm && onConfirm();
            });
        }, 0);
    }
};

// --- Auth 模块 ---
const Auth = {
    // 获取当前用户
    current() {
        return DataStore.getCurrentUser();
    },

    // 是否已登录
    isLoggedIn() {
        return !!this.current();
    },

    // 是否是 organizer
    isOrganizer() {
        return this.isLoggedIn() && this.current().role === 'organizer';
    },

    // 是否是 fan
    isFan() {
        return this.isLoggedIn() && this.current().role === 'fan';
    },

    // 确保登录
    requireLogin(redirectRoute = '#/login') {
        if (!this.isLoggedIn()) {
            location.hash = redirectRoute;
            return false;
        }
        return true;
    },

    // 登录
    login(username, password) {
        return DataStore.loginUser(username, password);
    },

    // 注册
    register(username, password, role, nickname) {
        return DataStore.registerUser(username, password, role, nickname);
    },

    // 登出
    logout() {
        DataStore.logoutUser();
        location.hash = '#/';
    }
};
