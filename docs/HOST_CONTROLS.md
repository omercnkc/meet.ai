# Host Controls — Backend Design Document

## Genel Bakış

Bu doküman, meet.ai'da host kullanıcılara toplantı yönetimi için sunulacak özelliklerin backend (node-api) tasarımını, API sözleşmesini ve client entegrasyonunu kapsar. Tasarım, mevcut admission flow ile aynı mimariyi kullanır: **HTTP endpoint + LiveKit DataChannel mesajı**.

---

## Mimari Özet

```
Client (Web / Mobile)
    │
    ├─ POST /api/host-controls/<action>   →  Node API (port 3001)
    │                                            │
    │                                            ├─ Host doğrulama
    │                                            ├─ RoomServiceClient işlemi (sunucu taraflı)
    │                                            └─ roomService.sendData() → LiveKit DataChannel
    │
    └─ RoomEvent.DataReceived (topic: "host-control")  ←  Hedef katılımcı dinler
```

### Mevcut altyapı

| Bileşen | Konum |
|---|---|
| Node API | `apps/node-api/src/` |
| Admission router | `apps/node-api/src/routes/admission.js` |
| LiveKit RoomServiceClient | admission.js içinde tanımlı, ortak `roomService` instance'ı |
| Logger | `apps/node-api/src/utils/logger.js` |

Yeni route: `apps/node-api/src/routes/host-controls.js`  
Kayıt: `apps/node-api/src/index.js` → `app.use("/api/host-controls", hostControlRoutes)`

---

## Güvenlik Modeli

Tüm endpoint'ler aynı doğrulama katmanını kullanır:

```js
// Her handler'da:
if (!callerId || !hostId || !meetingId) return 400
if (callerId !== hostId)               return 403   // Yalnızca host yetkilidir
if (callerId === targetUserId)         return 400   // Host kendi üzerine işlem yapamaz
```

> **Not:** Bu node-api, veritabanı bağlantısı olmayan bir mikroservistir. `hostId` doğrulaması client'ın sağladığı değere dayanır. Tam güvenlik için `hostId`'nin Firebase'den verify edilmesi gerekir (Firebase Admin SDK entegrasyonu ile — bkz. Gelecek Adımlar).

---

## DataChannel Mesaj Şeması

Tüm host kontrol mesajları `topic: "host-control"` ile gönderilir.

```jsonc
// Sunucudan → Hedef katılımcıya
{
  "type": "HOST_KICKED" | "HOST_MUTED" | "SCREEN_SHARE_STOPPED" | "UNMUTE_REQUESTED" | "HOST_TRANSFERRED",
  "payload": {
    "targetUserId": "string",   // Etkilenen kullanıcının Firebase UID'si
    "reason": "string"          // Opsiyonel açıklama
  }
}
```

Client tarafı dinleyici:
```js
room.on(RoomEvent.DataReceived, (payload, _p, _k, topic) => {
  if (topic !== "host-control") return;
  const msg = JSON.parse(new TextDecoder().decode(payload));
  // msg.type ve msg.payload.targetUserId ile işlem yapılır
});
```

---

## Özellikler

### 1. Katılımcıyı Çıkar (Kick)

**Amaç:** Host, seçilen katılımcıyı toplantıdan çıkarır. Katılımcının bağlantısı sunucu tarafından kesilir.

**Endpoint:** `POST /api/host-controls/kick`

**Request Body:**
```json
{
  "meetingId": "string",
  "targetUserId": "string",
  "callerId": "string",
  "hostId": "string",
  "reason": "string (opsiyonel)"
}
```

**Sunucu Akışı:**
1. Doğrulama (callerId === hostId, targetUserId !== hostId)
2. `roomService.removeParticipant(meetingId, targetUserId)` — LiveKit katılımcıyı odadan çıkarır
3. DataChannel ile `HOST_KICKED` mesajı gönderilir (katılımcı zaten odadan çıktığı için yalnızca log amaçlı)

**Response:**
```json
{ "success": true }
```

**Client Davranışı (target):**
- `RoomEvent.Disconnected` eventi alır (LiveKit SDK tarafından otomatik)
- Ayrıca `HOST_KICKED` mesajı varsa UI'da "Toplantıdan çıkarıldınız" ekranı gösterilir

