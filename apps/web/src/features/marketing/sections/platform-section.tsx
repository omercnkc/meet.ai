import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Monitor, Smartphone, Laptop } from "lucide-react"
import { useTranslation } from "react-i18next"

export function PlatformSection() {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])

  const platforms = [
    {
      icon: Monitor,
      title: t("platform.web") as string,
      description: "Full-featured web experience",
    },
    {
      icon: Smartphone,
      title: t("platform.mobile") as string,
      description: "iOS & Android apps",
    },
    {
      icon: Laptop,
      title: t("platform.desktop") as string,
      description: "Native Mac & Windows",
    },
  ]

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div style={{ opacity }} className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
            {t("platform.title") as string}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            {t("platform.subtitle") as string}
          </p>
        </motion.div>

        {/* Device Showcase */}
        <div className="relative">
          {/* Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />

          {/* Devices Grid */}
          <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 items-end">
            {/* Desktop/Web */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-2 order-2 lg:order-1"
            >
              <div className="relative">
                {/* Monitor Frame */}
                <div className="rounded-t-xl border-t border-x border-border bg-muted/50 px-2 pt-2">
                  {/* Browser Chrome */}
                  <div className="flex items-center gap-2 px-4 py-2 rounded-t-lg bg-card border-t border-x border-border">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="px-4 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground">
                        app.meetai.com
                      </div>
                    </div>
                  </div>

                  {/* Screen Content */}
                  <div className="aspect-[16/10] bg-card border-x border-border overflow-hidden">
                    <div className="h-full p-4 flex gap-4">
                      {/* Sidebar */}
                      <div className="w-48 flex-shrink-0 space-y-3">
                        <div className="h-8 rounded bg-muted" />
                        <div className="space-y-2">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`h-6 rounded ${i === 1 ? "bg-primary/20" : "bg-muted/50"}`} />
                          ))}
                        </div>
                      </div>
                      {/* Main Content */}
                      <div className="flex-1 space-y-4">
                        <div className="h-8 w-48 rounded bg-muted" />
                        <div className="grid grid-cols-2 gap-3">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="aspect-video rounded-lg bg-muted/50" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stand */}
                <div className="flex justify-center">
                  <div className="w-32 h-4 bg-muted rounded-b-lg" />
                </div>
                <div className="flex justify-center">
                  <div className="w-48 h-2 bg-muted/50 rounded-full" />
                </div>
              </div>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {platforms[0].description}
              </p>
            </motion.div>

            {/* Mobile */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="order-1 lg:order-2 flex justify-center lg:justify-start"
            >
              <div className="relative">
                {/* Phone Frame */}
                <div className="relative w-[200px] rounded-[2.5rem] border-4 border-muted bg-card overflow-hidden shadow-2xl">
                  {/* Notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-muted rounded-full z-10" />

                  {/* Screen Content */}
                  <div className="aspect-[9/19] p-4 pt-10">
                    <div className="h-full space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="h-6 w-24 rounded bg-muted" />
                        <div className="h-6 w-6 rounded-full bg-muted" />
                      </div>

                      {/* Meeting Cards */}
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="p-3 rounded-xl bg-muted/50">
                            <div className="h-3 w-20 rounded bg-muted mb-2" />
                            <div className="h-2 w-16 rounded bg-muted/50" />
                          </div>
                        ))}
                      </div>

                      {/* Mini Video Grid */}
                      <div className="grid grid-cols-2 gap-1.5 pt-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="aspect-square rounded-lg bg-muted/30" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Home Indicator */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-muted rounded-full" />
                </div>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {platforms[1].description}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Platform Icons */}
          <div className="mt-16 flex justify-center gap-8">
            {platforms.map((platform, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <platform.icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">{platform.title}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
