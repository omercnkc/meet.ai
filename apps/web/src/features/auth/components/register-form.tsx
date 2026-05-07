import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { User, Mail, Lock, ArrowRight, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/app/providers/auth-provider"
import { createUserProfile } from "@/shared/lib/firebase/services/users"

export function RegisterForm() {
  const { t } = useTranslation()
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError(t("auth.error.nameRequired") as string)
      return
    }

    if (!validateEmail(email)) {
      setError(t("auth.error.invalidEmail") as string)
      return
    }

    if (password.length < 6) {
      setError(t("auth.error.passwordMin") as string)
      return
    }

    if (password !== confirmPassword) {
      setError(t("auth.error.passwordMatch") as string)
      return
    }

    setIsLoading(true)

    try {
      const credential = await signUp(email, password)
      await createUserProfile(credential.user.uid, credential.user.email!, name)
      navigate("/dashboard")
    } catch (err: any) {
      setError(err.message || (t("auth.error.generic") as string))
    } finally {
      setIsLoading(false)
    }
  }

  const inputVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.1 + i * 0.05,
        duration: 0.3,
      },
    }),
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
        <h1 className="text-3xl font-bold tracking-tight">{t("auth.register.title") as string}</h1>
        <p className="text-muted-foreground">{t("auth.register.subtitle") as string}</p>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
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

        {/* Name Field */}
        <motion.div
          className="space-y-2"
          custom={0}
          variants={inputVariants}
          initial="hidden"
          animate="visible"
        >
          <label htmlFor="register-name" className="text-sm font-medium leading-none">
            {t("auth.register.name") as string}
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="register-name"
              type="text"
              placeholder={t("auth.register.namePlaceholder") as string}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              disabled={isLoading}
              autoComplete="name"
            />
          </div>
        </motion.div>

        {/* Email Field */}
        <motion.div
          className="space-y-2"
          custom={1}
          variants={inputVariants}
          initial="hidden"
          animate="visible"
        >
          <label htmlFor="register-email" className="text-sm font-medium leading-none">
            {t("auth.register.email") as string}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="register-email"
              type="email"
              placeholder={t("auth.register.emailPlaceholder") as string}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
        </motion.div>

        {/* Password Field */}
        <motion.div
          className="space-y-2"
          custom={2}
          variants={inputVariants}
          initial="hidden"
          animate="visible"
        >
          <label htmlFor="register-password" className="text-sm font-medium leading-none">
            {t("auth.register.password") as string}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="register-password"
              type="password"
              placeholder={t("auth.register.passwordPlaceholder") as string}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>
        </motion.div>

        {/* Confirm Password Field */}
        <motion.div
          className="space-y-2"
          custom={3}
          variants={inputVariants}
          initial="hidden"
          animate="visible"
        >
          <label htmlFor="register-confirm-password" className="text-sm font-medium leading-none">
            {t("auth.register.confirmPassword") as string}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="register-confirm-password"
              type="password"
              placeholder={t("auth.register.confirmPasswordPlaceholder") as string}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>
        </motion.div>

        {/* Submit Button */}
        <motion.div
          custom={4}
          variants={inputVariants}
          initial="hidden"
          animate="visible"
        >
          <button
            type="submit"
            className="group mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("auth.register.submitting") as string}
              </>
            ) : (
              <>
                {t("auth.register.submit") as string}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </motion.div>
      </form>

      {/* Footer */}
      <motion.div
        className="text-center text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        {t("auth.register.haveAccount") as string}{" "}
        <Link
          to="/login"
          className="font-medium text-foreground underline-offset-4 transition-colors hover:underline"
        >
          {t("auth.register.login") as string}
        </Link>
      </motion.div>
    </div>
  )
}