**LiveKit SDK:**
```js
await roomService.removeParticipant(meetingId, targetUserId);
```

---

### 2. Katılımcıyı Sustur (Mute)

**Amaç:** Host, bir katılımcının mikrofon track'ini sunucu tarafından susturur.

**Endpoint:** `POST /api/host-controls/mute`

**Request Body:**
```json
{
  "meetingId": "string",
  "targetUserId": "string",
  "callerId": "string",
  "hostId": "string"
}
```

**Sunucu Akışı:**
1. Doğrulama
2. `roomService.getParticipant(meetingId, targetUserId)` ile katılımcının mevcut track'leri alınır
3. Audio track SID bulunur
4. `roomService.mutePublishedTrack(meetingId, targetUserId, audioTrackSid, true)` ile sunucu taraflı mute yapılır
5. DataChannel ile `HOST_MUTED` mesajı gönderilir (UI bildirimi için)

**Response:**
```json
{ "success": true }
```

**Client Davranışı (target):**
- LiveKit SDK otomatik olarak yerel mikrofonu susturur (sunucu taraflı mute)
- `HOST_MUTED` mesajı alınca: "Host sizi susturdu" bildirimi gösterilir
- Katılımcı kendi isteğiyle unmute yapabilir (Zoom davranışı)

**LiveKit SDK:**
```js
const participant = await roomService.getParticipant(meetingId, targetUserId);
const audioTrack = participant.tracks.find(t => t.type === TrackType.AUDIO && t.source === TrackSource.MICROPHONE);
if (audioTrack) {
  await roomService.mutePublishedTrack(meetingId, targetUserId, audioTrack.sid, true);
}
```

---

### 3. Unmute İsteği Gönder (Request to Unmute)

**Amaç:** Host, susturulmuş katılımcıya "unmute olmak ister misiniz?" isteği gönderir. Katılımcı onaylarsa mikrofonunu açar (Zoom davranışı — sunucu zorla açmaz).

**Endpoint:** `POST /api/host-controls/request-unmute`

**Request Body:**
```json
{
  "meetingId": "string",
  "targetUserId": "string",
  "callerId": "string",
  "hostId": "string"
}
```

**Sunucu Akışı:**
1. Doğrulama
2. DataChannel ile `UNMUTE_REQUESTED` mesajı gönderilir (sunucu tarafı track işlemi yapılmaz)

**Response:**
```json
{ "success": true }
```

**Client Davranışı (target):**
- `UNMUTE_REQUESTED` alınca: "Host mikrofonu açmanızı istiyor" dialog'u gösterilir
- Kullanıcı onaylarsa: `room.localParticipant.setMicrophoneEnabled(true)` çağrılır

---

### 4. Ekran Paylaşımını Durdur (Stop Screen Share)

**Amaç:** Host, bir katılımcının ekran paylaşımını zorla durdurur.

**Endpoint:** `POST /api/host-controls/stop-screenshare`

**Request Body:**
```json
{
  "meetingId": "string",
  "targetUserId": "string",
  "callerId": "string",
  "hostId": "string"
}
```

**Sunucu Akışı:**
1. Doğrulama
2. `roomService.getParticipant()` ile screen share track SID'i bulunur
3. `roomService.mutePublishedTrack(meetingId, targetUserId, screenShareSid, true)` uygulanır
4. DataChannel ile `SCREEN_SHARE_STOPPED` mesajı gönderilir

**Response:**
```json
{ "success": true }
```

**Client Davranışı (target):**
- `SCREEN_SHARE_STOPPED` alınca: `room.localParticipant.setScreenShareEnabled(false)` çağrılır
- "Host ekran paylaşımınızı durdurdu" bildirimi gösterilir

**LiveKit SDK:**
```js
const participant = await roomService.getParticipant(meetingId, targetUserId);
const screenTrack = participant.tracks.find(t => t.source === TrackSource.SCREEN_SHARE);
if (screenTrack) {
  await roomService.mutePublishedTrack(meetingId, targetUserId, screenTrack.sid, true);
}
```

---

### 5. Host Rolü Devret (Transfer Host)

