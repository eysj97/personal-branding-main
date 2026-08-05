import puppeteer from 'puppeteer-core'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const URL = process.argv[2]
const OUT = process.argv[3]
const TARGET_STEP = Number(process.argv[4])
// ms to wait after the final wheel notch before shooting. Small values catch
// the tween mid-flight, which is where the sweep and the typing are only
// partly done — that is the state worth looking at.
const SETTLE = process.argv.slice(5).map(Number)

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
  defaultViewport: { width: 1440, height: 900 },
})

const page = await browser.newPage()
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })

// Park the page exactly on the career section so its isEngaged() is true.
await page.evaluate(() => {
  const el = document.querySelector('.section-career')
  window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY)
})
await new Promise((r) => setTimeout(r, 600))

// The section is wheel-driven, one notch per step, and each step tweens —
// so each has to land before the next is sent.
await page.mouse.move(720, 450)
for (let i = 0; i < TARGET_STEP; i += 1) {
  await page.mouse.wheel({ deltaY: 120 })
  await new Promise((r) => setTimeout(r, 700))
}

let waited = 0
for (const ms of SETTLE) {
  await new Promise((r) => setTimeout(r, ms - waited))
  waited = ms
  const file = `${OUT}-step${TARGET_STEP}-${ms}ms.png`
  await page.screenshot({ path: file })
  console.log(`saved ${file}`)
}

await browser.close()
