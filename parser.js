import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)',
];

const cookies = [
  'guestId=sq0zfJe9OF-MaqK8uc8b8',
  '_ga=GA1.1.110823941.1744885143',
  '_ym_uid=1744885143552495221',
  '_ym_d=1744885143',
  '_ym_isad=2',
  '_ym_visorc=w',
  'c2d_widget_id={%224638553b3f7ad00c20bd5c552ff72e4c%22:%22{%5C%22client_id%5C%22:%5C%22[chat]%201a2661649868df5840a8%5C%22%2C%5C%22client_token%5C%22:%5C%22d3f62f6e564711c52fdd75d196bf8063%5C%22}%22}',
  'sessionId=HRE5sXje0MOlkDDeuDT9A',
  'app_state_v2_mobileVersion.userSelected=false',
  '_ga_M753HT3PZ9=GS1.1.1744885142.1.1.1744885672.60.0.13949397',
  '_ga_L3S3N1BT1L=GS1.1.1744885142.1.1.1744885672.0.0.0'
];
const cookieString = cookies.join('; ');
// Функция для генерации случайной задержки
function randomDelay(min = 800, max = 4000) {
  return new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));
}

async function humanScroll(page) {
  const steps = 3 + Math.floor(Math.random() * 5);
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * (0.1 + Math.random() * 0.2)));
    await randomDelay(600, 2600);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    slowMo: 50
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  // Рандомизация User-Agent
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const fullUA = `${ua} Chrome/90.0.4430.212 Safari/537.36`;
  await page.setUserAgent(fullUA);

  const BASE = 'https://autopiter.ru';
  const brandPath = '/service-parts/geely';
  const brandUrl = `${BASE}${brandPath}`;

  const response = await page.goto(brandUrl, {
    waitUntil: 'networkidle2',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'ru',
      'Cache-Control': 'no-cache',
          'Cookie': cookieString,  
      'Referer': `https://autopiter.ru/service-parts/geely`,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': fullUA,
    }
  });
  await humanScroll(page);
  await randomDelay();

  const models = await page.$$eval(
    'div[class^="ServicePartsModels__models"] a',
    links => links.map(a => ({
      name: a.querySelector('img')?.alt.trim() || a.textContent.trim(),
      url: a.href
    }))
  );

  const results = [];
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Autoparts');
  
  // Определяем колонки
  sheet.columns = [
    { header: 'Brand', key: 'brand' },
    { header: 'Model', key: 'model' },
    { header: 'Trim', key: 'trim' },
    { header: 'No', key: 'number' },
    { header: 'Article', key: 'article' },
    { header: 'Name', key: 'name' },
    { header: 'Comment', key: 'comment' },
    { header: 'Quantity', key: 'quantity' },
    { header: 'Price (₽)', key: 'price' },
    { header: 'Analog Price (₽)', key: 'analog' },
  ];

  for (const { name: modelName, url: modelUrl } of models) {
    await page.goto(modelUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('div.Table__tbody');
    await humanScroll(page);
    await randomDelay();
  
    const rowHrefs = await page.$$eval(
      'div[class*="Table__tbody"] a',
      as => as.map(a => a.getAttribute('href')).filter(h => !!h)
    );
  
    const trimHrefs = Array.from(new Set(
      rowHrefs
        .filter(h => h.startsWith(brandPath + modelUrl.replace(BASE, '').replace(brandPath, '') + '/'))
        .map(h => `${BASE}${h}`)
    ));
  
    for (const trimUrl of trimHrefs) {
      await page.goto(trimUrl, { waitUntil: 'networkidle2' });
      await page.waitForSelector('div.Table__tbody');
      await humanScroll(page);
      await randomDelay();
  
      const trimName = await page.evaluate(() => {
        const crumbs = Array.from(document.querySelectorAll('ol[itemtype] li span[itemprop="name"]'));
        return crumbs[crumbs.length - 1]?.textContent.trim() || document.title;
      });
  
      const parts = await page.$$eval(
        'div[class*="Table__tbody"] a',
        rows => rows
          .filter(a => a.getAttribute('href')?.startsWith('/goods/'))
          .map(a => {
            const cells = Array.from(a.children).filter(el => el.tagName === 'DIV');
            console.log('cells', cells);
            
            const priceWrap = a.querySelector('div[class*="CatalogPrices__prices"]');
            const mainPrice = priceWrap?.querySelector('span')?.innerText.replace(/\D+/g, '') || '';
            const analogPrice = priceWrap?.querySelector('div span')?.innerText.replace(/\D+/g, '') || '';
            console.log('mainPrice', mainPrice);
            console.log('analogPrice', analogPrice);
            console.log('cells[0]?.innerText', cells[0]?.innerText);
            console.log('cells[1]?.innerText', cells[1]?.innerText);
            
            return {
              number: cells[0]?.innerText.trim() || '',
              article: cells[1]?.innerText.trim() || '',
              name: cells[2]?.innerText.trim() || '',
              comment: cells[3]?.innerText.trim() || '',
              quantity: cells[4]?.innerText.trim() || '',
              price: mainPrice,
              analog: analogPrice,
            };
          })
      );
  
      if (parts.length > 0) {
        for (const part of parts) {
          console.log(part);  // Выводим в консоль для отладки
          results.push({ brand: 'Geely', model: modelName, trim: trimName, ...part });
          sheet.addRow({ brand: 'Geely', model: modelName, trim: trimName, ...part });
        }
      } else {
        console.log(`No parts found for model: ${modelName}, trim: ${trimName}`);
      }
    }
  }
  
  await workbook.xlsx.writeFile('autoparts.xlsx');
  console.log(`Exported ${results.length} records to autoparts.xlsx`);

  await browser.close();
})();