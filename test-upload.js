const fs = require('fs');

async function testUpload() {
  const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
  
  // Create a tiny dummy image (1x1 pixel PNG)
  const dummyImage = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n`),
    dummyImage,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  try {
    const res = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        // Note: this won't have the next-auth session cookie, so it should fail with 401
      },
      body: body
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (e) {
    console.error("Error:", e);
  }
}

testUpload();
