export async function uploadToImgBB(base64Image: string, apiKey: string, name?: string): Promise<{ success: boolean; url?: string; displayUrl?: string; deleteUrl?: string; error?: string }> {
  try {
    const formData = new FormData();
    // Remove data:image/...;base64, prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    formData.append("image", cleanBase64);
    if (name) formData.append("name", name);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`ImgBB API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        url: data.data.url,
        displayUrl: data.data.display_url,
        deleteUrl: data.data.delete_url,
      };
    } else {
      return {
        success: false,
        error: data.error?.message || "Failed to upload to ImgBB",
      };
    }
  } catch (err: any) {
    console.error("[ImgBB Upload Error]", err);
    return { success: false, error: err.message || "Unknown error during upload" };
  }
}
