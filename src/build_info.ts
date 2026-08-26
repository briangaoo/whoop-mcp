// Set TOTEM_BUILD_ID in CI/deployment (normally the immutable git SHA or image
// digest). The value is intentionally non-secret and lets /health prove which
// artifact is serving a connector after deployment.
export const BUILD_ID = process.env.TOTEM_BUILD_ID || process.env.FLY_IMAGE_REF || "dev";
