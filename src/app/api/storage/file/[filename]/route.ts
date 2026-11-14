import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const cleanFilename = path.basename(filename);

    const tmpPath = path.join(os.tmpdir(), 'shredoo_uploads', cleanFilename);
    const publicPath = path.join(process.cwd(), 'public', 'uploads', cleanFilename);

    let targetPath: string | null = null;
    if (fs.existsSync(tmpPath)) {
      targetPath = tmpPath;
    } else if (fs.existsSync(publicPath)) {
      targetPath = publicPath;
    }

    if (!targetPath) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(targetPath);
    const ext = path.extname(cleanFilename).toLowerCase();

    let contentType = 'audio/mpeg';
    if (ext === '.wav') contentType = 'audio/wav';
    else if (ext === '.ogg') contentType = 'audio/ogg';
    else if (ext === '.aac') contentType = 'audio/aac';
    else if (ext === '.m4a') contentType = 'audio/mp4';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: any) {
    console.error('Failed to stream audio file:', err);
    return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 500 });
  }
}
