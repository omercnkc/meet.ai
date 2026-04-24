import { motion } from "framer-motion"
import { useTheme } from "@/app/providers/theme-provider"
import { useI18n } from "@/shared/lib/i18n"
import { Sparkles, Users, Shield, Globe, Moon, Sun } from "lucide-react"

interface AuthLayoutProps {
  children: React.ReactNode
}

const floatingAnimation = {
  initial: { y: 0 },
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
}

const features = [
  { icon: Sparkles, key: "auth.panel.feature1" as const },
  { icon: Users, key: "auth.panel.feature2" as const },
  { icon: Shield, key: "auth.panel.feature3" as const },
]

export function AuthLayout({ children }: AuthLayoutProps) {
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t } = useI18n()

  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <div className="relative flex min-h-screen w-full">
      {/* Controls - Fixed Position */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/80 backdrop-blur-sm text-foreground hover:bg-accent transition-colors"
          aria-label="Toggle theme"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>
        <button
          onClick={() => setLocale(locale === "en" ? "tr" : "en")}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background/80 backdrop-blur-sm px-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          <Globe className="size-4" />
          {locale === "en" ? "TR" : "EN"}
        </button>
      </div>

      {/* Left Side - Animated Side Panel (Hidden on mobile) */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-[55%] items-center justify-center overflow-hidden bg-primary p-12">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" className="text-primary-foreground" />
          </svg>
        </div>

        {/* Floating Gradient Orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 size-64 rounded-full bg-primary-foreground/5 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 size-80 rounded-full bg-primary-foreground/5 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-lg">
          {/* Logo/Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary-foreground">
                <Sparkles className="size-6 text-primary" />
              </div>
              <span className="text-2xl font-bold text-primary-foreground">Meet.ai</span>
            </div>
          </motion.div>

          {/* Main Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-primary-foreground xl:text-5xl text-balance">
              {t("auth.panel.title") as string}
            </h1>
            <p className="mb-10 text-lg leading-relaxed text-primary-foreground/70">
              {t("auth.panel.subtitle") as string}
            </p>
          </motion.div>

          {/* Feature List */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.key}
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary-foreground/10">
                  <feature.icon className="size-5 text-primary-foreground" />
                </div>
                <span className="text-primary-foreground/90">{t(feature.key) as string}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Floating Decorative Element */}
          <motion.div
            className="absolute -bottom-20 -right-20 opacity-20"
            variants={floatingAnimation}
            initial="initial"
            animate="animate"
          >
            <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.5" className="text-primary-foreground" />
              <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.5" className="text-primary-foreground" />
              <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.5" className="text-primary-foreground" />
            </svg>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Form Area */}
      <div className="relative flex w-full items-center justify-center px-4 py-12 lg:w-1/2 xl:w-[45%]">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-background">
          <div className="absolute inset-0 bg-gradient-to-br from-muted/30 via-transparent to-muted/30" />
        </div>

        {/* Form Container */}
        <motion.div
          className="relative z-10 w-full max-w-md"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
