export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Step 1: Lấy access token bằng refresh token
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

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("Token error:", tokenData);
      return res.status(401).json({ error: "Failed to get access token" });
    }

    // Step 2: Lấy danh sách ảnh và video trong folder Daily
    const folderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID_2;
    const query = `'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed=false`;
    const fields = "files(id,name,mimeType,createdTime,thumbnailLink)";
    const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=createdTime+desc`;

    const driveResponse = await fetch(driveUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const driveData = await driveResponse.json();

    if (!driveData.files) {
      console.error("Drive error:", driveData);
      return res.status(500).json({ error: "Failed to list files from Drive" });
    }

    const photos = driveData.files.map((file) => ({
      id: file.id,
      name: file.name.replace(/\.[^/.]+$/, ""), 
      mimeType: file.mimeType,
      thumbnail: file.thumbnailLink,
      url: `/api/image?id=${file.id}`,
      time: file.createdTime
    }));

    // Cache 5 phút
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
    return res.status(200).json({ photos });
  } catch (error) {
    console.error("Error fetching daily photos:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
