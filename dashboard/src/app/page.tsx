import { getSession } from "@/lib/auth-clerk"
import { redirect } from "next/navigation"
import { LandingPage } from "@/components/landing-page"

export default async function Home() {
  const session = await getSession()

  if (session) {
    redirect("/dashboard")
  }

  return <LandingPage />
}
