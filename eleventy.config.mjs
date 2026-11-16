import { readFileSync } from "node:fs";

const site = JSON.parse(readFileSync(new URL("./content/_data/brand.json", import.meta.url), "utf8"));
const absolute = (path) => new URL(path || "/", `${site.url}/`).href;

export default function (config) {
  config.addPassthroughCopy("assets");
  config.setNunjucksEnvironmentOptions({ autoescape: true });
  config.addFilter("absolute", absolute);
  config.addFilter("isoDate", (value) => new Date(value).toISOString().slice(0, 10));
  config.addFilter("json", (value) => JSON.stringify(value).replaceAll("<", "\\u003c"));
  config.addFilter("structuredData", (path, title, description) => {
    const organisation = {
      "@type": "Organization", "@id": "https://tityra.com/#organization",
      name: "Tityra", url: site.mainUrl,
      logo: { "@type": "ImageObject", url: absolute("/assets/images/tityra-wordmark.svg") },
      sameAs: [site.githubUrl]
    };
    const graph = [organisation, {
      "@type": "WebSite", "@id": `${site.url}/#website`,
      url: `${site.url}/`, name: site.title,
      description: site.description, inLanguage: site.language,
      publisher: { "@id": organisation["@id"] }
    }, {
      "@type": path === "/about/" ? "AboutPage" : "WebPage",
      "@id": `${absolute(path)}#webpage`,
      url: absolute(path), name: title, description, inLanguage: site.language,
      isPartOf: { "@id": `${site.url}/#website` },
      publisher: { "@id": organisation["@id"] }
    }];
    if (path !== "/") graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absolute("/") },
        { "@type": "ListItem", position: 2, name: title, item: absolute(path) }
      ]
    });
    return { "@context": "https://schema.org", "@graph": graph };
  });
  config.addCollection("indexablePages", (api) => api.getAll().filter((item) =>
    item.url?.endsWith("/") && !item.data.noindex
  ).sort((a, b) => a.url.localeCompare(b.url)));
  return {
    dir: { input: "content", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["md", "njk"], markdownTemplateEngine: "njk", htmlTemplateEngine: "njk"
  };
}
