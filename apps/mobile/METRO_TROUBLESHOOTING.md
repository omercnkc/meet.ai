# Metro Bağlantı ve Port Çatışması Çözüm Kılavuzu

Expo Go veya React Native uygulamasını çalıştırırken karşılaştığınız **`java.net.SocketTimeoutException: failed to connect to /192.168.x.x:8081`** hatası, cihazınızın bilgisayarınızda çalışan Metro Bundler sunucusuna erişemediğini belirtir.

---

## 1. Hatanın Temel Nedenleri

### A. Port Çatışması (En Sık Yaşanan Durum)
Metro sunucusu varsayılan olarak **8081** portunu kullanır. Eğer arka planda açık kalmış başka bir Metro süreci veya servis varsa, yeni başlattığınız sunucu şu uyarıyı verir:
> `Port 8081 is being used by another process. Use port 8082 instead? ... yes`

Bunu onayladığınızda Metro sunucunuz **8082** portunda çalışmaya başlar. Ancak telefonunuzdaki Expo Go uygulaması hâlâ **8081** portuna bağlanmaya çalıştığı için bağlantı kuramaz ve zaman aşımına (`SocketTimeout`) uğrar.

### B. Ağ/Wi-Fi Bağlantısı
Fiziksel telefonunuz ile bilgisayarınızın **aynı Wi-Fi ağına** bağlı olmaması veya bilgisayarınızın güvenlik duvarının (Firewall) gelen bağlantıyı engellemesi.

---

## 2. Sorunu Düzeltmek İçin Adım Adım Çözüm

Aşağıdaki adımları sırasıyla uygulayarak portları temizleyebilir ve bağlantıyı yeniden kurabilirsiniz.

### ADIM 1: Çalışan Tüm Metro/Node Süreçlerini Kapatın
Öncelikle arka planda kalmış tüm Node.js süreçlerini sonlandırarak portları boşa çıkarın.

**Windows PowerShell üzerinde çalıştırın:**
```powershell
# 8081 portunu kullanan süreci bulup sonlandırın
Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue | ForEach-Object {
  Stop-Process -Id $_.OwningProcess -Force
}

# 8082 portunu kullanan süreci bulup sonlandırın
Get-NetTCPConnection -LocalPort 8082 -ErrorAction SilentlyContinue | ForEach-Object {
  Stop-Process -Id $_.OwningProcess -Force
}
```

*Alternatif olarak terminalde tüm node süreçlerini doğrudan kapatmak için:*
```cmd
taskkill /F /IM node.exe
```

---

### ADIM 2: Port Yönlendirmesini Yenileyin (Android Cihazlar İçin)
Eğer Android emülatör veya USB kablosuyla bağlı bir fiziksel cihaz kullanıyorsanız, port bağlantısını yönlendirin:
```bash
adb reverse tcp:8081 tcp:8081
```

---

### ADIM 3: Metro'yu Doğru Parametrelerle Başlatın
Artık portlar tamamen temizlendiğine göre, Metro'yu **Expo Go** modunda ve önbelleği temizleyerek (`--clear`) başlatabilirsiniz:

```bash
# Proje ana dizinindeyken:
pnpm --filter mobile start -- --go --clear

# Veya doğrudan /apps/mobile klasörü içerisindeyken:
npx expo start --go -c
```

**Başarılı Başlangıç Çıktısı:**
Metro başarıyla başladığında `exp://192.168.x.x:8081` benzeri bir bağlantı adresi (veya QR kod) görmelisiniz. Expo Go üzerinden bu adresi girerek uygulamayı açabilirsiniz.
