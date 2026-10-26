/* ============================================
   SPA 路由 & 全局入口 & 工具
   ============================================ */

/* -------- 路由 -------- */
const Router = {
    routes: [],
    query: {},

    register(pattern, handler) {
        this.routes.push({ pattern, handler });
    },

    parse(hash) {
        hash = hash.replace(/^#\/?/, '');
        return hash;
    },

    match(path) {
        for (const route of this.routes) {
            const m = path.match(route.pattern);
            if (m) {
                const params = m.slice(1);
                return { handler: route.handler, params };
            }
        }
        return null;
    },

    navigate() {
        const raw = this.parse(location.hash);
        const qi = raw.indexOf('?');
        this.query = {};
        if (qi >= 0) {
            new URLSearchParams(raw.slice(qi + 1)).forEach((v, k) => { this.query[k] = v; });
        }
        const path = qi >= 0 ? raw.slice(0, qi) : raw;
        const matched = this.match(path);
        if (matched) {
            matched.handler(...matched.params);
        } else {
            Pages.home();
        }
        // 更新导航 active 状态
        updateNavActive(path);
    },

    start() {
        window.addEventListener('hashchange', () => this.navigate());
        window.addEventListener('load', () => {
            // 如果没 hash，加一个
            if (!location.hash) location.hash = '#/';
            this.navigate();
        });
    }
};

const updateNavActive = (path) => {
    document.querySelectorAll('.nav-item').forEach(item => {
        const route = item.dataset.route;
        if (!route) return;
        const href = item.getAttribute('href');
        const target = href.replace('#/', '');
        item.classList.toggle('active', 
            (target === '' && path === '') || 
            (target !== '' && path.startsWith(target))
        );
    });
    renderAuthNav();
};

/* -------- 导航栏动态渲染 -------- */
const renderAuthNav = () => {
    const auth = document.getElementById('nav-auth');
    if (!auth) return;
    const user = Auth.current();
    if (user) {
        auth.innerHTML = `
            <span style="font-size:13px; color: var(--color-ink-soft);">
                ${user.nickname}
            </span>
            <button class="btn btn-ghost btn-sm" onclick="handleLogout()">退出</button>
        `;
    } else {
        auth.innerHTML = `
            <button class="btn btn-ghost btn-sm" onclick="location.hash='#/login'">登录</button>
            <button class="btn btn-primary btn-sm" onclick="location.hash='#/register'">注册</button>
        `;
    }

    // 移动端菜单
    const mobile = document.getElementById('mobile-menu');
    if (mobile) {
        mobile.innerHTML = `
            <a href="#/" class="nav-item" data-route>探索生咖</a>
            <a href="#/my" class="nav-item" data-route>我的生咖</a>
            <div style="border-top: 1px solid var(--color-cream-dark); padding-top: 12px; margin-top: 8px;">
                ${user ? `
                    <div style="font-size:14px; margin-bottom:8px;">${user.nickname}</div>
                    <button class="btn btn-secondary btn-sm btn-block" onclick="handleLogout()">退出登录</button>
                ` : `
                    <button class="btn btn-primary btn-sm btn-block" onclick="location.hash='#/login'">登录 / 注册</button>
                `}
            </div>
        `;
    }
};

/* -------- 事件绑定：移动端菜单 -------- */
document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
        });
    }
});

/* -------- 注册路由 -------- */
Router.register(/^$/, () => Pages.home());
Router.register(/^login$/, () => Pages.login());
Router.register(/^register$/, () => Pages.register());
Router.register(/^create$/, () => Pages.createEvent());
Router.register(/^edit\/(.+)$/, (id) => Pages.editEvent(id));
Router.register(/^my$/, () => Pages.myPage());
Router.register(/^event\/(.+)$/, (id) => Pages.eventDetail(id));
Router.register(/^manage\/(.+)$/, (id) => Pages.manageEvent(id));
Router.register(/^register-event\/(.+)$/, (id) => Pages.registerEvent(id));

