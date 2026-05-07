import os
import json

locales = {
  "en": {
    "enteringMeeting": "Entering meeting...",
    "meetingNotFound": "Meeting Not Found",
    "meetingNotFoundDesc": "The meeting link is invalid or the meeting has already securely concluded.",
    "returnToDashboard": "Return to Dashboard",
    "connectionError": "Connection Error",
    "connectingToRoom": "Connecting to room...",
    "participantsCount": "{{count}} participant(s)",
    "shareInvite": "Share Invite",
    "inviteCopied": "Meeting link copied to clipboard!",
    "pipHint": "Click to enable the floating meeting window while browsing other tabs.",
    "enableMiniWindow": "Enable Mini Window",
    "tabShared": "This tab is being shared with Meet.ai",
    "hide": "Hide",
    "stopSharing": "Stop sharing",
    "connectingMeeting": "Connecting to meeting...",
    "reconnecting": "Connection lost. Reconnecting...",
    "disconnected": "Disconnected.",
    "connecting": "Connecting...",
    "requestingJoin": "Requesting to join...",
    "requestDeclined": "Request Declined",
    "requestDeclinedDesc": "The host has declined your request to join.",
    "requestTimedOut": "Request Timed Out",
    "requestTimedOutDesc": "The host didn't respond in time. Please try again later.",
    "waitingApproval": "Waiting for host approval...",
    "waitingApprovalDesc": "You will join the meeting as soon as the host admits you."
  },
  "tr": {
    "enteringMeeting": "Toplantıya giriliyor...",
    "meetingNotFound": "Toplantı Bulunamadı",
    "meetingNotFoundDesc": "Toplantı bağlantısı geçersiz veya toplantı zaten güvenli bir şekilde sona erdi.",
    "returnToDashboard": "Panele Dön",
    "connectionError": "Bağlantı Hatası",
    "connectingToRoom": "Odaya bağlanılıyor...",
    "participantsCount": "{{count}} katılımcı",
    "shareInvite": "Daveti Paylaş",
    "inviteCopied": "Toplantı bağlantısı panoya kopyalandı!",
    "pipHint": "Diğer sekmelerde gezinirken yüzen toplantı penceresini etkinleştirmek için tıklayın.",
    "enableMiniWindow": "Mini Pencereyi Etkinleştir",
    "tabShared": "Bu sekme Meet.ai ile paylaşılıyor",
    "hide": "Gizle",
    "stopSharing": "Paylaşımı durdur",
    "connectingMeeting": "Toplantıya bağlanılıyor...",
    "reconnecting": "Bağlantı kesildi. Yeniden bağlanılıyor...",
    "disconnected": "Bağlantı koptu.",
    "connecting": "Bağlanılıyor...",
    "requestingJoin": "Katılım isteği gönderiliyor...",
    "requestDeclined": "İstek Reddedildi",
    "requestDeclinedDesc": "Ev sahibi katılma isteğinizi reddetti.",
    "requestTimedOut": "İstek Zaman Aşımına Uğradı",
    "requestTimedOutDesc": "Ev sahibi zamanında yanıt vermedi. Lütfen daha sonra tekrar deneyin.",
    "waitingApproval": "Ev sahibinin onayı bekleniyor...",
    "waitingApprovalDesc": "Ev sahibi sizi kabul eder etmez toplantıya katılacaksınız."
  }
}

base_dir = r"c:\Users\omerc\Downloads\meet.ai\apps\web\public\locales"

for lang, data in locales.items():
    lang_dir = os.path.join(base_dir, lang)
    os.makedirs(lang_dir, exist_ok=True)
    with open(os.path.join(lang_dir, 'meeting.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Created meeting.json locales.")
