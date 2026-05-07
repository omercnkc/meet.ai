import { Header } from "@/features/marketing/components/header"
import { useTranslation } from "react-i18next"

export default function TasksPage() {
  const { t } = useTranslation("summary");
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pt-16">
      <Header />
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md w-full">
          <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('taskManagement')}</h1>
          <p className="text-muted-foreground text-base">
            {t('taskManagementDesc')}
          </p>
          <div className="pt-4 flex gap-4 justify-center">
            <button className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              {t('createTask')}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