/* -------- 全局函数暴露 -------- */
window.handleLogin = () => Pages.handleLogin();
window.handleRegister = () => Pages.handleRegister();
window.selectRole = (role) => Pages.selectRole(role);
window.selectPackage = (id) => Pages.selectPackage(id);
window.changeQty = (delta) => Pages.changeQty(delta);
window.submitRegistration = (id) => Pages.submitRegistration(id);
window.cancelRegistration = (id) => Pages.cancelRegistration(id);
window.addDynamicItem = (type) => Pages.addDynamicItem(type);
window.removeDynamicItem = (btn) => Pages.removeDynamicItem(btn);
window.submitCreateEvent = () => Pages.submitCreateEvent();

window.handleLogout = () => {
    Utils.confirm('确认退出登录吗？', () => {
        Auth.logout();
    }, '退出登录');
};

/* -------- 审核状态更新 -------- */
window.reviewVerification = (vid, status, note) => {
    DataStore.updateVerificationStatus(vid, status, note);
    Utils.toast(status === 'approved' ? '已通过审核' : '已拒绝', 'success');
    // 重新加载管理页
    const path = location.hash.replace('#/manage/', '');
    Pages.manageEvent(path);
};

/* -------- 封面上传 -------- */
window.handleCoverUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        Utils.toast('请上传图片文件', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        Utils.toast('图片过大，请选择 5MB 以内的图片', 'error');
        return;
    }
    try {
        const dataUrl = await Utils.compressImage(file, 1000, 0.82);
        window._coverImage = dataUrl;
        const preview = document.getElementById('cover-preview');
        if (preview) {
            preview.innerHTML = `
                <div class="upload-item" style="width: 200px; height: 120px;">
                    <img src="${dataUrl}" alt="封面预览">
                    <span class="remove-upload" onclick="removeCoverImage(event)">✕</span>
                </div>`;
        }
        Utils.toast('封面已上传', 'success');
    } catch (err) {
        Utils.toast('图片处理失败，请换一张试试', 'error');
    }
    event.target.value = '';
};

window.removeCoverImage = (e) => {
    e.stopPropagation();
    window._coverImage = null;
    const preview = document.getElementById('cover-preview');
    if (preview) preview.innerHTML = '';
};

/* -------- 封面：在线生成 -------- */
window.setCoverMode = (mode) => {
    window._coverMode = mode;
    ['generate', 'upload', 'none'].forEach(m => {
        const panel = document.getElementById(`cover-panel-${m}`);
        if (panel) panel.classList.toggle('hidden', m !== mode);
        const tab = document.querySelector(`.cover-tab[data-cover-tab="${m}"]`);
        if (tab) tab.classList.toggle('active', m === mode);
    });
    if (mode === 'generate') window.updateCoverGen();
};

window.updateCoverGen = () => {
    if (window._coverMode !== 'generate') return;
    const themeEl = document.getElementById('e-theme');
    const titleEl = document.getElementById('cg-title');
    const subEl = document.getElementById('cg-sub');
    const bgEl = document.querySelector('#cg-bg .swatch.active');
    const textEl = document.querySelector('#cg-text .swatch.active');
    if (!titleEl) return;

    const gen = window._coverGenerated || {};
    gen.title = titleEl.value.trim() || (themeEl ? themeEl.value.trim() : '');
    gen.subtitle = subEl ? subEl.value.trim() : '';
    if (bgEl) gen.bgColor = bgEl.dataset.color;
    if (textEl) gen.textColor = textEl.dataset.color;
    window._coverGenerated = gen;

    const preview = document.getElementById('cover-gen-preview');
    if (preview) {
        preview.style.background = gen.bgColor || '#F2E9DA';
        preview.innerHTML = Pages.coverGenInner(gen);
    }
};

