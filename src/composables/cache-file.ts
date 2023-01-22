import { computed, ref, type onUnmounted } from "vue"
import localforage from "localforage"
import type { IAudioContext } from "standardized-audio-context"

import { parseBlob, type IAudioMetadata } from "music-metadata-browser"

export type MetadataInit = MediaMetadataInit

interface FileOptions {
  audioContext: IAudioContext

  url: string | null
  namespace: string

  generateMetadata: (metadata: IAudioMetadata | null) => MetadataInit
  normalizeAudioBuffer: (audioBuffer: AudioBuffer) => number[]

  onUnmounted?: typeof onUnmounted
}

export function useCacheFile(options: FileOptions) {
  const namespacedName = `${options.namespace}/${options.url}`

  const isDownloading = ref(false)
  const isCaching = ref(false)

  const blob = ref<Blob | null>(null)
  const arrayBuffer = ref<ArrayBuffer | null>(null)
  const audioBuffer = ref<number[] | null>([])
  const audioMetadata = ref<IAudioMetadata | null>(null)
  const mediaMetadata = ref<MediaMetadata | null>(null)

  const url = computed(() => (blob.value ? URL.createObjectURL(blob.value) : null))

  const download = async () => {
    if (!options.url) {
      throw new Error(`Tried to get a file but no URL was provided.`)
    }

    blob.value = await localforage.getItem<Blob>(namespacedName)

    if (!blob.value) {
      console.debug(`File not found in cache, downloading...`)

      isDownloading.value = true
      const response = await fetch(options.url)
      isDownloading.value = false

      if (!response.ok) {
        throw new Error(`Tried to download ${options.url} but the response was not OK.`)
      }

      isCaching.value = true
      blob.value = await response.blob()

      localforage.setItem(namespacedName, blob.value).then(() => {
        console.debug(`${options.url} downloaded and cached at ${namespacedName}.`)
      })
    }

    arrayBuffer.value = await localforage.getItem<ArrayBuffer>(`${namespacedName}/arrayBuffer`)

    if (!arrayBuffer.value) {
      isCaching.value = true
      arrayBuffer.value = await blob.value!.arrayBuffer()

      localforage.setItem(`${namespacedName}/arrayBuffer`, arrayBuffer.value).then(() => {
        console.debug(`${options.url} arrayBuffer cached at ${namespacedName}/arrayBuffer.`)
      })
    }

    audioBuffer.value = JSON.parse(
      (await localforage.getItem<string>(`${namespacedName}/audioBuffer`)) ?? "[]"
    )

    if (!audioBuffer.value || audioBuffer.value.length === 0) {
      isCaching.value = true

      const decodedAudioBuffer = await options.audioContext.decodeAudioData(arrayBuffer.value)
      audioBuffer.value = options.normalizeAudioBuffer(decodedAudioBuffer)

      localforage
        .setItem(`${namespacedName}/audioBuffer`, JSON.stringify(audioBuffer.value))
        .then(() => {
          console.debug(`${options.url} audioBuffer cached at ${namespacedName}/audioBuffer.`)
        })
    }

    audioMetadata.value = await parseBlob(blob.value)
    mediaMetadata.value = new MediaMetadata(options.generateMetadata(audioMetadata.value))

    isCaching.value = false
  }

  if (options.onUnmounted) {
    options.onUnmounted(() => {
      if (!url.value) return

      console.debug(`Releasing URL object for ${namespacedName}.`)
      URL.revokeObjectURL(url.value)
    })
  } else {
    console.warn(
      `No onUnmounted hook provided for ${namespacedName}, you may have to manually revoke the URL object to avoid memory leaks.`
    )
  }

  return {
    download,
    isDownloading,
    isCaching,
    blob,
    url,
    arrayBuffer,
    audioBuffer,
    audioMetadata,
    mediaMetadata,
  }
}
