const axios = require('axios');
const cheerio = require('cheerio');

const playerName = process.argv[2];
const url = `https://www.milb.com/player/${playerName}`;

axios.get(url)
  .then(response => {
    const html = response.data;
    const $ = cheerio.load(html);
    const table = $('table').eq(4);
    const headers = [];
    const statsData = [];

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
      statsData.push(row);
    });

    // Next 10 games on the schedule
    const teamId = process.argv[3];
    const currentDate = new Date().toISOString().slice(0, 10); // Get the current date in ISO format
    const endDate = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // Get the date 30 days from now in ISO format

    const url_games = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${teamId}&startDate=${currentDate}&endDate=${endDate}&hydrate=team,linescore(matchup)`;

    axios.get(url_games)
      .then(response => {
        const data = response.data;
        const games = [];

        let numGamesAdded = 0;

        // Iterate over each game
        data.dates.forEach(date => {
          date.games.forEach(game => {
            const homeTeam = game.teams.home.team.name;
            const awayTeam = game.teams.away.team.name;
            const gameDate = game.gameDate;
        
            games.push({
              homeTeam,
              awayTeam,
              gameDate
            });
        
            numGamesAdded++;
        
            if (numGamesAdded >= 10) {
              return;
            }
          });
        });

        // Combine stats and games data into a single object
        const playerData = {
          playerName,
          stats: statsData,
          nextTenGames: games
        };

        // Convert data to formatted JSON and log to console
        const jsonData = JSON.stringify(playerData, null, 2);
        console.log(jsonData);
      })
      .catch(error => {
        console.log(error);
      });

  })
  .catch(error => {
    console.log(error);
  });