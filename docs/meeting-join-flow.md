# Meeting Join Flow

## Genel Bakış

Invite link, toplantıya doğrudan giriş izni vermez. Yalnızca bir **katılma isteği (join request)** oluşturur. LiveKit token, yalnızca host tarafından kabul edilen guest'e üretilir.

---

## Akış

```
Host meeting oluşturur
        ↓
Host invite link paylaşır
        ↓
Guest linke tıklar
        ↓
Guest login / register olur
        ↓
Guest toplantıya doğrudan alınmaz
        ↓
Guest için join request oluşur
        ↓
Host aktif meeting ekranında isteği görür
        ↓
Host Accept veya Reject yapar
       ↙ ↘
  Accept   Reject
     ↓        ↓
Guest     Guest reddedildi
LiveKit   ekranı görür
token alır
     ↓
Guest toplantıya girer
```

---

## Kurallar

| Kural | Açıklama |
|-------|----------|
| Invite link ≠ giriş izni | Link, guest'i doğrudan toplantıya almaz |
| Invite link = join request | Link tıklandığında yalnızca katılma isteği oluşur |
| LiveKit token koşulu | Token yalnızca host **Accept** ederse üretilir |

---

## Adım Adım Detay

### 1. Host Meeting Oluşturur
- Host yeni bir toplantı başlatır.
- Sistem bir `meetingId` ve benzersiz bir `invite link` üretir.

### 2. Host Invite Link Paylaşır
- Host, invite link'i istediği kişilerle paylaşır.
- Bu link yalnızca katılma isteği açma yetkisi taşır.

### 3. Guest Linke Tıklar
- Guest, invite link'e tıklar ve uygulamaya yönlendirilir.

### 4. Guest Login / Register Olur
- Eğer guest oturum açmamışsa login veya register ekranı gösterilir.
- Kimlik doğrulama tamamlandıktan sonra akış devam eder.

### 5. Join Request Oluşur
- Guest, toplantıya doğrudan **alınmaz**.
- Sistem, guest adına bir `join request` kaydı oluşturur.
- Guest bir bekleme ekranı görür.

### 6. Host İsteği Görür
- Host'un aktif meeting ekranında yeni bir join request bildirimi belirir.
- Bildirimde guest'in adı ve profil bilgisi gösterilir.

### 7. Host Accept veya Reject Yapar

#### Accept
- Host isteği onaylar.
- Sistem, guest için bir **LiveKit token** üretir.
- Token guest'e iletilir ve guest toplantıya girer.

#### Reject
- Host isteği reddeder.
- Guest bekleme ekranından **"Reddedildi"** ekranına geçer.
- LiveKit token üretilmez.
