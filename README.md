# 🚀 Teams Always Online - Chrome Extension (Manifest V3)

Microsoft Teams Web app (`https://teams.microsoft.com/v2/`) üzerinde durumunuzun sürekli **"Uygun" (Available / Online - Yeşil Işık)** kalmasını sağlayan gelişmiş Chrome uzantısı.

---

## 🌟 Özellikler

- **Çok Katmanlı Çevrimiçi Tutma Motoru**:
  - **Sentetik Aktivite Simülatörü**: Teams DOM elementlerine arka planda fark ettirmeden mikro fare (`mousemove`, `pointermove`), klavye ve kaydırma hareketleri gönderir.
  - **Web Audio Arka Plan Koruyucusu**: Chrome'un sekmeyi veya pencereyi simge durumuna küçülttüğünüzde zamanlayıcıları yavaşlatmasını (timer throttling) engelleyen sessiz Web Audio sinyali kullanır.
- **Şık ve Modern Kontrol Paneli (Popup UI)**:
  - **Ana Güç Anahtarı**: Uzantıyı anında açıp kapatabilirsiniz.
  - **Yineleme Sıklığı Seçimi**: 15s, 30s, 1m, 2m, 5m seçenekleri.
  - **Çalışma Modları**:
    - *Stealth (Gizli Mod)*: Tamamen görünmez arka plan simülasyonu.
    - *Pulse Modu*: Teams sayfasının sağ alt köşesinde şık ve canlı bir durum göstergesi noktası gösterir.
  - **Mesai Saatleri Zamanlayıcısı**: Sadece belirttiğiniz mesai saatleri arasında (örn: 09:00 - 18:00) aktif olma seçeneği.
  - **Canlı İstatistikler & Log Konsolu**: Gönderilen toplam ping sayısı, son ping zamanı ve canlı işlem geçmişi.

---

## 🛠️ Kurulum Adımları (Chrome / Brave / Edge)

1. **Google Chrome** (veya Edge/Brave) tarayıcınızı açın.
2. Adres çubuğuna `chrome://extensions/` yazın ve Enter'a basın.
3. Sağ üst köşede bulunan **"Geliştirici modu" (Developer mode)** anahtarını **AÇIK** konuma getirin.
4. Sol üstteki **"Paketlenmemiş öge yükle" (Load unpacked)** butonuna tıklayın.
5. Dosya seçici penceresinde aşağıdaki proje klasörünü seçin:
   ```text
   /Users/amanvermez/Development/teams-always-online-extension
   ```
6. Uzantı tarayıcınıza yüklenecek ve simgesi yeşil **"ON"** rozetiyle görünecektir!
7. **[Microsoft Teams Web v2](https://teams.microsoft.com/v2/)** sayfasını açın veya yenileyin. Durumunuz otomatik olarak sürekli çevrimiçi tutulacaktır.

---

## 📁 Proje Dosya Yapısı

```text
teams-always-online-extension/
├── manifest.json              # Extension Manifest V3 konfigürasyonu
├── background/
│   └── background.js          # Arka plan service worker ve durum rozeti yönetimi
├── content/
│   ├── content.js             # Teams sekmesine enjekte edilen aktivite motoru
│   └── content.css            # Pulse modu görsel gösterge stilleri
├── popup/
│   ├── popup.html             # Şık karanlık tema kontrol paneli
│   ├── popup.css              # Glassmorphism arayüz stilleri
│   └── popup.js               # Kontrol paneli mantığı ve ayar yönetimi
├── icons/
│   ├── icon16.png             # 16x16 Rozet simgesi
│   ├── icon48.png             # 48x48 Sayfa simgesi
│   └── icon128.png            # 128x128 Mağaza simgesi
└── README.md                  # Kullanım kılavuzu
```

---

## ⚙️ Desteklenen Microsoft Teams Adresleri

- `https://teams.microsoft.com/*`
- `https://teams.microsoft.com/v2/`
- `https://teams.cloud.microsoft/*`
- `https://teams.live.com/*`
- `https://teams.office.com/*`

---

## 🔒 Gizlilik ve Güvenlik
- Bu uzantı tamamen **yerel (local)** çalışır.
- Hiçbir veri sunucuya gönderilmez veya kaydedilmez.
- Şifre, mesaj veya kişisel verilerinize erişmez.
