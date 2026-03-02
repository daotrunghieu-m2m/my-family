async function getAccessToken() {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await tokenResponse.json();
  if (!data.access_token) throw new Error("Failed to get access token");
  return data.access_token;
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing id parameter" });
  }

  try {
    const accessToken = await getAccessToken();

    // Lấy ảnh từ Drive API với auth
    const driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!driveResponse.ok) {
      return res.status(driveResponse.status).json({ error: "Failed to fetch image from Drive" });
    }

    const contentType = driveResponse.headers.get("content-type") || "image/jpeg";
    const buffer = await driveResponse.arrayBuffer();

    // Cache ảnh 1 ngày ở browser, 1 tiếng ở Vercel Edge
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, s-maxage=3600, max-age=86400");
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Error proxying image:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
