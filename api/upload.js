// Tăng giới hạn body size lên 50MB để nhận ảnh/video base64
export const config = {
  api: { bodyParser: { sizeLimit: "50mb" } },
};

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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, mimeType, data, folderType } = req.body;

  if (!name || !data) {
    return res.status(400).json({ error: "Thiếu tên hoặc dữ liệu ảnh" });
  }

  try {
    // Chọn folder ID dựa trên folderType (1: mặc định/gia đình, 2: kỷ niệm)
    const folderId = folderType === "daily" 
      ? process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID_2 
      : process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    // DEBUG: log để xem iPhone gửi lên cái gì
    console.log("[upload] mimeType:", mimeType, "| name:", name, "| folder:", folderId);

    const accessToken = await getAccessToken();

    // Normalize mimeType — mobile (iPhone HEIC, Android WebP, v.v.)
    let resolvedMime = mimeType || "image/jpeg";
    if (
      resolvedMime === "image/heic" ||
      resolvedMime === "image/heif" ||
      resolvedMime === "image/heic-sequence" ||
      resolvedMime === "image/heif-sequence"
    ) {
      // HEIC/HEIF không được Google Drive API chấp nhận → convert sang JPEG
      resolvedMime = "image/jpeg";
    }

    // Tính extension từ mimeType đã normalize
    const extMap = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/bmp": "bmp",
    };
    const ext = extMap[resolvedMime] || resolvedMime.split("/")[1] || "jpg";

    // Sanitize tên file: bỏ ký tự đặc biệt, chỉ giữ chữ/số/dấu cách/gạch
    const sanitizedName = name
      .trim()
      .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF\-().]/g, "")
      .trim() || "photo";
    const fileName = sanitizedName.endsWith(`.${ext}`)
      ? sanitizedName
      : `${sanitizedName}.${ext}`;

    // Decode base64 → Buffer
    const fileBuffer = Buffer.from(data, "base64");

    // Build multipart body cho Drive API
    const boundary = `boundary_${Date.now()}`;
    const metadata = JSON.stringify({
      name: fileName,
      parents: [folderId],
    });

    const metaPart = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      metadata,
      `--${boundary}`,
      `Content-Type: ${resolvedMime}`,
      "",
      "",
    ].join("\r\n");

    const bodyBuffer = Buffer.concat([
      Buffer.from(metaPart, "utf-8"),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--`, "utf-8"),
    ]);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
          "Content-Length": bodyBuffer.length.toString(),
        },
        body: bodyBuffer,
      }
    );

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      console.error("[upload] Drive API error:", JSON.stringify(uploadData));
      return res.status(uploadRes.status).json({
        error: uploadData.error?.message || "Upload thất bại",
        detail: uploadData.error,
      });
    }

    return res.status(200).json({
      success: true,
      id: uploadData.id,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Lỗi server: " + error.message });
  }
}
