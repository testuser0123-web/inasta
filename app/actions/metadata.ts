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

    // Extract og:image
    const imageMatch = html.match(/<meta\s+[^>]*?(?:property|name)=["']og:image["'][^>]*?content=["']([^"']+)["']|<meta\s+[^>]*?content=["']([^"']+)["'][^>]*?(?:property|name)=["']og:image["']/i);
    const imageUrl = imageMatch ? (imageMatch[1] || imageMatch[2]) : null;

    // Extract og:title
    const titleMatch = html.match(/<meta\s+[^>]*?(?:property|name)=["']og:title["'][^>]*?content=["']([^"']+)["']|<meta\s+[^>]*?content=["']([^"']+)["'][^>]*?(?:property|name)=["']og:title["']/i);
    // Decode HTML entities if necessary (simple unescape for common ones might be good, but let's keep it simple for now)
    let title = titleMatch ? (titleMatch[1] || titleMatch[2]) : null;

    // Fallback to <title> tag if og:title is missing
    if (!title) {
        const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleTagMatch) title = titleTagMatch[1];
    }

    // Extract Artist (specifically for Spotify or general music metadata)
    let artist: string | null = null;
    const musicianMatch = html.match(/<meta\s+[^>]*?(?:name)=["']music:musician_description["'][^>]*?content=["']([^"']+)["']|<meta\s+[^>]*?content=["']([^"']+)["'][^>]*?(?:name)=["']music:musician_description["']/i);
    if (musicianMatch) {
        artist = musicianMatch[1] || musicianMatch[2];
    }

    // If no explicit artist tag, try to parse from description if it looks like "Song · Artist · Year" (Spotify pattern)
    if (!artist) {
        const descMatch = html.match(/<meta\s+[^>]*?(?:property|name)=["']og:description["'][^>]*?content=["']([^"']+)["']|<meta\s+[^>]*?content=["']([^"']+)["'][^>]*?(?:property|name)=["']og:description["']/i);
        const description = descMatch ? (descMatch[1] || descMatch[2]) : null;
        if (description) {
            // Check for Spotify pattern: "Listen to [Song] on Spotify. [Song] · [Artist] · [Year]"
            // Or simpler: "Song · Artist · Year"
            const parts = description.split(' · ');
            if (parts.length >= 3) {
                // Heuristic: If we have 3 parts, the middle one might be the artist.
                // However, the first part is often "Song", second "Artist".
                // Example: "Listen to Blinding Lights on Spotify. Song · The Weeknd · 2020"
                // The description content seen in curl was "Listen to Blinding Lights on Spotify. Song · The Weeknd · 2020"
                // Wait, "Song" is a literal string? Or the type?
                // Let's assume if we found music:musician_description we are good.
                // If not, we might be on a platform that doesn't use it.
                // But for Spotify, we saw music:musician_description.
                // Let's rely on that first.
            }
        }
    }


    // Decode minimal entities
    if (title) {
        title = title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }
    if (artist) {
        artist = artist.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }

    if (!imageUrl) {
        console.log('No og:image found');
        // Return title even if image is missing? The existing logic expects image to proceed with "skip crop".
        // But the user complained about "Song title not displayed".
        // If we return null here, UploadForm triggers "fetchError", showing Manual Upload.
        // We probably want to return what we have. But existing contract was "string = image".
        // Let's stick to requiring image for the "magic flow", but maybe we should relax it later.
        // For now, if no image, we return null, which triggers manual upload.
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
    const imageBase64 = `data:${mimeType};base64,${base64}`;

    return { title, image: imageBase64, artist };

  } catch (error) {
    console.error('Error fetching metadata:', error);
    return null;
  }
}
