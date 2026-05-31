const SUPABASE_URL = 'https://hqscfwwaznpqhshuujmo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6otq5jDEKMoy-d7VWcB11w_3lr4FEe5';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.onload = () => {
    fetchData();
    // جلب تلقائي كل 10 ثوانٍ لتحديث البطاقات الرئيسية والسجل القصير
    setInterval(fetchData, 10000);
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('تم تسجيل Service Worker بنجاح'))
            .catch(err => console.error('فشل تسجيل Service Worker:', err));
    }
};

// 1. وظيفة الجلب المستمر للبطاقات الرئيسية وآخر 5 أحداث
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

// 2. وظيفة جلب وعرض القراءات الكاملة داخل الجدول التاريخي عند الضغط على الأزرار
async function viewFullHistory(type) {
    const historySection = document.getElementById('history-section');
    const historyTitle = document.getElementById('history-title');
    const tableBody = document.getElementById('history-table-body');
    
    // إظهار قسم السجل وتجهيز شاشة الانتظار
    historySection.classList.remove('hidden');
    tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:10px;">جاري تحميل السجل الكامل...</td></tr>';

    // تحديد الجدول المستهدف بناءً على نوع الزر المكبوس
    const tableName = type === 'door' ? 'door_logs' : 'power_logs';
    historyTitle.textContent = type === 'door' ? 'سجل حركة الباب الكامل 🚪' : 'سجل حالات الكهرباء الكامل ⚡';

    try {
        // جلب جميع البيانات مرتبة من الأحدث إلى الأقدم
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

                // صياغة النص بناءً على نوع البيانات المجلوبة
                if (type === 'door') {
                    detailText = row.action === 'opened' ? 'تم فتح الباب 🚪' : 'تم إغلاق الباب 🔒';
                } else {
                    detailText = row.event_type === 'power_loss' ? 'تأكيد انقطاع تيار الكهرباء/الشبكة ❌' : 'تأكيد عودة تيار الكهرباء/الشبكة ⚡';
                }

                const eventTime = new Date(row.logged_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                const eventDate = new Date(row.logged_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

                tr.innerHTML = `
                    <td><b>${detailText}</b></td>
                    <td class="time">${eventDate} في ${eventTime}</td>
                `;
                tableBody.appendChild(tr);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:10px;">لا توجد سجلات محفوظة في هذا الجدول بعد.</td></tr>';
        }
    } catch (err) {
        console.error("خطأ في تحميل السجل التاريخي الكامل:", err);
        tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:10px; color:red;">فشل جلب البيانات، تحقق من تفعيل RLS للجدول.</td></tr>';
    }
}
// التحقق من حالة الإشعارات عند تحميل الصفحة
if ('Notification' in window) {
    if (Notification.permission === 'default') {
        // إظهار الزر إذا لم يوافق أو يرفض المستخدم بعد
        document.getElementById('notify-btn').style.display = 'block';
    }
}

// دالة طلب صلاحية الإشعارات المرتبطة بالزر
function requestNotificationPermission() {
    if (!('Notification' in window)) {
        alert('متصفحك لا يدعم الإشعارات.');
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            document.getElementById('notify-btn').style.display = 'none';
            alert('تم تفعيل الإشعارات بنجاح!');
            // سيتم وضع كود الاشتراك في خدمة الـ Push لاحقاً هنا
        } else {
            alert('تم رفض الإشعارات. يمكنك تفعيلها لاحقاً من إعدادات المتصفح.');
        }
    });
}
