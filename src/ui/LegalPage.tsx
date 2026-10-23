import { useEffect, type ReactNode } from 'react'
import { PitMark } from './icons'
import { ROUTE_HREF, type LegalRoute } from './route'

const REPO = 'https://github.com/abivan100-stack/pitwatch-3d'

const PAGES: Record<LegalRoute, { title: string; body: ReactNode }> = {
  terms: {
    title: 'Terms and Conditions',
    body: (
      <>
        <p>
          These terms cover your use of the PitWatch 3D website. By using it you accept them. They
          are a plain-language draft and have not been reviewed by a lawyer.
        </p>
        <h2>The data is simulated</h2>
        <p>
          The mine, both surveys and every finding are generated from a fixed random seed. They do
          not describe a real site. Do not use anything shown here for a real permit, safety or
          regulatory decision.
        </p>
        <h2>No warranty</h2>
        <p>
          The site is provided as it is, without any promise that it is accurate, complete or always
          available. Findings point to places worth inspecting; they do not prove a breach.
        </p>
        <h2>Limit of liability</h2>
        <p>
          To the extent the law allows, the authors are not liable for any loss that comes from
          using the site or relying on what it shows.
        </p>
        <h2>Changes</h2>
        <p>These terms may change. The version on this page is the one that applies.</p>
      </>
    ),
  },
  license: {
    title: 'License',
    body: (
      <>
        <p>
          The PitWatch 3D source code is published at{' '}
          <a href={REPO} className="text-accent underline underline-offset-2">
            github.com/abivan100-stack/pitwatch-3d
          </a>{' '}
          for review.
        </p>
        <h2>Current status</h2>
        <p>
          No open-source licence has been granted yet. Until one is added to the repository, all
          rights are reserved by the authors, and you may view the code but not copy, change or
          redistribute it without permission.
        </p>
        <h2>Third-party software</h2>
        <p>
          The site is built with open-source libraries, including React, three.js, Zustand and
          Tailwind CSS. Each remains under its own licence, listed in the repository&apos;s
          dependency files.
        </p>
        <h2>Permission</h2>
        <p>To ask for permission to use the code or the design, use the Contact page.</p>
      </>
    ),
  },
  contact: {
    title: 'Contact',
    body: (
      <>
        <p>
          The quickest way to reach the team is to open an issue on the project&apos;s GitHub page.
          Questions, bug reports and licensing requests are all welcome there.
        </p>
        <p>
          <a href={`${REPO}/issues`} className="text-accent underline underline-offset-2">
            Open an issue on GitHub
          </a>
        </p>
        <h2>What to include</h2>
        <p>
          Say which page you were on, what you expected and what happened, and the width of your
          screen if it is a layout problem.
        </p>
      </>
    ),
  },
}

/** Terms, License and Contact: plain pages reached from the landing page footer. */
export function LegalPage({ route }: { route: LegalRoute }) {
  const { title, body } = PAGES[route]

  useEffect(() => {
    document.title = `${title} – PitWatch 3D`
  }, [title])

  return (
    <div className="landing h-full overflow-y-auto">
      <header className="landing-bar">
        <a href={ROUTE_HREF.home} className="landing-brand" aria-label="PitWatch home">
          <span className="brand-mark">
            <PitMark className="h-6 w-[38px]" />
          </span>
          <span className="cond text-[22px] font-bold text-ink">PitWatch</span>
        </a>
        <a href={ROUTE_HREF.home} className="btn ml-auto">
          Back to home
        </a>
      </header>
      <main id="content" tabIndex={-1} className="legal-page">
        <h1 className="cond text-[clamp(34px,5vw,52px)] leading-none font-bold text-ink">
          {title}
        </h1>
        {body}
      </main>
    </div>
  )
}
