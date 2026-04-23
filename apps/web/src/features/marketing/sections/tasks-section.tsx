import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Calendar, Flag, User, ArrowRight } from "lucide-react"
import { useI18n } from "@/shared/lib/i18n"

export function TasksSection() {
  const { t } = useI18n()
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])

  const tasks = [
    {
      title: t("tasks.card1.title") as string,
      assignee: t("tasks.card1.assignee") as string,
      due: t("tasks.card1.due") as string,
      priority: t("tasks.card1.priority") as string,
      priorityColor: "bg-red-500",
      progress: 75,
    },
    {
      title: t("tasks.card2.title") as string,
      assignee: t("tasks.card2.assignee") as string,
      due: t("tasks.card2.due") as string,
      priority: t("tasks.card2.priority") as string,
      priorityColor: "bg-yellow-500",
      progress: 40,
    },
    {
      title: t("tasks.card3.title") as string,
      assignee: t("tasks.card3.assignee") as string,
      due: t("tasks.card3.due") as string,
      priority: t("tasks.card3.priority") as string,
      priorityColor: "bg-red-500",
      progress: 90,
    },
  ]

  return (
    <section ref={sectionRef} className="relative py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div style={{ opacity }} className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
            {t("tasks.title") as string}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            {t("tasks.subtitle") as string}
          </p>
        </motion.div>

        {/* Task Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tasks.map((task, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="group relative"
            >
              {/* Card Glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative p-6 rounded-2xl bg-card border border-border overflow-hidden">
                {/* Priority Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${task.priorityColor}/10`}>
                    <Flag className={`h-3.5 w-3.5 ${task.priorityColor.replace("bg-", "text-")}`} />
                    <span className={`text-xs font-medium ${task.priorityColor.replace("bg-", "text-")}`}>
                      {task.priority}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Task Title */}
                <h3 className="text-lg font-semibold mb-4">{task.title}</h3>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Progress</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${task.progress}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="h-full rounded-full bg-foreground"
                    />
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground">{task.assignee}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{task.due}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
