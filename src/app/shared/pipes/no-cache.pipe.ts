import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'noCache',
  standalone: true
})
export class NoCachePipe implements PipeTransform {
  // Use a random value generated once per app load or a timestamp.
  // We use a property initialized once so it doesn't change on every change detection cycle
  // if the pipe were to be called multiple times for the same input across different components,
  // although pure pipes cache based on input.
  private static readonly cacheBuster = new Date().getTime();

  transform(url: any): any {
    if (!url || typeof url !== 'string') return url;
    
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }

    // Signed URLs cannot be mutated, otherwise the storage provider rejects them.
    if (this.isSignedUrl(url)) {
      return url;
    }
    
    // Prevent adding multiple cache busters
    if (url.includes('?t=') || url.includes('&t=')) {
      return url;
    }
    
    // Use the same timestamp for the session so it doesn't cause infinite reloads or flickering
    // if change detection runs multiple times.
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${NoCachePipe.cacheBuster}`;
  }

  private isSignedUrl(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return [
      'x-amz-algorithm=',
      'x-amz-signature=',
      'x-amz-credential=',
      'signature=',
      'sig=',
      'token='
    ].some(marker => lowerUrl.includes(marker));
  }
}
