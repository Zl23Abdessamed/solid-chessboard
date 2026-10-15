const { chromium } = require('playwright-core');

const EXE =
  '/var/home/zallaabdessamed/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';

const step = process.argv[2] || 'black';

(async () => {
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
  page.on('console', (m) => console.log('[browser]', m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#chessboard-square-e2', { timeout: 15000 });
  await page.waitForTimeout(500);

  const center = async (id) =>
    page.evaluate((sq) => {
      const el = document.getElementById(`chessboard-square-${sq}`);
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, id);

  const drag = async (from, to) => {
    const a = await center(from);
    const b = await center(to);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 8 });
    await page.mouse.move(b.x, b.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(600);
  };

  if (step === 'white' || step === 'both') {
    console.log('--- drag e2-e4 (white, fresh board) ---');
    await drag('e2', 'e4');
  }
  if (step === 'remount' || step === 'both') {
    console.log('--- drag e4-e5 (white pawn, remounted instance, illegal move) ---');
    await drag('e4', 'e5');
  }
  if (step === 'black' || step === 'both') {
    console.log('--- drag e7-e5 (black, original mount) ---');
    await drag('e7', 'e5');
  }
  if (step === 'knight') {
    console.log('--- drag b8-c6 (black knight, original mount) ---');
    await drag('b8', 'c6');
  }

  const status = await page.evaluate(
    () => document.querySelector('p')?.textContent,
  );
  console.log('status:', status);
  await browser.close();
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
