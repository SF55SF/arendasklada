// ARENDASKLADA_MARKER_DOMAIN: main production origin used for SEO and structured data.
const SITE_ORIGIN = 'https://arendasklada.uz';

function isExternalUrl(path: string) {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(path);
}

function cleanCurrentPath(currentPath = '/') {
  if (!currentPath || currentPath === '/') {
    return '/';
  }

  const withoutHash = currentPath.split('#')[0]?.split('?')[0] || '/';
  return withoutHash.endsWith('/') ? withoutHash : `${withoutHash}/`;
}

function getRelativePrefix(currentPath = '/') {
  const cleanPath = cleanCurrentPath(currentPath);
  const depth = cleanPath.split('/').filter(Boolean).length;

  return depth === 0 ? './' : '../'.repeat(depth);
}

export function absoluteUrl(path = '/') {
  return new URL(path, SITE_ORIGIN).toString();
}

export function relativePath(path: string, currentPath = '/') {
  if (
    !path ||
    path.startsWith('#') ||
    isExternalUrl(path) ||
    /^[a-z][a-z0-9+.-]*:/i.test(path)
  ) {
    return path;
  }

  if (!path.startsWith('/')) {
    return path;
  }

  const cleanPath = path.replace(/^\/+/, '');
  const prefix = getRelativePrefix(currentPath);

  return cleanPath ? `${prefix}${cleanPath}` : prefix;
}

export function homePath(currentPath = '/') {
  return relativePath('/', currentPath);
}

export function homeAnchor(anchor: string, currentPath = '/') {
  const cleanAnchor = anchor.replace(/^#/, '');
  const cleanPath = cleanCurrentPath(currentPath);

  return cleanPath === '/'
    ? `#${cleanAnchor}`
    : `${homePath(currentPath)}#${cleanAnchor}`;
}

export function resolveNavHref(href: string, currentPath = '/') {
  const homeAnchorMatch = href.match(/^\/#(.+)$/);

  if (homeAnchorMatch) {
    return homeAnchor(homeAnchorMatch[1], currentPath);
  }

  return relativePath(href, currentPath);
}
