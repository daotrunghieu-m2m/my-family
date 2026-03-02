async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get access token");
  return data.access_token;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });

  const { fileId } = req.body;
  if (!fileId) return res.status(400).json({ error: "Thiếu fileId" });

  try {
    const accessToken = await getAccessToken();

    // Chuyển vào Trash thay vì xóa vĩnh viễn (an toàn hơn)
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trashed: true }),
      }
    );

    if (!driveRes.ok) {
      const err = await driveRes.json();
      console.error("[delete] Drive error:", err);
      return res.status(500).json({ error: "Xóa thất bại", detail: err });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[delete] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