window.pickSwatch = (el, group) => {
    if (!el) return;
    el.parentElement.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    const gen = window._coverGenerated || {};
    if (group === 'bg') gen.bgColor = el.dataset.color;
    else gen.textColor = el.dataset.color;
    window._coverGenerated = gen;
    window.updateCoverGen();
};

window.syncCoverTitle = () => {
    if (window._coverMode === 'generate') window.updateCoverGen();
};

/* -------- 套餐图片 -------- */
window.handleItemImage = async (event) => {
    const input = event.target;
    const file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        Utils.toast('请上传图片文件', 'error');
        input.value = '';
        return;
    }
    const item = input.closest('.dynamic-item');
    try {
        const dataUrl = await Utils.compressImage(file, 800, 0.8);
        const hidden = item.querySelector('.pkg-image');
        if (hidden) hidden.value = dataUrl;
        const preview = item.querySelector('.item-img-preview');
        if (preview) {
            preview.innerHTML = `
                <div class="upload-item">
                    <img src="${dataUrl}" alt="套餐图片">
                    <span class="remove-upload" onclick="removeItemImage(event)">✕</span>
                </div>`;
        }
        Utils.toast('套餐图片已添加', 'success');
    } catch (e) {
        Utils.toast('图片处理失败，请换一张试试', 'error');
    }
    input.value = '';
};

window.removeItemImage = (e) => {
    e.stopPropagation();
    const item = e.target.closest('.dynamic-item');
    if (!item) return;
    const hidden = item.querySelector('.pkg-image');
    if (hidden) hidden.value = '';
    const preview = item.querySelector('.item-img-preview');
    if (preview) preview.innerHTML = '';
};

/* -------- 物料图片（最多 4 张） -------- */
const renderTierImages = (preview, images) => {
    if (!preview) return;
    preview.innerHTML = images.map((src, i) => `
        <div class="upload-item">
            <img src="${src}" alt="物料图片">
            <span class="remove-upload" onclick="removeTierImage(event, ${i})">✕</span>
        </div>`).join('');
};

window.handleTierImages = async (event) => {
    const input = event.target;
    const item = input.closest('.dynamic-item');
    const hidden = item.querySelector('.tier-images');
    const preview = item.querySelector('.tier-img-preview');
    if (!input.files || !input.files.length) return;

    let images = [];
    try { images = JSON.parse(hidden.value || '[]'); } catch (e) { images = []; }
    const room = 4 - images.length;
    if (room <= 0) {
        Utils.toast('每个层级最多上传 4 张物料图片', 'warning');
        input.value = '';
        return;
    }
    const files = Array.from(input.files).slice(0, room);
    for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        try { images.push(await Utils.compressImage(file, 800, 0.78)); } catch (e) { /* 忽略单张失败 */ }
    }
    hidden.value = JSON.stringify(images);
    renderTierImages(preview, images);
    input.value = '';
    Utils.toast('物料图片已添加', 'success');
};

window.removeTierImage = (e, idx) => {
    e.stopPropagation();
    const item = e.target.closest('.dynamic-item');
    if (!item) return;
    const hidden = item.querySelector('.tier-images');
    let images = [];
    try { images = JSON.parse(hidden.value || '[]'); } catch (err) { images = []; }
    images.splice(idx, 1);
    hidden.value = JSON.stringify(images);
    renderTierImages(item.querySelector('.tier-img-preview'), images);
};

