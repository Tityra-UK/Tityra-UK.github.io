import { rm } from "node:fs/promises";

// This directory contains generated files only. Cleaning it prevents removed
// pages or an earlier preview configuration from leaking into a publication.
const output = new URL("../_site/", import.meta.url);
await rm(output, { recursive: true, force: true });
