import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Makes the 512px previews of stored maps that predate them. New renders get
 * theirs when they're saved, so this only needs running once.
 */
export default class TexturesThumbnails extends BaseCommand {
  static commandName = 'textures:thumbnails'
  static description = 'Create missing 512px previews of rendered texture maps'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { default: TextureOutput } = await import('#models/texture_output')
    const { outputThumbnail } = await import('#services/texture_service')
    const { putPublic, readBytes, storageKeys } = await import('#services/storage_service')

    const outputs = await TextureOutput.query().whereNull('thumb_key')
    if (outputs.length === 0) {
      this.logger.info('Every map already has a preview')
      return
    }

    for (const output of outputs) {
      const key = storageKeys.outputThumb(output.textureId, output.revision, output.channel)
      try {
        await putPublic(key, await outputThumbnail(await readBytes(output.key)), {
          contentType: 'image/webp',
        })
        output.thumbKey = key
        await output.save()
        this.logger.success(`texture ${output.textureId} ${output.channel}`)
      } catch (error) {
        this.logger.error(
          `texture ${output.textureId} ${output.channel}: ${(error as Error).message}`
        )
        this.exitCode = 1
      }
    }
  }
}
