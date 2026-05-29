import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Learn Automation Working Playbook",
  description: "Shipping Real Workflows with n8n",
  base: '/n8n-playbook/',
  appearance: 'dark',

  themeConfig: {

    // ── TOP NAV ──────────────────────────────────────────────────
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Start Here', link: '/chapter-01' },
      { text: '10-min First Win', link: '/chapter-04' },
      {
        text: 'Parts',
        items: [
          { text: 'Part I: Foundations', link: '/chapter-01' },
          { text: 'Part II: Setup Once', link: '/chapter-06' },
          { text: 'Part III: Building Real Workflows', link: '/chapter-10' },
          { text: 'Part IV: Adding AI', link: '/chapter-19' },
          { text: 'Part V: Workflows by Role', link: '/chapter-22' },
          { text: 'Part VI: Going Further', link: '/chapter-27' },
        ]
      },
      { text: 'About', link: '/about' },
    ],

    // ── SIDEBAR ──────────────────────────────────────────────────
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Start Here', link: '/start-here' },
        ]
      },
      {
        text: 'Part I: Foundations',
        collapsed: false,
        items: [
          { text: '1. What changes when you stop doing it by hand?', link: '/chapter-01' },
          { text: '2. How does an automation actually run?', link: '/chapter-02' },
          { text: '3. What is the automation landscape right now?', link: '/chapter-03' },
          { text: '4. A 10-minute first win', link: '/chapter-04' },
          { text: '5. Do you still need that AI tool?', link: '/chapter-05' },
        ]
      },
      {
        text: 'Part II: Setup Once',
        collapsed: true,
        items: [
          { text: '6. Installing n8n: Cloud, Render, Hostinger, or self-hosted Docker?', link: '/chapter-06' },
          { text: '7. How much should you trust a workflow to run on its own?', link: '/chapter-07' },
          { text: '8. Setting up your first credentials', link: '/chapter-08' },
          { text: '9. Your workspace setup: workflows, folders, tags', link: '/chapter-09' },
        ]
      },
      {
        text: 'Part III: Building Real Workflows',
        collapsed: true,
        items: [
          { text: '10. Triggers: how does a workflow know when to run?', link: '/chapter-10' },
          { text: '11. Why does data flow as items?', link: '/chapter-11' },
          { text: '12. How do you actually write an expression?', link: '/chapter-12' },
          { text: '13. How do you route different items down different paths?', link: '/chapter-13' },
          { text: '14. How do you pause a workflow for a human?', link: '/chapter-14' },
          { text: '15. What happens when a node fails?', link: '/chapter-15' },
          { text: '16. How do you process 10,000 items without breaking everything?', link: '/chapter-16' },
          { text: '17. How do you shape data between nodes?', link: '/chapter-17' },
          { text: '18. How do you call any API n8n does not already integrate with?', link: '/chapter-18' },

        ]
      },
      {
        text: 'Part IV: Adding AI',
        collapsed: true,
        items: [
          { text: '19. The AI Agent node: setup, models, and your first agent', link: '/chapter-19' },
          { text: '20. Classifying and extracting from unstructured text', link: '/chapter-20' },
          { text: '21. Memory, embeddings, and Q&A over your own documents', link: '/chapter-21' },
        ]
      },
      {
        text: 'Part V: Workflows by Role',
        collapsed: true,
        items: [
          { text: '22. For business development', link: '/chapter-22' },
          { text: '23. For customer success', link: '/chapter-23' },
          { text: '24. For finance and ops', link: '/chapter-24' },
          { text: '25. For marketing', link: '/chapter-25' },
          { text: '26. For everyone — personal workflows', link: '/chapter-26' },
        ]
      },
      {
        text: 'Part VI: Going Further',
        collapsed: true,
        items: [
          { text: '27. Sub-workflows: keeping the canvas readable', link: '/chapter-27' },
          { text: '28. Self-hosting n8n at depth: Docker, queue mode, the PDPA case', link: '/chapter-28' },
          { text: '29. Connecting to a database and writing real records', link: '/chapter-29' },
          { text: '30. Scheduling, queueing, and running at scale', link: '/chapter-30' },
          { text: '31. Custom code: advanced patterns', link: '/chapter-31' },
          { text: '32. What we got wrong, and what is next', link: '/chapter-32' },
        ]
      },
      {
        text: 'Appendix',
        collapsed: true,
        items: [
          { text: 'A. Glossary', link: '/appendix-a' },
          { text: 'B. Reference workflow library', link: '/appendix-b' },
          { text: 'C. Credentials cheat sheet', link: '/appendix-c' },
          { text: 'D. Further reading', link: '/appendix-d' },
        ]
      },
      {
        text: 'More',
        items: [
          { text: 'About', link: '/about' },
        ]
      },
    ],

    // ── SOCIAL + SEARCH + FOOTER ─────────────────────────────────
    socialLinks: [
      { icon: 'github', link: 'https://github.com/MahAbram/n8n-playbook' }
    ],

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3],
      label: 'On this page'
    },

    footer: {
      message: 'Released under CC BY 4.0.',
      copyright: 'Copyright © 2026 MahAbram'
    }
  }
})
