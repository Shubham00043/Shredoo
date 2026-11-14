import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

function getUploadDirectory() {
  const isVercel = Boolean(process.env.VERCEL);
  if (isVercel) {
    const tmpUploadDir = path.join(os.tmpdir(), 'shredoo_uploads');
    if (!fs.existsSync(tmpUploadDir)) {
      fs.mkdirSync(tmpUploadDir, { recursive: true });
    }
    return { dir: tmpUploadDir, isTemp: true };
  }

  const localUploadDir = path.join(process.cwd(), 'public', 'uploads');
  try {
    if (!fs.existsSync(localUploadDir)) {
      fs.mkdirSync(localUploadDir, { recursive: true });
    }
    return { dir: localUploadDir, isTemp: false };
  } catch (err) {
    const tmpUploadDir = path.join(os.tmpdir(), 'shredoo_uploads');
    if (!fs.existsSync(tmpUploadDir)) {
      fs.mkdirSync(tmpUploadDir, { recursive: true });
    }
    return { dir: tmpUploadDir, isTemp: true };
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = (formData.get('title') as string) || file?.name || 'Uploaded Track';
    const artist = (formData.get('artist') as string) || 'User Upload';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const { dir, isTemp } = getUploadDirectory();
    const ext = path.extname(file.name) || '.mp3';
    const safeName = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
    const filePath = path.join(dir, safeName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = isTemp ? `/api/storage/file/${safeName}` : `/uploads/${safeName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      track: {
        trackId: `upload-${Date.now()}`,
        providerId: 'user_upload',
        category: 'independent',
        title: title.replace(ext, ''),
        artist,
        album: 'Personal Uploads',
        artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
        duration: 210,
        playbackAvailability: 'full_playback',
        licenseType: 'User-Authorized Personal Audio',
        territory: 'Worldwide',
        attribution: 'Uploaded by room member',
        sourceUrl: publicUrl,
      },
    });
  } catch (err: any) {
    console.error('Upload failed:', err);
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 });
  }
}

