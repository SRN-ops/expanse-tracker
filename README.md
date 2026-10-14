# Expense Tracker

A private, phone-first expense tracker (React + Vite + TypeScript).

- Setup asks for your name and the amount you have right now, then tracks from there
- Multiple profiles per device; each profile keeps its own ledger
- Spend, receive, lend and borrow, with settle-up for lena/dena
- Analytics, searchable history, edit/delete with undo
- Installable on phones (PWA) and works offline after first load
- All data is saved in the browser on that device. Use Export backup to move or keep a copy.

## Run

    npm install
    npm run dev

## Build and deploy

    npm run build      # outputs dist/

Deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages).
Netlify/Vercel: build command `npm run build`, output directory `dist`. The app uses relative paths, so it also works from a sub-folder.
