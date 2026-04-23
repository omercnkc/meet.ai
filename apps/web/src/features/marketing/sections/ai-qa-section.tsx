import { useRef, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Sparkles, Send, ArrowRight } from "lucide-react"
import { useI18n } from "@/shared/lib/i18n"
import { Button } from "@/shared/ui/button"

export function AIQASection() {
  const { t } = useI18n()
  const sectionRef = useRef<HTMLDivElement>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.2], [0.95, 1])

  const handleAsk = () => {
    setIsTyping(true)
    setShowAnswer(false)
    setTimeout(() => {
      setIsTyping(false)
      setShowAnswer(true)
    }, 1500)
  }

  const suggestedQuestions = [
    "What decisions were made?",
    "Who has pending tasks?",
    "Key discussion points?",
  ]

  return (
    <section ref={sectionRef} className="relative py-32 bg-muted/30 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, var(--foreground) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div style={{ opacity }} className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            AI-Powered Intelligence
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
            {t("ai.title") as string}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            {t("ai.subtitle") as string}
          </p>
        </motion.div>

        {/* AI Chat Interface */}
        <motion.div
          style={{ opacity, scale }}
          className="max-w-3xl mx-auto"
        >
          {/* Glow Effect */}
          <div className="absolute inset-0 max-w-3xl mx-auto -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
          </div>

          <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-2xl">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">MeetAI Assistant</h3>
                  <p className="text-xs text-muted-foreground">Powered by AI</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-emerald-500">Online</span>
              </div>
            </div>

            {/* Chat Content */}
            <div className="p-6 min-h-[300px]">
              {/* Suggested Questions */}
              {!showAnswer && !isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-muted-foreground">Try asking:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={handleAsk}
                        className="px-4 py-2 rounded-full border border-border bg-background hover:bg-muted transition-colors text-sm"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* User Question */}
              {(isTyping || showAnswer) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end mb-6"
                >
                  <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-sm bg-primary text-primary-foreground">
                    <p className="text-sm">{t("ai.question") as string}</p>
                  </div>
                </motion.div>
              )}

              {/* AI Typing */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-sm bg-muted">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </motion.div>
              )}

              {/* AI Response */}
              {showAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 px-4 py-3 rounded-2xl rounded-bl-sm bg-muted">
                    <p className="text-sm leading-relaxed">{t("ai.answer") as string}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        Copy
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        Share
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={t("ai.placeholder") as string}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    onFocus={handleAsk}
                  />
                  <Button
                    size="icon"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
