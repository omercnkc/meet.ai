import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useTheme } from "@/app/providers/theme-provider"
import { Moon, Sun, Globe, Menu, X } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { useI18n, type Locale } from "@/shared/lib/i18n"
import { cn } from "@/shared/lib/utils"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/app/providers/auth-provider"

export function Header() {
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t } = useI18n()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const handleGetStarted = () => {
    if (currentUser) {
      navigate("/dashboard")
    } else {
      navigate("/register")
    }
  }

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const toggleLocale = () => {
    setLocale(locale === "en" ? "tr" : "en")
  }

  

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/">
            <motion.div
              className="flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
                <span className="text-sm font-bold text-background">M</span>
              </div>
              <span className="text-lg font-semibold text-foreground">MeetAI</span>
            </motion.div>
          </Link>

        

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLocale}
              className="hidden sm:flex"
            >
              <Globe className="h-4 w-4" />
              <span className="ml-1 text-xs font-medium uppercase">{locale}</span>
            </Button>

            {/* Theme Toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* CTA Button */}
            <Button onClick={handleGetStarted} className="hidden sm:flex">
              {currentUser ? (t("nav.dashboard") as string) || "Dashboard" : (t("nav.getStarted") as string)}
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border"
        >
          <nav className="flex flex-col gap-4 p-4">
           
            <div className="flex items-center gap-2 pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLocale}
                className="flex items-center gap-1"
              >
                <Globe className="h-4 w-4" />
                <span className="text-xs font-medium uppercase">{locale}</span>
              </Button>
            </div>
            <Button onClick={handleGetStarted} className="w-full">
              {currentUser ? (t("nav.dashboard") as string) || "Dashboard" : (t("nav.getStarted") as string)}
            </Button>
          </nav>
        </motion.div>
      )}
    </motion.header>
  )
}
