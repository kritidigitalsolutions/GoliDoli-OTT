/**
 * Generates an inline SVG data URI with user initials and a deterministic background color.
 * No external network requests needed; loads instantly and works offline.
 */
export const getInitialsAvatar = (name = "User") => {
  let cleanName = String(name || "").trim();

  // If name is empty, pure digits, or a phone number like +91..., fallback to "User"
  if (!cleanName || /^\+?\d+$/.test(cleanName)) {
    cleanName = "User";
  }

  // If email was passed as name, strip the domain
  if (cleanName.includes("@")) {
    cleanName = cleanName.split("@")[0];
  }

  const parts = cleanName.split(/[\s._-]+/).filter(Boolean);
  let initials = "U";
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    initials = parts[0].slice(0, 2).toUpperCase();
  } else if (parts.length === 1) {
    initials = parts[0][0].toUpperCase();
  }

  // Deterministic color palette matching modern OTT dashboard styling
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    { bg: "#4F46E5", text: "#FFFFFF" }, // Indigo
    { bg: "#7C3AED", text: "#FFFFFF" }, // Violet
    { bg: "#DB2777", text: "#FFFFFF" }, // Pink
    { bg: "#059669", text: "#FFFFFF" }, // Emerald
    { bg: "#D97706", text: "#FFFFFF" }, // Amber
    { bg: "#2563EB", text: "#FFFFFF" }, // Blue
    { bg: "#0D9488", text: "#FFFFFF" }, // Teal
    { bg: "#E11D48", text: "#FFFFFF" }, // Rose
  ];
  const color = colors[Math.abs(hash) % colors.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><rect width="100" height="100" rx="50" fill="${color.bg}"/><text x="50" y="53" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="700" fill="${color.text}" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
