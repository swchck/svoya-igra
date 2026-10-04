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
      title: 'Tour for the host',
      text: 'We\'ll go through the sample game: where you write questions, how you start a game and what the host gets. It takes a couple of minutes. Press Esc to leave at any time.',
    },
    actions: {
      title: 'Where to start',
      text: 'New game opens an empty editor. Import takes SIGame files (.siq), games in .gamezip and .json, and library backups. Open sample adds a ready-made game, and the tour uses it.',
    },
    card: {
      title: 'Game card',
      text: 'Play starts the game for the audience, Edit opens the editor. The ⋯ menu saves the game to a file or deletes it.',
      textDesktop: 'Play starts the game for the audience, Edit opens the editor. The ⋯ menu saves the game to a file, sends it over Wi-Fi to another computer, or deletes it.',
    },
    tools: {
      title: 'Settings and this tour',
      text: 'The gear opens settings: language, sounds, rules and look. The question mark starts this tour again.',
    },
    board: {
      title: 'Round board',
      text: 'Each row is a category and each cell a question with its value. Click a cell to open the question.',
    },
    questionText: {
      title: 'Question and answer',
      text: 'The question goes on the left, the answer on the right. The buttons above the text add bold, italics, lists and quotes, and players see the text formatted that way.',
    },
    questionMedia: {
      title: 'Pictures, sound and video',
      text: 'Add a picture, sound or video as a file, by dragging it in, by pasting, or as a link, YouTube included. The answer can have attachments too.',
    },
    questionKind: {
      title: 'Question type and value',
      text: 'A question can be normal, an Auction, where players bid for the right to answer, or a Cat in the bag, which goes to another player. Type any value or pick a preset. The cross closes the window.',
    },
    rounds: {
      title: 'Rounds and final',
      text: 'The Round button adds a round, and you reorder rounds by dragging. You can end the game with a final question with wagers.',
    },
    gameSettings: {
      title: 'Game settings',
      text: 'Here you set the answer timer, the color theme, a logo and the text shown on the title screen.',
    },
    checks: {
      title: 'Checks and history',
      text: 'The badge shows where an answer is missing or a link is broken. History keeps earlier versions of the game, and you can go back to any of them.',
    },
    export: {
      title: 'Export and cheat sheet',
      text: 'Save the game to a file to open it on another computer. The Host cheat sheet prints every question with its answer.',
      textDesktop: 'Save the game to a file or send it over Wi-Fi to another computer. The Host cheat sheet prints every question with its answer.',
    },
    play: {
      title: 'Play',
      text: 'This button opens the game on the audience screen. The next steps cover running it.',
    },
    players: {
      title: 'Players or teams',
      text: 'Type the names and pick a color and badge. The switch at the top decides whether people play alone or in teams.',
    },
    phones: {
      title: 'Phones as buzzers',
      text: 'Players join from their phones over Wi-Fi and tap the button on screen; whoever is first answers. Without phones the host marks who answered.',
    },
    hostWindow: {
      title: 'Host window',
      text: 'Opens the console in its own window. The question, answer and scores there are only for you while the audience watches the stage. Keep the console on your laptop and put the stage on a second screen.',
    },
    start: {
      title: 'Starting the game',
      text: 'Start the game opens the first round. The tour only shows the stage, so you don\'t have to play for real.',
    },
    stageBoard: {
      title: 'Board on the stage',
      text: 'Pick a cell and the question fills the screen. Space shows the answer, then a panel lets you mark who was right, who was wrong, or Nobody answered.',
    },
    chooser: {
      title: 'Who picks',
      text: 'The Picks next tag sits on the player who calls the next cell. After a correct answer, the player who answered picks next.',
    },
    hotkeys: {
      title: 'Keys and undo',
      text: 'Space moves the game on, B opens the phone buttons, Ctrl/⌘+Z undoes the last action. Undo and Skip round are also buttons under the board. After the rounds come the final and the results table.',
    },
  },
} satisfies typeof ru
