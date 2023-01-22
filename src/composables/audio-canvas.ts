import type { Ref } from "vue"

type DrawSegmentOptions = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  isEven: boolean,
  color: string
) => void

interface AudioCanvasOptions {
  parentEl: Ref<HTMLDivElement | null>
  audioBuffer: Ref<number[] | null>
  height: number
  samples: number
  lineWidth: number
  drawLineSegment?: DrawSegmentOptions
}

export function useAudioCanvas(options: AudioCanvasOptions) {
  const drawLineSegment: DrawSegmentOptions = (ctx, x, y, width, isEven, color) => {
    ctx.lineWidth = options.lineWidth
    ctx.strokeStyle = color

    ctx.beginPath()
    y = isEven ? y : -y
    ctx.moveTo(x, 0)
    ctx.lineTo(x, y)
    ctx.arc(x + width / 2, y, width / 2, Math.PI, 0, isEven)
    ctx.lineTo(x + width, 1)
    ctx.stroke()
  }

  const draw = (target: Ref<HTMLCanvasElement | null>, color: string) => {
    if (!options.parentEl.value || !target.value) return

    target.value.width = options.parentEl.value.clientWidth
    target.value.height = options.height + 20

    const ctx = target.value.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, target.value.width, options.height + 20)
    ctx.translate(0, (options.height + 20) / 2)

    const buffer = options.audioBuffer.value ?? []
    const bufferLength = buffer.length ?? 0
    const width = target.value.offsetWidth / bufferLength

    for (let i = 0; i < bufferLength; i += 1) {
      const x = width * i
      let height = buffer[i] * options.height

      if (height < 0) {
        height = 0
      } else if (height > options.height / 2) {
        height = options.height / 4
      }

      ;(options.drawLineSegment ?? drawLineSegment)(ctx, x, height, width, !!((i + 1) % 2), color)
    }
  }

  return {
    draw,
  }
}