**Amaç:** Mevcut host, host yetkisini başka bir katılımcıya devreder.

**Endpoint:** `POST /api/host-controls/transfer-host`

**Request Body:**
```json
{
  "meetingId": "string",
  "newHostId": "string",
  "callerId": "string",
  "hostId": "string"
}
```

**Sunucu Akışı:**
1. Doğrulama
2. DataChannel ile `HOST_TRANSFERRED` mesajı tüm katılımcılara broadcast edilir (`destinationSids` belirtilmez)

**Response:**
```json
{ "success": true }
```

**Client Davranışı (tüm katılımcılar):**
- `HOST_TRANSFERRED` alınca: `msg.payload.newHostId === currentUserId` → "Artık hostusunuz" bildirimi
- UI host kontrolleri görünür/gizlenir
- **Önemli:** Firebase'deki meeting dokümanındaki `userId`/`hostId` alanı da güncellenmeli (client tarafından veya ayrı bir Firebase write ile)

**DataChannel Payload:**
```json
{
  "type": "HOST_TRANSFERRED",
  "payload": {
    "previousHostId": "string",
    "newHostId": "string"
  }
}
```

---

### 6. Herkesi Sustur (Mute All)

**Amaç:** Host, kendisi dışındaki tüm katılımcıların mikrofonunu kapatır.

**Endpoint:** `POST /api/host-controls/mute-all`

**Request Body:**
```json
{
  "meetingId": "string",
  "callerId": "string",
  "hostId": "string"
}
```

**Sunucu Akışı:**
1. Doğrulama
2. `roomService.listParticipants(meetingId)` ile tüm katılımcılar listelenir
3. Host dışındaki her katılımcı için `mutePublishedTrack` döngüsü
4. DataChannel ile `HOST_MUTED` broadcast edilir (tüm katılımcılar)

**Response:**
```json
{ "success": true, "mutedCount": 3 }
```

---

### 7. Katılımcıları Listele (List Participants)

**Amaç:** Host, odadaki aktif katılımcıların listesini ve track durumlarını alır.

**Endpoint:** `GET /api/host-controls/participants?meetingId=<id>&callerId=<id>&hostId=<id>`

**Response:**
```json
{
  "success": true,
  "participants": [
    {
      "identity": "firebase-uid",
      "name": "Omer",
      "isMicEnabled": true,
      "isCameraEnabled": false,
      "isScreenSharing": false,
      "joinedAt": 1700000000000
    }
  ]
}
```

**LiveKit SDK:**
```js
const participants = await roomService.listParticipants(meetingId);
```

---

## Dosya Yapısı

```
apps/node-api/src/
├── routes/
│   ├── admission.js         (mevcut)
│   ├── meetings.js          (mevcut)
│   └── host-controls.js     (yeni)
├── services/
│   ├── admission-store.js   (mevcut)
│   └── room-service.js      (yeni — ortak RoomServiceClient instance)
└── index.js                 (güncellenir)
```

### `room-service.js` — Ortak RoomServiceClient

Şu an `admission.js` içinde tanımlı olan `roomService` instance'ı ayrı bir modüle taşınmalıdır:

```js
// apps/node-api/src/services/room-service.js
import { RoomServiceClient } from "livekit-server-sdk";

export const roomService = new RoomServiceClient(
  process.env.LIVEKIT_URL || "ws://localhost:7880",
  process.env.LIVEKIT_API_KEY || "devkey",
  process.env.LIVEKIT_API_SECRET || "secret"
);
```

---

## `host-controls.js` İskelet Kodu

