
import { getSession } from "@/lib/auth-clerk"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 font-sans text-white">
      <div className="text-center space-y-6 max-w-lg">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Project Overwatch</h1>
            <p className="text-zinc-400">Advanced ERLC Management Dashboard</p>
          </div>
          
          <div className="flex justify-center gap-4">
              <Link 
                  href="/login"
                  className="rounded-lg bg-indigo-500 px-6 py-3 font-semibold hover:bg-indigo-600 transition-colors"
              >
                  Log In
              </Link>
          </div>
      </div>
    </div>
  )
}
