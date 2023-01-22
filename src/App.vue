<script setup lang="ts">
import AudioPlayer from "./components/AudioPlayer.vue"
</script>

<template>
  <audio-player url="/@triomakesnoises - 119 slit.wav" />
  <audio-player
    url="/VALOO_TRIO_NATHAN_102bpm_Dolem.mp3"
    :audio-metadata="{
      title: 'Dolem',
    }"
  />
</template>
