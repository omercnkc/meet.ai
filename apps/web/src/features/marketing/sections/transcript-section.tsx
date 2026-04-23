import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Search, Download, Share2 } from "lucide-react"
import { useI18n } from "@/shared/lib/i18n"
import { Button } from "@/shared/ui/button"

export function TranscriptSection() {
  const { t } = useI18n()
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const x = useTransform(scrollYProgress, [0, 0.5], [-50, 0])

  const conversation = t("transcript.conversation") as string[]
  const speakers = t("transcript.speakers") as string[]

  const speakerColors: Record<string, string> = {
    Sarah: "bg-blue-500",
    Mike: "bg-emerald-500",
    Alex: "bg-amber-500",
    Ayşe: "bg-blue-500",
    Mehmet: "bg-emerald-500",
    Ali: "bg-amber-500",
  }

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div style={{ opacity, x }}>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
              {t("transcript.title") as string}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
              {t("transcript.subtitle") as string}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm">Real-time sync</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm">Speaker detection</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm">40+ languages</span>
              </div>
            </div>
          </motion.div>

          {/* Right Content - Transcript UI */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-amber-500/10 rounded-2xl blur-3xl" />

            <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">Transcript</h3>
                  <span className="text-xs text-muted-foreground">47:23</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Conversation */}
              <div className="p-6 space-y-6 max-h-[400px] overflow-y-auto">
                {conversation.map((message, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                    className="flex gap-4"
                  >
                    {/* Avatar */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full ${
                        speakerColors[speakers[i]] || "bg-muted"
                      } flex items-center justify-center`}
                    >
                      <span className="text-xs font-medium text-white">
                        {speakers[i]?.[0] || "?"}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{speakers[i]}</span>
                        <span className="text-xs text-muted-foreground">
                          {`${Math.floor(i * 2.5)}:${String((i * 30) % 60).padStart(2, "0")}`}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {message}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {/* Typing Indicator */}
                <div className="flex gap-4 opacity-50">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium">...</span>
                  </div>
                  <div className="flex items-center gap-1 pt-2">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
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
