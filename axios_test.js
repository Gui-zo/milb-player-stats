const axios = require('axios');
const cheerio = require('cheerio');
const readline = require('readline');

// Function to prompt user for input
function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// Function to extract player stats from HTML
async function extractPlayerStats(playerName) {
  const url = `https://www.milb.com/player/${playerName}`;

  const response = await axios.get(url);
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

  return statsData;
}

// Function to extract next 10 games from MLB API
async function extractGames(teamId, numGames) {
  const currentDate = new Date().toISOString().slice(0, 10); // Get the current date in ISO format
  const endDate = new Date(new Date().getTime() + numGames * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // Get the date 30 days from now in ISO format

  const url_games = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${teamId}&startDate=${currentDate}&endDate=${endDate}&hydrate=team,linescore(matchup)`;

  const response = await axios.get(url_games);
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

      if (numGamesAdded >= numGames) {
        return;
      }
    });
  });

  return games;
}

// Function to combine player stats and next 10 games into a single object
async function getPlayerData(playerName, teamId, numGames) {
  const statsData = await extractPlayerStats(playerName);
  const games = await extractGames(teamId, numGames);

  const playerData = {
    playerName,
    stats: statsData,
    nextGames: games
  };

  return playerData;
}

// Main function
async function main() {
    const playerName = await promptUser('Enter player name (i.e.: harry-ford-695670): ');
    const teamId = await promptUser('Enter team ID: ');
    const numGames = await promptUser('You want to see the games for the next (days): ')
    
    const playerData = await getPlayerData(playerName, teamId, numGames);
  
    // Convert data to formatted JSON and log to console
    const jsonData = JSON.stringify(playerData, null, 2);
    console.log(jsonData);
  }
  
  main().catch(error => {
    console.log(error);
  });