```js
import { Router } from "express";
import { roomService } from "../services/room-service.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

const router = Router();

// ── Ortak doğrulama yardımcısı ───────────────────────────────────────────────
function validateHostAction(req, res) {
  const { meetingId, callerId, hostId } = req.body;
  if (!meetingId || !callerId || !hostId) {
    res.status(400).json({ success: false, error: "meetingId, callerId ve hostId zorunludur" });
    return false;
  }
  if (callerId !== hostId) {
    res.status(403).json({ success: false, error: "Yalnızca host bu işlemi yapabilir" });
    return false;
  }
  return true;
}

// ── DataChannel broadcast yardımcısı ─────────────────────────────────────────
async function broadcast(meetingId, type, payload) {
  const data = new TextEncoder().encode(JSON.stringify({ type, payload }));
  await roomService.sendData(meetingId, data, 0, { topic: "host-control" });
}

// ── Kick ─────────────────────────────────────────────────────────────────────
router.post("/kick", async (req, res) => {
  if (!validateHostAction(req, res)) return;
  const { meetingId, targetUserId, callerId, reason } = req.body;
  if (!targetUserId || targetUserId === callerId) {
    return res.status(400).json({ success: false, error: "Geçersiz hedef kullanıcı" });
  }
  try {
    await roomService.removeParticipant(meetingId, targetUserId);
    await broadcast(meetingId, "HOST_KICKED", { targetUserId, reason });
    logInfo("Participant kicked", { meetingId, targetUserId, by: callerId });
    res.json({ success: true });
  } catch (err) {
    logError("Kick failed", { error: err.message });
    res.status(500).json({ success: false, error: "İşlem başarısız" });
  }
});

// ── Mute ─────────────────────────────────────────────────────────────────────
router.post("/mute", async (req, res) => {
  if (!validateHostAction(req, res)) return;
  const { meetingId, targetUserId, callerId } = req.body;
  if (!targetUserId || targetUserId === callerId) {
    return res.status(400).json({ success: false, error: "Geçersiz hedef kullanıcı" });
  }
  try {
    const participant = await roomService.getParticipant(meetingId, targetUserId);
    const audioTrack = participant.tracks.find(
      t => t.type === 0 /* AUDIO */ && t.source === 1 /* MICROPHONE */
    );
    if (audioTrack) {
      await roomService.mutePublishedTrack(meetingId, targetUserId, audioTrack.sid, true);
    }
    await broadcast(meetingId, "HOST_MUTED", { targetUserId });
    logInfo("Participant muted", { meetingId, targetUserId, by: callerId });
    res.json({ success: true });
  } catch (err) {
    logError("Mute failed", { error: err.message });
    res.status(500).json({ success: false, error: "İşlem başarısız" });
  }
});

// ── Request Unmute ────────────────────────────────────────────────────────────
router.post("/request-unmute", async (req, res) => {
  if (!validateHostAction(req, res)) return;
  const { meetingId, targetUserId } = req.body;
  try {
    await broadcast(meetingId, "UNMUTE_REQUESTED", { targetUserId });
    res.json({ success: true });
  } catch (err) {
    logError("Request unmute failed", { error: err.message });
    res.status(500).json({ success: false, error: "İşlem başarısız" });
  }
});

// ── Stop Screen Share ─────────────────────────────────────────────────────────
router.post("/stop-screenshare", async (req, res) => {
  if (!validateHostAction(req, res)) return;
  const { meetingId, targetUserId } = req.body;
  try {
    const participant = await roomService.getParticipant(meetingId, targetUserId);
    const screenTrack = participant.tracks.find(t => t.source === 4 /* SCREEN_SHARE */);
    if (screenTrack) {
      await roomService.mutePublishedTrack(meetingId, targetUserId, screenTrack.sid, true);
    }
    await broadcast(meetingId, "SCREEN_SHARE_STOPPED", { targetUserId });
    logInfo("Screen share stopped", { meetingId, targetUserId });
    res.json({ success: true });
  } catch (err) {
    logError("Stop screenshare failed", { error: err.message });
    res.status(500).json({ success: false, error: "İşlem başarısız" });
  }
});

// ── Transfer Host ─────────────────────────────────────────────────────────────
router.post("/transfer-host", async (req, res) => {
  if (!validateHostAction(req, res)) return;
  const { meetingId, newHostId, callerId } = req.body;
  if (!newHostId || newHostId === callerId) {
    return res.status(400).json({ success: false, error: "Geçersiz yeni host" });
  }
  try {
    await broadcast(meetingId, "HOST_TRANSFERRED", {
      previousHostId: callerId,
      newHostId,
    });
    logInfo("Host transferred", { meetingId, from: callerId, to: newHostId });
    res.json({ success: true });
  } catch (err) {
    logError("Transfer host failed", { error: err.message });
    res.status(500).json({ success: false, error: "İşlem başarısız" });
  }
});

// ── Mute All ─────────────────────────────────────────────────────────────────
router.post("/mute-all", async (req, res) => {
  if (!validateHostAction(req, res)) return;
  const { meetingId, callerId } = req.body;
  try {
    const participants = await roomService.listParticipants(meetingId);
    const others = participants.filter(p => p.identity !== callerId);
    let mutedCount = 0;
    for (const p of others) {
      const audioTrack = p.tracks.find(t => t.type === 0 && t.source === 1);
      if (audioTrack) {
        await roomService.mutePublishedTrack(meetingId, p.identity, audioTrack.sid, true);
        mutedCount++;
      }
    }
    await broadcast(meetingId, "HOST_MUTED", { targetUserId: "*" }); // "*" = herkese
    logInfo("Mute all", { meetingId, mutedCount, by: callerId });
    res.json({ success: true, mutedCount });
  } catch (err) {
    logError("Mute all failed", { error: err.message });
    res.status(500).json({ success: false, error: "İşlem başarısız" });
  }
});

// ── List Participants ─────────────────────────────────────────────────────────
router.get("/participants", async (req, res) => {
  const { meetingId, callerId, hostId } = req.query;
  if (!meetingId || !callerId || !hostId) {
    return res.status(400).json({ success: false, error: "Parametreler eksik" });
  }
  if (callerId !== hostId) {
    return res.status(403).json({ success: false, error: "Yalnızca host listeyebilir" });
  }
  try {
    const participants = await roomService.listParticipants(meetingId);
    const list = participants.map(p => ({
      identity: p.identity,
      name: p.name,
      isMicEnabled: p.tracks.some(t => t.source === 1 && !t.muted),
      isCameraEnabled: p.tracks.some(t => t.source === 2 && !t.muted),
      isScreenSharing: p.tracks.some(t => t.source === 4),
      joinedAt: Number(p.joinedAt),
    }));
    res.json({ success: true, participants: list });
  } catch (err) {
    logError("List participants failed", { error: err.message });
    res.status(500).json({ success: false, error: "İşlem başarısız" });
  }
});

export default router;
```

