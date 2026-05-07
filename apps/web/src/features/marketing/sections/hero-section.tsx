import { motion } from "framer-motion"
import { Play } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

export function HeroSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-background" />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 backdrop-blur-sm px-4 py-1.5 text-sm text-muted-foreground mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            AI-Powered Meeting Intelligence
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight text-balance"
          >
            {t("hero.title") as string}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty"
          >
            {t("hero.subtitle") as string}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button onClick={() => navigate('/register')} size="lg" className="text-base px-8 h-12">
              {t("hero.cta") as string}
            </Button>
            <Button 
              onClick={() => document.getElementById('product')?.scrollIntoView({ behavior: 'smooth' })} 
              variant="outline" 
              size="lg" 
              className="text-base px-8 h-12 gap-2"
            >
              <Play className="h-4 w-4" />
              {t("hero.watchDemo") as string}
            </Button>
          </motion.div>

          {/* Hero Visual */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-20 relative"
          >
            <div className="relative mx-auto max-w-5xl">
              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-3xl opacity-50" />
              
              {/* Main Visual Container */}
              <div className="relative rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl">
                {/* Browser Chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      app.meetai.com
                    </div>
                  </div>
                </div>
                
                {/* Meeting Interface Preview */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Video Grid */}
                  <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="aspect-video rounded-lg bg-muted/50 flex items-center justify-center relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50" />
                        <div className="relative w-12 h-12 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                          <span className="text-lg font-medium text-muted-foreground">
                            {["SC", "MJ", "AK", "You"][i - 1]}
                          </span>
                        </div>
                        {i === 1 && (
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded bg-foreground/10 backdrop-blur-sm text-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Speaking
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Side Panel */}
                  <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">AI Tasks</h3>
                      <span className="text-xs text-emerald-500 font-medium">Live</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        "Review Q4 budget",
                        "Schedule follow-up",
                        "Send proposal"
                      ].map((task, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs"
                        >
                          <div className="w-4 h-4 rounded border border-border flex items-center justify-center">
                            {i === 0 && <span className="w-2 h-2 rounded-sm bg-primary" />}
                          </div>
                          <span className="flex-1 truncate">{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
