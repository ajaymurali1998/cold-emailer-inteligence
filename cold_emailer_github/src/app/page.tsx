import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-16">
      <h1 className="text-2xl font-semibold">Email Intelligence App</h1>
      <div className="flex gap-4">
        <Link className="rounded-full bg-black px-5 py-3 text-white" href="/contexts">
          Business Contexts
        </Link>
        <Link className="rounded-full border border-black px-5 py-3" href="/runs">
          Runs
        </Link>
      </div>
    </div>
  )
}
