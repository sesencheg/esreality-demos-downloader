const { readdirSync, readFileSync, existsSync, mkdirSync, copyFileSync } = require("fs");
const { extname } = require("path");

const baseDir = ".";
const extensions = {};
const types = {};
const others = [];

/*
// type stats
{
  'Q1 duel': 41,
  'Q1 4x4': 5,
  'Q1 2x2': 4,
  'Q1 CW': 2,
  'Q1 tricks': 1,
  'Q2 4x4': 29,
  'Q2 duel': 66,
  'Q2 FFA': 5,
  'Q2 2x2': 16,
  'Q2 3x3': 10,
  'Q3 duel': 2909,
  'Q3 2x2': 387,
  'Q3 4x4': 1073,
  'Q3 CPM': 104,
  'Q3 CTF': 50,
  'Q3 FFA': 25,
  'Q3 tricks': 33,
  'Q3 3x3': 4,
  'Q3 bots': 3,
  'Q3 Rocket Arena': 1,
  'Q4 duel': 57,
  'Q4 movie': 1,
  'QL duel': 182,
  'QL 4x4': 28
  'shoutcast': 44,
  'movie': 12,
}

// file extenstion stats
{
  '.zip': 4464,
  '.rar': 486,
  '.dm_68': 76,
  '.mp3': 39,
  '.dm_67': 10,
  '.dm_73': 3,
  '.cfg': 3
  '.avi': 2,
  '.7z': 2,
  '.dm2': 1,
  '.wma': 1,
  '.mpg': 1,
  '.dm_66': 1,
  '.dm-67': 1,
  '.pk3': 1,
  '.exe': 1,
}
*/

try {
  const gameDirs = readdirSync(baseDir);
  for (const gameDir of gameDirs) {
    // create new game dirs if groups by game
    // if (gameDir.includes("_new")) {
    //   continue;
    // }
    // const newGameDir = `${gameDir}_new`;
    // mkDir(newGameDir);
    const oldDirs = readdirSync(gameDir);
    for (const id of oldDirs) {
      if (existsSync(`${gameDir}/${id}/info2.json`)) {
        console.log(`${gameDir}/${id}/info2.json`);
      }
      try {
        const oldInfoFile = `${gameDir}/${id}/info.json`;
        const info = JSON.parse("" + readFileSync(oldInfoFile));
        const oldReplayFile = `${gameDir}/${id}/${info.fileName}`;
        const ext = extname(info.fileName).toLowerCase();
        const newTournamentDir = `${info.type}/${getSafeName(info.tourney)}`;
        const newReplayDir = `${newTournamentDir}/${getSafeName(info.name)}`;
        const newReplayFile = `${newReplayDir}/${info.fileName}`;
        const newInfoFile = `${newReplayDir}/${info.fileName.replace(ext, ".json")}`;
        // stats
        types[info.type] = types[info.type] || 0;
        extensions[ext] = extensions[ext] || 0;
        extensions[ext]++;
        types[info.type]++;
        // some checks
        if ([".avi", ".mp3", ".wma", ".mpg", ".pk3", ".exe", ".cfg"].includes(ext) || info.fileSize.includes("0.0 ")) {
          delete info.comments;
          if (info.fileSize === "0.0 Kb") {
            // console.log(info);
            // continue;
          } else {
            // console.log(info);
            others.push(info);
          }
        }
        // create folders
        mkDir(info.type);
        mkDir(newTournamentDir);
        mkDir(newReplayDir);
        // copy files
        copyFileSync(oldInfoFile, newInfoFile);
        if (info.fileSize === "0.0 Kb") {
          console.log(`Skiping ${gameDir}/${id} to ${newTournamentDir}`);
        } else {
          console.log(`Copying ${gameDir}/${id} to ${newTournamentDir}`);
          copyFileSync(oldReplayFile, newReplayFile);
        }
      } catch (error) {
        console.log(`error in ${id}`, error.message);
      }
    }
  }
} catch (error) {
  console.log(`error`, error.message);
}

console.log({ types, extensions });
// console.log(others.length, "others");

function mkDir(name) {
  try {
    if (!existsSync(name)) {
      mkdirSync(name);
    }
  } catch (error) {
    console.log(`error while making a dir`, error.message);
  }
}

function getSafeName(name) {
  return name.replace(/[/\\?%*:|'"<>]/g, "_");
}
