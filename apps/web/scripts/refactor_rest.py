import re
import os
import json

locales = {
  "en": {
    "loadingSummary": "Loading summary...",
    "meetingNotFoundDesc2": "The meeting might have been deleted or never existed.",
    "backToDashboard": "Back to Dashboard",
    "userMeeting": "{{name}}'s Meeting",
    "createdLabel": "Created:",
    "endedLabel": "Ended:",
    "joinLive": "Join Live Meeting",
    "meetingTranscript": "Meeting Transcript",
    "generating": "Generating...",
    "generateTranscript": "Generate Transcript",
    "generationFailed": "Generation failed",
    "noContentFound": "No content found in transcript.",
    "noTranscript": "No transcript available",
    "noTranscriptDesc": "Generate a transcript from the latest meeting recording using our AI transcription service.",
    "aiQa": "AI Q&A",
    "messagesCount": "{{count}} message(s)",
    "transcriptRequired": "Transcript required",
    "transcriptRequiredDesc": "Generate a meeting transcript first, then you can ask AI questions about it.",
    "aiReady": "AI Assistant Ready",
    "aiReadyDesc": "Ask me anything about this meeting — key decisions, action items, specific topics, or what was discussed. I'll answer based on the transcript.",
    "q1": "What were the key decisions?",
    "q2": "Summarize the meeting",
    "q3": "What action items were assigned?",
    "errorTitle": "Error",
    "dismiss": "Dismiss",
    "askQuestionPlaceholder": "Ask a question about the meeting...",
    "generateFirstPlaceholder": "Generate a transcript first...",
    "actionItems": "Action Items",
    "noActionItems": "No action items found.",
    "noActionItemsDesc": "Tasks assigned during the meeting will appear here.",
    "added": "Added",
    "taskManagement": "Task Management",
    "taskManagementDesc": "Track your action items and ensure nothing falls through the cracks after your meetings.",
    "createTask": "Create Task"
  },
  "tr": {
    "loadingSummary": "Özet yükleniyor...",
    "meetingNotFoundDesc2": "Toplantı silinmiş olabilir veya hiç var olmamış olabilir.",
    "backToDashboard": "Panele Dön",
    "userMeeting": "{{name}} Toplantısı",
    "createdLabel": "Oluşturuldu:",
    "endedLabel": "Sona Erdi:",
    "joinLive": "Canlı Toplantıya Katıl",
    "meetingTranscript": "Toplantı Transkripti",
    "generating": "Oluşturuluyor...",
    "generateTranscript": "Transkript Oluştur",
    "generationFailed": "Oluşturma başarısız oldu",
    "noContentFound": "Transkriptte içerik bulunamadı.",
    "noTranscript": "Transkript bulunmuyor",
    "noTranscriptDesc": "AI transkripsiyon hizmetimizi kullanarak son toplantı kaydından bir transkript oluşturun.",
    "aiQa": "Yapay Zeka Soru & Cevap",
    "messagesCount": "{{count}} mesaj",
    "transcriptRequired": "Transkript gerekli",
    "transcriptRequiredDesc": "Önce bir toplantı transkripti oluşturun, ardından AI'a bunun hakkında sorular sorabilirsiniz.",
    "aiReady": "AI Asistan Hazır",
    "aiReadyDesc": "Bana bu toplantı hakkında herhangi bir şey sorun — önemli kararlar, eylem öğeleri, belirli konular veya tartışılanlar. Transkripte göre cevaplayacağım.",
    "q1": "Önemli kararlar nelerdi?",
    "q2": "Toplantıyı özetle",
    "q3": "Hangi eylem öğeleri atandı?",
    "errorTitle": "Hata",
    "dismiss": "Kapat",
    "askQuestionPlaceholder": "Toplantı hakkında bir soru sorun...",
    "generateFirstPlaceholder": "Önce bir transkript oluşturun...",
    "actionItems": "Eylem Öğeleri",
    "noActionItems": "Eylem öğesi bulunamadı.",
    "noActionItemsDesc": "Toplantı sırasında atanan görevler burada görünecektir.",
    "added": "Eklendi",
    "taskManagement": "Görev Yönetimi",
    "taskManagementDesc": "Toplantılarınızdan sonra aksiyon öğelerinizi takip edin ve hiçbir şeyin gözden kaçmamasını sağlayın.",
    "createTask": "Görev Oluştur"
  }
}

base_dir = r"c:\Users\omerc\Downloads\meet.ai\apps\web\public\locales"

