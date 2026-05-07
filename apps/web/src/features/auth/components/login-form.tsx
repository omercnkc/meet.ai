import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/app/providers/auth-provider"

export function LoginForm() {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateEmail(email)) {
      setError(t("auth.error.invalidEmail") as string)
      return
    }

    if (password.length < 6) {
      setError(t("auth.error.passwordMin") as string)
      return
    }

    setIsLoading(true)

    try {
      await signIn(email, password)
      navigate("/dashboard")
    } catch (err: any) {
      setError(err.message || (t("auth.error.generic") as string))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        className="space-y-2 text-center lg:text-left"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">{t("auth.login.title") as string}</h1>
        <p className="text-muted-foreground">{t("auth.login.subtitle") as string}</p>
      </motion.div>

      {/* Form */}
      <motion.form
        onSubmit={handleSubmit}
        className="space-y-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}

        {/* Email Field */}
        <div className="space-y-2">
          <label htmlFor="login-email" className="text-sm font-medium leading-none">
            {t("auth.login.email") as string}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="login-email"
              type="email"
              placeholder={t("auth.login.emailPlaceholder") as string}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label htmlFor="login-password" className="text-sm font-medium leading-none">
            {t("auth.login.password") as string}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="login-password"
              type="password"
              placeholder={t("auth.login.passwordPlaceholder") as string}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("auth.login.submitting") as string}
            </>
          ) : (
            <>
              {t("auth.login.submit") as string}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </motion.form>

      {/* Footer */}
      <motion.div
        className="text-center text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        {t("auth.login.noAccount") as string}{" "}
        <Link
          to="/register"
          className="font-medium text-foreground underline-offset-4 transition-colors hover:underline"
        >
          {t("auth.login.register") as string}
        </Link>
      </motion.div>
    </div>
  )
}
