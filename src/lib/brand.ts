/** Central site identity. Edit this file to rename/rebrand the public site. */
export const SITE_BRAND = {
  name: "ARIO SCRIPTS",
  shortName: "ARIO",
  tagline: "Premium Lua Script Database",
  description: "A curated database of premium Lua scripts. Every script is hand-checked, versioned and kept working.",
} as const;

export const siteTitle = () => SITE_BRAND.name + " — " + SITE_BRAND.tagline;
