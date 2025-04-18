// Импорт необходимых модулей
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import randomUseragent from 'random-useragent';
import XLSX from 'xlsx';
import ProxyPlugin from 'puppeteer-extra-plugin-proxy';

// Подключаем плагин для обхода детектирования роботов
puppeteer.use(StealthPlugin());
puppeteer.use(ProxyPlugin({ 
    address: '46.174.193.73', 
    port: '5370', 
    credentials: { username: 'user283026', password: 'tz2y7h' }
  }));
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
/**
 * Функция для задержки выполнения
 * @param {number} ms - время задержки в миллисекундах
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Функция для создания браузерной сессии с динамическим userAgent и заголовками.
 * @returns {Promise<puppeteer.Browser>}
 */
async function launchBrowser() {
  const browser = await puppeteer.launch({
    headless: false, // или false для визуального режима
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // добавляем прочие аргументы для эмуляции реального браузера
    ]
  });
  return browser;
}

// Функция для генерации случайной задержки
function randomDelay(min = 100, max = 1000) {
    return new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));
  }
  // Проверка и обработка капчи "Вы очень активный!"
  // Обработка антибот-страницы "Вы очень активный!"
  async function handleAntiBotCaptcha(page) {
    try {
      // Проверяем, есть ли текст "Вы очень активный!"
      const isBlocked = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        return h1?.textContent?.includes('Вы очень активный!');
      });
  
      if (isBlocked) {
        console.log('[!] Обнаружена защита "Вы очень активный!"');
  
        // Ждём появления кнопки по тексту
        const buttonXPath = "//button[contains(., 'Я не робот!')]";
        const [button] = await page.$x(buttonXPath);
  
        if (button) {
          await page.waitForTimeout(1000 + Math.random() * 2000);
          await button.click();
  
          console.log('[✓] Нажали "Я не робот!", ждём снятия блокировки...');
  
          // Ждём исчезновения заголовка
          await page.waitForFunction(() => {
            const h1 = document.querySelector('h1');
            return !h1 || !h1.textContent?.includes('Вы очень активный!');
          }, { timeout: 15000 });
  
          console.log('[✓] Капча пройдена, продолжаем парсинг');
        } else {
          console.warn('[x] Кнопка "Я не робот!" не найдена');
        }
      }
    } catch (err) {
      console.error('[x] Ошибка при обработке капчи:', err);
    }
  }
  
  async function humanScroll(page) {
    const steps = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < steps; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * (0.1 + Math.random() * 0.2)));
      await randomDelay(100, 2600);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  
  

/**
 * Функция для получения новой страницы с динамическим userAgent.
 * @param {puppeteer.Browser} browser 
 * @returns {Promise<puppeteer.Page>}
 */
async function getPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });
  // Получаем случайный userAgent
  const userAgent = randomUseragent.getRandom();
  await page.setUserAgent(userAgent);
  // Устанавливаем дополнительные заголовки - можно расширять по необходимости
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
  });
//   await handleAntiBotCaptcha(page);
  await humanScroll(page);
  return page;
}

/**
 * Функция для парсинга первой страницы и получения списка ссылок на модели.
 * @param {puppeteer.Page} page 
 * @returns {Promise<string[]>} Массив полных URL
 */
async function parseMainPage(page) {
  const baseUrl = 'https://autopiter.ru';
  const url = `${baseUrl}/service-parts/chery`;
  await page.goto(url, { waitUntil: 'networkidle2' });
  // Имитация поведения пользователя: небольшая случайная задержка
//   await handleAntiBotCaptcha(page);
await sleep(1500 + Math.random() * 1000);

  // Выбираем все ссылки, основываясь на атрибуте href
  const links = await page.$$eval('a[href^="/service-parts/chery/"]', anchors =>
    // Фильтруем дубликаты и оставляем только те, которые относятся к моделям (например, можно фильтровать по наличию класса "CatalogCard__root")
    Array.from(new Set(anchors
      .filter(a => a.className.indexOf('CatalogCard__root') !== -1)
      .map(a => a.getAttribute('href')))
    )
  );
  // Приводим ссылки к полному URL
  return links.map(link => baseUrl + link);
}

/**
 * Функция для парсинга второй страницы, где содержатся ссылки с данными по моделям (таблица моделей)
 * @param {puppeteer.Page} page 
 * @param {string} url - URL страницы модели
 * @returns {Promise<string[]>} Массив полных URL для перехода к деталям
 */
async function parseModelPage(page, url) {
    const baseUrl = 'https://autopiter.ru';
    await page.goto(url, { waitUntil: 'networkidle2' });
    // await handleAntiBotCaptcha(page);
    await sleep(1500 + Math.random() * 1000);
  
    // Получаем все элементы <a>, у которых есть нужный класс (начинается с Table__linkRow)
    const modelLinks = await page.$$eval('a[class^="Table__linkRow"]', anchors =>
      anchors.map(a => a.href) // возвращаем полный href (уже с доменом)
    );
  
    return modelLinks;
  }

