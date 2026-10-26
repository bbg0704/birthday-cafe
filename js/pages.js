/* ============================================
   页面渲染 - Pages
   ============================================ */

const Pages = (() => {

    /* -------- 封面工具 -------- */
    const COVER_BG_COLORS = ['#FAF6EE', '#F2E9DA', '#E6D7C0', '#D8C0A3', '#C29A6F', '#8B5E3C', '#4E3524'];
    const COVER_TEXT_COLORS = ['#3F2E22', '#7C5233', '#A0714F', '#FAF6EE', '#FFFFFF', '#D8C0A3'];

    const escAttr = (s) => Utils.escapeHtml(String(s === null || s === undefined ? '' : s))
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const COVER_DECO_SVG = `
        <svg class="cover-gen-deco" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 26h28v12c0 7.7-6.2 14-14 14h-1c-7.7 0-14-6.3-14-14V26z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
            <path d="M40 30c5.5 0 9 3 9 7s-3.5 7-9 7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
            <path d="M20 20c-1.6-2-1.6-4 0-6M27 20c-1.6-2-1.6-4 0-6M34 20c-1.6-2-1.6-4 0-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
        </svg>`;

    const coverGenInner = (g) => `
        <div class="cover-gen" style="color:${g.textColor};">
            ${COVER_DECO_SVG}
            <div class="cover-gen-title">${Utils.escapeHtml(g.title || '生咖主题名')}</div>
            ${g.subtitle ? `<div class="cover-gen-sub">${Utils.escapeHtml(g.subtitle)}</div>` : ''}
        </div>`;

    const coverParts = (e) => {
        if (e.coverImage) {
            return { style: ` style="background-image:url('${e.coverImage}')"`, inner: '' };
        }
        if (e.coverGenerated && e.coverGenerated.title) {
            return { style: ` style="background:${e.coverGenerated.bgColor};"`, inner: coverGenInner(e.coverGenerated) };
        }
        return { style: '', inner: coverFallback(e.coverEmoji) };
    };

    const coverThumb = (e) => {
        if (e.coverImage) {
            return { style: ` style="background-image:url('${e.coverImage}')"`, inner: '' };
        }
        if (e.coverGenerated && e.coverGenerated.title) {
            return { style: ` style="background:${e.coverGenerated.bgColor};"`, inner: coverGenInner(e.coverGenerated) };
        }
        return { style: '', inner: `<span>${e.coverEmoji || '☕'}</span>` };
    };

    /* -------- 首页：生咖列表 -------- */
    const home = () => {
        const app = document.getElementById('app');
        const cities = DataStore.getAvailableCities();
        
        app.innerHTML = `
            <section class="hero">
                <h1>寻找属于你的 <em>生日咖啡店</em></h1>
                <p>汇集全国各地的生咖数调 — 韩娱、内娱、二次元、乙游。线下购买套餐领取物料，参与游戏打卡随舞，赴一场温柔的生日之约。</p>
                <div class="hero-actions">
                    ${Auth.isOrganizer() 
                        ? `<button class="btn btn-primary" onclick="location.hash='#/create'">＋ 创建生咖</button>`
                        : `<button class="btn btn-primary" onclick="document.querySelector('.filter-section').scrollIntoView({behavior:'smooth'})">开始探索</button>`
                    }
                    ${!Auth.isLoggedIn() 
                        ? `<button class="btn btn-secondary" onclick="location.hash='#/login'">登录 / 注册</button>`
                        : ''
                    }
                </div>
            </section>

            <section class="filter-section">
                <div class="filter-row">
                    <div class="filter-group">
                        <div class="filter-label">属性</div>
                        <div class="chip-group" data-filter="attribute">
                            <div class="chip active" data-value="">全部</div>
                            ${Object.entries(ATTRIBUTE_MAP).map(([k, v]) => 
                                `<div class="chip" data-value="${k}">${v.label}</div>`
                            ).join('')}
                        </div>
                    </div>
                    <div class="filter-group">
                        <div class="filter-label">方式</div>
                        <div class="chip-group" data-filter="type">
                            <div class="chip active" data-value="">全部</div>
                            ${Object.entries(TYPE_MAP).map(([k, v]) => 
                                `<div class="chip" data-value="${k}">${v.label}</div>`
                            ).join('')}
                        </div>
                    </div>
                    <div class="filter-group">
                        <div class="filter-label">地点</div>
                        <div class="chip-group" data-filter="city">
                            <div class="chip active" data-value="">全部</div>
                            ${cities.length > 0 ? cities.map(c => 
                                `<div class="chip" data-value="${c}">${c}</div>`
                            ).join('') : '<div class="chip" data-value="其他">其他</div>'}
                        </div>
                    </div>
                </div>
                <div class="search-bar">
                    <span>🔍</span>
                    <input type="text" id="search-input" placeholder="搜索生咖主题或城市...">
                </div>
            </section>

            <section>
                <div class="section-title">生咖活动</div>
                <div class="card-grid" id="events-grid">
                    ${renderEventCards(DataStore.getEvents())}
                </div>
            </section>
        `;

        // 绑定筛选
        const filterState = { attribute: '', type: '', city: '', keyword: '' };

        document.querySelectorAll('.chip-group').forEach(group => {
            const filterKey = group.dataset.filter;
            group.addEventListener('click', (e) => {
                if (e.target.classList.contains('chip')) {
                    group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                    e.target.classList.add('active');
                    filterState[filterKey] = e.target.dataset.value;
                    applyFilters(filterState);
                }
            });
        });

        const searchInput = document.getElementById('search-input');
        let searchTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                filterState.keyword = e.target.value.trim();
                applyFilters(filterState);
            }, 300);
        });

        // 绑定卡片点击
        document.querySelectorAll('.cafe-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                location.hash = `#/event/${id}`;
            });
        });
    };

    const applyFilters = (state) => {
        const events = DataStore.filterEvents(state);
        const grid = document.getElementById('events-grid');
        grid.innerHTML = renderEventCards(events);
        grid.querySelectorAll('.cafe-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                location.hash = `#/event/${id}`;
            });
        });
    };

    /* 无自定义封面时的咖啡插画兜底 */
    const coverFallback = (emoji) => `
        <svg viewBox="0 0 200 120" width="140" height="84" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 桌面线 -->
            <ellipse cx="100" cy="102" rx="70" ry="6" fill="#E9DCC8"/>
            <!-- 杯碟 -->
            <ellipse cx="100" cy="96" rx="46" ry="8" fill="#FFFFFF" stroke="#B8A58C" stroke-width="2"/>
            <!-- 杯身 -->
            <path d="M70 46h60v18c0 16.6-13.4 30-30 30s-30-13.4-30-30V46z" fill="#FFFFFF" stroke="#7C5233" stroke-width="3.5" stroke-linejoin="round"/>
            <!-- 杯柄 -->
            <path d="M130 52c11 1 18 7 17 16-1 9-9 14-18 13" stroke="#7C5233" stroke-width="3.5" stroke-linecap="round"/>
            <!-- 拉花爱心 -->
            <path d="M100 80c-6.5-4.8-11-9.2-11-14 0-3.8 3-6.8 6.8-6.8 1.8 0 3.4.7 4.2 2 .8-1.3 2.4-2 4.2-2 3.8 0 6.8 3 6.8 6.8 0 4.8-4.5 9.2-11 14z" fill="#D98B93"/>
            <!-- 蒸汽 -->
            <path d="M86 38c-3.6-4.4-3.6-9 0-13.4M100 38c-3.6-4.4-3.6-9 0-13.4M114 38c-3.6-4.4-3.6-9 0-13.4" stroke="#A0714F" stroke-width="3" stroke-linecap="round"/>
            <!-- 咖啡豆 -->
            <ellipse cx="40" cy="90" rx="7" ry="9" transform="rotate(-20 40 90)" fill="#A0714F"/>
            <path d="M36.5 83c3.5 4 5 8.5 4.5 14" stroke="#FAF5EC" stroke-width="2" stroke-linecap="round"/>
            <ellipse cx="162" cy="88" rx="6" ry="8" transform="rotate(30 162 88)" fill="#8B5E3C"/>
            <path d="M158.5 82c3 3.5 4.5 7.5 4 12.5" stroke="#FAF5EC" stroke-width="2" stroke-linecap="round"/>
            ${emoji ? `<text x="170" y="40" font-size="26">${emoji}</text>` : ''}
        </svg>`;

    const renderEventCards = (events) => {
        if (!events || events.length === 0) {
            return `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-icon">${coverFallback('')}</div>
                    <p>暂时没有找到符合条件的生咖活动</p>
                    ${Auth.isOrganizer() ? '<button class="btn btn-primary" onclick="location.hash=\'#/create\'">创建第一个生咖</button>' : ''}
                </div>
            `;
        }
        return events.map(e => {
            const status = DataStore.getEventStatus(e);
            const attr = ATTRIBUTE_MAP[e.attribute] || { label: e.attribute };
            const type = TYPE_MAP[e.type] || { label: e.type };
            const cd = Utils.getCountdown(e.deadline);
            const cover = coverParts(e);
            return `
                <div class="cafe-card" data-id="${e.id}" onclick="location.hash='#/event/${e.id}'">
                    <div class="cafe-card-cover"${cover.style}>
                        ${cover.inner}
                        <div class="cafe-card-badges">
                            <span class="badge ${attr.className}">${attr.label}</span>
                            <span class="badge ${type.className}">${type.label}</span>
                        </div>
                    </div>
                    <div class="cafe-card-body">
                        <div class="cafe-card-title">${Utils.escapeHtml(e.theme)}</div>
                        <div class="cafe-card-meta">
                            <span>📍 ${Utils.escapeHtml(e.city)}</span>
                            <span>📅 ${Utils.formatDate(e.startTime)} ~ ${Utils.formatDate(e.endTime)}</span>
                            <span>📌 ${Utils.escapeHtml(e.location)}</span>
                        </div>
                        <div class="cafe-card-footer">
                            <span>${e.registrationsCount || 0} 人已报名</span>
                            <span class="countdown ${cd.expired ? 'expired' : ''}">${cd.text}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };

    /* -------- 登录/注册页 -------- */
    const login = () => {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="form-container">
                <div class="form-card">
                    <div class="form-card-title">欢迎回来 ☕</div>
                    <div class="form-card-subtitle">登录你的账号，继续参与热爱</div>
                    
                    <div class="form-group">
                        <label class="form-label">用户名</label>
                        <input type="text" class="form-input" id="login-username" placeholder="请输入用户名">
                    </div>
                    <div class="form-group">
                        <label class="form-label">密码</label>
                        <input type="password" class="form-input" id="login-password" placeholder="请输入密码">
                    </div>
                    <button class="btn btn-primary btn-block" onclick="handleLogin()">登 录</button>
                    <div style="text-align:center; margin-top: var(--space-4); font-size: 14px; color: var(--color-ink-soft);">
                        还没有账号？ <a href="#/register" style="color: var(--color-accent); font-weight: 500;">立即注册</a>
                    </div>
                    <div style="text-align:center; margin-top: var(--space-3); font-size: 12px; color: var(--color-ink-lighter);">
                        演示账号： organizer / fan · 密码： 123456
                    </div>
                </div>
            </div>
        `;
    };

    const handleLogin = () => {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        if (!username || !password) {
            Utils.toast('请填写完整信息', 'error');
            return;
        }
        const result = Auth.login(username, password);
        if (result.success) {
            Utils.toast('登录成功', 'success');
            setTimeout(() => { location.hash = '#/'; }, 500);
        } else {
            Utils.toast(result.message, 'error');
        }
    };

    const register = () => {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="form-container">
                <div class="form-card">
                    <div class="form-card-title">创建你的账号 ✨</div>
                    <div class="form-card-subtitle">选择身份，开启你的生咖之旅</div>
                    
                    <div class="form-group">
                        <label class="form-label">选择身份</label>
                        <div class="role-select">
                            <div class="role-card active" data-role="organizer" onclick="selectRole('organizer')">
                                <div class="role-icon">🎪</div>
                                <div class="role-name">生咖主办</div>
                                <div class="role-desc">创建活动、管理数调、审核物料</div>
                            </div>
                            <div class="role-card" data-role="fan" onclick="selectRole('fan')">
                                <div class="role-icon">💖</div>
                                <div class="role-name">普通粉丝</div>
                                <div class="role-desc">报名活动、领取物料、上传审核</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">昵称</label>
                        <input type="text" class="form-input" id="reg-nickname" placeholder="给自己取个可爱的名字">
                    </div>
                    <div class="form-group">
                        <label class="form-label">用户名 <span class="required">*</span></label>
                        <input type="text" class="form-input" id="reg-username" placeholder="用于登录，不可重复">
                    </div>
                    <div class="form-group">
                        <label class="form-label">密码 <span class="required">*</span></label>
                        <input type="password" class="form-input" id="reg-password" placeholder="至少 6 位">
                    </div>
                    <button class="btn btn-primary btn-block" onclick="handleRegister()">注 册</button>
                    <div style="text-align:center; margin-top: var(--space-4); font-size: 14px; color: var(--color-ink-soft);">
                        已有账号？ <a href="#/login" style="color: var(--color-accent); font-weight: 500;">去登录</a>
                    </div>
                </div>
            </div>
        `;
    };

    let selectedRole = 'organizer';
    const selectRole = (role) => {
        selectedRole = role;
        document.querySelectorAll('.role-card').forEach(c => {
            c.classList.toggle('active', c.dataset.role === role);
        });
    };

    const handleRegister = () => {
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value;
        const nickname = document.getElementById('reg-nickname').value.trim();
        if (!username || !password) {
            Utils.toast('请填写用户名和密码', 'error');
            return;
        }
        if (password.length < 6) {
            Utils.toast('密码至少 6 位', 'error');
            return;
        }
        const result = Auth.register(username, password, selectedRole, nickname);
        if (result.success) {
            // 自动登录
            DataStore.loginUser(username, password);
            Utils.toast('注册成功 🎉', 'success');
            setTimeout(() => { location.hash = '#/'; }, 800);
        } else {
            Utils.toast(result.message, 'error');
        }
    };

    /* -------- 生咖详情页 -------- */
    const eventDetail = (id) => {
        const event = DataStore.getEventById(id);
        if (!event) {
            document.getElementById('app').innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">😿</div>
                    <p>找不到这个生咖活动</p>
                    <button class="btn btn-primary" onclick="location.hash='#/'">返回首页</button>
                </div>
            `;
            return;
        }

        const attr = ATTRIBUTE_MAP[event.attribute] || { label: event.attribute };
        const type = TYPE_MAP[event.type] || { label: event.type };
        const cd = Utils.getCountdown(event.deadline);
        const isOrganizerView = Auth.current() && Auth.current().id === event.organizerId;
        const regCount = DataStore.getRegistrationsByEvent(id).length;
        const cover = coverParts(event);
        const relatedEvents = event.seriesId
            ? DataStore.getEvents().filter(e => e.seriesId === event.seriesId && e.id !== event.id)
            : [];

        // 我的报名（粉丝视角）
        let myReg = null;
        if (Auth.isFan()) {
            myReg = DataStore.getUserRegistrations(Auth.current().id).find(r => r.eventId === id);
        }

        document.getElementById('app').innerHTML = `
            <div class="detail-header">
                <div class="detail-cover"${cover.style}>${cover.inner}</div>
                <div class="detail-info">
                    <h1 class="detail-title">${Utils.escapeHtml(event.theme)}</h1>
                    <div class="detail-badges">
                        <span class="badge ${attr.className}">${attr.label}</span>
                        <span class="badge ${type.className}">${type.label}</span>
                        <span class="badge ${cd.expired ? 'status-ended' : 'status-ongoing'}">
                            ${cd.expired ? '已截止' : '报名进行中'}
                        </span>
                    </div>
                    <div class="detail-meta">
                        <div class="detail-meta-item">
                            <span class="detail-meta-label">📍 地点</span>
                            <span class="detail-meta-value">${Utils.escapeHtml(event.location)}</span>
                        </div>
                        <div class="detail-meta-item">
                            <span class="detail-meta-label">🗓 时间</span>
                            <span class="detail-meta-value">${Utils.formatDate(event.startTime)} ~ ${Utils.formatDate(event.endTime)}</span>
                        </div>
                        <div class="detail-meta-item">
                            <span class="detail-meta-label">⏰ 截止</span>
                            <span class="detail-meta-value countdown">${cd.text}</span>
                        </div>
                        <div class="detail-meta-item">
                            <span class="detail-meta-label">👥 报名</span>
                            <span class="detail-meta-value">${regCount} 人</span>
                        </div>
                    </div>
                    <div class="detail-actions">
                        ${!cd.expired && Auth.isFan() && !myReg 
                            ? `<button class="btn btn-primary" onclick="location.hash='#/register-event/${id}'">立即报名</button>`
                            : !cd.expired && Auth.isFan() && myReg
                            ? `<button class="btn btn-outline" onclick="location.hash='#/register-event/${id}'">修改报名</button>`
                            : !Auth.isLoggedIn() && !cd.expired
                            ? `<button class="btn btn-primary" onclick="location.hash='#/login'">登录后报名</button>`
                            : ''
                        }
                        ${isOrganizerView
                            ? `<button class="btn btn-secondary" onclick="location.hash='#/manage/${id}'">管理数调</button>
                               <button class="btn btn-outline" onclick="shareEvent('${id}')">分享数调</button>
                               <button class="btn btn-ghost" onclick="location.hash='#/edit/${id}'">编辑信息</button>`
                            : ''
                        }
                        <button class="btn btn-ghost" onclick="location.hash='#/'">← 返回列表</button>
                    </div>
                </div>
            </div>

            ${relatedEvents.length > 0 ? `
            <div class="series-block">
                <div class="series-title">☕ 同一主题 · 其他城市场次</div>
                <div class="series-list">
                    ${relatedEvents.map(r => `
                        <a class="series-item" href="#/event/${r.id}">
                            📍 ${Utils.escapeHtml(r.city)} · ${Utils.formatDate(r.startTime)}
                            <span style="color:var(--color-ink-lighter);">${Utils.escapeHtml(r.location)}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="tabs">
                <button class="tab-btn active" data-tab="info">活动信息</button>
                <button class="tab-btn" data-tab="packages">套餐详情</button>
                <button class="tab-btn" data-tab="materials">物料门槛</button>
                ${Auth.isLoggedIn() ? `<button class="tab-btn" data-tab="verify">我的审核</button>` : ''}
            </div>

            <div id="tab-content">
                <!-- 默认：活动信息 -->
                <div class="tab-panel" data-panel="info">
                    <div class="section-block-title">主要活动内容</div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom: 24px;">
                        ${event.mainActivities && event.mainActivities.length > 0 
                            ? event.mainActivities.map(a => `<span class="material-tag">📌 ${Utils.escapeHtml(a)}</span>`).join('')
                            : '<span style="color: var(--color-ink-lighter);">暂无活动详情</span>'
                        }
                    </div>
                </div>

                <div class="tab-panel hidden" data-panel="packages">
                    <div class="package-list">
                        ${event.packages && event.packages.length > 0 ? event.packages.map(p => `
                            <div class="package-card">
                                <div class="package-name">${Utils.escapeHtml(p.name)}</div>
                                <div class="package-price">¥${p.price}<small>/份</small></div>
                                ${p.items && p.items.length > 0
                                    ? `<div style="font-size:13px; color: var(--color-ink-soft);">
                                        ${p.items.map(i => `• ${Utils.escapeHtml(i)}`).join('<br>')}
                                       </div>`
                                    : ''
                                }
                                ${p.image ? `<div class="package-cover"><img src="${p.image}" alt="套餐图片"></div>` : ''}
                                ${(!p.items || p.items.length === 0) && !p.image
                                    ? '<div class="detail-placeholder">套餐详情待主办补充</div>' : ''}
                            </div>
                        `).join('') : '<span style="color: var(--color-ink-lighter);">暂无套餐信息</span>'}
                    </div>
                </div>

                <div class="tab-panel hidden" data-panel="materials">
                    ${event.tieredMaterials && event.tieredMaterials.length > 0 
                        ? event.tieredMaterials.map(t => {
                            const tierInfo = TIER_MAP[t.level] || { label: t.level, className: '' };
                            const hasMaterials = t.materials && t.materials.length > 0;
                            const hasImages = t.images && t.images.length > 0;
                            return `
                                <div class="tier-section">
                                    <div class="tier-header">
                                        <div class="tier-name">
                                            ${t.name}
                                            <span class="tier-level ${tierInfo.className}">${tierInfo.label}</span>
                                        </div>
                                        ${t.needVerify ? '<span class="review-status pending">需线上审核</span>' : '<span class="review-status approved">自动发放</span>'}
                                    </div>
                                    ${t.requirement ? `<div class="tier-requirement">📝 领取条件：${Utils.escapeHtml(t.requirement)}</div>` : ''}
                                    ${hasImages ? `<div class="material-images">${t.images.map(src => `<img src="${src}" alt="物料图片">`).join('')}</div>` : ''}
                                    ${hasMaterials ? `<div class="tier-materials">${t.materials.map(m => `<span class="material-tag">🎁 ${Utils.escapeHtml(m)}</span>`).join('')}</div>` : ''}
                                    ${!t.requirement && !hasMaterials && !hasImages
                                        ? '<div class="detail-placeholder">物料信息待主办补充</div>' : ''}
                                </div>
                            `;
                        }).join('')
                        : '<div style="color: var(--color-ink-lighter); text-align:center; padding:40px;">暂无物料信息</div>'
                    }
                </div>

                ${Auth.isLoggedIn() ? `
                <div class="tab-panel hidden" data-panel="verify">
                    ${renderVerifyPanel(id, event)}
                </div>
                ` : ''}
            </div>
        `;

        // 绑定 tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
                document.querySelector(`.tab-panel[data-panel="${btn.dataset.tab}"]`).classList.remove('hidden');
            });
        });
    };

    const renderVerifyPanel = (eventId, event) => {
        if (Auth.isFan()) {
            const myReg = DataStore.getUserRegistrations(Auth.current().id).find(r => r.eventId === eventId);
            if (!myReg) {
                return `<div class="empty-state" style="padding:32px;">
                    <div class="empty-icon">📝</div>
                    <p>请先报名活动后再上传物料审核</p>
                </div>`;
            }

            const verifications = DataStore.getUserVerifications(Auth.current().id).filter(v => v.eventId === eventId);
            
            const tiersNeedVerify = (event.tieredMaterials || []).filter(t => t.needVerify);
            if (tiersNeedVerify.length === 0) {
                return `<div style="text-align:center; padding:40px; color: var(--color-ink-lighter);">
                    本活动的物料均可自动领取，无需线上审核 ✨
                </div>`;
            }

            return `
                <div style="font-size:14px; color: var(--color-ink-soft); margin-bottom: 20px;">
                    你的报名套餐：${myReg.packageName} × ${myReg.quantity} 份
                </div>
                ${tiersNeedVerify.map(t => {
                    const tierInfo = TIER_MAP[t.level] || { label: t.level, className: '' };
                    const existingV = verifications.find(v => v.tierId === t.id);
                    return `
                        <div class="tier-section">
                            <div class="tier-header">
                                <div class="tier-name">
                                    ${t.name}
                                    <span class="tier-level ${tierInfo.className}">${tierInfo.label}</span>
                                </div>
                                ${existingV 
                                    ? `<span class="review-status ${existingV.status}">
                                        ${existingV.status === 'pending' ? '⏳ 审核中' : existingV.status === 'approved' ? '✅ 已通过' : '❌ 未通过'}
                                       </span>`
                                    : '<span class="review-status pending">未提交</span>'
                                }
                            </div>
                            ${t.requirement ? `<div class="tier-requirement">📝 领取条件：${Utils.escapeHtml(t.requirement)}</div>` : ''}
                            ${t.images && t.images.length > 0 ? `
                                <div class="material-images">
                                    ${t.images.map(src => `<img src="${src}" alt="物料图片">`).join('')}
                                </div>
                            ` : ''}
                            ${t.materials && t.materials.length > 0 ? `
                                <div class="tier-materials">
                                    ${t.materials.map(m => `<span class="material-tag">🎁 ${Utils.escapeHtml(m)}</span>`).join('')}
                                </div>
                            ` : ''}
                            <div class="section-block-title">上传凭证（图片/视频）</div>
                            <div class="upload-area" onclick="document.getElementById('upload-${t.id}').click()">
                                <div class="upload-icon">📤</div>
                                <div class="upload-text">点击上传图片或视频（最多 5 个）</div>
                                <input type="file" id="upload-${t.id}" multiple accept="image/*,video/*" 
                                    style="display:none" 
                                    onchange="handleUpload(event, '${t.id}', '${eventId}')">
                            </div>
                            <div class="upload-preview" id="preview-${t.id}">
                                ${existingV && existingV.assets ? existingV.assets.map(a => renderUploadItem(a)).join('') : ''}
                            </div>
                            ${existingV && existingV.reviewNote ? `
                                <div style="margin-top:12px; font-size:13px; color: var(--color-ink-soft); padding:12px; background: var(--color-cream); border-radius: 8px;">
                                    主办反馈：${Utils.escapeHtml(existingV.reviewNote)}
                                </div>
                            ` : ''}
                            <div style="margin-top: 16px;">
                                <button class="btn btn-primary btn-sm" onclick="submitVerification('${t.id}', '${eventId}')">
                                    ${existingV ? '重新提交' : '提交审核'}
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            `;
        }
        return '<div style="text-align:center; padding:40px; color: var(--color-ink-lighter);">主办视角无审核面板</div>';
    };

    const renderUploadItem = (asset) => {
        if (asset.type === 'video') {
            return `<div class="upload-item"><video src="${asset.src}" muted></video></div>`;
        }
        return `<div class="upload-item"><img src="${asset.src}" alt=""></div>`;
    };

    /* -------- 创建 / 编辑生咖 -------- */
    const createEvent = () => {
        if (!Auth.requireLogin('#/login')) return;
        if (!Auth.isOrganizer()) {
            document.getElementById('app').innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔒</div>
                    <p>只有生咖主办可以创建活动哦</p>
                    <button class="btn btn-primary" onclick="location.hash='#/'">返回首页</button>
                </div>
            `;
            return;
        }
        renderEventForm(null);
    };

    const editEvent = (id) => {
        if (!Auth.requireLogin('#/login')) return;
        const event = DataStore.getEventById(id);
        if (!event) { Utils.toast('活动不存在', 'error'); return; }
        if (!Auth.isOrganizer() || event.organizerId !== Auth.current().id) {
            Utils.toast('只有活动主办可以编辑', 'error');
            return;
        }
        renderEventForm(event);
    };

    const packageItemHTML = (pkg, idx) => {
        const name = pkg ? pkg.name : '';
        const price = pkg && pkg.price !== undefined && pkg.price !== null ? pkg.price : '';
        const items = pkg && pkg.items ? pkg.items.join('\n') : '';
        const image = pkg && pkg.image ? pkg.image : '';
        return `
            <div class="dynamic-item" data-pkg-index="${idx}" data-pkg-id="${pkg ? pkg.id : ''}">
                <div class="dynamic-item-header">
                    <div class="dynamic-item-title">套餐 ${idx + 1}</div>
                    <button class="remove-btn" onclick="removeDynamicItem(this)">删除</button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">套餐名称 <span class="required">*</span></label>
                        <input type="text" class="form-input pkg-name" value="${escAttr(name)}" placeholder="例如：基础咖啡套餐">
                    </div>
                    <div class="form-group">
                        <label class="form-label">价格（元）</label>
                        <input type="number" class="form-input pkg-price" value="${price}" placeholder="68" min="0">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">套餐内容（文字，可留空）</label>
                    <textarea class="form-textarea pkg-items" placeholder="美式咖啡\n纪念杯套">${Utils.escapeHtml(items)}</textarea>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">套餐图片（可选）</label>
                    <div class="inline-upload">
                        <label class="mini-upload">＋ 上传图片
                            <input type="file" accept="image/*" style="display:none" onchange="handleItemImage(event)">
                        </label>
                        <div class="upload-preview item-img-preview">${image ? `
                            <div class="upload-item">
                                <img src="${image}" alt="套餐图片">
                                <span class="remove-upload" onclick="removeItemImage(event)">✕</span>
                            </div>` : ''}</div>
                    </div>
                    <input type="hidden" class="pkg-image" value="${image}">
                    <div class="form-hint">文字和图片填一种即可，也可以都先空着，之后在「编辑信息」里补充。</div>
                </div>
            </div>`;
    };

    const tierItemHTML = (tier, idx) => {
        const level = tier ? tier.level : 'entry';
        const name = tier ? tier.name : '';
        const requirement = tier && tier.requirement ? tier.requirement : '';
        const mats = tier && tier.materials ? tier.materials.join('\n') : '';
        const images = tier && tier.images ? tier.images : [];
        const needVerify = tier ? !!tier.needVerify : true;
        return `
            <div class="dynamic-item" data-tier-index="${idx}" data-tier-id="${tier ? tier.id : ''}">
                <div class="dynamic-item-header">
                    <div class="dynamic-item-title">物料层级 ${idx + 1}</div>
                    <button class="remove-btn" onclick="removeDynamicItem(this)">删除</button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">层级</label>
                        <select class="form-select tier-level">
                            ${Object.entries(TIER_MAP).map(([k, v]) => `<option value="${k}"${level === k ? ' selected' : ''}>${v.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">层级名称</label>
                        <input type="text" class="form-input tier-name" value="${escAttr(name)}" placeholder="例如：入门礼">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">领取条件（可留空）</label>
                    <textarea class="form-textarea tier-req" placeholder="例如：报名任意套餐即可获得">${Utils.escapeHtml(requirement)}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">包含物料（文字，可留空）</label>
                    <textarea class="form-textarea tier-mats" placeholder="主题杯套\n贴纸1张">${Utils.escapeHtml(mats)}</textarea>
                </div>
                <div class="form-group" style="margin-bottom: var(--space-3);">
                    <label class="form-label">物料图片（可选，最多 4 张）</label>
                    <div class="inline-upload">
                        <label class="mini-upload">＋ 上传图片
                            <input type="file" accept="image/*" multiple style="display:none" onchange="handleTierImages(event)">
                        </label>
                        <div class="upload-preview item-img-preview tier-img-preview">
                            ${images.map((src, i) => `
                                <div class="upload-item">
                                    <img src="${src}" alt="物料图片">
                                    <span class="remove-upload" onclick="removeTierImage(event, ${i})">✕</span>
                                </div>`).join('')}
                        </div>
                    </div>
                    <input type="hidden" class="tier-images" value="${escAttr(JSON.stringify(images))}">
                </div>
                <label class="checkbox-item">
                    <input type="checkbox" class="tier-verify"${needVerify ? ' checked' : ''}> 该层级需要线上审核（用户上传凭证）
                </label>
            </div>`;
    };

    const renderEventForm = (event) => {
        const isEdit = !!event;
        const myEvents = DataStore.getOrganizerEvents(Auth.current().id)
            .filter(e => !isEdit || e.id !== event.id);
        const currentSeriesId = isEdit ? (event.seriesId || '') : '';
        const linkedEvent = currentSeriesId
            ? myEvents.find(e => (e.seriesId || e.id) === currentSeriesId)
            : null;
        const packages = isEdit && event.packages && event.packages.length ? event.packages : [null];
        const tiers = isEdit && event.tieredMaterials && event.tieredMaterials.length ? event.tieredMaterials : [null];

        document.getElementById('app').innerHTML = `
            <div class="form-container" style="max-width: 720px;">
                <div class="section-title" style="margin-bottom: 24px;">${isEdit ? '编辑生咖' : '创建生咖'} ☕</div>
                <div class="form-card">
                    <div class="form-group">
                        <label class="form-label">主题名 <span class="required">*</span></label>
                        <input type="text" class="form-input" id="e-theme" value="${escAttr(isEdit ? event.theme : '')}" placeholder="例如：XX 生日咖啡屋" oninput="syncCoverTitle()">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">属性</label>
                            <select class="form-select" id="e-attr">
                                ${Object.entries(ATTRIBUTE_MAP).map(([k, v]) => `<option value="${k}"${isEdit && event.attribute === k ? ' selected' : ''}>${v.label}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">方式</label>
                            <select class="form-select" id="e-type">
                                ${Object.entries(TYPE_MAP).map(([k, v]) => `<option value="${k}"${isEdit && event.type === k ? ' selected' : ''}>${v.label} — ${v.desc}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">生咖封面</label>
                        <div class="cover-tabs">
                            <button type="button" class="cover-tab" data-cover-tab="generate" onclick="setCoverMode('generate')">在线生成</button>
                            <button type="button" class="cover-tab" data-cover-tab="upload" onclick="setCoverMode('upload')">上传图片</button>
                            <button type="button" class="cover-tab" data-cover-tab="none" onclick="setCoverMode('none')">默认插画</button>
                        </div>

                        <div id="cover-panel-generate" class="cover-panel">
                            <div class="cover-gen-preview" id="cover-gen-preview"></div>
                            <div class="form-group" style="margin-top: var(--space-4); margin-bottom: var(--space-3);">
                                <label class="form-label">封面标题</label>
                                <input type="text" class="form-input" id="cg-title" maxlength="24" placeholder="留空则使用主题名" oninput="updateCoverGen()">
                            </div>
                            <div class="form-group" style="margin-bottom: var(--space-3);">
                                <label class="form-label">副标题（可选）</label>
                                <input type="text" class="form-input" id="cg-sub" maxlength="30" placeholder="例如：生日咖啡屋 · 上海站" oninput="updateCoverGen()">
                            </div>
                            <div class="form-group" style="margin-bottom: var(--space-3);">
                                <label class="form-label">背景颜色</label>
                                <div class="swatch-row" id="cg-bg">
                                    ${COVER_BG_COLORS.map(c => `<span class="swatch" data-color="${c}" style="background:${c}" onclick="pickSwatch(this,'bg')"></span>`).join('')}
                                </div>
                            </div>
                            <div class="form-group" style="margin-bottom: var(--space-2);">
                                <label class="form-label">文字颜色</label>
                                <div class="swatch-row" id="cg-text">
                                    ${COVER_TEXT_COLORS.map(c => `<span class="swatch" data-color="${c}" style="background:${c}" onclick="pickSwatch(this,'text')"></span>`).join('')}
                                </div>
                            </div>
                            <div class="form-hint">封面会按标题自动排版，颜色可随时更换。</div>
                        </div>

                        <div id="cover-panel-upload" class="cover-panel hidden">
                            <div class="upload-area" onclick="document.getElementById('e-cover-file').click()">
                                <div class="upload-icon">🖼️</div>
                                <div class="upload-text">点击上传封面图片（建议横图，≤5MB，自动压缩）</div>
                                <input type="file" id="e-cover-file" accept="image/*" style="display:none" onchange="handleCoverUpload(event)">
                            </div>
                            <div class="upload-preview" id="cover-preview"></div>
                        </div>

                        <div id="cover-panel-none" class="cover-panel hidden">
                            <div class="upload-area" style="cursor:default;">
                                <div class="upload-icon">${coverFallback('')}</div>
                                <div class="upload-text">使用默认咖啡插画</div>
                            </div>
                            <div class="form-group" style="margin-top: var(--space-3); margin-bottom: 0;">
                                <label class="form-label">点缀 Emoji（可选）</label>
                                <input type="text" class="form-input" id="e-cover" value="${escAttr(isEdit && event.coverEmoji ? event.coverEmoji : '')}" placeholder="例如：🌸" maxlength="4">
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">城市</label>
                            <select class="form-select" id="e-city">
                                <option value="">选择城市</option>
                                ${CITIES.map(c => `<option value="${c}"${isEdit && event.city === c ? ' selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">具体地点</label>
                            <input type="text" class="form-input" id="e-location" value="${escAttr(isEdit ? event.location : '')}" placeholder="例如：上海市静安区南京西路xxx号 · XXX CAFE">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">开始时间</label>
                            <input type="datetime-local" class="form-input" id="e-start">
                        </div>
                        <div class="form-group">
                            <label class="form-label">结束时间</label>
                            <input type="datetime-local" class="form-input" id="e-end">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">数调截止日期</label>
                        <input type="datetime-local" class="form-input" id="e-deadline">
                    </div>

                    <div class="form-group">
                        <label class="form-label">主要活动内容（每行一个）</label>
                        <textarea class="form-textarea" id="e-activities" placeholder="粉丝合影墙\n生日蛋糕试吃\n随机舞蹈">${isEdit ? Utils.escapeHtml((event.mainActivities || []).join('\n')) : ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">同一主题系列（可选）</label>
                        <select class="form-select" id="e-series">
                            <option value="">不关联，作为独立生咖</option>
                            ${myEvents.map(e => `<option value="${e.id}"${linkedEvent && linkedEvent.id === e.id ? ' selected' : ''}>${escAttr(e.theme)} · ${escAttr(e.city)}</option>`).join('')}
                        </select>
                        <div class="form-hint">同一主题在不同城市举办时，可以关联成系列，详情页会互相展示其他城市场次。</div>
                    </div>

                    <div class="section-block-title">可购买套餐</div>
                    <div class="dynamic-list" id="packages-list">
                        ${packages.map((p, i) => packageItemHTML(p, i)).join('')}
                    </div>
                    <button class="add-item-btn" onclick="addDynamicItem('package')">＋ 添加套餐</button>

                    <div class="section-block-title">物料门槛（分层级）</div>
                    <div class="dynamic-list" id="tiers-list">
                        ${tiers.map((t, i) => tierItemHTML(t, i)).join('')}
                    </div>
                    <button class="add-item-btn" onclick="addDynamicItem('tier')">＋ 添加物料层级</button>

                    <div class="form-actions">
                        <button class="btn btn-secondary" onclick="${isEdit ? `location.hash='#/event/${event.id}'` : 'history.back()'}">取消</button>
                        <button class="btn btn-primary" onclick="submitCreateEvent()">${isEdit ? '保存修改' : '创建生咖'}</button>
                    </div>
                </div>
            </div>
        `;

        initEventForm(isEdit ? event : null);
    };

    const initEventForm = (event) => {
        const isEdit = !!event;
        window._editingId = isEdit ? event.id : null;
        window._coverImage = isEdit && event.coverImage ? event.coverImage : null;
        window._coverGenerated = isEdit && event.coverGenerated ? { ...event.coverGenerated } : {
            title: '', subtitle: '', bgColor: COVER_BG_COLORS[1], textColor: COVER_TEXT_COLORS[1]
        };
        window._coverMode = isEdit
            ? (event.coverImage ? 'upload' : (event.coverGenerated && event.coverGenerated.title ? 'generate' : 'none'))
            : 'generate';

        if (isEdit) {
            document.getElementById('cg-title').value = event.coverGenerated ? (event.coverGenerated.title || '') : '';
            document.getElementById('cg-sub').value = event.coverGenerated ? (event.coverGenerated.subtitle || '') : '';

            const citySel = document.getElementById('e-city');
            if (event.city && !Array.from(citySel.options).some(o => o.value === event.city)) {
                citySel.insertAdjacentHTML('beforeend', `<option value="${escAttr(event.city)}">${escAttr(event.city)}</option>`);
            }
            citySel.value = event.city || '';

            document.getElementById('e-start').value = Utils.toDatetimeLocal(event.startTime);
            document.getElementById('e-end').value = Utils.toDatetimeLocal(event.endTime);
            document.getElementById('e-deadline').value = Utils.toDatetimeLocal(event.deadline);
        } else {
            const deadline = new Date(Date.now() + 86400000 * 7);
            document.getElementById('e-deadline').value = Utils.toDatetimeLocal(deadline.getTime());
        }

        const bg = window._coverGenerated.bgColor || COVER_BG_COLORS[1];
        const tc = window._coverGenerated.textColor || COVER_TEXT_COLORS[1];
        document.querySelector(`#cg-bg .swatch[data-color="${bg}"]`)?.classList.add('active');
        document.querySelector(`#cg-text .swatch[data-color="${tc}"]`)?.classList.add('active');

        if (window._coverImage) {
            const preview = document.getElementById('cover-preview');
            if (preview) {
                preview.innerHTML = `
                    <div class="upload-item" style="width: 200px; height: 120px;">
                        <img src="${window._coverImage}" alt="封面预览">
                        <span class="remove-upload" onclick="removeCoverImage(event)">✕</span>
                    </div>`;
            }
        }

        setCoverMode(window._coverMode);
    };

    const addDynamicItem = (type) => {
        if (type === 'package') {
            const list = document.getElementById('packages-list');
            list.insertAdjacentHTML('beforeend', packageItemHTML(null, list.children.length));
        } else {
            const list = document.getElementById('tiers-list');
            list.insertAdjacentHTML('beforeend', tierItemHTML(null, list.children.length));
        }
    };

    const removeDynamicItem = (btn) => {
        const container = btn.closest('.dynamic-list');
        if (container.children.length <= 1) {
            Utils.toast('至少保留一项', 'warning');
            return;
        }
        btn.closest('.dynamic-item').remove();
    };

    const parseLines = (str) => {
        if (!str) return [];
        return str.split('\n').map(s => s.trim()).filter(s => s);
    };

    const submitCreateEvent = () => {
        const theme = document.getElementById('e-theme').value.trim();
        const attribute = document.getElementById('e-attr').value;
        const type = document.getElementById('e-type').value;
        const city = document.getElementById('e-city').value;
        const locationText = document.getElementById('e-location').value.trim();
        const startTime = Utils.fromDatetimeLocal(document.getElementById('e-start').value);
        const endTime = Utils.fromDatetimeLocal(document.getElementById('e-end').value);
        const deadline = Utils.fromDatetimeLocal(document.getElementById('e-deadline').value);
        const activities = parseLines(document.getElementById('e-activities').value);

        if (!theme) { Utils.toast('请填写主题名', 'error'); return; }
        if (!city) { Utils.toast('请选择城市', 'error'); return; }
        if (!locationText) { Utils.toast('请填写具体地点', 'error'); return; }
        if (!startTime) { Utils.toast('请填写开始时间', 'error'); return; }
        if (!endTime) { Utils.toast('请填写结束时间', 'error'); return; }
        if (!deadline) { Utils.toast('请填写截止日期', 'error'); return; }
        if (endTime <= startTime) { Utils.toast('结束时间需晚于开始时间', 'error'); return; }
        if (deadline >= startTime) { Utils.toast('截止日期需早于活动开始', 'error'); return; }

        // 收集套餐（保留原有 id，避免报名记录失效）
        const packages = [];
        document.querySelectorAll('#packages-list .dynamic-item').forEach(item => {
            const name = item.querySelector('.pkg-name').value.trim();
            const price = parseFloat(item.querySelector('.pkg-price').value) || 0;
            const items = parseLines(item.querySelector('.pkg-items').value);
            const image = item.querySelector('.pkg-image').value || '';
            if (name) packages.push({ id: item.dataset.pkgId || DataStore.uid(), name, price, items, image });
        });
        if (packages.length === 0) { Utils.toast('至少填写一个套餐名称', 'error'); return; }

        // 收集物料层级（条件/文字/图片都可以先留空）
        const tieredMaterials = [];
        document.querySelectorAll('#tiers-list .dynamic-item').forEach(item => {
            const level = item.querySelector('.tier-level').value;
            const name = item.querySelector('.tier-name').value.trim() || TIER_MAP[level].label;
            const requirement = item.querySelector('.tier-req').value.trim();
            const materials = parseLines(item.querySelector('.tier-mats').value);
            let images = [];
            try {
                images = JSON.parse(item.querySelector('.tier-images').value || '[]');
            } catch (e) { images = []; }
            const needVerify = item.querySelector('.tier-verify').checked;
            if (requirement || materials.length > 0 || images.length > 0 || item.querySelector('.tier-name').value.trim()) {
                tieredMaterials.push({
                    id: item.dataset.tierId || DataStore.uid(),
                    level, name, requirement, materials, images, needVerify
                });
            }
        });

        // 封面
        const coverMode = window._coverMode || 'generate';
        let coverImage = '';
        let coverGenerated = null;
        let coverEmoji = '';
        if (coverMode === 'upload') {
            coverImage = window._coverImage || '';
        } else if (coverMode === 'generate') {
            coverGenerated = {
                title: (window._coverGenerated.title || theme).trim(),
                subtitle: (window._coverGenerated.subtitle || '').trim(),
                bgColor: window._coverGenerated.bgColor,
                textColor: window._coverGenerated.textColor
            };
        } else {
            coverEmoji = document.getElementById('e-cover').value.trim();
        }

        // 同主题系列关联
        const seriesPick = document.getElementById('e-series').value;
        let seriesId = '';
        if (seriesPick) {
            const base = DataStore.getEventById(seriesPick);
            if (base) {
                seriesId = base.seriesId || base.id;
                if (!base.seriesId) DataStore.updateEvent(base.id, { seriesId });
            }
        }

        const payload = {
            theme, attribute, type, city, location: locationText,
            coverImage, coverGenerated, coverEmoji,
            startTime, endTime, deadline,
            mainActivities: activities,
            packages,
            tieredMaterials,
            seriesId
        };

        try {
            if (window._editingId) {
                const updated = DataStore.updateEvent(window._editingId, payload);
                Utils.toast('生咖信息已更新 ✨', 'success');
                location.hash = `#/event/${updated.id}`;
            } else {
                const user = Auth.current();
                const newEvent = DataStore.createEvent({ ...payload, organizerId: user.id });
                Utils.toast('生咖创建成功 🎉', 'success');
                location.hash = `#/event/${newEvent.id}`;
            }
        } catch (err) {
            console.error('保存生咖失败:', err);
            Utils.toast('保存失败，请重试', 'error');
        }
    };

    /* -------- 粉丝报名 -------- */
    const registerEvent = (eventId) => {
        if (!Auth.requireLogin('#/login')) return;
        if (!Auth.isFan()) {
            Utils.toast('请使用粉丝账号报名', 'warning');
            return;
        }

        const event = DataStore.getEventById(eventId);
        if (!event) { Utils.toast('活动不存在', 'error'); return; }
        if (!DataStore.isBeforeDeadline(event)) {
            Utils.toast('报名已截止', 'error');
            return;
        }

        let myReg = DataStore.getUserRegistrations(Auth.current().id).find(r => r.eventId === eventId);

        document.getElementById('app').innerHTML = `
            <div class="form-container">
                <div class="section-title" style="margin-bottom: 24px;">${myReg ? '修改报名' : '报名参加'} 📝</div>
                <div class="form-card">
                    <div style="margin-bottom: 20px;">
                        <div style="font-weight: 600; font-size: 18px; margin-bottom: 4px;">${Utils.escapeHtml(event.theme)}</div>
                        <div style="font-size: 13px; color: var(--color-ink-soft);">📍 ${event.location} · ${Utils.formatDate(event.startTime)}</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">我的 ID / 昵称 <span class="required">*</span></label>
                        <input type="text" class="form-input" id="reg-fan-id" 
                            value="${Utils.escapeHtml(myReg ? myReg.fanId : Auth.current().nickname)}" 
                            placeholder="填写你的粉丝 ID 或昵称">
                    </div>

                    <div class="form-group">
                        <label class="form-label">选择套餐</label>
                        <div class="package-list">
                            ${event.packages.map((p, idx) => {
                                const selected = myReg && myReg.packageId === p.id;
                                return `
                                <div class="package-card ${selected ? 'pkg-selected' : ''}" 
                                     style="cursor:pointer; ${selected ? 'border-color: var(--color-accent); background: var(--color-accent-soft);' : ''}"
                                     data-package-id="${p.id}"
                                     onclick="selectPackage('${p.id}')">
                                    <div class="package-name">${Utils.escapeHtml(p.name)}</div>
                                    <div class="package-price">¥${p.price}<small>/份</small></div>
                                    ${p.items && p.items.length > 0 ? `<div style="font-size:13px; color: var(--color-ink-soft); margin-top: 8px;">
                                        ${p.items.map(i => `• ${Utils.escapeHtml(i)}`).join('<br>')}
                                    </div>` : ''}
                                    ${p.image ? `<div class="package-cover"><img src="${p.image}" alt="套餐图片"></div>` : ''}
                                    <div style="margin-top: 12px; font-size: 12px; color: var(--color-accent);">
                                        ${selected ? '✓ 已选择' : '点击选择'}
                                    </div>
                                </div>
                            `}).join('')}
                        </div>
                        <input type="hidden" id="selected-package" value="${myReg ? myReg.packageId : ''}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">购买份数</label>
                        <div class="quantity-selector">
                            <button class="qty-btn" onclick="changeQty(-1)">－</button>
                            <span class="qty-value" id="qty-value">${myReg ? myReg.quantity : 1}</span>
                            <button class="qty-btn" onclick="changeQty(1)">＋</button>
                        </div>
                    </div>

                    <div style="background: var(--color-cream); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                        <div style="font-size: 13px; color: var(--color-ink-soft); margin-bottom: 4px;">预估总额</div>
                        <div style="font-size: 24px; font-weight: 600; color: var(--color-accent);" id="total-price">¥0</div>
                    </div>

                    <div class="form-actions">
                        <button class="btn btn-secondary" onclick="location.hash='#/event/${eventId}'">取消</button>
                        <button class="btn btn-primary" onclick="submitRegistration('${eventId}')">
                            ${myReg ? '保存修改' : '确认报名'}
                        </button>
                        ${myReg ? `<button class="btn btn-outline" onclick="cancelRegistration('${eventId}')" style="color: #A85A46; border-color: #C08A76;">取消报名</button>` : ''}
                    </div>

                    <div style="margin-top: 20px; font-size: 12px; color: var(--color-ink-lighter); text-align: center;">
                        数调截止前可随时修改哦 · 截止时间 ${Utils.formatDate(event.deadline, true)}
                    </div>
                </div>
            </div>
        `;

        // 绑定更新总额
        const qtyEl = document.getElementById('qty-value');
        const updateTotal = () => {
            const pkgId = document.getElementById('selected-package').value;
            const pkg = event.packages.find(p => p.id === pkgId);
            const qty = parseInt(qtyEl.textContent);
            const total = pkg ? pkg.price * qty : 0;
            document.getElementById('total-price').textContent = `¥${total}`;
        };
        updateTotal();
        // 暴露更新函数
        window._updateTotal = updateTotal;
    };

    const selectPackage = (pkgId) => {
        // 清除之前选择
        document.querySelectorAll('.package-card[data-package-id]').forEach(card => {
            const isSelected = card.dataset.packageId === pkgId;
            card.style.borderColor = isSelected ? 'var(--color-accent)' : '';
            card.style.background = isSelected ? 'var(--color-accent-soft)' : '';
            // 移除旧的状态文字
            const oldStatus = card.querySelector('.pkg-status');
            if (oldStatus) oldStatus.remove();
            // 添加新的状态文字
            const status = document.createElement('div');
            status.className = 'pkg-status';
            status.style.marginTop = '12px';
            status.style.fontSize = '12px';
            status.style.color = 'var(--color-accent)';
            status.textContent = isSelected ? '✓ 已选择' : '点击选择';
            card.appendChild(status);
        });
        document.getElementById('selected-package').value = pkgId;
        window._updateTotal && window._updateTotal();
    };

    const changeQty = (delta) => {
        const el = document.getElementById('qty-value');
        let v = parseInt(el.textContent) + delta;
        if (v < 1) v = 1;
        if (v > 100) v = 100;
        el.textContent = v;
        window._updateTotal && window._updateTotal();
    };

    const submitRegistration = (eventId) => {
        const fanId = document.getElementById('reg-fan-id').value.trim();
        const packageId = document.getElementById('selected-package').value;
        const quantity = parseInt(document.getElementById('qty-value').textContent);

        if (!fanId) { Utils.toast('请填写你的 ID/昵称', 'error'); return; }
        if (!packageId) { Utils.toast('请选择一个套餐', 'error'); return; }

        const event = DataStore.getEventById(eventId);
        const pkg = event.packages.find(p => p.id === packageId);
        const total = pkg.price * quantity;
        const user = Auth.current();

        let myReg = DataStore.getUserRegistrations(user.id).find(r => r.eventId === eventId);

        if (myReg) {
            DataStore.updateRegistration(myReg.id, {
                fanId, packageId, packageName: pkg.name, packagePrice: pkg.price, quantity, total
            });
            Utils.toast('报名已更新 ✨', 'success');
        } else {
            DataStore.createRegistration({
                userId: user.id,
                eventId,
                fanId,
                packageId,
                packageName: pkg.name,
                packagePrice: pkg.price,
                quantity,
                total
            });
            Utils.toast('报名成功 🎉', 'success');
        }

        setTimeout(() => { location.hash = `#/event/${eventId}`; }, 600);
    };

    const cancelRegistration = (eventId) => {
        Utils.confirm('确认取消报名吗？此操作不可恢复。', () => {
            const user = Auth.current();
            const reg = DataStore.getUserRegistrations(user.id).find(r => r.eventId === eventId);
            if (reg) {
                DataStore.deleteRegistration(reg.id);
                Utils.toast('已取消报名', 'success');
                setTimeout(() => { location.hash = `#/event/${eventId}`; }, 500);
            }
        }, '取消报名');
    };

    /* -------- 主办方管理页 -------- */
    const manageEvent = (eventId) => {
        const event = DataStore.getEventById(eventId);
        if (!event) { Utils.toast('活动不存在', 'error'); return; }
        const user = Auth.current();
        if (!user || user.id !== event.organizerId) {
            Utils.toast('你不是这个活动的主办', 'error');
            return;
        }

        const registrations = DataStore.getRegistrationsByEvent(eventId);
        const verifications = DataStore.getVerificationsByEvent(eventId);
        const totalRevenue = registrations.reduce((sum, r) => sum + r.total, 0);
        const pendingCount = verifications.filter(v => v.status === 'pending').length;

        document.getElementById('app').innerHTML = `
            <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 24px; flex-wrap: wrap; gap:12px;">
                <div>
                    <div class="section-title" style="margin-bottom: 0;">数调管理</div>
                    <div style="font-size: 15px; color: var(--color-ink-soft); margin-top: 4px;">${Utils.escapeHtml(event.theme)}</div>
                </div>
                <div style="display:flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-primary btn-sm" onclick="shareEvent('${eventId}')">分享数调</button>
                    <button class="btn btn-outline btn-sm" onclick="exportRegistrations('${eventId}', 'xlsx')">导出 Excel</button>
                    <button class="btn btn-outline btn-sm" onclick="exportRegistrations('${eventId}', 'txt')">导出 TXT</button>
                    <button class="btn btn-outline btn-sm" onclick="exportRegistrations('${eventId}', 'pdf')">导出 PDF</button>
                    <button class="btn btn-secondary btn-sm" onclick="location.hash='#/event/${eventId}'">查看活动</button>
                </div>
            </div>

            <div class="stats-row">
                <div class="stat-card">
                    <div class="stat-value">${registrations.length}</div>
                    <div class="stat-label">报名人数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">¥${totalRevenue}</div>
                    <div class="stat-label">预计营收</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${registrations.reduce((s, r) => s + r.quantity, 0)}</div>
                    <div class="stat-label">套餐份数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${pendingCount}</div>
                    <div class="stat-label">待审核物料</div>
                </div>
            </div>

            <div class="tabs">
                <button class="tab-btn active" data-tab="regs">报名名单</button>
                <button class="tab-btn" data-tab="verify">物料审核</button>
            </div>

            <div id="tab-content">
                <div class="tab-panel" data-panel="regs">
                    ${renderRegistrationList(registrations, event)}
                </div>
                <div class="tab-panel hidden" data-panel="verify">
                    ${renderVerificationList(verifications, event)}
                </div>
            </div>
        `;

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
                document.querySelector(`.tab-panel[data-panel="${btn.dataset.tab}"]`).classList.remove('hidden');
            });
        });
    };

    const renderRegistrationList = (registrations, event) => {
        if (registrations.length === 0) {
            return `<div class="empty-state"><div class="empty-icon">📭</div><p>还没有报名记录</p></div>`;
        }
        // 按套餐分组统计
        const pkgStats = {};
        registrations.forEach(r => {
            if (!pkgStats[r.packageName]) pkgStats[r.packageName] = { count: 0, qty: 0 };
            pkgStats[r.packageName].count++;
            pkgStats[r.packageName].qty += r.quantity;
        });

        return `
            <div style="margin-bottom: 16px; font-size: 13px; color: var(--color-ink-soft);">
                <strong>套餐统计：</strong>
                ${Object.entries(pkgStats).map(([name, s]) => 
                    `${Utils.escapeHtml(name)} — ${s.count} 人 / ${s.qty} 份`
                ).join(' ｜ ')}
            </div>
            <div style="overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>序号</th>
                            <th>粉丝 ID</th>
                            <th>套餐</th>
                            <th>份数</th>
                            <th>小计</th>
                            <th>报名时间</th>
                            <th>最近修改</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${registrations.map((r, idx) => `
                            <tr>
                                <td>${idx + 1}</td>
                                <td>${Utils.escapeHtml(r.fanId)}</td>
                                <td>${Utils.escapeHtml(r.packageName)}</td>
                                <td>${r.quantity}</td>
                                <td>¥${r.total}</td>
                                <td>${Utils.formatDate(r.createdAt, true)}</td>
                                <td>${Utils.formatDate(r.updatedAt, true)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    };

    const renderVerificationList = (verifications, event) => {
        if (verifications.length === 0) {
            return `<div class="empty-state"><div class="empty-icon">📭</div><p>暂无物料审核提交</p></div>`;
        }
        const pending = verifications.filter(v => v.status === 'pending').length;
        return `
            <div style="margin-bottom: 16px;">
                <span style="font-size:14px; color: var(--color-ink-soft);">共 ${verifications.length} 条提交，其中</span>
                <span class="review-status pending">${pending} 待审核</span>
                <span class="review-status approved" style="margin-left:8px;">${verifications.filter(v=>v.status==='approved').length} 通过</span>
                <span class="review-status rejected" style="margin-left:8px;">${verifications.filter(v=>v.status==='rejected').length} 未过</span>
            </div>
            ${verifications.sort((a,b) => a.status === 'pending' ? -1 : b.status === 'pending' ? 1 : 0).map(v => {
                const tier = event.tieredMaterials.find(t => t.id === v.tierId);
                const tierInfo = TIER_MAP[tier?.level] || { label: '' };
                return `
                    <div class="tier-section">
                        <div class="tier-header">
                            <div class="tier-name">
                                ${Utils.escapeHtml(v.fanId || '未知用户')}
                                ${tier ? `<span class="tier-level ${tierInfo.className}">${tierInfo.label}</span>` : ''}
                            </div>
                            <span class="review-status ${v.status}">
                                ${v.status === 'pending' ? '⏳ 待审核' : v.status === 'approved' ? '✅ 已通过' : '❌ 未通过'}
                            </span>
                        </div>
                        <div style="font-size:12px; color: var(--color-ink-lighter); margin-bottom: 8px;">
                            提交时间：${Utils.formatDate(v.createdAt, true)}
                        </div>
                        ${tier ? `<div class="tier-requirement">📝 要求：${Utils.escapeHtml(tier.requirement)}</div>` : ''}
                        ${v.assets && v.assets.length > 0 ? `
                            <div class="upload-preview">
                                ${v.assets.map(a => renderUploadItem(a)).join('')}
                            </div>
                        ` : '<div style="color: var(--color-ink-lighter); font-size:13px;">未上传凭证</div>'}
                        ${v.status === 'pending' ? `
                            <div style="margin-top: 16px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                <button class="btn btn-primary btn-sm" onclick="reviewVerification('${v.id}', 'approved', '')">✅ 通过</button>
                                <button class="btn btn-outline btn-sm" style="color:#A85A46; border-color:#C08A76;" 
                                    onclick="reviewVerification('${v.id}', 'rejected', prompt('请输入拒绝理由：') || '')">❌ 拒绝</button>
                            </div>
                        ` : v.reviewNote ? `<div style="margin-top: 12px; font-size:13px; color: var(--color-ink-soft); padding:12px; background: var(--color-cream); border-radius: 8px;">反馈：${Utils.escapeHtml(v.reviewNote)}</div>` : ''}
                    </div>
                `;
            }).join('')}
        `;
    };

    /* -------- 我的生咖 -------- */
    const myPage = () => {
        if (!Auth.requireLogin('#/login')) return;

        const user = Auth.current();
        document.getElementById('app').innerHTML = `
            <div style="display:flex; align-items:center; gap:16px; margin-bottom: 32px; padding: 24px; background: linear-gradient(135deg, var(--color-accent-soft), var(--color-cream)); border-radius: var(--radius-lg);">
                <div style="font-size: 48px;">${user.role === 'organizer' ? '🎪' : '💖'}</div>
                <div>
                    <div style="font-weight: 600; font-size: 18px;">${Utils.escapeHtml(user.nickname)}</div>
                    <div style="font-size: 13px; color: var(--color-ink-soft);">
                        ${user.role === 'organizer' ? '生咖主办 · 创建并管理活动' : '粉丝 · 参与活动，领取物料'}
                    </div>
                </div>
                <div style="margin-left: auto;">
                    <button class="btn btn-ghost btn-sm" onclick="handleLogout()">退出登录</button>
                </div>
            </div>

            <div class="tabs">
                ${user.role === 'organizer' 
                    ? '<button class="tab-btn active" data-tab="my-events">我创建的生咖</button>'
                    : '<button class="tab-btn active" data-tab="my-regs">我的报名</button>'
                }
            </div>

            <div id="tab-content">
                ${user.role === 'organizer' 
                    ? `<div class="tab-panel" data-panel="my-events">${renderMyOrganizerEvents(user.id)}</div>`
                    : `<div class="tab-panel" data-panel="my-regs">${renderMyFanRegistrations(user.id)}</div>`
                }
            </div>
        `;
    };

    const renderMyOrganizerEvents = (organizerId) => {
        const events = DataStore.getOrganizerEvents(organizerId);
        if (events.length === 0) {
            return `<div class="empty-state">
                <div class="empty-icon">${coverFallback('')}</div>
                <p>还没有创建过生咖活动</p>
                <button class="btn btn-primary" onclick="location.hash='#/create'">创建第一个生咖</button>
            </div>`;
        }
        return events.map(e => {
            const cd = Utils.getCountdown(e.deadline);
            const regs = DataStore.getRegistrationsByEvent(e.id);
            const revenue = regs.reduce((s, r) => s + r.total, 0);
            const cover = coverThumb(e);
            return `
                <div class="my-registration-card">
                    <div class="my-reg-cover"${cover.style}>${cover.inner}</div>
                    <div class="my-reg-info">
                        <div class="my-reg-title">${Utils.escapeHtml(e.theme)}</div>
                        <div class="my-reg-meta">
                            📅 ${Utils.formatDate(e.startTime)} · 👥 ${regs.length}人 · ¥${revenue} · 
                            <span class="${cd.expired ? '' : 'countdown'}">${cd.text}</span>
                        </div>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="shareEvent('${e.id}')">分享</button>
                    <button class="btn btn-outline btn-sm" onclick="location.hash='#/manage/${e.id}'">管理</button>
                </div>
            `;
        }).join('');
    };

    const renderMyFanRegistrations = (userId) => {
        const regs = DataStore.getUserRegistrations(userId);
        if (regs.length === 0) {
            return `<div class="empty-state">
                <div class="empty-icon">💫</div>
                <p>还没有报名任何生咖活动</p>
                <button class="btn btn-primary" onclick="location.hash='#/'">去探索</button>
            </div>`;
        }
        return regs.map(r => {
            const event = DataStore.getEventById(r.eventId);
            if (!event) return '';
            const cd = Utils.getCountdown(event.deadline);
            const cover = coverThumb(event);
            return `
                <div class="my-registration-card">
                    <div class="my-reg-cover"${cover.style}>${cover.inner}</div>
                    <div class="my-reg-info">
                        <div class="my-reg-title">${Utils.escapeHtml(event.theme)}</div>
                        <div class="my-reg-meta">
                            📦 ${Utils.escapeHtml(r.packageName)} × ${r.quantity} · ¥${r.total} · 
                            <span class="${cd.expired ? '' : 'countdown'}">${cd.text}</span>
                        </div>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="location.hash='#/event/${event.id}'">查看</button>
                </div>
            `;
        }).join('');
    };

    return { home, login, register, eventDetail, createEvent, editEvent, registerEvent, manageEvent, myPage, 
        selectRole, handleLogin, handleRegister, selectPackage, changeQty, 
        submitRegistration, cancelRegistration, addDynamicItem, removeDynamicItem, submitCreateEvent,
        coverGenInner };
})();
