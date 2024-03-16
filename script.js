const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { Parser } = require('json2csv');
const puppeteer = require('puppeteer');

const parse = async () => {
    const getHTML = async (url) => {
        const { data } = await axios.get(url);
        return cheerio.load(data);
    };

    const properties = []; // Массив для хранения объектов недвижимости

    let hasNextPage = true;
    let currentPage = 1;

    while (hasNextPage) {
        const pageHTML = await getHTML(`https://slavna44.ru/propertys?page=${currentPage}`);
        
        pageHTML('.property.clearfix.wow.fadeInUp.delay-03s').each(async (i, element) => {
            const address = pageHTML(element).find('.property-address a').text().trim();
            const price = pageHTML(element).find('.col-lg-7.col-md-7.col-sm-7.col-xs-12.property-content h3').text().trim();
            const title = pageHTML(element).find('.col-lg-7.col-md-7.col-sm-7.col-xs-12.property-content .title a').text().trim();
            let link = pageHTML(element).find('.col-lg-7.col-md-7.col-sm-7.col-xs-12.property-content .title a').attr('href');
            const user = pageHTML(element).find('.property-footer .left').text().trim().replace('Контактное лицо: ', '');
            const date = pageHTML(element).find('.property-footer .right').text().trim();

            // Получаем URL изображения
            let imageURL = pageHTML(element).find('.property-img img').attr('src');

            // Проверяем и обновляем URL изображения
            if (imageURL && !imageURL.startsWith('https://slavna44.ru')) {
                imageURL = 'https://slavna44.ru' + imageURL;
            }

            // Проверяем и обновляем ссылки
            if (link && !link.startsWith('https://slavna44.ru')) {
                link = 'https://slavna44.ru' + link;
            }
            
            // Получение информации из блока характеристик
            const propertyHTML = await getHTML(link);
            const characteristics = {};
            propertyHTML('.inside-properties.sidebar-widget .prop-char').each(async (i, el) => {
                const key = propertyHTML(el).find('h4').text().trim();
                const value = propertyHTML(el).find('span').text().trim();
                characteristics[key] = value;
            });

            // Добавляем данные об объекте недвижимости в массив
            properties.push({
                address,
                price,
                title,
                link,
                user,
                date,
                imageURL,
                characteristics
            });
        });

        // Проверяем наличие кнопки "следующая страница"
        const nextPageButton = pageHTML('ul.pagination li.next a');
        if (nextPageButton.length === 0) {
            hasNextPage = false;
        } else {
            currentPage++;
        }
    }

    // Преобразуем массив объектов в CSV формат
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(properties);

    // Записываем данные в файл
    fs.writeFileSync('properties.csv', csv, 'utf-8');
};

parse();