/* -------- 分享快照：把活动信息编码进链接，换设备也能打开 -------- */
const base64UrlEncode = (str) => {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const base64UrlDecode = (str) => {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
};

const Snapshot = {
    encode(event) {
        const data = {
            v: 1,
            t: event.theme,
            a: event.attribute,
            ty: event.type,
            c: event.city,
            l: event.location,
            s: event.startTime,
            e: event.endTime,
            d: event.deadline,
            ac: event.mainActivities || [],
            pk: (event.packages || []).map(p => ({ n: p.name, p: p.price, it: p.items || [] })),
            tr: (event.tieredMaterials || []).map(t => ({
                lv: t.level, n: t.name, rq: t.requirement || '', m: t.materials || [], nv: !!t.needVerify
            })),
            cg: event.coverGenerated || null,
            sid: event.seriesId || ''
        };
        return base64UrlEncode(JSON.stringify(data));
    },

    decode(id, token) {
        try {
            const data = JSON.parse(base64UrlDecode(token));
            if (!data || !data.t) return null;
            return {
                id,
                theme: data.t,
                attribute: data.a,
                type: data.ty,
                city: data.c,
                location: data.l,
                startTime: data.s,
                endTime: data.e,
                deadline: data.d,
                mainActivities: data.ac || [],
                packages: (data.pk || []).map((p, i) => ({
                    id: 'sp' + i, name: p.n, price: p.p, items: p.it || [], image: ''
                })),
                tieredMaterials: (data.tr || []).map((t, i) => ({
                    id: 'st' + i, level: t.lv, name: t.n, requirement: t.rq,
                    materials: t.m || [], images: [], needVerify: t.nv
                })),
                coverGenerated: data.cg,
                coverImage: '',
                coverEmoji: '',
                seriesId: data.sid || '',
                organizerId: '',
                registrationsCount: 0,
                __shared: true
            };
        } catch (e) {
            return null;
        }
    }
};
window.Snapshot = Snapshot;

/* -------- 分享数调：链接 + 二维码 -------- */
const buildShareUrl = (eventId) => {
    const base = location.href.split('#')[0];
    const event = DataStore.getEventById(eventId);
    if (!event) return `${base}#/event/${eventId}`;
    return `${base}#/event/${eventId}?d=${Snapshot.encode(event)}`;
};

const makeQR = (text, size = 220) => {
    try {
        if (typeof qrcode === 'function') {
            const qr = qrcode(0, 'M');
            qr.addData(text);
            qr.make();
            return qr.createDataURL(4, 8);
        }
    } catch (e) {
        console.warn('本地二维码生成失败，使用在线服务', e);
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
};

window.shareEvent = (eventId) => {
    const event = DataStore.getEventById(eventId);
    if (!event) { Utils.toast('活动不存在', 'error'); return; }
    const url = buildShareUrl(eventId);
    const qr = makeQR(url);
    const isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

    Utils.openModal(`
        <button class="modal-close" onclick="Utils.closeModal()">✕</button>
        <div class="modal-title">分享生咖数调</div>
        <div style="text-align:center;">
            <div style="font-size:14px; color: var(--color-ink-soft); margin-bottom: var(--space-3);">${Utils.escapeHtml(event.theme)}</div>
            <div class="share-qr"><img src="${qr}" alt="数调二维码"></div>
            <div class="share-hint">粉丝扫码或打开链接即可查看这份数调，活动信息已随链接一起发送，换设备也能打开</div>
            <div class="share-link-row">
                <input type="text" class="form-input" id="share-link-input" readonly value="${Utils.escapeHtml(url)}">
                <button class="btn btn-primary btn-sm" onclick="copyShareLink()">复制链接</button>
            </div>
            ${isLocal ? `<div class="share-hint" style="margin-top: var(--space-3);">当前用的是 localhost 地址，其他设备打不开。请先在浏览器里用本机局域网 IP（如 192.168.x.x:8080）访问本页面，再分享二维码。</div>` : ''}
        </div>
    `);
};

window.copyShareLink = () => {
    const input = document.getElementById('share-link-input');
    if (!input) return;
    const text = input.value;
    const done = () => Utils.toast('链接已复制，快去分享吧', 'success');
    const fallback = () => {
        input.removeAttribute('readonly');
        input.select();
        try {
            document.execCommand('copy');
            done();
        } catch (e) {
            Utils.toast('复制失败，请手动长按选择链接', 'error');
        }
        input.setAttribute('readonly', 'readonly');
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else {
        fallback();
    }
};

/* -------- 上传处理 -------- */
window.handleUpload = (event, tierId, eventId) => {
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB per file
    const files = Array.from(event.target.files).slice(0, 5);
    if (files.length === 0) return;

    // 文件大小检查
    for (const file of files) {
        if (file.size > MAX_SIZE) {
            Utils.toast(`文件 ${file.name} 超过 2MB 限制，请压缩后再上传`, 'error');
            return;
        }
    }

    // 估算 localStorage 剩余空间（粗略）
    const totalNewSize = files.reduce((s, f) => s + f.size, 0);
    try {
        const test = JSON.stringify({ test: 'x'.repeat(totalNewSize / 200) });
        localStorage.setItem('__size_test__', test);
        localStorage.removeItem('__size_test__');
    } catch (e) {
        Utils.toast('存储空间不足，请减少文件数量或大小', 'error');
        return;
    }

    // 读取已存在的审核（避免覆盖其他层级）
    let verification = DataStore.getVerifications().find(
        v => v.tierId === tierId && v.eventId === eventId && v.userId === Auth.current().id
    );
    const existingAssets = verification?.assets || [];

    Promise.all(files.map(file => new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve({
                type: file.type.startsWith('video') ? 'video' : 'image',
                src: e.target.result,
                name: file.name
            });
        };
        reader.readAsDataURL(file);
    }))).then(newAssets => {
        const allAssets = [...existingAssets, ...newAssets].slice(0, 5);

        // 创建或更新审核
        if (verification) {
            DataStore.updateVerificationStatus(verification.id, 'pending', '');
            // 直接修改 assets（绕过 status 更新覆盖）
            const verifications = DataStore.getVerifications();
            const idx = verifications.findIndex(v => v.id === verification.id);
            if (idx !== -1) {
                verifications[idx].assets = allAssets;
                DataStore.saveVerifications(verifications);
            }
        } else {
            DataStore.createVerification({
                userId: Auth.current().id,
                eventId,
                tierId,
                assets: allAssets,
                fanId: Auth.current().nickname
            });
        }

        // 刷新预览
        const preview = document.getElementById(`preview-${tierId}`);
        if (preview) {
            preview.innerHTML = allAssets.map(a => {
                if (a.type === 'video') {
                    return `<div class="upload-item"><video src="${a.src}" muted></video></div>`;
                }
                return `<div class="upload-item"><img src="${a.src}" alt=""></div>`;
            }).join('');
        }

        Utils.toast(`已上传 ${newAssets.length} 个文件`, 'success');
    });
};

