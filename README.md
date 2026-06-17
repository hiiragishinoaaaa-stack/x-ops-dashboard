# Re:link

A minimal URL shortener with custom OG previews. Built with Next.js + Supabase.

## Features

- Custom short slugs
- Set OG title, description, and image per link
- Instant redirect (users redirected via JS, OG scrapers see meta tags)
- Click count tracking
- Simple admin dashboard at `/admin`
- Mobile responsive

---

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql` — this creates the `links` table **and** the `increment_click_count` SQL function used for atomic click tracking
3. Copy your project URL and anon key from **Settings → API**

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000   # change to your domain in production
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add the three environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BASE_URL`) in **Project Settings → Environment Variables**
4. Deploy — done

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Create a new short link |
| `/admin` | Dashboard: list all links, see click counts, delete links |
| `/[slug]` | Redirects to destination (with OG meta tags for scrapers) |

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/links` | List all links |
| `POST` | `/api/links` | Create a link |
| `DELETE` | `/api/links/:id` | Delete a link |

---

## Adding auth later

Since this is an MVP without login, `/admin` is public. To add auth, the recommended path is [Supabase Auth](https://supabase.com/docs/guides/auth) — add a middleware that checks the session and redirects to a login page if unauthenticated.