for lang, data in locales.items():
    lang_dir = os.path.join(base_dir, lang)
    with open(os.path.join(lang_dir, 'summary.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Created summary locales.")

# Now refactor meeting-summary and tasks

summary_file = r"c:\Users\omerc\Downloads\meet.ai\apps\web\src\pages\meeting-summary\index.tsx"
with open(summary_file, 'r', encoding='utf-8') as f:
    content = f.read()

if "useTranslation" not in content:
    content = content.replace('from "react-router-dom"', 'from "react-router-dom"\nimport { useTranslation } from "react-i18next"')

content = re.sub(
    r'(export default function MeetingSummaryPage\(\)\s*\{)',
    r'\1\n  const { t, i18n } = useTranslation(["summary", "dashboard", "meeting"]);',
    content
)

replacements = [
    ("Loading summary...", "{t('loadingSummary', { ns: 'summary' })}"),
    ("Meeting Not Found", "{t('meetingNotFound', { ns: 'meeting' })}"),
    ("The meeting might have been deleted or never existed.", "{t('meetingNotFoundDesc2', { ns: 'summary' })}"),
    ("Return to Dashboard", "{t('returnToDashboard', { ns: 'meeting' })}"),
    (">Back to Dashboard<", ">{t('backToDashboard', { ns: 'summary' })}<"),
    ("{currentUser?.displayName || currentUser?.email?.split('@')[0] || \"User\"} 's Meeting", "{t('userMeeting', { name: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User', ns: 'summary' })}"),
    ('meeting.status === "active" ? "Active" : "Ended"', 'meeting.status === "active" ? t("active", { ns: "dashboard" }) : t("ended", { ns: "dashboard" })'),
    ("Created: ", "{t('createdLabel', { ns: 'summary' })} "),
    ("Ended: ", "{t('endedLabel', { ns: 'summary' })} "),
    (">Join Live Meeting<", ">{t('joinLive', { ns: 'summary' })}<"),
    (">Meeting Transcript<", ">{t('meetingTranscript', { ns: 'summary' })}<"),
    ('isGenerating ? "Generating..." : "Generate Transcript"', 'isGenerating ? t("generating", { ns: "summary" }) : t("generateTranscript", { ns: "summary" })'),
    (">Generation failed<", ">{t('generationFailed', { ns: 'summary' })}<"),
    ("No content found in transcript.", "{t('noContentFound', { ns: 'summary' })}"),
    (">No transcript available<", ">{t('noTranscript', { ns: 'summary' })}<"),
    ("Generate a transcript from the latest meeting recording using our AI transcription service.", "{t('noTranscriptDesc', { ns: 'summary' })}"),
    (">AI Q&A<", ">{t('aiQa', { ns: 'summary' })}<"),
    ('{aiMessages.length} {aiMessages.length === 1 ? "message" : "messages"}', "{t('messagesCount', { count: aiMessages.length, ns: 'summary' })}"),
    (">Transcript required<", ">{t('transcriptRequired', { ns: 'summary' })}<"),
    ("Generate a meeting transcript first, then you can ask AI questions about it.", "{t('transcriptRequiredDesc', { ns: 'summary' })}"),
    (">AI Assistant Ready<", ">{t('aiReady', { ns: 'summary' })}<"),
    ("Ask me anything about this meeting — key decisions, action items, specific topics, or what was discussed. I'll answer based on the transcript.", "{t('aiReadyDesc', { ns: 'summary' })}"),
    ('"What were the key decisions?"', 't("q1", { ns: "summary" })'),
    ('"Summarize the meeting"', 't("q2", { ns: "summary" })'),
    ('"What action items were assigned?"', 't("q3", { ns: "summary" })'),
    ('>Error<', '>{t("errorTitle", { ns: "summary" })}<'),
    ('>Dismiss<', '>{t("dismiss", { ns: "summary" })}<'),
    ('placeholder={hasTranscript ? "Ask a question about the meeting..." : "Generate a transcript first..."}', 'placeholder={hasTranscript ? t("askQuestionPlaceholder", { ns: "summary" }) : t("generateFirstPlaceholder", { ns: "summary" })}'),
    ('>Action Items<', '>{t("actionItems", { ns: "summary" })}<'),
    ('>No action items found.<', '>{t("noActionItems", { ns: "summary" })}<'),
    ('>Tasks assigned during the meeting will appear here.<', '>{t("noActionItemsDesc", { ns: "summary" })}<'),
    ('Added • ', "{t('added', { ns: 'summary' })} • "),
    ("meeting.createdAt?.toDate().toLocaleString()", "meeting.createdAt?.toDate().toLocaleString(i18n.language)"),
    ("meeting.endedAt.toDate().toLocaleString()", "meeting.endedAt.toDate().toLocaleString(i18n.language)"),
    ("task.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })", "task.createdAt?.toDate().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })")
]

for old, new in replacements:
    content = content.replace(old, new)
    
with open(summary_file, 'w', encoding='utf-8') as f:
    f.write(content)

tasks_file = r"c:\Users\omerc\Downloads\meet.ai\apps\web\src\pages\tasks\index.tsx"
with open(tasks_file, 'r', encoding='utf-8') as f:
    content = f.read()

if "useTranslation" not in content:
    content = content.replace('from "@/features/marketing/components/header"', 'from "@/features/marketing/components/header"\nimport { useTranslation } from "react-i18next"')

content = re.sub(
    r'(export default function TasksPage\(\)\s*\{)',
    r'\1\n  const { t } = useTranslation("summary");',
    content
)

content = content.replace("Task Management", "{t('taskManagement')}")
content = content.replace("Track your action items and ensure nothing falls through the cracks after your meetings.", "{t('taskManagementDesc')}")
content = content.replace("Create Task", "{t('createTask')}")

with open(tasks_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Rest refactored.")
