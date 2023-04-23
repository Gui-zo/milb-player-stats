const axios = require("axios");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const readline = require("readline");

// Function to prompt user for input
function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}


// Main function that triggers the rest of the functions based on the selected player and number of games picked.
const searchPlayer = async (playerName, numGames) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://milb.com");

  // Click the search icon
  await page.click(".search__handler");

  // Type the player name in the search field
  await page.type(".header__search-bar", playerName);

  // Wait for the search suggestions to load
  await page.waitForSelector(".search__suggestions.has-suggestions");

  // Get the URL of the first search suggestion
  const suggestion = await page.$(".search__suggestions.has-suggestions a");

  if (!suggestion) {
    throw new Error(`Player "${playerName}" not found`);
  }

  const playerUrl = await suggestion.getProperty("href");
  const playerUrlValue = await playerUrl.jsonValue();

  // Go to the player's page
  await page.goto(playerUrlValue);

  // Get the first row of the fourth table

  const teamId = await getTeamID(playerUrlValue);

  const allStats = await getPlayerData(playerName, playerUrlValue, teamId, numGames);

  await browser.close();

  return allStats;
};

// Function to extract player stats from HTML
async function extractPlayerStats(player_url) {
  const url = player_url;

  const response = await axios.get(url);
  const html = response.data;
  const $ = cheerio.load(html);
  const table = $("table").eq(4);
  const headers = [];
  const statsData = [];

  // Extract table headers
  table.find("thead tr th").each((i, el) => {
    headers.push($(el).text().trim());
  });

  // Extract first table row only
  const firstRow = table.find("tbody tr").first();
  const row = {};
  firstRow.find("td").each((j, cell) => {
    row[headers[j]] = $(cell).text().trim();
  });
  statsData.push(row);

  return statsData;
}

// Function to extract player's teamId from HTML
async function getTeamID(player_url) {
  const playerUrl = player_url;

  try {
    const response = await axios.get(playerUrl);
    const html = response.data;
    const $ = cheerio.load(html);

    // Get the team name from the player-header--vitals-name span tag
    const teamName = $(".player-header--vitals-name span").text().trim();

    // Find the img tag with alt='{Team Name}' and grab the src number from the link
    const teamLogo = $('img[alt="' + teamName + '"]').attr("src");
    const teamId = teamLogo.split("/").pop().split(".")[0];

    return teamId;
  } catch (error) {
    console.log(error);
  }
}

// Function to extract next X games from MLB API
async function extractGames(teamId, numGames) {
  const currentDate = new Date().toISOString().slice(0, 10); // Get the current date in ISO format
  const endDate = new Date(
    new Date().getTime() + numGames * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);

  console.log(currentDate);
  console.log(endDate);

  const url_games = `https://statsapi.mlb.com/api/v1/schedule?lang=en&sportId=11,12,13,14,15,16,5442,22&hydrate=team(venue(timezone,location)),venue(timezone,location),game(seriesStatus,seriesSummary,tickets,promotions,sponsorships,content(summary,media(epg))),seriesStatus,seriesSummary,decisions,person,linescore,broadcasts(all),tickets,event(tickets),radioBroadcasts&season=2023&startDate=${currentDate}&endDate=${endDate}&teamId=${teamId}&eventTypes=primary&scheduleTypes=games,events,xref`;

  const response = await axios.get(url_games);
  const data = response.data;
  const games = [];

  let numGamesAdded = 0;

  // Iterate over each game
  data.dates.forEach((date) => {
    date.games.forEach((game) => {
      const homeTeam = game.teams.home.team.name;
      const awayTeam = game.teams.away.team.name;
      const gameDate = game.gameDate;

      games.push({
        homeTeam,
        awayTeam,
        gameDate,
      });

      numGamesAdded++;

      if (numGamesAdded >= numGames) {
        return;
      }
    });
  });

  return games;
}

// Function to combine player stats and next X games into a single object
async function getPlayerData(playerName, playerUrl, teamId, numGames) {
    
  const statsData = await extractPlayerStats(playerUrl)
  const games = await extractGames(teamId, numGames)

  const playerData = {
    playerName,
    stats: statsData,
    nextGames: games,
  };

  return playerData;
}

// Main function
async function main() {
  const playerName = await promptUser(
    "Enter player name you wish to search for: "
  );
  const numGames = await promptUser(
    "You want to see the games for the next (days): "
  );

  const playerData = await searchPlayer(playerName, numGames);

  // Convert data to formatted JSON and log to console
  const jsonData = JSON.stringify(playerData, null, 2);
  console.log(jsonData);
}

main().catch((error) => {
  console.log(error);
});
