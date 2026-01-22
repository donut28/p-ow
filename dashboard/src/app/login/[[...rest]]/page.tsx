
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 font-sans text-zinc-100">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-zinc-950 to-zinc-950 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-6">
                <SignIn />

                <div className="max-w-sm text-center text-zinc-400 text-sm">
                    Don't have an account? Please open a <strong>Staff Management Ticket</strong> for access.
                </div>
            </div>
        </div>
    );
}
