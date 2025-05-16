## Estrutura do Projeto (BTC-Conversor)

```
BTC-Conversor/
├── .cursor/
├── .git/
├── @memory-bank/
│   ├── activeContext.md
│   ├── componentCatalog.md
│   ├── detailed-tasks.md
│   ├── productContext.md
│   ├── progress.md
│   ├── projectbrief.md
│   ├── projectTree.md
│   ├── quick-wins.md
│   ├── sprint-focus-export-import-enhancements.md
│   ├── sprint-planning.md
│   ├── systemPatterns.md
│   ├── tasks.md
│   └── techContext.md
├── app/
│   ├── admin/
│   │   ├── diagnose/
│   │   │   ├── client.tsx      [NOVO]
│   │   │   └── page.tsx        [MODIFICADO]
│   │   └── layout.tsx          [NOVO]
│   ├── api/
│   │   ├── bitcoin/
│   │   │   ├── data/
│   │   │   ├── historical/
│   │   │   └── price/
│   │   └── init-db/
│   │       └── route.ts        [MODIFICADO]
│   ├── auth/
│   │   └── page.tsx            [MODIFICADO]
│   ├── calculator/
│   │   └── page.tsx
│   ├── chart/
│   │   └── page.tsx
│   ├── converter/
│   │   └── page.tsx
│   ├── profile/
│   │   └── page.tsx            [MODIFICADO]
│   ├── settings/
│   │   └── page.tsx            [MODIFICADO]
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   │   ├── accordion.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── alert.tsx
│   │   ├── aspect-ratio.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── carousel.tsx
│   │   ├── chart.tsx
│   │   ├── checkbox.tsx
│   │   ├── collapsible.tsx
│   │   ├── command.tsx
│   │   ├── context-menu.tsx
│   │   ├── dialog.tsx
│   │   ├── drawer.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── hover-card.tsx
│   │   ├── input-otp.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── menubar.tsx
│   │   ├── navigation-bar.tsx
│   │   ├── navigation-menu.tsx
│   │   ├── pagination.tsx
│   │   ├── popover.tsx
│   │   ├── progress.tsx
│   │   ├── radio-group.tsx
│   │   ├── resizable.tsx
│   │   ├── responsive-container.tsx
│   │   ├── scroll-area.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── sidebar.tsx
│   │   ├── skeleton.tsx
│   │   ├── slider.tsx
│   │   ├── sonner.tsx
│   │   ├── switch.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   ├── toast.tsx
│   │   ├── toaster.tsx
│   │   ├── toggle-group.tsx
│   │   ├── toggle.tsx
│   │   ├── tooltip.tsx
│   │   └── use-mobile.tsx
│   ├── animated-counter.tsx
│   ├── auth-form.tsx
│   ├── bitcoin-converter.tsx
│   ├── diagnose-page-client.tsx
│   ├── historical-rates-chart.tsx
│   ├── mobile-navigation.tsx
│   ├── page-transition.tsx
│   ├── profit-calculator.tsx
│   ├── require-auth.tsx
│   ├── theme-provider.tsx
│   ├── user-profile.tsx
│   └── user-settings.tsx
├── context/
│   └── AuthContext.tsx
├── data/
├── hooks/
│   ├── use-active-tab.ts
│   ├── use-auth.tsx           [MODIFICADO]
│   ├── use-mobile.tsx
│   ├── use-supabase-retry.ts  [MODIFICADO]
│   └── use-toast.ts
├── lib/
│   ├── api.ts
│   ├── client-api.ts
│   ├── server-api.ts
│   ├── supabase.ts           [MODIFICADO]
│   └── utils.ts
├── public/
│   ├── placeholder-logo.png
│   ├── placeholder-logo.svg
│   ├── placeholder-user.jpg
│   ├── placeholder.jpg
│   └── placeholder.svg
├── styles/
│   └── globals.css
├── .gitignore
├── components.json
├── middleware.ts
├── next.config.js
├── package.json              [MODIFICADO]
├── pnpm-lock.yaml
├── postcss.config.mjs
├── README.md
├── tailwind.config.ts
└── tsconfig.json
└── vercel.json