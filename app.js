const SUPABASE_URL = 'https://hqscfwwaznpqhshuujmo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6otq5jDEKMoy-d7VWcB11w_3lr4FEe5';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.onload = () => {
    fetchData();
    setInterval(fetchData, 10000);
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('تم تسجيل Service Worker بنجاح'))
            .catch(err => console.error('فشل تسجيل Service Worker:', err));
    }

    // إظهار زر الإشعارات دائماً ما لم تكن الصلاحية ممنوحة بالفعل
    const notifyBtn = document.getElementById('notify-btn');
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        notifyBtn.style.display = 'block';
    }
};

async function fetchData() {
    try {
        const { data: deviceData } = await supabaseClient
            .from('device_status')
            .select('*')
            .eq('id', 'esp32_gate')
            .single();

        if (deviceData) {
            const powerDiv = document.getElementById('power-status');
            if (deviceData.status === 'online') {
                powerDiv.className = 'status-card online';
                powerDiv.textContent = 'حالة الكهرباء والشبكة: متصل ⚡';
            } else {
                powerDiv.className = 'status-card offline';
                powerDiv.textContent = 'حالة الكهرباء والشبكة: منقطع ❌';
            }
        }

        const { data: doorData } = await supabaseClient
            .from('door_logs')
            .select('*')
            .order('logged_at', { ascending: false })
            .limit(1);

        if (doorData && doorData.length > 0) {
            const doorDiv = document.getElementById('door-status');
            if (doorData[0].action === 'opened') {
                doorDiv.className = 'status-card door-open';
                doorDiv.textContent = 'حالة الباب الحالية: مفتوح 🚪';
            } else {
                doorDiv.className = 'status-card door-closed';
                doorDiv.textContent = 'حالة الباب الحالية: مغلق 🔒';
            }
        }

        const { data: logs } = await supabaseClient
            .from('door_logs')
            .select('*')
            .order('logged_at', { ascending: false })
            .limit(5);

        const listAdmin = document.getElementById('events-list');
        listAdmin.innerHTML = '';

        if (logs && logs.length > 0) {
            logs.forEach(log => {
                const li = document.createElement('li');
                const actionText = log.action === 'opened' ? 'تم فتح الباب 🚪' : 'تم إغلاق الباب 🔒';
                const eventTime = new Date(log.logged_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                const eventDate = new Date(log.logged_at).toLocaleDateString('ar-SA', { month: 'numeric', day: 'numeric' });

                li.innerHTML = `<span>${actionText}</span> <span class="time">${eventDate} - ${eventTime}</span>`;
                listAdmin.appendChild(li);
            });
        } else {
            listAdmin.innerHTML = '<li>لا توجد أحداث مسجلة بعد.</li>';
        }

    } catch (err) {
        console.error("خطأ في جلب البيانات الدورية:", err);
    }
}

async function viewFullHistory(type) {
    const historySection = document.getElementById('history-section');
    const historyTitle = document.getElementById('history-title');
    const tableBody = document.getElementById('history-table-body');
    
    historySection.classList.remove('hidden');
    tableBody.innerHTML = '<tr><td style="text-align:center; padding:10px;">جاري تحميل السجل الكامل...</td></tr>';

    const tableName = type === 'door' ? 'door_logs' : 'power_logs';
    historyTitle.textContent = type === 'door' ? 'سجل حركة الباب الكامل 🚪' : 'سجل حالات الكهرباء الكامل ⚡';

    try {
        const { data, error } = await supabaseClient
            .from(tableName)
            .select('*')
            .order('logged_at', { ascending: false });

        if (error) throw error;

        tableBody.innerHTML = '';
        
        if (data && data.length > 0) {
            data.forEach(row => {
                const tr = document.createElement('tr');
                let detailText = '';

                if (type === 'door') {
                    detailText = row.action === 'opened' ? 'تم فتح الباب 🚪' : 'تم إغلاق الباب 🔒';
                } else {
                    detailText = row.event_type === 'power_loss' ? 'تأكيد انقطاع تيار الكهرباء/الشبكة ❌' : 'تأكيد عودة تيار الكهرباء/الشبكة ⚡';
                }

                const eventTime = new Date(row.logged_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                const eventDate = new Date(row.logged_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

                tr.innerHTML = `
                    <td>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <b>${detailText}</b>
                            <span class="time" style="font-size: 12px; color: #8e8e93;">${eventDate} - ${eventTime}</span>
                        </div>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        } else {
            tableBody.innerHTML = '<tr><td style="text-align:center; padding:10px;">لا توجد سجلات محفوظة.</td></tr>';
        }
    } catch (err) {
        console.error("خطأ في تحميل السجل التاريخي الكامل:", err);
        tableBody.innerHTML = '<tr><td style="text-align:center; padding:10px; color:red;">فشل جلب البيانات، تحقق من تفعيل RLS للجدول.</td></tr>';
    }
}

function requestNotificationPermission() {
    if (!('Notification' in window)) {
        alert('متصفحك الحالي لا يدعم الإشعارات. تأكد من تحديث نظام الآيفون إلى 16.4 أو أحدث، وأضف الموقع للشاشة الرئيسية.');
        return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
        alert('ملاحظة أمنية من Apple: لتفعيل الإشعارات، يجب عليك الضغط على زر "مشاركة" بالأسفل واختيار "إضافة إلى الشاشة الرئيسية" (Add to Home Screen)، ثم افتح التطبيق من الشاشة لتفعيل الإشعارات.');
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            document.getElementById('notify-btn').style.display = 'none';
            alert('تم تفعيل الإشعارات بنجاح!');
        } else {
            alert('تم رفض الإشعارات. يمكنك تفعيلها لاحقاً من إعدادات النظام.');
        }
    });
}