window.submitVerification = (tierId, eventId) => {
    const verification = DataStore.getVerifications().find(
        v => v.tierId === tierId && v.eventId === eventId && v.userId === Auth.current().id
    );
    if (!verification || !verification.assets || verification.assets.length === 0) {
        Utils.toast('请先上传凭证文件', 'error');
        return;
    }
    if (verification.status !== 'pending') {
        DataStore.updateVerificationStatus(verification.id, 'pending', '');
    }
    Utils.toast('已提交审核，等待主办审核', 'success');
    // 刷新
    setTimeout(() => {
        document.querySelector('.tab-btn[data-tab="verify"]')?.click();
    }, 300);
};

/* -------- 导出功能 -------- */
window.exportRegistrations = (eventId, format) => {
    const event = DataStore.getEventById(eventId);
    const registrations = DataStore.getRegistrationsByEvent(eventId);
    if (registrations.length === 0) {
        Utils.toast('暂无报名数据可导出', 'warning');
        return;
    }

    const attr = ATTRIBUTE_MAP[event.attribute]?.label || event.attribute;
    const fileName = `${event.theme}_数调结果_${Utils.formatDateShort(Date.now())}`;

    if (format === 'txt') {
        exportTxt(registrations, event, fileName);
    } else if (format === 'xlsx') {
        exportExcel(registrations, event, fileName);
    } else if (format === 'pdf') {
        exportPDF(registrations, event, fileName);
    }
};

