import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Header } from "@/features/marketing/components/header"
import { useAuth } from "@/app/providers/auth-provider"
import { auth } from "@/shared/lib/firebase/config"
import { createUserProfile } from "@/shared/lib/firebase/services/users"

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const credential = await signUp(email, password)
      await createUserProfile(credential.user.uid, credential.user.email!, name)
      navigate("/dashboard")
    } catch (err: any) {
      setError(err.message || "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pt-16">
      <Header />
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 rounded-2xl border border-border/40 bg-card p-10 shadow-sm">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
            <p className="text-muted-foreground">Sign up to get started with MeetFlow</p>
          </div>
          
          <form className="space-y-4 pt-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Name</label>
              <input 
                type="text" 
                placeholder="John Doe" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Email</label>
              <input 
                type="email" 
                placeholder="m@example.com" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-6 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
            <div className="text-center mt-4">
              <a href="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Already have an account? Sign in
              </a>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
