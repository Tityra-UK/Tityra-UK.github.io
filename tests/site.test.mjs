import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';

const origin = 'https://tityra-uk.github.io';
const output = path.resolve(fileURLToPath(new URL('../_site/', import.meta.url)));
const source = path.resolve(fileURLToPath(new URL('../content/', import.meta.url)));
const indexableRoutes = ['/', '/about/', '/agent-experience/'];

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(target) : [target];
  }));
  return groups.flat();
}

function routeOf(file) {
  const relative = path.relative(output, file).split(path.sep).join('/');
  return `/${relative.replace(/index\.html$/, '')}`;
}

const allFiles = await filesIn(output);
const pages = await Promise.all(allFiles.filter(file => file.endsWith('.html')).map(async file => {
  const html = await readFile(file, 'utf8');
  const { document } = parseHTML(html);
  const route = routeOf(file);
  const url = new URL(route, origin).href;
  const noindex = /\bnoindex\b/i.test(document.querySelector('meta[name="robots"]')?.content || '');
  return { file, route, url, html, document, noindex };
}));
const pagesByUrl = new Map(pages.map(page => [page.url, page]));

function content(document, selector) {
  return document.querySelector(selector)?.getAttribute('content')?.trim() || '';
}

function schemasOf(document) {
  return [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(script => {
    const value = JSON.parse(script.textContent);
    assert.equal(value['@context'], 'https://schema.org');
    return value['@graph'] || [value];
  });
}

function hasType(schema, type) {
  return [schema['@type']].flat().includes(type);
}

async function localTarget(url) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { assert.fail(`Malformed URL path: ${url.href}`); }
  const resolved = path.resolve(output, `.${pathname}`);
  assert.ok(resolved === output || resolved.startsWith(`${output}${path.sep}`), url.href);
  let target = resolved;
  let information;
  try { information = await stat(target); }
  catch { assert.fail(`Missing internal target: ${url.href}`); }
  if (information.isDirectory()) target = path.join(target, 'index.html');
  await stat(target).catch(() => assert.fail(`Missing page: ${url.href}`));
  return target;
}

test('production pages expose meaningful semantic documents and keyboard entry points', () => {
  assert.deepEqual(pages.map(page => page.route).sort(), [...indexableRoutes, '/404.html'].sort(), 'Publication must retain the agreed three-page scope.');
  for (const { route, html, document } of pages) {
    assert.match(html, /^\s*<!doctype html>/i, route);
    assert.match(document.documentElement.lang || '', /^en(?:-GB)?$/i, route);
    assert.equal(document.querySelectorAll('main').length, 1, route);
    assert.equal(document.querySelectorAll('h1').length, 1, route);
    assert.ok(document.querySelector('main h1')?.textContent.trim(), route);
    assert.ok(document.querySelector('header nav'), `${route}: missing site navigation`);
    assert.ok(document.querySelector('a[href^="#"]'), `${route}: missing skip link`);
    const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
    assert.equal(ids.length, new Set(ids).size, `${route}: duplicate IDs`);
    let previous = 0;
    for (const heading of document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6')) {
      const level = Number(heading.localName[1]);
      assert.ok(level <= previous + 1, `${route}: heading jumps from H${previous} to H${level}`);
      assert.ok(heading.textContent.trim(), `${route}: empty heading`);
      previous = level;
    }
    for (const navigation of document.querySelectorAll('nav')) {
      assert.ok(navigation.getAttribute('aria-label') || navigation.getAttribute('aria-labelledby'), `${route}: unnamed navigation`);
    }
    for (const element of document.querySelectorAll('[tabindex]')) {
      assert.ok(Number(element.getAttribute('tabindex')) <= 0, `${route}: positive tabindex`);
    }
    for (const hidden of document.querySelectorAll('[aria-hidden="true"]')) {
      assert.ok(!hidden.matches('a[href], button, input, select, textarea, [tabindex="0"]'), `${route}: hidden control`);
      assert.equal(hidden.querySelectorAll('a[href], button, input, select, textarea, [tabindex="0"]').length, 0, `${route}: hidden focusable child`);
    }
  }
});

