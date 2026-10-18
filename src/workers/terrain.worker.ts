import { SyntheticTerrainProvider } from '../data/SyntheticTerrainProvider'
import type { TerrainSurvey } from '../domain/types'

/*
 * Builds synthetic surveys off the main thread (about 1.5 s of work for both epochs).
 * Request: { id, surveyId }. Reply: { id, survey } or { id, error }.
 * Pixel and elevation buffers are transferred, not copied.
 */

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<{ id: number; surveyId: string }>) => void) | null
  postMessage(message: unknown, transfer?: Transferable[]): void
}

const provider = new SyntheticTerrainProvider()

ctx.onmessage = async ({ data }) => {
  try {
    const survey: TerrainSurvey = await provider.getSurvey(data.surveyId)
    const transfer: Transferable[] = []
    // Send copies so the provider's cache stays usable for later requests.
    const elevations = survey.elevations.slice()
    transfer.push(elevations.buffer)
    let orthophoto = survey.orthophoto
    if (orthophoto) {
      orthophoto = { ...orthophoto, rgba: orthophoto.rgba.slice() }
      transfer.push(orthophoto.rgba.buffer)
    }
    ctx.postMessage({ id: data.id, survey: { ...survey, elevations, orthophoto } }, transfer)
  } catch (e) {
    ctx.postMessage({ id: data.id, error: e instanceof Error ? e.message : String(e) })
  }
}
