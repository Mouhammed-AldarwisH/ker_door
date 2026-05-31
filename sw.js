// الاستماع لحدث استقبال الإشعارات القادمة من السيرفر عبر الـ Web Push API
self.addEventListener('push', function(event) {
  let data = { title: 'تنبيه أمني', body: 'حدثت حركة في الاستراحة' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/553/553376.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/553/553376.png',
    dir: 'rtl',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
