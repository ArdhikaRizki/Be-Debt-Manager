const admin = require('firebase-admin');
// Kamu harus mendownload file serviceAccountKey.json dari Firebase Console -> Project Settings -> Service Accounts
const serviceAccount = require('./ServiceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Helper untuk kirim notif
const sendNotification = async (fcmToken, title, body) => {
  if (!fcmToken) return; // Kalau user belum punya token, skip

  const message = {
    notification: { title, body },
    token: fcmToken
  };

  try {
    await admin.messaging().send(message);
    console.log('Notifikasi berhasil dikirim');
  } catch (error) {
    console.error('Error mengirim notifikasi:', error);
  }
};

module.exports = { sendNotification };