/* ============================================
   云端数据层 - Supabase REST
   未配置 config.js 时自动退化为纯本地模式
   ============================================ */

const Remote = (() => {
    const cfg = (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG) ? SUPABASE_CONFIG : {};
    const url = String(cfg.url || '').replace(/\/+$/, '');
    const key = String(cfg.anonKey || '');
    const enabled = !!(url && key);

    const headers = () => ({
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
    });

    const request = async (path, options = {}) => {
        if (!enabled) throw new Error('Supabase 未配置');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        try {
            const res = await fetch(`${url}/rest/v1/${path}`, {
                ...options,
                signal: controller.signal,
                headers: { ...headers(), ...(options.headers || {}) }
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
            }
            const text = await res.text();
            return text ? JSON.parse(text) : null;
        } finally {
            clearTimeout(timer);
        }
    };

    /* 去掉只在本地有意义的标记，避免把大体积快照再传上云 */
    const cleanEvent = (event) => {
        const copy = { ...event };
        delete copy.__shared;
        delete copy.__fromShare;
        delete copy.__remoteCount;
        return copy;
    };

    const cleanRegistration = (reg) => {
        const copy = { ...reg };
        delete copy.__event;
        delete copy.__cloud;
        return copy;
    };

    return {
        enabled,

        /* 新建或更新活动 */
        async publishEvent(event) {
            if (!enabled || !event || !event.id) return false;
            try {
                await request('bc_events?on_conflict=id', {
                    method: 'POST',
                    headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
                    body: JSON.stringify({
                        id: event.id,
                        data: cleanEvent(event),
                        updated_at: new Date().toISOString()
                    })
                });
                return true;
            } catch (e) {
                console.warn('云端保存活动失败：', e);
                return false;
            }
        },

        /* 按 id 读取活动，返回活动对象或 null */
        async readEvent(id) {
            if (!enabled || !id) return null;
            const rows = await request(
                `bc_events?id=eq.${encodeURIComponent(id)}&select=data&limit=1`
            );
            if (!rows || rows.length === 0) return null;
            return rows[0].data || null;
        },

        /* 读取某个活动的全部报名（云端数据） */
        async listRegistrations(eventId) {
            if (!enabled || !eventId) return [];
            const rows = await request(
                `bc_registrations?event_id=eq.${encodeURIComponent(eventId)}&select=data&order=created_at.asc`
            );
            return (rows || []).map(row => ({
                ...(row.data || {}),
                eventId,
                __cloud: true
            }));
        },

        /* 报名写入云端（同 id 覆盖，便于粉丝修改报名） */
        async addRegistration(eventId, reg) {
            if (!enabled || !eventId || !reg || !reg.id) return false;
            try {
                await request('bc_registrations?on_conflict=id', {
                    method: 'POST',
                    headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
                    body: JSON.stringify({
                        id: reg.id,
                        event_id: eventId,
                        data: cleanRegistration(reg),
                        updated_at: new Date().toISOString()
                    })
                });
                return true;
            } catch (e) {
                console.warn('云端保存报名失败：', e);
                return false;
            }
        },

        /* 取消报名 */
        async deleteRegistration(id) {
            if (!enabled || !id) return false;
            try {
                await request(`bc_registrations?id=eq.${encodeURIComponent(id)}`, {
                    method: 'DELETE',
                    headers: { 'Prefer': 'return=minimal' }
                });
                return true;
            } catch (e) {
                console.warn('云端删除报名失败：', e);
                return false;
            }
        }
    };
})();

window.Remote = Remote;
