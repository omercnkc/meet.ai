# Ekran Yansıtma (Screen Share) Düzeltme Kılavuzu

LiveKit React Native'de ekran paylaşımının çalışması için platforma özgü yapılandırmalar gerekmektedir.

---

## 1. Sorunun Kökü

`room.localParticipant.setScreenShareEnabled(true)` çağrısı aşağıdaki durumlarda sessizce hata verir:

| Platform | Neden başarısız olur |
|----------|---------------------|
| **Android** | `MediaProjection` API'si için `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PROJECTION` izinleri eksik |
| **iOS**     | Broadcast Upload Extension kurulmamış; Expo Dev Client'ta desteklenmez |
| **Her ikisi** | `isScreenShareEnabled` state'i gerçek room durumundan bağımsız güncelleniyor (drift) |

---

## 2. Android Düzeltmesi

### 2a. `app.json`'a izinleri ekle

```json
{
  "expo": {
    "android": {
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "MODIFY_AUDIO_SETTINGS",
        "BLUETOOTH",
        "BLUETOOTH_CONNECT",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_MEDIA_PROJECTION"
      ]
    }
  }
}
```

### 2b. `android/app/src/main/AndroidManifest.xml`'e servis ekle

`expo run:android` ile native build alındıktan sonra aşağıdaki satırı `<application>` bloğuna ekle:

```xml
<service
    android:name="com.oney.WebRTCModule.screenshare.ScreenCaptureService"
    android:foregroundServiceType="mediaProjection"
    android:exported="false" />
```

### 2c. Native build yenile

```bash
# Mevcut Android build'i temizle ve yeniden derle
cd apps/mobile
npx expo run:android --device
```

---

## 3. iOS Düzeltmesi

iOS'ta ekran paylaşımı bir **Broadcast Upload Extension** gerektirir ve Expo managed workflow ile direkt desteklenmez.

### Seçenek A — Geçici çözüm: Butonu gizle (iOS'ta)

`ActiveMeetingScreen.tsx` içinde ekran paylaşım butonunu iOS'ta gizle:

```tsx
{Platform.OS === "android" && (
  <TouchableOpacity onPress={toggleScreenShare} ...>
    <Ionicons name="desktop" ... />
  </TouchableOpacity>
)}
```

### Seçenek B — Tam iOS desteği (EAS Build ile)

1. Xcode'da projeye yeni bir **Broadcast Upload Extension** target ekle
2. LiveKit'in `BroadcastExtension` rehberini takip et:  
   https://docs.livekit.io/realtime/client/react-native/#screen-share
3. `app.json`'a gerekli entitlement'ları ekle
4. `eas build --profile development --platform ios` ile build al

---

## 4. Kod Düzeltmesi (Zaten Uygulandı)

`toggleScreenShare` fonksiyonu artık:

1. **State'i optimistik güncellemiyor** — `setScreenShareEnabled` başarılı olduktan sonra gerçek room state'ini okur:
   ```typescript
   await room.localParticipant.setScreenShareEnabled(next);
   setIsScreenSharing(room.localParticipant.isScreenShareEnabled); // gerçek değer
   ```

2. **Hata durumunda kullanıcıya Alert gösteriyor:**
   ```typescript
   Alert.alert("Screen share failed", e?.message || "...");
   ```

---

## 5. Test Adımları

```
1. pnpm run mobile:clean  →  Metro başlat
2. Telefonda Expo Dev Client ile bağlan
3. Active Meeting ekranına gir
4. Ekran yansıtma butonuna bas
5. Android: İzin popup'ı çıkmalı → "Start now" seç → paylaşım başlamalı
6. İOS: Alert görünmeli → "Broadcast Extension gerekli" mesajı
```

---

## 6. Hızlı Özet

```
Önce:  setScreenShareEnabled() → hata sessiz, state kayması, kullanıcı habersiz
Sonra: setScreenShareEnabled() → hata Alert ile gösterilir, state gerçek değerle güncellenir
       Android izinleri app.json'a eklendi
       iOS için geçici gizleme veya EAS build yolu belgelendi
```
