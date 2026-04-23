import { I18nProvider } from "@/shared/lib/i18n"
import { Header } from "@/features/marketing/components/header"
import { HeroSection } from "@/features/marketing/sections/hero-section"
import { MeetingPreviewSection } from "@/features/marketing/sections/meeting-preview-section"
import { TasksSection } from "@/features/marketing/sections/tasks-section"
import { TranscriptSection } from "@/features/marketing/sections/transcript-section"
import { AIQASection } from "@/features/marketing/sections/ai-qa-section"
import { PlatformSection } from "@/features/marketing/sections/platform-section"
import { CTASection } from "@/features/marketing/sections/cta-section"
import { Footer } from "@/features/marketing/components/footer"

export default function LandingPage() {
  return (
    <I18nProvider>
      <div className="min-h-screen">
        <Header />
        <main>
          <HeroSection />
          <MeetingPreviewSection />
          <TasksSection />
          <TranscriptSection />
          <AIQASection />
          <PlatformSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </I18nProvider>
  )
}
