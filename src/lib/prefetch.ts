/**
 * AI Healthcare System — Route Prefetch Helper
 */
export function prefetchRoute(routePath: string): void {
  // Silent prefetch trigger for code-splitting hints
  try {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = routePath;
    document.head.appendChild(link);
  } catch {
    // Ignore in non-browser or sandbox environments
  }
}
