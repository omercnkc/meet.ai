import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Video, Mic, MicOff, VideoOff, MonitorUp, Users, MoreHorizontal } from "lucide-react"
import { useI18n } from "@/shared/lib/i18n"
import { Button } from "@/shared/ui/button"

export function MeetingPreviewSection() {
  const { t } = useI18n()
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })

  const y = useTransform(scrollYProgress, [0, 1], [100, -100])
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])

  const tasks = t("meeting.tasks") as Record<string, string>
  const assignees = t("meeting.assignees") as string[]

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative py-32 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          style={{ opacity }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
            {t("meeting.title") as string}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            {t("meeting.subtitle") as string}
          </p>
        </motion.div>

        {/* Interactive Meeting UI */}
        <motion.div style={{ y }} className="relative">
          {/* Glow Effect */}
          <div className="absolute -inset-8 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10 rounded-3xl blur-3xl" />

          <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-2xl">
            {/* Meeting Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <span className="text-sm font-medium text-red-500">{t("meeting.live") as string}</span>
                </div>
                <span className="text-sm text-muted-foreground">47:23</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-xs">
                  <Users className="h-3.5 w-3.5" />
                  <span>4 {t("meeting.participants") as string}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Meeting Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-0">
              {/* Video Grid */}
              <div className="lg:col-span-3 p-6 border-r border-border">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: "Sarah Chen", initials: "SC", speaking: true },
                    { name: "Mike Johnson", initials: "MJ", speaking: false },
                    { name: "Alex Kim", initials: "AK", speaking: false },
                    { name: "You", initials: "Y", speaking: false, muted: true },
                  ].map((participant, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: i * 0.1 }}
                      className={`aspect-video rounded-xl bg-muted relative overflow-hidden ${
                        participant.speaking ? "ring-2 ring-emerald-500" : ""
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/80" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                          <span className="text-xl font-semibold text-muted-foreground">
                            {participant.initials}
                          </span>
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <span className="text-sm font-medium bg-background/50 backdrop-blur-sm px-2 py-0.5 rounded">
                          {participant.name}
                        </span>
                        {participant.speaking && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Speaking
                          </div>
                        )}
                        {participant.muted && (
                          <div className="p-1 rounded bg-red-500/20">
                            <MicOff className="h-3.5 w-3.5 text-red-500" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Controls */}
                <div className="mt-6 flex items-center justify-center gap-3">
                  <Button variant="outline" size="icon" className="h-12 w-12 rounded-full">
                    <Mic className="h-5 w-5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-12 w-12 rounded-full">
                    <Video className="h-5 w-5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-12 w-12 rounded-full">
                    <MonitorUp className="h-5 w-5" />
                  </Button>
                  <Button variant="destructive" size="lg" className="rounded-full px-8">
                    End Meeting
                  </Button>
                </div>
              </div>

              {/* Task Panel */}
              <div className="p-6 bg-muted/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold">{t("meeting.taskPanel") as string}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                    {t("meeting.aiSuggested") as string}
                  </span>
                </div>

                <div className="space-y-3">
                  {Object.entries(tasks).map(([key, task], i) => (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.1 }}
                      className="p-4 rounded-lg bg-card border border-border"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-5 h-5 rounded border-2 border-muted-foreground/30 flex items-center justify-center">
                          {i === 0 && (
                            <svg
                              className="w-3 h-3 text-emerald-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${i === 0 ? "line-through text-muted-foreground" : ""}`}>
                            {task}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                              {assignees[i]?.[0] || "?"}
                            </div>
                            <span className="text-xs text-muted-foreground">{assignees[i]}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Button variant="outline" className="w-full mt-4" size="sm">
                  View All Tasks
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
