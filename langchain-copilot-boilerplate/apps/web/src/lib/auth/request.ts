/** Blocks browser cross-site POST requests while allowing same-origin and CLI calls. */
export const isTrustedRequestOrigin = (request: Request): boolean => {
  const origin = request.headers.get('origin');
  if (origin) {
    return origin === new URL(request.url).origin;
  }

  return request.headers.get('sec-fetch-site') !== 'cross-site';
};