const exportTxt = (registrations, event, fileName) => {
    const attr = ATTRIBUTE_MAP[event.attribute]?.label || event.attribute;
    let content = `生咖数调结果\n${'='.repeat(50)}\n`;
    content += `主题：${event.theme}\n`;
    content += `属性：${attr}\n`;
    content += `时间：${Utils.formatDate(event.startTime)} ~ ${Utils.formatDate(event.endTime)}\n`;
    content += `地点：${event.location}\n`;
    content += `报名人数：${registrations.length}\n`;
    content += `总营收：¥${registrations.reduce((s,r)=>s+r.total,0)}\n`;
    content += `${'='.repeat(50)}\n\n`;

    // 套餐统计
    const pkgStats = {};
    registrations.forEach(r => {
        if (!pkgStats[r.packageName]) pkgStats[r.packageName] = { count: 0, qty: 0, revenue: 0 };
        pkgStats[r.packageName].count++;
        pkgStats[r.packageName].qty += r.quantity;
        pkgStats[r.packageName].revenue += r.total;
    });
    content += `【套餐统计】\n`;
    Object.entries(pkgStats).forEach(([name, s]) => {
        content += `  ${name}：${s.count}人 / ${s.qty}份 / ¥${s.revenue}\n`;
    });
    content += `\n【报名明细】\n`;
    content += `${'序号'.padEnd(6)}${'粉丝ID'.padEnd(20)}${'套餐'.padEnd(22)}${'份数'.padEnd(8)}${'小计'.padEnd(10)}${'报名时间'}\n`;
    content += '-'.repeat(80) + '\n';
    registrations.forEach((r, i) => {
        content += `${String(i+1).padEnd(6)}${r.fanId.padEnd(20)}${r.packageName.padEnd(22)}${String(r.quantity).padEnd(8)}¥${String(r.total).padEnd(8)}${Utils.formatDate(r.createdAt, true)}\n`;
    });

    downloadFile(content, `${fileName}.txt`, 'text/plain;charset=utf-8');
    Utils.toast('TXT 文件已下载', 'success');
};

const exportExcel = (registrations, event, fileName) => {
    // 生成简单的 CSV，Excel 可直接打开；同时也能生成真正的 XLSX
    // 这里用 HTML 表格 + 转换的方式（更通用）
    const attr = ATTRIBUTE_MAP[event.attribute]?.label || event.attribute;

    // 使用 SpreadsheetML 格式（Excel 原生支持，比 CSV 好）
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#A0714F"/><Interior ss:Color="#FAF7F2" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="14" ss:Color="#7C5233"/></Style>
  <Style ss:ID="Total"><Font ss:Bold="1"/></Style>
 </Styles>
 <Worksheet ss:Name="数调结果">
  <Table>
   <Row ss:StyleID="Title">
    <Cell ss:MergeAcross="6"><Data ss:Type="String">${event.theme}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:Index="1"><Data ss:Type="String">属性：${attr}</Data></Cell>
    <Cell><Data ss:Type="String">地点：${event.city}</Data></Cell>
    <Cell><Data ss:MergeAcross="4"><Data ss:Type="String">时间：${Utils.formatDate(event.startTime)} ~ ${Utils.formatDate(event.endTime)}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:Index="1"><Data ss:Type="String">地址：${event.location}</Data></Cell>
    <Cell ss:MergeAcross="6"></Cell>
   </Row>
   <Row></Row>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="Number">序号</Data></Cell>
    <Cell><Data ss:Type="String">粉丝 ID</Data></Cell>
    <Cell><Data ss:Type="String">套餐</Data></Cell>
    <Cell><Data ss:Type="Number">份数</Data></Cell>
    <Cell><Data ss:Type="Number">单价</Data></Cell>
    <Cell><Data ss:Type="Number">小计</Data></Cell>
    <Cell><Data ss:Type="String">报名时间</Data></Cell>
   </Row>`;

    registrations.forEach((r, i) => {
        xml += `
   <Row>
    <Cell><Data ss:Type="Number">${i+1}</Data></Cell>
    <Cell><Data ss:Type="String">${r.fanId}</Data></Cell>
    <Cell><Data ss:Type="String">${r.packageName}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.quantity}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.packagePrice}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.total}</Data></Cell>
    <Cell><Data ss:Type="String">${Utils.formatDate(r.createdAt, true)}</Data></Cell>
   </Row>`;
    });

    const totalRev = registrations.reduce((s,r)=>s+r.total, 0);
    xml += `
   <Row ss:StyleID="Total">
    <Cell ss:Index="5"><Data ss:Type="String">合计</Data></Cell>
    <Cell><Data ss:Type="Number">${totalRev}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

    downloadFile(xml, `${fileName}.xls`, 'application/vnd.ms-excel;charset=utf-8');
    Utils.toast('Excel 文件已下载', 'success');
};

