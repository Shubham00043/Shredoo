// Automated Verification Suite for Dual Music Provider Integration & Compliance
// Verifies Jamendo CC streaming, Bollywood B2B catalog metadata, and Playback Validation

const BASE_URL = 'http://localhost:3000';

async function testMusicProviders() {
  console.log('🎵 Testing SHREDoo Dual Music Provider Integration...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
      throw new Error(message);
    }
  }

  try {
    // 1. Independent Music Provider: Jamendo Search
    console.log('Test 1: Search Independent Music (Jamendo / CC)');
    const indieRes = await fetch(`${BASE_URL}/api/music/search?q=acoustic&category=independent`);
    const indieData = await indieRes.json();
    assert(indieRes.status === 200, 'Search returned status 200');
    assert(Array.isArray(indieData.tracks), 'Returned tracks array');
    assert(indieData.tracks.length > 0, `Found ${indieData.tracks.length} independent tracks`);
    
    const sampleIndie = indieData.tracks[0];
    assert(sampleIndie.category === 'independent', 'Track category is independent');
    assert(sampleIndie.providerId === 'jamendo', 'Provider ID is jamendo');
    assert(sampleIndie.licenseType.includes('Creative Commons'), 'Track has Creative Commons license');
    assert(sampleIndie.playbackAvailability === 'full_playback', 'Playback availability is full_playback');
    assert(sampleIndie.sourceUrl, 'Contains direct audio playback URL');
    console.log(`  Sample track: "${sampleIndie.title}" by ${sampleIndie.artist} (${sampleIndie.licenseType})\n`);

    // 2. Bollywood Music Provider: Metadata and Catalog Search
    console.log('Test 2: Search Bollywood Music (B2B Catalog Discovery)');
    const bollyRes = await fetch(`${BASE_URL}/api/music/search?q=Arijit&category=bollywood`);
    const bollyData = await bollyRes.json();
    assert(bollyRes.status === 200, 'Bollywood search returned status 200');
    assert(Array.isArray(bollyData.tracks), 'Returned tracks array');
    assert(bollyData.tracks.length > 0, `Found ${bollyData.tracks.length} Bollywood tracks`);

    const sampleBolly = bollyData.tracks[0];
    assert(sampleBolly.category === 'bollywood', 'Track category is bollywood');
    assert(sampleBolly.providerId === 'bollywood_partner', 'Provider ID is bollywood_partner');
    assert(sampleBolly.licenseType.includes('Commercial B2B'), 'Honest licensing designation');
    assert(sampleBolly.territory, `Territory restriction defined: ${sampleBolly.territory}`);
    assert(sampleBolly.playbackAvailability === 'licensing_pending', 'Correctly flagged as licensing_pending');
    console.log(`  Sample track: "${sampleBolly.title}" by ${sampleBolly.artist} (${sampleBolly.licenseType})\n`);

    // 3. Playback Rights Validation API
    console.log('Test 3: Playback Rights Validation API');
    const validRes = await fetch(`${BASE_URL}/api/music/validate-playback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId: sampleIndie.trackId, track: sampleIndie }),
    });
    const validData = await validRes.json();
    assert(validRes.status === 200, 'Validation API returned status 200');
    assert(validData.playbackSource.canStream === true, 'Jamendo track authorized to stream');

    const invalidRes = await fetch(`${BASE_URL}/api/music/validate-playback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId: sampleBolly.trackId, track: sampleBolly }),
    });
    const invalidData = await invalidRes.json();
    assert(invalidData.playbackSource.canStream === false, 'Bollywood track without B2B key correctly denied direct stream');
    console.log('');

    // 4. File Upload (Audio File & Cover Image)
    console.log('Test 4: Storage Upload API for User Audio & Cover');
    const testBuffer = Buffer.from('RIFF....WAVEfmt ....data....');
    const blob = new Blob([testBuffer], { type: 'audio/wav' });
    const formData = new FormData();
    formData.append('file', blob, 'sample_riff.wav');
    formData.append('category', 'audio');

    const uploadRes = await fetch(`${BASE_URL}/api/storage/upload`, {
      method: 'POST',
      body: formData,
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 200, 'Audio upload returned status 200');
    assert(uploadData.url.startsWith('/uploads/'), 'Returned public upload URL');
    console.log(`  Uploaded test file: ${uploadData.url}\n`);

    console.log('====================================================');
    console.log(`🎉 ALL DUAL MUSIC PROVIDER TESTS PASSED! (${passed} checks passed, 0 failed)`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ Music provider test failed:', err);
    process.exit(1);
  }
}

testMusicProviders();