test('every page has distinct search metadata, a self canonical and usable social previews', async () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const { route, url, document, noindex } of pages) {
    const title = document.querySelector('title')?.textContent.trim();
    const description = content(document, 'meta[name="description"]');
    assert.ok(title, `${route}: empty title`);
    assert.ok(description, `${route}: empty description`);
    assert.ok(!titles.has(title), `${route}: duplicated title`);
    assert.ok(!descriptions.has(description), `${route}: duplicated description`);
    titles.add(title);
    descriptions.add(description);
    assert.ok(!/localhost|127\.0\.0\.1|example\.com|TODO|\{\{|\{%/i.test(`${title} ${description}`), `${route}: placeholder metadata`);
    const canonicals = [...document.querySelectorAll('link[rel="canonical"]')];
    if (!noindex || canonicals.length) {
      assert.equal(canonicals.length, 1, `${route}: missing or repeated canonical`);
      assert.equal(canonicals[0].getAttribute('href'), url, `${route}: canonical must use the page's own origin`);
    }
    assert.match(content(document, 'meta[name="viewport"]'), /width=device-width/, route);
    const socialTitle = content(document, 'meta[property="og:title"]');
    assert.ok(socialTitle && title.includes(socialTitle), `${route}: social title must describe the page`);
    assert.equal(content(document, 'meta[property="og:description"]'), description, route);
    assert.equal(content(document, 'meta[property="og:url"]'), url, route);
    const imageUrl = content(document, 'meta[property="og:image"]');
    assert.ok(imageUrl, `${route}: missing social image`);
    const socialImage = new URL(imageUrl);
    assert.equal(socialImage.origin, origin, `${route}: social image must be an absolute production URL`);
    await localTarget(socialImage);
    assert.ok(content(document, 'meta[property="og:image:alt"]'), `${route}: social image needs a description`);
  }
});

test('links, fragments and asset references resolve without placeholder destinations', async () => {
  for (const { route, url, document } of pages) {
    for (const element of document.querySelectorAll('[href], [src]')) {
      const attribute = element.hasAttribute('href') ? 'href' : 'src';
      const value = element.getAttribute(attribute);
      assert.ok(value?.trim(), `${route}: empty ${attribute}`);
      assert.ok(!/^(?:javascript|vbscript):/i.test(value), `${route}: unsafe URL`);
      assert.notEqual(value, '#', `${route}: placeholder link`);
      if (element.matches('a') && /^data:/i.test(value)) assert.fail(`${route}: unsafe data link`);
      if (/^(?:mailto|tel|data):/i.test(value)) continue;
      const destination = new URL(value, url);
      assert.ok(['http:', 'https:'].includes(destination.protocol), `${route}: unsupported URL scheme`);
      if (destination.origin !== origin) continue;
      const target = await localTarget(destination);
      if (destination.hash) {
        const targetUrl = new URL(destination.href);
        targetUrl.hash = '';
        targetUrl.search = '';
        const targetPage = pagesByUrl.get(targetUrl.href) || pages.find(page => page.file === target);
        assert.ok(targetPage, `${route}: fragment targets a non-HTML asset`);
        const fragment = decodeURIComponent(destination.hash.slice(1));
        assert.ok(targetPage.document.getElementById(fragment), `${route}: missing fragment ${destination.href}`);
      }
      if (element.matches('a[aria-current="page"]')) {
        assert.equal(destination.pathname, new URL(url).pathname, `${route}: aria-current must identify the actual page`);
      }
    }
    for (const image of document.querySelectorAll('img')) {
      assert.ok(image.hasAttribute('alt'), `${route}: image missing alt`);
      assert.ok(Number(image.getAttribute('width')) > 0 && Number(image.getAttribute('height')) > 0, `${route}: image dimensions must reserve layout space`);
    }
    for (const anchor of document.querySelectorAll('a[href]')) {
      const name = anchor.getAttribute('aria-label') || anchor.textContent.trim() || anchor.querySelector('img[alt]')?.getAttribute('alt');
      assert.ok(name, `${route}: unnamed link`);
    }
  }
});

test('stylesheet URLs resolve to published files', async () => {
  for (const file of allFiles.filter(file => file.endsWith('.css'))) {
    const stylesheet = await readFile(file, 'utf8');
    const stylesheetUrl = new URL(path.relative(output, file).split(path.sep).join('/'), `${origin}/`);
    for (const match of stylesheet.matchAll(/url\(\s*["']?([^\s)"']+)["']?\s*\)/g)) {
      const destination = new URL(match[1], stylesheetUrl);
      if (destination.origin === origin) await localTarget(destination);
    }
  }
});

test('structured data identifies the public pages and breadcrumb context truthfully', () => {
  for (const { route, url, document, noindex } of pages) {
    if (noindex) continue;
    const schemas = schemasOf(document);
    assert.ok(schemas.length, `${route}: missing structured data`);
    const pageTypes = ['WebPage', 'AboutPage'];
    assert.ok(schemas.some(schema => pageTypes.some(type => hasType(schema, type))), `${route}: missing page schema`);
    assert.ok(schemas.some(schema => schema.url === url || schema['@id'] === `${url}#webpage` || schema.mainEntityOfPage?.['@id'] === url), `${route}: schema does not identify its canonical page`);
    for (const schema of schemas) {
      assert.ok(!['Review', 'AggregateRating', 'Article', 'TechArticle'].some(type => hasType(schema, type)), `${route}: unsupported ratings or article claims`);
    }
    if (route !== '/') {
      assert.ok(document.querySelector('nav[aria-label*="readcrumb"]'), `${route}: missing visible breadcrumbs`);
      const breadcrumbs = schemas.find(schema => hasType(schema, 'BreadcrumbList'));
      assert.ok(breadcrumbs?.itemListElement?.length >= 2, `${route}: missing breadcrumb schema`);
      const positions = breadcrumbs.itemListElement.map(item => item.position);
      assert.deepEqual(positions, positions.map((_, index) => index + 1), `${route}: invalid breadcrumb order`);
    }
    if (route === '/about/') assert.ok(schemas.some(schema => hasType(schema, 'AboutPage')), 'About page must use a matching schema type.');
  }
});

test('robots and sitemap agree with the indexable production pages and exclude the error page', async () => {
  const robots = await readFile(path.join(output, 'robots.txt'), 'utf8');
  assert.match(robots, /^User-agent:\s*\*/im);
  assert.ok(!/^Disallow:\s*\/\s*$/im.test(robots), 'Production crawling must not be disabled.');
  assert.match(robots, new RegExp(`^Sitemap:\\s*${origin.replaceAll('.', '\\.')}\\/sitemap\\.xml\\s*$`, 'im'));
  const sitemap = await readFile(path.join(output, 'sitemap.xml'), 'utf8');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].replaceAll('&amp;', '&'));
  assert.equal(locations.length, new Set(locations).size, 'Sitemap has repeated URLs.');
  assert.deepEqual(pages.filter(page => !page.noindex).map(page => page.route).sort(), indexableRoutes, 'Exactly the agreed three public pages should be indexable.');
  assert.deepEqual([...locations].sort(), pages.filter(page => !page.noindex).map(page => page.url).sort());
  const errorPage = pages.find(page => page.route === '/404.html');
  assert.ok(errorPage?.noindex, 'The custom 404 page must use noindex.');
  for (const location of locations) {
    assert.equal(new URL(location).origin, origin);
    await localTarget(new URL(location));
  }
});

