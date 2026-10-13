export default async function run(page) {
  await page.waitForTimeout(5000);
  const result = await page.evaluate(() => ({
    rootChildren: document.querySelector('#root')?.childElementCount ?? 0,
    bodyText: document.body.innerText.slice(0, 300),
    hasMain: !!document.querySelector('#main-content'),
    hasNav: !!document.querySelector('nav'),
  }));
  return result;
}
