const axios = require('axios');
const cheerio = require('cheerio');

const url = 'https://www.milb.com/player/harry-ford-695670';

axios.get(url)
  .then(response => {
    const html = response.data;
    const $ = cheerio.load(html);
    const table = $('table').eq(4);
    const headers = [];
    const data = [];

    // Extract table headers
    table.find('thead tr th').each((i, el) => {
      headers.push($(el).text().trim());
    });

    // Extract table rows
    table.find('tbody tr').each((i, el) => {
      const row = {};
      $(el).find('td').each((j, cell) => {
        row[headers[j]] = $(cell).text().trim();
      });
      data.push(row);
    });

    // Convert data to formatted JSON and log to console
    const jsonData = JSON.stringify(data, null, 2);
    console.log(jsonData);

    // const nextTenGamesLink = $('a[href*="/game-center/2023/"]').attr('href');
    const baseUrl = 'https://www.milb.com';

    // console.log(nextTenGamesLink)

  })
  .catch(error => {
    console.log(error);
  });