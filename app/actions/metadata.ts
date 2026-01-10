'use server';

export async function fetchLinkMetadata(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'bot', // Some sites might block generic requests, but 'bot' often works for metadata
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      console.error('Failed to fetch URL:', response.statusText);
      return null;
    }

    const html = await response.text();

    // Simple regex to extract og:image
    const match = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);

    if (!match || !match[1]) {
        console.log('No og:image found');
        return null;
    }

    const imageUrl = match[1]; // The captured URL

    // Fetch the image
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
        console.error('Failed to fetch image:', imageRes.statusText);
        return null;
    }

    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = imageRes.headers.get('content-type') || 'image/jpeg';

    return `data:${mimeType};base64,${base64}`;

  } catch (error) {
    console.error('Error fetching metadata:', error);
    return null;
  }
}
