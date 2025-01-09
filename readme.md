# Esreality Demos Downloader

>  The script for automatic downloading demos from [esreality.com](https://esreality.com)

## Install

Required: [node.js](https://nodejs.org/) > 0.12 or [io.js](https://iojs.org) > 1.0

```
git clone https://github.com/sesencheg/esreality-demos-downloader.git
cd esreality-demos-downloader
npm install
```

## Usage

### Download demos

```
node demos.js [game_id1] [game_id2] ...
```

#### Game Ids

| id | game |
| --:| :--- |
| Q1 | Quake |
| Q2 | Quake 2 |
| Q3 | Quake 3 |
| QL | Quake Live |
| UT | Unreal Tournament |

## Additional information

### `info.json` for demos
```
{
  "demoLink": "https://esreality.com/post/2790984/locktar-vs-rickoll/",
  "dateTime": "23:02 GMT 30 Dec 2015",
  "game": "Q1",
  "mod": "N/A",
  "type": "1v1",
  "map": "DM2",
  "text": "Thunderdome Season 5 Div0 Grand Final map 4",
  "tourney": "",
  "encodedLink": "https://esreality.com/files/demos/2015/107394-duel_rikoll_vs_locktar%5Bdm2%5D301215-2146.mvd",
  "demoDir": "demos/2790984",
  "demoId": "2790984",
  "fileName": "107394-duel_rikoll_vs_locktar[dm2]301215-2146.mvd",
  "fileSize": "1.15 MB"
}
```

## License

MIT © Sergey Kositsyn
