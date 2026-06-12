require('dotenv').config();

async function createSignedUrl(path) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  const url = `${SUPABASE_URL}/storage/v1/object/sign/tutor-documents/${path}`;
  console.log('POST to:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: 3600 }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || 'Failed');

  const rawSigned = data.signedURL || data.signedUrl || (data.data && data.data.signedUrl) || null;
  if (!rawSigned) return null;

  if (rawSigned.startsWith('http://') || rawSigned.startsWith('https://')) {
    return rawSigned;
  }
  if (rawSigned.startsWith('/object/')) {
    return `${SUPABASE_URL}/storage/v1${rawSigned}`;
  }
  return `${SUPABASE_URL}${rawSigned}`;
}

async function run() {
  // Use actual path from DB
  const testPath = 'certificates/6ab39c3f-2c5a-4785-910a-fcb0bb9a2c00_1781273693937.jpg';
  console.log('Testing path:', testPath);

  const signedUrl = await createSignedUrl(testPath);
  console.log('\n✅ Final signed URL:');
  console.log(signedUrl);

  // Verify the URL works by doing a HEAD request
  console.log('\n🔍 Verifying URL is accessible...');
  const verifyRes = await fetch(signedUrl, { method: 'HEAD' });
  console.log('HTTP status:', verifyRes.status, verifyRes.statusText);
  if (verifyRes.ok) {
    console.log('✅ URL is valid and accessible!');
    console.log('Content-Type:', verifyRes.headers.get('content-type'));
    console.log('Content-Length:', verifyRes.headers.get('content-length'));
  } else {
    const text = await fetch(signedUrl).then(r => r.text());
    console.log('❌ URL not accessible:', text.slice(0, 200));
  }
}

run().catch(console.error);
