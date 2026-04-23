import React, { createContext, useContext, useState, useCallback, ReactNode } from "react"

export type Locale = "en" | "tr"

type TranslationValue = string | Record<string, string | string[]> | string[]

interface Translations {
  [key: string]: TranslationValue
}

const translations: Record<Locale, Translations> = {
  en: {
    // Header
    "nav.features": "Features",
    "nav.product": "Product",
    "nav.pricing": "Pricing",
    "nav.download": "Download",
    "nav.getStarted": "Get Started",
    
    // Hero
    "hero.title": "Meet. Decide. Assign.",
    "hero.subtitle": "AI-powered meetings that transform conversations into actionable outcomes. Capture every insight, assign tasks automatically, and never lose a decision again.",
    "hero.cta": "Start Free Trial",
    "hero.watchDemo": "Watch Demo",
    
    // Meeting Preview
    "meeting.title": "Experience the Future of Meetings",
    "meeting.subtitle": "See how AI transforms your meetings in real-time",
    "meeting.live": "Live",
    "meeting.recording": "Recording",
    "meeting.participants": "participants",
    "meeting.taskPanel": "Task Panel",
    "meeting.aiSuggested": "AI Suggested",
    "meeting.tasks": {
      "task1": "Review Q4 marketing budget",
      "task2": "Schedule follow-up with design team",
      "task3": "Send updated proposal to client"
    },
    "meeting.assignees": ["Sarah", "Mike", "You"],
    
    // Tasks
    "tasks.title": "Tasks That Assign Themselves",
    "tasks.subtitle": "AI automatically detects commitments and creates actionable tasks",
    "tasks.card1.title": "Prepare presentation slides",
    "tasks.card1.assignee": "Sarah Chen",
    "tasks.card1.due": "Tomorrow",
    "tasks.card1.priority": "High",
    "tasks.card2.title": "Review budget proposal",
    "tasks.card2.assignee": "Mike Johnson",
    "tasks.card2.due": "Friday",
    "tasks.card2.priority": "Medium",
    "tasks.card3.title": "Send meeting summary",
    "tasks.card3.assignee": "You",
    "tasks.card3.due": "Today",
    "tasks.card3.priority": "High",
    
    // Transcript
    "transcript.title": "Every Word, Perfectly Captured",
    "transcript.subtitle": "Real-time transcription with speaker identification",
    "transcript.conversation": [
      "I think we should move forward with the new design.",
      "Agreed. Let&apos;s schedule a review for next week.",
      "I&apos;ll take care of the presentation slides.",
      "Perfect. And I&apos;ll handle the budget analysis."
    ],
    "transcript.speakers": ["Sarah", "Mike", "Sarah", "Alex"],
    
    // AI Q&A
    "ai.title": "Ask Anything About Your Meetings",
    "ai.subtitle": "Get instant answers from your meeting history",
    "ai.placeholder": "Ask about decisions, action items, or discussions...",
    "ai.question": "What were the key decisions from last week?",
    "ai.answer": "Based on your meetings last week, there were 3 key decisions: 1) Approved the Q4 marketing budget of $50,000, 2) Decided to launch the new feature on November 15th, 3) Agreed to hire two additional developers for the mobile team.",
    
    // Cross-platform
    "platform.title": "Available Everywhere",
    "platform.subtitle": "Seamless experience across all your devices",
    "platform.web": "Web App",
    "platform.mobile": "Mobile App",
    "platform.desktop": "Desktop App",
    
    // CTA
    "cta.title": "Ready to Transform Your Meetings?",
    "cta.subtitle": "Join thousands of teams already saving hours every week",
    "cta.button": "Get Started Free",
    "cta.note": "No credit card required",
    
    // Footer
    "footer.product": "Product",
    "footer.company": "Company",
    "footer.resources": "Resources",
    "footer.legal": "Legal",
    "footer.copyright": "© 2024 MeetAI. All rights reserved.",
  },
  tr: {
    // Header
    "nav.features": "Özellikler",
    "nav.product": "Ürün",
    "nav.pricing": "Fiyatlandırma",
    "nav.download": "İndir",
    "nav.getStarted": "Başla",
    
    // Hero
    "hero.title": "Topla. Karar Ver. Ata.",
    "hero.subtitle": "Konuşmaları eyleme dönüştüren yapay zeka destekli toplantılar. Her fikri yakalayın, görevleri otomatik atayın ve bir kararı bir daha kaçırmayın.",
    "hero.cta": "Ücretsiz Deneyin",
    "hero.watchDemo": "Demo İzle",
    
    // Meeting Preview
    "meeting.title": "Toplantıların Geleceğini Deneyimleyin",
    "meeting.subtitle": "Yapay zekanın toplantılarınızı gerçek zamanlı nasıl dönüştürdüğünü görün",
    "meeting.live": "Canlı",
    "meeting.recording": "Kayıt",
    "meeting.participants": "katılımcı",
    "meeting.taskPanel": "Görev Paneli",
    "meeting.aiSuggested": "AI Önerisi",
    "meeting.tasks": {
      "task1": "4. çeyrek pazarlama bütçesini incele",
      "task2": "Tasarım ekibiyle takip toplantısı planla",
      "task3": "Güncellenmiş teklifi müşteriye gönder"
    },
    "meeting.assignees": ["Ayşe", "Mehmet", "Sen"],
    
    // Tasks
    "tasks.title": "Kendini Atayan Görevler",
    "tasks.subtitle": "Yapay zeka otomatik olarak taahhütleri algılar ve eyleme geçirilebilir görevler oluşturur",
    "tasks.card1.title": "Sunum slaytlarını hazırla",
    "tasks.card1.assignee": "Ayşe Yılmaz",
    "tasks.card1.due": "Yarın",
    "tasks.card1.priority": "Yüksek",
    "tasks.card2.title": "Bütçe teklifini incele",
    "tasks.card2.assignee": "Mehmet Kaya",
    "tasks.card2.due": "Cuma",
    "tasks.card2.priority": "Orta",
    "tasks.card3.title": "Toplantı özetini gönder",
    "tasks.card3.assignee": "Sen",
    "tasks.card3.due": "Bugün",
    "tasks.card3.priority": "Yüksek",
    
    // Transcript
    "transcript.title": "Her Kelime, Mükemmel Şekilde Yakalandı",
    "transcript.subtitle": "Konuşmacı tanımlama ile gerçek zamanlı transkript",
    "transcript.conversation": [
      "Bence yeni tasarımla devam etmeliyiz.",
      "Katılıyorum. Gelecek hafta için bir inceleme planlayalım.",
      "Sunum slaytlarını ben hallederim.",
      "Mükemmel. Ben de bütçe analizini üstlenirim."
    ],
    "transcript.speakers": ["Ayşe", "Mehmet", "Ayşe", "Ali"],
    
    // AI Q&A
    "ai.title": "Toplantılarınız Hakkında Her Şeyi Sorun",
    "ai.subtitle": "Toplantı geçmişinizden anında cevaplar alın",
    "ai.placeholder": "Kararlar, yapılacaklar veya tartışmalar hakkında sorun...",
    "ai.question": "Geçen haftanın önemli kararları nelerdi?",
    "ai.answer": "Geçen haftaki toplantılarınıza göre 3 önemli karar alındı: 1) 50.000₺&apos;lik 4. çeyrek pazarlama bütçesi onaylandı, 2) Yeni özelliğin 15 Kasım&apos;da başlatılmasına karar verildi, 3) Mobil ekibi için iki ek geliştirici alınması kararlaştırıldı.",
    
    // Cross-platform
    "platform.title": "Her Yerde Kullanılabilir",
    "platform.subtitle": "Tüm cihazlarınızda kesintisiz deneyim",
    "platform.web": "Web Uygulaması",
    "platform.mobile": "Mobil Uygulama",
    "platform.desktop": "Masaüstü Uygulama",
    
    // CTA
    "cta.title": "Toplantılarınızı Dönüştürmeye Hazır mısınız?",
    "cta.subtitle": "Her hafta saatler tasarruf eden binlerce ekibe katılın",
    "cta.button": "Ücretsiz Başla",
    "cta.note": "Kredi kartı gerekmez",
    
    // Footer
    "footer.product": "Ürün",
    "footer.company": "Şirket",
    "footer.resources": "Kaynaklar",
    "footer.legal": "Yasal",
    "footer.copyright": "© 2024 MeetAI. Tüm hakları saklıdır.",
  },
}

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string | string[] | Record<string, string | string[]>
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en")

  const t = useCallback(
    (key: string): string | string[] | Record<string, string | string[]> => {
      const value = translations[locale][key]
      if (value === undefined) {
        console.warn(`Translation missing for key: ${key}`)
        return key
      }
      return value
    },
    [locale]
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}
