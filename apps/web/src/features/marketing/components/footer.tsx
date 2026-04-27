import { motion } from "framer-motion"
import { Github, Twitter, Linkedin } from "lucide-react"
import { useI18n } from "@/shared/lib/i18n"
import { Link } from "react-router-dom"

export function Footer() {
  const { t } = useI18n()


  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & Tagline */}
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
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
          <div className="hidden lg:block h-4 w-px bg-border" />
          <p className="text-xs text-muted-foreground hidden sm:block">
            {t("footer.tagline") as string}
          </p>
        </div>

        {/* Copyright & Socials */}
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex gap-4">
            <a
              href="https://github.com/omercnkc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="https://tr.linkedin.com/in/%C3%B6mer-%C3%A7anak%C3%A7%C4%B1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
          
          <p className="text-xs text-muted-foreground">
            {t("footer.copyright") as string}
          </p>
        </div>
      </div>
    </footer>
  )
}
