import type ru from './ru'

export default {
  meta: {
    title: 'Svoya Igra: build and host your own quiz show',
    description:
      'A free app for macOS, Windows and Linux. Build a Jeopardy-style game with pictures, music and YouTube clips, then host it on a big screen.',
  },
  brand: 'Svoya Igra',
  nav: {
    features: 'Features',
    how: 'How to play',
    download: 'Download',
    faq: 'FAQ',
    online: 'Online',
  },
  hero: {
    lede: 'Build your own quiz show with pictures, music and YouTube clips, then host it on a big screen.',
    openInBrowser: 'Open in browser',
    boardCaption: 'This board is live: click any value.',
  },
  board: {
    revealAnswer: 'Show answer',
    backToBoard: 'Back to board',
    played: 'Board cleared',
    again: 'Play again',
    auction: 'Auction',
    cat: 'Cat in the bag',
  },
  download: {
    button: 'Download',
    buttonFor: 'Download for {platform}',
    versionLine: 'Version {version} · {date} · free',
    notPublished: 'The first version is not out yet',
    freeLine: 'Free · macOS, Windows, Linux',
    title: 'Download',
    released: 'Version {version}, released {date}.',
    notPublishedYet: 'The first version is not out yet.',
    updates: 'The app offers to update itself when a new version comes out.',
    notBuilt: 'not built yet',
    onlineTitle: 'Online version',
    onlineText: 'Nothing to install. Your games are stored in this browser.',
    allVersions: 'All versions and changelogs',
    onGithub: 'on GitHub',
    hints: {
      macArm: 'Macs with M1 or newer',
      macX64: 'Macs with an Intel processor',
      windows: 'Windows 10 and 11, 64-bit',
      appimage: 'no install needed',
      deb: 'Ubuntu, Debian, Mint',
      rpm: 'Fedora, openSUSE',
    },
  },
  features: {
    title: 'What the app does',
    editor: {
      title: 'An editor shaped like the board',
      text: 'You build the game on the same board your players will see. Click a cell to open the question window: the question on the left, the answer on the right, each with formatted text, pictures, sound and video. Drag rounds, categories and questions to reorder them. Changes save as you type, and earlier versions of the game can be restored.',
      alt: 'The editor with a round board and an open question',
    },
    board: {
      title: 'A stage for the audience',
      text: 'The board fills the screen or the projector. The picked cell flies out into the question, and the scores at the bottom update as soon as the host marks an answer. Play solo or in teams, each with its own color and badge. An answer timer is optional, and sound effects mark picks, answers and points.',
      alt: 'The round board with player scores',
    },
    question: {
      title: 'Pictures, sound and YouTube',
      text: 'Attach files from your computer or links to a question and to its answer. A YouTube clip plays as video or as sound only. Sound and video can play just a segment, say from 0:30 to 1:15. A long question shrinks to fit the screen.',
      alt: 'A question with pictures on the audience screen',
    },
    host: {
      title: 'The host’s console',
      text: 'In a second window the host sees the correct answer, picks questions, plays sound and video and marks answers. While the console is open, the stage shows no buttons at all. Points given by mistake come back with one click, and the common actions have keyboard shortcuts.',
      alt: 'The host window with a question and its correct answer',
    },
  },
  facts: {
    special: {
      title: 'Auctions and cats in the bag',
      text: 'In an auction a player can bet up to their whole score. A cat in the bag is a question the host hands to another player. In the final everyone places a bet.',
    },
    saved: {
      title: 'Games survive a closed window',
      text: 'Scores are saved after every turn. Close the window mid-game and you can pick up where you left off.',
    },
    offline: {
      title: 'No internet, no account',
      text: 'Your games stay on your computer. You only need a connection for YouTube and media from links.',
    },
    file: {
      title: 'One game, one file',
      text: 'Exporting to .gamezip packs the questions together with their media. Double-click the file to open the game in the app.',
    },
  },
  how: {
    title: 'How to play',
    steps: {
      build: { title: 'Build a game', text: 'Start a new one or open the sample. Fill in the categories, questions and answers.' },
      show: {
        title: 'Put it on screen',
        text: 'Click Play and make the stage full screen. The Host window button opens the console for a second monitor.',
      },
      host: {
        title: 'Host the game',
        text: 'Pick questions, reveal answers and mark who got them right. After the final, the results come up on screen.',
      },
    },
  },
  faq: {
    title: 'FAQ',
    screen: {
      q: 'How do I show the game on a big screen?',
      a: 'Click Play, drag the window to the TV or projector and make it full screen. The Host window button opens the console with the correct answers, sound and video controls and the score. Keep the console on a laptop; the audience never sees it.',
    },
    internet: {
      q: 'Do I need an internet connection?',
      a: 'No. Pictures, sound and video from your computer are stored inside the game. You only need a connection for YouTube clips and pictures from links.',
    },
    siq: {
      q: 'Can I play a ready-made SIGame package?',
      a: 'Yes. Click Import on the home screen and pick a .siq file. Rounds, categories, questions, pictures and sound come across. The final keeps its first category, because our final is a single question.',
    },
    share: {
      q: 'How do I send a game to another host?',
      a: 'In the editor, click Export and save the game as a .gamezip file. It holds every question together with its pictures and sound. Double-click the file to open the game in the app.',
    },
    languages: {
      q: 'Which languages does the app support?',
      a: 'Russian, English and Serbian. Switch the language in the menu on the home screen; the site and the online version remember your choice.',
    },
    sounds: {
      q: 'Can I turn the sound effects off?',
      a: 'Yes. There is a speaker button on the game screen and in the host console. It does not affect the sound in your questions, such as the music in a guess-the-melody round.',
    },
    online: {
      q: 'How is the online version different from the app?',
      a: 'It is the same app running in your browser. Games are stored in this browser, so clearing site data deletes them: save the ones you care about to .gamezip. The host console opens in a separate browser window. Opening .gamezip files with a double-click only works in the installed app. You can install the online version on a computer or phone like an app, and then it opens without an internet connection too.',
    },
    mac: {
      q: 'macOS says it cannot verify the developer',
      a: 'The app is not signed by Apple, so macOS asks for permission the first time you open it. Open System Settings, go to Privacy & Security and click Open Anyway. If macOS says the app is damaged, run this in Terminal: {command}',
    },
    windows: {
      q: 'Windows shows a SmartScreen warning',
      a: 'The installer has no paid signature, so Windows does not recognize it. Click More info, then Run anyway.',
    },
    appimage: {
      q: 'How do I run the AppImage on Linux?',
      a: 'Make the file executable with {command} and run it. There is nothing to install.',
    },
    storage: {
      q: 'Where are my games stored?',
      a: 'The installed app keeps games on your computer, the online version keeps them in the browser. There is no account or cloud, so your games never leave the device.',
    },
    price: {
      q: 'How much does it cost?',
      a: 'Nothing. The app is free and its source code is on GitHub.',
    },
  },
  footer: {
    online: 'Online version',
    source: 'Source code on GitHub',
  },
} satisfies typeof ru
