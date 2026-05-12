const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');

const HTML_FILE = path.resolve(__dirname, 'App', 'presentation-auto.html');
const TMP_FILE  = path.resolve(__dirname, '_slides_tmp.html');
const OUTPUT    = path.resolve(__dirname, 'Perch-Presentation.pdf');

async function main() {
  console.log('Launching browser…');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page    = await browser.newPage();

  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
  await page.goto('file://' + HTML_FILE, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  await page.evaluate(() => {
    document.getElementById('ctrl-bar').style.display = 'none';
    document.getElementById('progress').style.display = 'none';
    document.getElementById('deck').style.height = '100vh';
  });

  const slideCount = await page.evaluate(() =>
    document.querySelectorAll('.slide').length
  );
  console.log(`Capturing ${slideCount} slides…`);

  const screenshots = [];
  for (let i = 0; i < slideCount; i++) {
    await page.evaluate(idx => {
      document.querySelectorAll('.slide').forEach((s, j) => {
        s.style.opacity       = j === idx ? '1' : '0';
        s.style.transform     = j === idx ? 'translateY(0)' : 'translateY(20px)';
        s.style.transition    = 'none';
        s.querySelectorAll('*').forEach(el => {
          el.style.animationDelay    = '0s';
          el.style.animationDuration = '0s';
        });
      });
    }, i);

    await new Promise(r => setTimeout(r, 200));
    const deck = await page.$('#deck');
    const buf  = await deck.screenshot({ type: 'png' });
    screenshots.push(buf.toString('base64'));
    console.log(`  [${i + 1}/${slideCount}] captured`);
  }

  await browser.close();

  // Build a single HTML with one image-div per slide, page-break between each
  const pages = screenshots.map(b64 => `
    <div class="page">
      <img src="data:image/png;base64,${b64}">
    </div>`).join('');

  fs.writeFileSync(TMP_FILE, `<!DOCTYPE html>
<html><head><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#000; }
  .page {
    width: 297mm;
    height: 167.0625mm;
    overflow: hidden;
    page-break-after: always;
  }
  .page:last-child { page-break-after: avoid; }
  .page img { width:100%; height:100%; display:block; object-fit:cover; }
</style></head>
<body>${pages}</body></html>`);

  console.log('Rendering PDF…');
  const b2 = await puppeteer.launch({ headless: 'new' });
  const p2 = await b2.newPage();
  await p2.goto('file://' + TMP_FILE, { waitUntil: 'networkidle0' });
  await p2.pdf({
    path:            OUTPUT,
    width:           '297mm',
    height:          '167.0625mm',
    printBackground: true,
    margin:          { top: 0, bottom: 0, left: 0, right: 0 },
  });

  await b2.close();
  fs.unlinkSync(TMP_FILE);

  console.log(`\n✓  Saved: ${OUTPUT}`);
}

main().catch(err => { console.error(err); process.exit(1); });
