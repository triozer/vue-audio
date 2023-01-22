import type { App } from "vue"

import AudioPlayer from "./components/AudioPlayer.vue"
import { useAudio } from "./composables/audio"

export function install(app: App) {
  app.component("AudioPlayer", AudioPlayer)
}

export { AudioPlayer, useAudio }
