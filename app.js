const SUPABASE_URL = 'https://hqscfwwaznpqhshuujmo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6otq5jDEKMoy-d7VWcB11w_3lr4FEe5';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// تشغيل الجلب التلقائي بمجرد فتح الصفحة
window.onload = () => {
    fetchData();
    // إعادة جلب البيانات تلقائياً كل 10 ثوانٍ لتحديث الحالة أمام الأهل بشكل مستمر
    setInterval(fetchData, 10000);
};

async function fetchData() {
    try {
        // 1. جلب حالة الكهرباء الحالية
        const { data: deviceData } = await supabase
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

        // 2. جلب آخر حالة للباب
        const { data: doorData } = await supabase
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

        // 3. جلب سجل الأحداث التاريخي (آخر 5 أحداث للباب)
        const { data: logs } = await supabase
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
                
                // تحويل الوقت لصيغة محلية مقروءة
                const eventTime = new Date(log.logged_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                const eventDate = new Date(log.logged_at).toLocaleDateString('ar-SA', { month: 'numeric', day: 'numeric' });

                li.innerHTML = `<span>${actionText}</span> <span class="time">${eventDate} - ${eventTime}</span>`;
                listAdmin.appendChild(li);
            });
        } else {
            listAdmin.innerHTML = '<li>لا توجد أحداث مسجلة بعد.</li>';
        }

    } catch (err) {
        console.error("خطأ في جلب البيانات:", err);
    }
}
