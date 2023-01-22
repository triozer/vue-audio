<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, type PropType } from "vue"
import { AudioContext } from "standardized-audio-context"
import { useAudio } from "@/composables/audio"
import { type MetadataInit, useCacheFile } from "@/composables/cache-file"
import { useAudioCanvas } from "@/composables/audio-canvas"

const audioContext = new AudioContext()

const props = defineProps({
  url: {
    type: String,
    required: true,
  },
  samples: {
    type: Number,
    default: 100,
  },
  audioMetadata: {
    type: Object as PropType<MetadataInit>,
    default: () => ({}),
  },
  height: {
    type: Number,
    default: 50,
  },
})

const audioEl = ref<HTMLAudioElement | null>(null)
const wrapper = ref<HTMLDivElement | null>(null)
const foregroundCanvasEl = ref<HTMLCanvasElement | null>(null)
const backgroundCanvasEl = ref<HTMLCanvasElement | null>(null)

const {
  download,
  isDownloading,
  isCaching,
  url,
  arrayBuffer,
  audioBuffer,
  audioMetadata,
  mediaMetadata,
} = useCacheFile({
  audioContext,
  url: props.url,
  namespace: "audio",
  generateMetadata: (audioMetadata) => {
    const defaultAudioMetadata = {
      title: props.url.split("/").pop() || "Unknown title",
      artist: "Unknown artist",
      album: "Unknown album",
      artwork: [],
    }

    return {
      ...{
        title: audioMetadata?.common.title,
        artist: audioMetadata?.common.artists?.join(", ") || audioMetadata?.common.artist,
        album: audioMetadata?.common.album,
        artwork:
          audioMetadata?.common.picture?.map((picture) => ({
            src: URL.createObjectURL(new Blob([picture.data], { type: picture.type })),
          })) || [],
      },
      ...defaultAudioMetadata,
      ...props.audioMetadata,
    }
  },
  normalizeAudioBuffer: (audioBuffer) => {
    if (audioBuffer.length === 0 || props.samples <= 0) {
      return []
    }
    const rawData = audioBuffer.getChannelData(0)

    const blockSize = Math.floor(rawData.length / props.samples)
    const filteredData = []

    for (let i = 0; i < props.samples; i += 1) {
      const blockStart = blockSize * i
      let sum = 0
      for (let j = 0; j < blockSize; j += 1) {
        sum += Math.abs(rawData[blockStart + j])
      }
      filteredData.push(sum / blockSize)
    }

    const multiplier = Math.max(...filteredData) ** -1
    return filteredData.map((n) => n * multiplier)
  },
  onUnmounted,
})

const resizeObserver = new ResizeObserver((entries) => {
  if (entries.length !== 1) {
    throw new Error("Only one element should be watched for resize.")
  }
  if (isDownloading.value) {
    return
  }

  draw(backgroundCanvasEl, "white")
  draw(foregroundCanvasEl, "red")
})

const { isPlaying, currentTime, play, pause, update, onUpdate } = useAudio({
  target: audioEl,
  audioSourceUrl: url,
  audioSourceMediaMetaData: mediaMetadata,
})

const { draw } = useAudioCanvas({
  audioBuffer,
  parentEl: wrapper,
  samples: props.samples,
  height: props.height + 10,
  lineWidth: 3,
})

onUpdate(() => {
  draw(backgroundCanvasEl, "white")
  draw(foregroundCanvasEl, "red")
})

const foregroundCanvasStyle = computed(() => {
  return {
    width: `${
      (currentTime.value * (wrapper.value?.clientWidth ?? 0)) /
      (audioMetadata.value?.format.duration ?? 1)
    }px`,
    height: `${props.height + 30}px`,
  }
})

onMounted(async () => {
  await download()
  draw(backgroundCanvasEl, "white")
  resizeObserver.observe(wrapper.value!)
})

onUnmounted(() => {
  resizeObserver.unobserve(wrapper.value!)
  resizeObserver.disconnect()
})
</script>

<template>
  <div class="audio-player">
    <audio v-show="false" ref="audioEl" @play="play" @pause="pause" @timeupdate="update" controls />

    <button @click="play">Play</button>
    <button @click="pause">Pause</button>

    <div
      ref="wrapper"
      v-show="!isDownloading && !isCaching"
      :style="{
        height: `${height + 30}px`,
      }"
    >
      <div class="overlay" :style="foregroundCanvasStyle">
        <canvas ref="foregroundCanvasEl" :height="`${height}px`"></canvas>
      </div>
      <canvas ref="backgroundCanvasEl" :height="`${height}px`"></canvas>
    </div>
  </div>
</template>

<style scoped lang="scss">
.audio-player {
  .overlay {
    overflow: hidden;
    z-index: 1;
  }

  canvas,
  .overlay {
    position: absolute;
  }
}
</style>
