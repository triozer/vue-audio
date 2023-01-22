import { Buffer } from "buffer"
import process from "process"

globalThis.Buffer = Buffer
globalThis.process = process

import { createApp } from "vue"
import "./styles/style.css"

import App from "./App.vue"

createApp(App).mount("#app")