test('publication contains static public assets rather than private or development files', async () => {
  const withdrawnPaths = /(?:^|\/)(?:guides(?:-index)?(?:\/|\.)|checklist(?:\/|\.)|website-content-auditing(?:\/|\.)|[^/]*(?:backup|archive)[^/]*(?:\/|\.))/i;
  for (const file of allFiles) {
    const relative = path.relative(output, file).split(path.sep).join('/');
    assert.ok(!/(?:^|\/)(?:\.git|\.env(?:\..*)?|node_modules|package(?:-lock)?\.json)(?:\/|$)/.test(relative), `Private development file published: ${relative}`);
    assert.ok(!/\.(?:pem|key)$/i.test(relative), `Private key file published: ${relative}`);
    assert.ok(!withdrawnPaths.test(relative), `Withdrawn content remains in publication: ${relative}`);
  }
  for (const file of await filesIn(source)) {
    const relative = path.relative(source, file).split(path.sep).join('/');
    assert.ok(!withdrawnPaths.test(relative), `Withdrawn source remains in the public repository: ${relative}`);
  }
  for (const { route, document } of pages) {
    const main = document.querySelector('main');
    assert.equal(main.querySelectorAll('pre, code').length, 0, `${route}: technical examples exceed the public introduction scope`);
    assert.ok(!/\b(?:API|MCP|curl|audit checklist|audit methodology)\b/i.test(main.textContent), `${route}: detailed methods exceed the public introduction scope`);
  }
});
