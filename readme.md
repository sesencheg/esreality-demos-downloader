# Cyberfight Media Downloader

>  The script for automatic downloading galleries and demos from [cyberfight.ru](http://cyberfight.ru)

## Install

Required: [node.js](https://nodejs.org/) > 0.12 or [io.js](https://iojs.org) > 1.0

```
git clone https://github.com/danmer/c58-media-downloader.git
cd c58-media-downloader
npm install
```

## Usage

### Download galleries

```
node galleries.js
```

### Download demos

```
node demos.js [game_id1] [game_id2] ...
```

#### Game Ids

| id | game |
| --:| :--- |
|  5 | Counter Strike |
| 26 | Counter-Strike: Global Offensive |
| 19 | DOOM 3 |
| 28 | DOTA 2 |
| 23 | FIFA |
| 24 | Need For Speed |
| 21 | Painkiller |
| 16 | Quake |
| 13 | Quake 2 |
|  1 | Quake 3 |
| 22 | Quake 4 |
| 25 | Quake Live |
| 15 | Return to Castle Wolfenstein |
|  9 | Starcraft Brood War |
| 27 | Starcraft 2 |
| 10 | Unreal Tournament |
| 18 | Unreal Tournament 2004 |
| 17 | Unreal Tournament 2003 |
| 14 | War Craft 3 |

## Additional information

### `info.json` for galleries
```
{
  "source": "http://cyberfight.ru/offline/gallery/631/",
  "galleryId": "631",
  "galleryTitle": "2nd Female CS Tourney",
  "photosCount": 2,
  "comentsCount": 2,
  "photos": [
    {
      "source": "http://cyberfight.ru/offline/gallery/631/15235/",
      "galleryId": "631",
      "photoId": "15235",
      "photoTitle": "Yss->v. в игре",
      "imageId": "15235",
      "imageSrc": "http://img.cyberfight.ru/i_c/i5i/15235/orig/img.jpg",
      "imageExt": ".jpg",
      "imageSize": "72.54 kB"
    },
    ...
  ],
  "comments": [
    {
      "index": "1",
      "authorId": "40563",
      "authorName": "The_Vicont",
      "dateTime": "0:05 / 9 Mar '05",
      "html": "<b></b> Клёво<br> <br> <br>",
      "text": "Клёво"
    },
    ...
  ]
}
```

### `info.json` for demos
```
{
  "source": "http://cyberfight.ru/site/demos/31617/",
  "demoDir": "demos/31617",
  "demoId": "31617",
  "name": "ASUS CUP 2011 - FINAL BATTLE OF THE YEAR",
  "pov": "1",
  "map": "1",
  "type": "Q3 duel",
  "tourney": "ASUS CUP 2011 - FINAL BATTLE OF THE YEAR",
  "downloads": "674",
  "description": "графика для региональных отборочных",
  "fileId": "39269",
  "fileName": "asus_cup_2011_december_regions.zip",
  "fileSize": "13.28 MB",
  "fileLink": "http://files.cyberfight.ru/39269/asus_cup_2011_december_regions.zip",
  "encodedLink": "http://files.cyberfight.ru/39269/%61%73%75%73%5F%63%75%70%5F%32%30%31%31%5F%64%65%63%65%6D%62%65%72%5F%72%65%67%69%6F%6E%73%2E%7A%69%70",
  "commentsCount": 2,
  "comments": [
    {
      "index": "1",
      "authorId": "40563",
      "authorName": "The_Vicont",
      "dateTime": "0:05 / 9 Mar '05",
      "html": "<b></b> Клёво<br> <br> <br>",
      "text": "Клёво"
    },
    ...
  ]
}
```

## License

MIT © Egor Kotlyarov
