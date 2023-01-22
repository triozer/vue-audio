import { computed, onUpdated, watch, type Ref } from "vue"
import { ref } from "vue"

interface AudioControlsOptions {
  seekBackward: number
  seekForward: number
}

interface AudioOptions {
  target: Ref<HTMLAudioElement | null>
  audioSourceUrl: Ref<string | null>
  audioSourceMediaMetaData: Ref<MediaMetadata | null>
  controls?: AudioControlsOptions
}

type TimeUpdateCallback = (time: number) => void

export function useAudio(options: AudioOptions) {
  const isPlaying = ref(false)
  const _currentTime = ref(0)

  let onTimeUpdateCallback: TimeUpdateCallback = () => {}

  const currentTime = computed({
    get: () => _currentTime.value,
    set: (value) => {
      if (!options.target.value) return

      options.target.value.currentTime = value
    },
  })

  watch(options.audioSourceUrl, (newValue) => {
    if (!options.target.value || !newValue) return

    options.target.value.src = newValue
  })

  const play = () => {
    if (!options.target.value) return
    if (isPlaying.value) return

    if (options.audioSourceMediaMetaData.value) {
      navigator.mediaSession.metadata = options.audioSourceMediaMetaData.value

      navigator.mediaSession.setActionHandler("play", play)
      navigator.mediaSession.setActionHandler("pause", pause)
      navigator.mediaSession.setActionHandler("stop", () => {
        if (!options.target.value) return

        options.target.value.currentTime = 0
        currentTime.value = 0
      })
      navigator.mediaSession.setActionHandler("seekbackward", () => {
        if (!options.target.value) return

        currentTime.value -= options.controls?.seekBackward ?? 10
      })
      navigator.mediaSession.setActionHandler("seekforward", () => {
        if (!options.target.value) return

        currentTime.value += options.controls?.seekForward ?? 10
      })
    }

    isPlaying.value = true
    options.target.value.play()
  }

  const pause = () => {
    if (!options.target.value) return

    isPlaying.value = false
    options.target.value.pause()
  }

  const update = () => {
    if (!options.target.value) return

    _currentTime.value = options.target.value.currentTime

    onTimeUpdateCallback(_currentTime.value)
  }

  const onUpdate = (callback: TimeUpdateCallback) => {
    onTimeUpdateCallback = callback
  }

  return {
    isPlaying,
    currentTime,
    play,
    pause,
    update,
    onUpdate,
  }
}
