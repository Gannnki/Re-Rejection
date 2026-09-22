import Link from "next/link";

const features = [
  {
    emoji: "📥",
    title: "Log it three ways",
    description:
      "Upload a screenshot of the rejection email, paste the message text, or just type in the company, position, and date.",
  },
  {
    emoji: "📊",
    title: "See your dashboard",
    description:
      "Track how many companies have said no, and follow the timeline of your job search so far.",
  },
  {
    emoji: "💛",
    title: "Get a little support",
    description:
      "An encouraging note every time you log a rejection, plus a milestone message when you hit a meaningful number.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-background font-sans text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 sm:px-10">
        <span className="text-lg font-semibold tracking-tight">
          Re-Rejection
        </span>
        <nav className="flex items-center gap-3 text-sm font-medium">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 transition-colors hover:bg-foreground/[.06]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-foreground px-4 py-2 text-background transition-colors hover:bg-foreground/85"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-16 px-6 py-16 sm:px-10 sm:py-24">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Every rejection, logged and looked after.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-foreground/70">
            Job hunting means collecting rejections — often more of them
            than offers. Re-Rejection keeps track of every &ldquo;no&rdquo;
            you get, so it becomes a clear record instead of a pile in your
            inbox.
          </p>
          <Link
            href="/signup"
            className="mt-2 flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-base font-medium text-background transition-colors hover:bg-foreground/85"
          >
            Get started
          </Link>
        </div>

        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col gap-3 rounded-2xl border border-foreground/10 p-6"
            >
              <span className="text-3xl" aria-hidden>
                {feature.emoji}
              </span>
              <h2 className="text-lg font-semibold">{feature.title}</h2>
              <p className="text-sm leading-6 text-foreground/70">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
