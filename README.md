# Tityra on GitHub Pages

The source for [Tityra's GitHub Pages website](https://tityra-uk.github.io/).
It gives a concise introduction to Tityra and Agent Experience (AX), with
contextual links to the product website at [tityra.com](https://tityra.com/).

The agreed public scope is:

- `/`: Tityra introduction and relevant next steps.
- `/agent-experience/`: a short overview of Agent Experience.
- `/about/`: information about Tityra and this website.
- `/404.html`: the custom error page, excluded from indexing.

This is a lightweight brand and referral website. Detailed audit methods,
technical examples and checklists are outside its scope.

## Local development

Use Node.js 22 and npm:

```sh
npm ci
npm run dev
```

The local preview is available at `http://localhost:4178/`. The site is built
with Eleventy and produces ordinary HTML, CSS and local assets. It requires no
backend, paid service or client account.

```sh
npm run build
npm test
```

`npm run build` creates `_site/`. `npm test` inspects that production output.
For a clean build followed by every repository check, run:

```sh
npm run check
```

The checks cover the agreed page scope, metadata, canonical URLs, internal
links and fragments, local assets, heading structure, structured data and
sitemap/robots consistency. They also reject withdrawn technical content and
private development files in the publication. Browser and keyboard review are
still necessary for layout and interaction quality. Automated checks do not
certify accessibility.

## Update a page

Edit the page in `content/` and use its existing front matter for the title,
description and URL. Shared layouts live in `content/_includes/`, with site
identity and navigation in `content/_data/`. The template supplies the H1 for
Markdown pages, so use H2 headings for their main sections.

Keep the wording concise, truthful and consistent with the product website.
Tityra audits websites and their content. Its outputs are documented findings
and practical recommendations. Avoid unsupported claims, duplicated landing
pages and repetitive backlinks. Do not add new pages or detailed audit
materials without an explicit scope change.

Fix content in its source and rebuild, rather than editing `_site/`. Preserve
unique descriptions, descriptive internal links and the page's own canonical
URL. Use an actual publication or modification date when applicable.

## GitHub Pages publication

The intended origin is `https://tityra-uk.github.io/`, with no project path
prefix. The repository's Actions workflow builds and checks pull requests.
Successful pushes to `main`, or manual workflow runs on `main`, publish the
checked `_site/` artifact to the `github-pages` environment.

In repository **Settings → Pages**, the publishing source must be **GitHub
Actions**. An administrator can enable that setting before the first
publication. The workflow does not change repository visibility or create a
custom domain. Deployment jobs receive `contents: read`, `pages: write` and
`id-token: write`; build and pull-request jobs have read-only repository
permissions.

Actions are pinned to official release commit SHAs, with the corresponding
release version alongside each pin. Update pins deliberately and run the
checks when upgrading build dependencies.

After publication, verify the three public pages, `/robots.txt`,
`/sitemap.xml` and `/404.html`. A successful local build alone does not prove
a successful deployment or search indexing.

## Search maintenance

- Each page uses its own canonical URL on this GitHub Pages origin.
  Contextual links to `tityra.com` do not change the page's canonical.
- Keep navigation and sitemap entries consistent with the agreed scope.
- Structured data must match visible content. Do not add ratings, customer
  relationships or author credentials that have not been verified.
- Search Console verification and sitemap submission require the site's owner
  to choose and verify an account. They are separate from building and
  publishing this website. The project does not send automatic submissions to
  search engines or backlink directories.
- Search engines decide whether and when to index content. Hosting on GitHub
  Pages does not guarantee rankings, traffic or referral volume.

## Brand assets

The Tityra wordmark and bird mark are Tityra brand assets. The local
Philosopher and Noto Sans Tagalog fonts retain their accompanying SIL Open
Font License notices. No general open-source licence for Tityra's brand assets
is implied by this repository being public.
