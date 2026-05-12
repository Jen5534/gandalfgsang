const puppeteer = require('puppeteer');
const PptxGenJS = require('pptxgenjs');
const path      = require('path');

const HTML_FILE = path.resolve(__dirname, 'App', 'presentation-auto.html');
const OUTPUT    = path.resolve(__dirname, 'Perch-Presentation.pptx');

async function main() {
  console.log('Launching browser…');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page    = await browser.newPage();

  // 16:9 at 1280×720, 2× pixel ratio for sharpness
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

  await page.goto('file://' + HTML_FILE, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  // Hide chrome controls; make deck fill the full viewport
  await page.evaluate(() => {
    const ctrl = document.getElementById('ctrl-bar');
    const prog = document.getElementById('progress');
    if (ctrl) ctrl.style.display = 'none';
    if (prog) prog.style.display = 'none';
    const deck = document.getElementById('deck');
    if (deck) deck.style.height = '100vh';
  });

  const slideInfo = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.slide'))
      .map((s, i) => ({ index: i, title: s.dataset.title || `Slide ${i + 1}` }))
  );

  console.log(`Found ${slideInfo.length} slides`);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33" × 7.5" (16:9)

  for (const { index, title } of slideInfo) {
    console.log(`  [${index + 1}/${slideInfo.length}] ${title}`);

    await page.evaluate(idx => {
      document.querySelectorAll('.slide').forEach((s, i) => {
        s.style.opacity         = i === idx ? '1' : '0';
        s.style.transform       = i === idx ? 'translateY(0)' : 'translateY(20px)';
        s.style.pointerEvents   = i === idx ? 'all' : 'none';
        s.style.transition      = 'none';
        // Remove entrance animation stagger so everything is visible at once
        s.querySelectorAll('*').forEach(el => {
          el.style.animationDelay    = '0s';
          el.style.animationDuration = '0s';
        });
      });
    }, index);

    await new Promise(r => setTimeout(r, 250));

    const deck       = await page.$('#deck');
    const screenshot = await deck.screenshot({ encoding: 'base64', type: 'png' });

    const slide = pptx.addSlide();
    slide.addImage({ data: `data:image/png;base64,${screenshot}`, x: 0, y: 0, w: '100%', h: '100%' });
  }

  await browser.close();
  await pptx.writeFile({ fileName: OUTPUT });
  console.log(`\n✓  Saved: ${OUTPUT}`);
}

main().catch(err => { console.error(err); process.exit(1); });
