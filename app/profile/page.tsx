"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import UserProfile from "@/components/user-profile"
import { PageTransition } from "@/components/page-transition"
import { RequireAuth } from "@/components/require-auth"

export default function ProfilePage() {
  return (
    <RequireAuth>
      <main className="min-h-screen p-4 pt-24 md:pt-28 pb-8 md:pb-12">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
          </div>
        }>
          <PageTransition>
            <UserProfile />
          </PageTransition>
        </Suspense>
      </main>
    </RequireAuth>
  )
} 