---

## Client Entegrasyonu

### Web (`admission-listener.tsx` ile aynı pattern)

```tsx
// hooks/useHostControls.ts
const NODE_API_URL = import.meta.env.VITE_NODE_API_URL || "http://localhost:3001";

export function useHostControls(meetingId: string, hostId: string, currentUserId: string) {
  const room = useRoomContext();

  // HOST_CONTROL mesajlarını dinle
  useEffect(() => {
    if (!room) return;
    const handler = (payload: Uint8Array, _p: any, _k: any, topic?: string) => {
      if (topic !== "host-control") return;
      const msg = JSON.parse(new TextDecoder().decode(payload));
      switch (msg.type) {
        case "HOST_KICKED":
          if (msg.payload.targetUserId === currentUserId) {
            // navigate("/dashboard") + "Toplantıdan çıkarıldınız" toast
          }
          break;
        case "HOST_MUTED":
          if (msg.payload.targetUserId === currentUserId || msg.payload.targetUserId === "*") {
            // "Host sizi susturdu" toast göster
          }
          break;
        case "UNMUTE_REQUESTED":
          if (msg.payload.targetUserId === currentUserId) {
            // "Host mikrofonu açmanızı istiyor" dialog göster
          }
          break;
        case "SCREEN_SHARE_STOPPED":
          if (msg.payload.targetUserId === currentUserId) {
            room.localParticipant.setScreenShareEnabled(false);
          }
          break;
        case "HOST_TRANSFERRED":
          // UI'da host state güncellenir
          break;
      }
    };
    room.on(RoomEvent.DataReceived, handler);
    return () => room.off(RoomEvent.DataReceived, handler);
  }, [room, currentUserId]);

  // Host aksiyonları
  const kick = (targetUserId: string) =>
    fetch(`${NODE_API_URL}/api/host-controls/kick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId, targetUserId, callerId: currentUserId, hostId }),
    });

  const mute = (targetUserId: string) =>
    fetch(`${NODE_API_URL}/api/host-controls/mute`, { /* ... */ });

  const stopScreenShare = (targetUserId: string) =>
    fetch(`${NODE_API_URL}/api/host-controls/stop-screenshare`, { /* ... */ });

  return { kick, mute, stopScreenShare /* ... */ };
}
```

### Mobile (`ActiveMeetingScreen.tsx` içine eklenecek)

```tsx
// roomInst.on() listener'ına eklenir:
room.on(RoomEvent.DataReceived, (payload, _p, _k, topic) => {
  if (topic !== "host-control") return;
  const msg = JSON.parse(new TextDecoder().decode(payload));
  switch (msg.type) {
    case "HOST_KICKED":
      if (msg.payload.targetUserId === currentUserId) {
        Alert.alert("Toplantıdan Çıkarıldınız", "Host sizi toplantıdan çıkardı.", [
          { text: "Tamam", onPress: () => navigation.navigate("Dashboard") },
        ]);
      }
      break;
    case "HOST_MUTED":
      if (msg.payload.targetUserId === currentUserId || msg.payload.targetUserId === "*") {
        // Toast bildirimi + state güncelleme (refreshTracks aracılığıyla)
      }
      break;
    case "UNMUTE_REQUESTED":
      if (msg.payload.targetUserId === currentUserId) {
        Alert.alert("Unmute İsteği", "Host mikrofonu açmanızı istiyor.", [
          { text: "Reddet" },
          { text: "Aç", onPress: () => room.localParticipant.setMicrophoneEnabled(true) },
        ]);
      }
      break;
    case "SCREEN_SHARE_STOPPED":
      if (msg.payload.targetUserId === currentUserId) {
        room.localParticipant.setScreenShareEnabled(false);
      }
      break;
  }
});
```

---

## API Referansı

| Method | Endpoint | Açıklama |
|---|---|---|
| POST | `/api/host-controls/kick` | Katılımcıyı çıkar |
| POST | `/api/host-controls/mute` | Katılımcıyı sustur |
| POST | `/api/host-controls/request-unmute` | Unmute isteği gönder |
| POST | `/api/host-controls/stop-screenshare` | Ekran paylaşımını durdur |
| POST | `/api/host-controls/transfer-host` | Host rolünü devret |
| POST | `/api/host-controls/mute-all` | Herkesi sustur |
| GET | `/api/host-controls/participants` | Katılımcı listesi |

**Ortak Request Header:** `Content-Type: application/json`

**Ortak Error Response:**
```json
{ "success": false, "error": "Hata açıklaması" }
```

---

## LiveKit TrackSource Sabitleri

```
UNKNOWN    = 0
CAMERA     = 1
MICROPHONE = 2
SCREEN_SHARE        = 4
SCREEN_SHARE_AUDIO  = 5
```

---

## Uygulama Öncelik Sırası

| Öncelik | Özellik | Zorluk | Not |
|---|---|---|---|
| 1 | Mute | Orta | `mutePublishedTrack` hazır |
| 2 | Kick | Kolay | `removeParticipant` hazır |
| 3 | Stop Screen Share | Orta | `mutePublishedTrack` + track filter |
| 4 | Mute All | Orta | Döngüsel mute |
| 5 | Unmute Request | Kolay | Sadece DataChannel mesajı |
| 6 | List Participants | Kolay | `listParticipants` hazır |
| 7 | Transfer Host | Zor | Firebase write + DataChannel |

---

## Gelecek Adımlar

1. **Firebase Admin SDK** — `hostId`'yi client'tan almak yerine Firebase Firestore'dan doğrula (güvenlik için kritik)
2. **Co-host desteği** — Birden fazla host rolü, izin matrisi
3. **Raise Hand** — Katılımcı el kaldırma sinyali (`HAND_RAISED` DataChannel event)
4. **Spotlight / Pin** — Belirli katılımcıyı öne çıkarma (yalnızca UI taraflı, backend gerektirmez)
5. **Katılımı Kilitle** — Yeni katılımcıların admission request'ini otomatik reddet (`ROOM_LOCKED` event)
6. **Rate limiting** — `host-controls.js` için admission.js'deki pattern uygulanmalı