const exportPDF = (registrations, event, fileName) => {
    // 创建一个打印用的 HTML 页面，然后触发打印
    const attr = ATTRIBUTE_MAP[event.attribute]?.label || event.attribute;

    const printContent = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${event.theme} - 数调结果</title>
<style>
body { font-family: 'Noto Sans SC', sans-serif; padding: 40px; color: #3F2E22; }
h1 { font-size: 24px; margin-bottom: 4px; color: #A0714F; }
.meta { font-size: 13px; color: #74604F; margin-bottom: 24px; }
table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
th { background: #FAF7F2; color: #7C5233; padding: 10px; text-align: left; border-bottom: 2px solid #E8DFD3; }
td { padding: 8px 10px; border-bottom: 1px solid #F5EFE6; }
.total-row td { font-weight: 600; background: #FAF7F2; }
.footer { margin-top: 32px; font-size: 12px; color: #A29180; text-align: center; }
.pkg-stats { margin-bottom: 24px; font-size: 13px; color: #74604F; }
</style>
</head><body>
<h1>${event.theme}</h1>
<div class="meta">属性：${attr} ｜ 地点：${event.city} ｜ 
时间：${Utils.formatDate(event.startTime)} ~ ${Utils.formatDate(event.endTime)}<br>
地址：${event.location}</div>

<div class="pkg-stats">
<strong>套餐统计：</strong>
${(() => {
    const pkgStats = {};
    registrations.forEach(r => {
        if (!pkgStats[r.packageName]) pkgStats[r.packageName] = { count: 0, qty: 0 };
        pkgStats[r.packageName].count++;
        pkgStats[r.packageName].qty += r.quantity;
    });
    return Object.entries(pkgStats).map(([n, s]) => `${n} (${s.count}人 / ${s.qty}份)`).join('，');
})()}
</div>

<table>
<thead><tr><th>序号</th><th>粉丝 ID</th><th>套餐</th><th>份数</th><th>单价</th><th>小计</th><th>报名时间</th></tr></thead>
<tbody>
${registrations.map((r, i) => `
<tr><td>${i+1}</td><td>${r.fanId}</td><td>${r.packageName}</td><td>${r.quantity}</td><td>¥${r.packagePrice}</td><td>¥${r.total}</td><td>${Utils.formatDate(r.createdAt, true)}</td></tr>`).join('')}
<tr class="total-row"><td colspan="5" style="text-align:right;">合计营收</td><td>¥${registrations.reduce((s,r)=>s+r.total,0)}</td><td></td></tr>
</tbody>
</table>

<div class="footer">生咖数调平台 · 导出时间 ${Utils.formatDate(Date.now(), true)}</div>
<script>window.onload = function() { window.print(); }</script>
</body></html>`;

    // 打开新窗口并写入内容
    const win = window.open('', '_blank');
    win.document.write(printContent);
    win.document.close();
    Utils.toast('已打开打印预览（Ctrl+P 保存为 PDF）', 'success');
};

const downloadFile = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/* -------- 启动 Router -------- */
Router.start();
