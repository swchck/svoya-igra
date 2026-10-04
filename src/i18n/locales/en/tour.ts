import type ru from '../ru/tour'

export default {
  restart: 'Take the app tour',
  progress: 'Step {n} of {total}',
  clickHint: 'Click the highlighted spot, or press Next.',
  back: 'Back',
  next: 'Next',
  done: 'Done',
  skip: 'Skip',
  later: 'Later',
  show: 'Show me',
  steps: {
    welcome: {
      title: 'A quick tour for the host',
      text: 'I will point out the main controls on a ready-made sample game: how to build a game, how to run it and what the host can do. It takes a couple of minutes, and Esc stops it at any time.',
    },
    actions: {
      title: 'Where to start',
      text: '"New game" opens an empty editor. "Import" takes games made elsewhere: SIGame files (.siq), our .gamezip and .json, and library backups. "Open sample" puts a finished game in your library, and the tour uses it.',
    },
    card: {
      title: 'The game card',
      text: '"Play" starts the game for the audience, "Edit" opens the editor. The "⋯" menu saves the game as a file or deletes it.',
      textDesktop: '"Play" starts the game for the audience, "Edit" opens the editor. The "⋯" menu saves the game as a file, shares it over Wi-Fi with another computer or deletes it.',
    },
    tools: {
      title: 'Settings and this tour',
      text: 'The gear opens settings: language, sounds, looks and game rules. The question mark runs this tour again.',
    },
    board: {
      title: 'The round board',
      text: 'Themes run in rows, questions are the cells with a price. Click any cell to open its question.',
    },
    questionText: {
      title: 'Question and answer',
      text: 'The question goes on the left, the answer on the right. The bar above the field formats text: bold, italic, lists and quotes. Players see it all on screen.',
    },
    questionMedia: {
      title: 'Pictures, sound and video',
      text: 'A question can carry a picture, sound or video: add a file, drop one in, paste from the clipboard or use a link (YouTube works too). The answer takes the same attachments.',
    },
    questionKind: {
      title: 'Question type and price',
      text: 'A regular question, an "Auction" (players bid for the right to answer) or a "Cat in the bag" (the question is handed to an opponent). The price is any number, with common values at hand. The cross closes the window.',
    },
    rounds: {
      title: 'Rounds and the final',
      text: 'The "Round" button adds a round, dragging changes their order. The game can end with a final question with bets.',
    },
    gameSettings: {
      title: 'Game settings',
      text: 'The answer timer, accent color, logo and intro text give the game its own look on screen.',
    },
    checks: {
      title: 'Checks and history',
      text: 'The badge tells what is unfilled or broken in the game. "History" keeps earlier versions of the game, and any of them can be restored.',
    },
    export: {
      title: 'Export and cheat sheet',
      text: 'Save the game as a file to open it on another computer. "Host cheat sheet" prints every question with its answer, handy for the host to keep close.',
      textDesktop: 'Save the game as a file or share it over Wi-Fi with another computer. "Host cheat sheet" prints every question with its answer, handy for the host to keep close.',
    },
    play: {
      title: 'Play',
      text: 'This button starts the game on the stage. Next, a look at how to run it.',
    },
    players: {
      title: 'Players or teams',
      text: 'Type the names, pick a color and an avatar. The switch on top decides whether people play alone or in teams.',
    },
    phones: {
      title: 'Phones as buzzers',
      text: 'Players join from their phones over Wi-Fi and press a button on screen: the fastest one answers. Without phones the host marks who answered.',
    },
    hostWindow: {
      title: 'The host window',
      text: 'Opens a separate window with a console: the question, the answer and prompts are for your eyes only while the audience watches the stage. It can sit on a second monitor.',
    },
    start: {
      title: 'Starting the game',
      text: 'The "Start the game" button begins the game. The tour will show you the stage, so there is no need to play for real.',
    },
    stageBoard: {
      title: 'The game board',
      text: 'Pick a cell and its question fills the screen. Space reveals the answer, then a verdict panel appears: mark who answered right or wrong, or "Nobody answered".',
    },
    chooser: {
      title: 'Whose turn to pick',
      text: 'The "Picks next" tag sits on the player who names the next cell. Whoever answers correctly picks next.',
    },
    hotkeys: {
      title: 'Keys and undo',
      text: 'Space moves on, B opens the buzzers, Ctrl/⌘+Z undoes the last action. Undo and Skip round are also buttons. The final and the results table come at the end. Have a great game!',
    },
  },
} satisfies typeof ru
