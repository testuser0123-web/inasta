'use server';

export async function fetchLinkMetadata(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      console.error('Failed to fetch URL:', response.statusText);
      return null;
    }

    const html = await response.text();

    // More robust regex to extract og:image (order agnostic)
    // Matches <meta ... property="og:image" ... content="..." ... > or <meta ... content="..." ... property="og:image" ... >
    const match = html.match(/<meta\s+[^>]*?(?:property|name)=["']og:image["'][^>]*?content=["']([^"']+)["']|<meta\s+[^>]*?content=["']([^"']+)["'][^>]*?(?:property|name)=["']og:image["']/i);

    const imageUrl = match ? (match[1] || match[2]) : null;

    if (!imageUrl) {
        console.log('No og:image found');
        return null;
    }

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
