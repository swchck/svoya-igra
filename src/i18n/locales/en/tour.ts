import type ru from '../ru/tour'

export default {
  restart: 'Tour of this screen',
  progress: 'Step {n} of {total}',
  clickHint: 'Click the highlighted spot, or press Next.',
  back: 'Back',
  next: 'Next',
  done: 'Done',
  skip: 'Skip',
  later: 'Later',
  show: 'Show me',
  demo: 'Demo',
  home: {
    welcome: {
      title: 'Quick tour',
      text: 'A quick look at what the home screen has.',
    },
    actions: {
      title: 'Getting started',
      text: 'New game creates an empty one, Import opens .siq, .gamezip, .json and backups, Open sample adds a ready-made game.',
    },
    card: {
      title: 'Game card',
      text: 'Play starts the game, Edit opens the editor. The ⋯ menu saves the game to a file or deletes it.',
      textDesktop: 'Play starts the game, Edit opens the editor. The ⋯ menu saves the game to a file, shares it over Wi-Fi or deletes it.',
    },
    tools: {
      title: 'Settings',
      text: 'The gear opens settings. Every screen has a question mark that repeats its tour.',
    },
  },
  editor: {
    board: {
      title: 'The board',
      text: 'A row is a category, a cell is a question with a value. Click the highlighted cell.',
    },
    question: {
      title: 'Question and answer',
      text: 'The question is on the left, the answer on the right. You can format the text and add a picture, sound or video to either.',
    },
    kind: {
      title: 'Type and value',
      text: 'A question is Regular, an Auction or a Cat in the bag. Type any value or pick a ready one.',
    },
    rounds: {
      title: 'Rounds and final',
      text: 'The Round button adds a round, dragging reorders them. The final goes at the end.',
    },
    checks: {
      title: 'Checks and history',
      text: 'The badge shows where an answer is missing or a link is broken. History keeps earlier versions of the game.',
    },
    export: {
      title: 'Export',
      text: 'The Export menu saves the game to a file. It also has the Host cheat sheet with questions and answers to print.',
      textDesktop: 'The Export menu saves the game to a file or shares it over Wi-Fi. It also has the Host cheat sheet to print.',
    },
  },
  stage: {
    players: {
      title: 'Players',
      text: 'Type names and pick colors. The switch on top decides whether people play alone or in teams.',
    },
    phones: {
      title: 'Phones',
      text: 'With Play with phones, players press a button on their own phones over Wi-Fi. Without them, the host marks who answers.',
    },
    hostWindow: {
      title: 'Host window',
      text: 'Opens a console with answers and scores in a separate window. The audience does not see it.',
    },
    start: {
      title: 'Starting',
      text: 'Start the game begins the first round, then the tour shows the stage.',
    },
    chooser: {
      title: 'Who picks',
      text: 'The Picks next tag marks the player whose turn it is to name a cell. The host changes it on the console.',
    },
    hotkeys: {
      title: 'Hotkeys',
      text: 'Space moves the game on, B opens the buttons on phones, Ctrl/⌘+Z undoes the last action. Skip round sits under the board.',
    },
  },
  host: {
    chooser: {
      title: 'Sample game',
      text: 'This is a demo, nothing reaches the stage. The highlighted player picks the cell, clicking another passes the pick.',
    },
    question: {
      title: 'Question and answer',
      text: 'Only you see the correct answer. Show answer on the stage reveals it to the audience.',
    },
    buzz: {
      title: 'Phones',
      text: 'Shows who buzzed first. The buttons can be reopened, also with a wrong answer.',
    },
    timer: {
      title: 'Timer',
      text: 'Starts the answer time, pauses it and resets it.',
    },
    verdict: {
      title: 'Verdict',
      text: 'Mark who answered right or wrong. If nobody answered, press Nobody answered.',
    },
    scores: {
      title: 'Score',
      text: 'A number selects a player (keys 1–9), + and − change the score. Undo reverts the last action.',
    },
    top: {
      title: 'Top bar',
      text: 'Shows the game phase, the hotkeys hint and sound. The question mark repeats this tour.',
    },
  },
} satisfies typeof ru