/**
 * Функция для парсинга страницы деталей, где содержатся данные по запчастям.
 * @param {puppeteer.Page} page 
 * @param {string} url - URL страницы с деталями запчастей
 * @returns {Promise<Object[]>} Массив объектов с данными строки таблицы
 */
async function parseDetailPage(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2' });
//   await handleAntiBotCaptcha(page);
await sleep(1500 + Math.random() * 1000);
 // Получаем название автомобиля из заголовка
 const vehicleName = await page.$eval('h1[class^="PageTitle__root"]', el => el.innerText.trim());

  // Парсим строки таблицы, где каждая строка представлена ссылкой <a class="Table__linkRow...">
  const data = await page.$$eval('a[class^="Table__linkRow"]', rows => {
    return rows.map(row => {
      // Собираем все колонки строки
      const cells = Array.from(row.querySelectorAll('div[class^="Table__td"]'));
      return {
        "Артикул": cells[1] ? cells[1].innerText.trim() : '',
        "Наименование": cells[2] ? cells[2].innerText.trim() : '',
        "Комментарий": cells[3] ? cells[3].innerText.trim() : '',
        "Кратность": cells[4] ? cells[4].innerText.trim() : '',
        "Цены": cells[5] ? cells[5].innerText.trim() : ''
      };
    });
  });
  return  { vehicleName, data };;
}

/**
 * Функция для сохранения данных в Excel-файл.
 * @param {Object[]} dataArray - Массив объектов с данными
 * @param {string} filename - Имя файла для сохранения
 */
function saveToExcel(groupedData, filename) {
    const sheetData = [];
  
    groupedData.forEach(({ vehicleName, data }) => {
      // Вставляем заголовок для машины
      sheetData.push([`${vehicleName}`]);
      // Вставляем шапку таблицы
      sheetData.push(["№", "Артикул", "Наименование", "Комментарий", "Кратность", "Цены"]);
  
      // Вставляем строки с деталями
      data.forEach((item, index) => {
        sheetData.push([
          index + 1,
          item["Артикул"],
          item["Наименование"],
          item["Комментарий"],
          item["Кратность"],
          item["Цены"]
        ]);
      });
  
      // Пустая строка между машинами
      sheetData.push([]);
    });
  
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Детали');
    XLSX.writeFile(workbook, filename);
  }

/**
 * Главная функция, объединяющая все шаги
 */
async function main() {
  const browser = await launchBrowser();
  try {
    // Шаг 1: Получаем список ссылок моделей с главной страницы
    let page = await getPage(browser);
    console.log('Парсинг главной страницы...');
    const mainModelLinks = await parseMainPage(page);
    console.log('Найденные ссылки моделей:', mainModelLinks);
    await page.close();

    // Собираем все ссылки для детальных страниц (из шага 2)
    let detailPageLinks = [];
    for (const modelUrl of mainModelLinks) {
      // Создаем новую страницу для каждого запроса
      page = await getPage(browser);
      console.log(`Парсинг страницы модели: ${modelUrl}`);
      try {
        const links = await parseModelPage(page, modelUrl);
        console.log(`Найдено ${links.length} ссылок на детали.`);
        detailPageLinks = detailPageLinks.concat(links);
      } catch (err) {
        console.error(`Ошибка при парсинге ${modelUrl}: `, err);
      }
      await page.close();
      // Задержка между запросами для имитации человеческого поведения
      await sleep(1500 + Math.random() * 1000);
    }

    console.log('Общее количество ссылок на детали:', detailPageLinks.length);

    // Шаг 3: Парсинг страницы деталей и сбор данных для Excel
    let allData = [];
    for (const detailUrl of detailPageLinks) {
      page = await getPage(browser);
      console.log(`Парсинг страницы деталей: ${detailUrl}`);
      try {
        const detailData = await parseDetailPage(page, detailUrl);
        console.log(`Получено ${detailData.length} записей с ${detailUrl}`);
        allData = allData.concat(detailData);
      } catch (err) {
        console.error(`Ошибка при парсинге страницы деталей ${detailUrl}: `, err);
      }
      await page.close();
      // Задержка между запросами
      await sleep(1500 + Math.random() * 1000);
    }

    // Сохраняем собранные данные в Excel
    if (allData.length > 0) {
      console.log('Сохранение данных в файл Excel...');
      saveToExcel(allData, 'parsed_data.xlsx');
      console.log('Данные успешно сохранены в parsed_data.xlsx');
    } else {
      console.log('Нет данных для сохранения.');
    }
  } catch (err) {
    console.error('Общая ошибка: ', err);
  } finally {
    await browser.close();
  }
}

// Запускаем парсер
main();
