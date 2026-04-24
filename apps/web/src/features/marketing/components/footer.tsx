import { motion } from "framer-motion"
import { Github, Twitter, Linkedin } from "lucide-react"
import { useI18n } from "@/shared/lib/i18n"
import { Link } from "react-router-dom"

export function Footer() {
  const { t } = useI18n()

  const footerLinks = [
    {
      title: t("footer.product") as string,
      links: ["Features", "Pricing", "Integrations", "Changelog"],
    },
    {
      title: t("footer.company") as string,
      links: ["About", "Blog", "Careers", "Press"],
    },
    {
      title: t("footer.resources") as string,
      links: ["Documentation", "Help Center", "API", "Status"],
    },
    {
      title: t("footer.legal") as string,
      links: ["Privacy", "Terms", "Security", "Cookies"],
    },
  ]

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
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
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Transform your meetings into actionable outcomes with AI-powered intelligence.
            </p>
            <div className="mt-6 flex gap-4">
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="font-semibold text-sm mb-4">{group.title}</h3>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {t("footer.copyright") as string}
          </p>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Built with</span>
            <span className="text-red-500">♥</span>
            <span>for better meetings</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
