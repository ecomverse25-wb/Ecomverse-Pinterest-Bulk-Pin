import type { WordPressSettings } from "../types";

export interface WordPressPublishOptions {
  title: string;
  content: string;
  excerpt?: string;
  featuredImageUrl?: string;
  settings: WordPressSettings;
  rankMathFocusKeyword?: string;
}

export async function publishToWordPress(options: WordPressPublishOptions): Promise<{ success: boolean; link?: string; id?: number; error?: string }> {
  const { title, content, excerpt, featuredImageUrl, settings, rankMathFocusKeyword } = options;

  if (!settings.siteUrl || !settings.username || !settings.appPassword) {
    return { success: false, error: "Missing WordPress credentials." };
  }

  try {
    const auth = btoa(`${settings.username}:${settings.appPassword}`);
    const baseUrl = settings.siteUrl.replace(/\/$/, "");
    let featuredMediaId: number | undefined;

    // 1. Upload featured image to Media Library
    if (featuredImageUrl) {
      try {
        const imgResponse = await fetch(featuredImageUrl);
        if (imgResponse.ok) {
          const imgBlob = await imgResponse.blob();
          const imgBuffer = Buffer.from(await imgBlob.arrayBuffer());
          const fileName = `featured-${Date.now()}.jpg`;

          const uploadResponse = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${auth}`,
              "Content-Disposition": `attachment; filename="${fileName}"`,
              "Content-Type": imgBlob.type || "image/jpeg",
            },
            body: imgBuffer,
          });

          if (uploadResponse.ok) {
            const mediaData = await uploadResponse.json();
            featuredMediaId = mediaData.id;
            
            // Correction 4: Set ALT text on the uploaded media (via update)
            if (featuredMediaId && rankMathFocusKeyword) {
               await fetch(`${baseUrl}/wp-json/wp/v2/media/${featuredMediaId}`, {
                 method: "POST",
                 headers: {
                   "Authorization": `Basic ${auth}`,
                   "Content-Type": "application/json"
                 },
                 body: JSON.stringify({
                   alt_text: title + " - " + rankMathFocusKeyword
                 })
               }).catch(e => console.error("Setting image alt text failed:", e));
            }
          } else {
             console.error("WP Media Upload Error:", await uploadResponse.text());
          }
        }
      } catch (imgErr) {
        console.error("Featured image upload failed:", imgErr);
      }
    }

    // 2. Publish Post
    let finalContent = content;
    finalContent = finalContent.replace(/<figure[^>]*class=["'][^"']*featured-image[^"']*["'][^>]*>[\s\S]*?<\/figure>\s*/i, "");

    const postData: Record<string, any> = {
      title,
      content: finalContent,
      status: settings.publishingMode === "draft" ? "draft" : "publish",
    };

    if (excerpt) {
      postData.excerpt = excerpt;
    }

    if (featuredMediaId) {
      postData.featured_media = featuredMediaId;
    }

    if (rankMathFocusKeyword) {
      postData.meta = {
        rank_math_focus_keyword: rankMathFocusKeyword,
      };
    }

    const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WordPress API Error: ${response.status} — ${errorText}`);
    }

    const data = await response.json();
    return { success: true, link: data.link, id: data.id };
  } catch (error: any) {
    console.error("[WP Publish Error]", error);
    return { success: false, error: error.message || "Failed to publish to WordPress." };
  }
}
