import type ru from '../ru/print'

export default {
  back: 'Back',
  print: 'Print',
  title: 'Host cheat sheet',
  final: 'Final',
  noText: 'No text',
  noAnswer: 'No answer',
  mediaPrefix: 'Media',
  kind: {
    auction: 'Auction',
    catInBag: 'Cat in the bag, for {n}',
    noRisk: 'No risk',
    allIn: 'All in',
    forAll: 'For all',
  },
  media: {
    image: 'picture',
    audio: 'audio',
    video: 'video',
    youtube: 'YouTube',
    youtubeAudio: 'YouTube, audio',
    from: '{label} from {start}',
    range: '{label} {start}–{end}',
  },
  accepted: 'Also right',
  rejected: 'Do not accept',
} satisfies typeof ru
