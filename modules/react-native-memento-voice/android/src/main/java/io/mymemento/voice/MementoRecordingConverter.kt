package io.mymemento.voice

import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import java.io.File
import java.io.IOException
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Compresses a finished call recording (16-bit mono PCM WAV) to AAC-LC in an
 * M4A, the same as the iOS converter: 32 kbps, the recording's own sample
 * rate, written to a ".partial.m4a" sibling and renamed when complete, so a
 * failed conversion never leaves a half file. The WAV is deleted only once
 * the M4A is in place. About 0.24 MB a minute instead of about 1.9 MB.
 */
object MementoRecordingConverter {
  private const val MIME = MediaFormat.MIMETYPE_AUDIO_AAC
  private const val BIT_RATE = 32_000
  private const val TIMEOUT_US = 10_000L
  private const val CHUNK_BYTES = 8_192

  private class Wav(val sampleRate: Int, val dataOffset: Long, val dataBytes: Long)

  fun convertToM4A(wavPath: String): String {
    val path = wavPath.removePrefix("file://")
    val input = File(path)
    if (path.isEmpty() || !input.exists()) throw IOException("Recording file not found.")
    val wav = readWavHeader(input)
    if (wav.dataBytes <= 0) throw IOException("The recording is empty.")

    val base = path.substringBeforeLast('.')
    val output = File("$base.m4a")
    val partial = File("$base.partial.m4a")
    partial.delete()
    try {
      encode(input, wav, partial)
    } catch (error: Throwable) {
      partial.delete()
      throw error
    }
    output.delete()
    if (!partial.renameTo(output)) {
      partial.delete()
      throw IOException("Could not save the M4A file.")
    }
    input.delete()
    return output.absolutePath
  }

  /** Finds the PCM format and data chunk; refuses anything but 16-bit mono PCM. */
  private fun readWavHeader(file: File): Wav {
    RandomAccessFile(file, "r").use { raf ->
      val riff = ByteArray(12)
      raf.readFully(riff)
      if (String(riff, 0, 4, Charsets.US_ASCII) != "RIFF" ||
        String(riff, 8, 4, Charsets.US_ASCII) != "WAVE"
      ) {
        throw IOException("Could not read the recording.")
      }
      var sampleRate = 0
      var channels = 0
      var bits = 0
      val header = ByteArray(8)
      while (raf.filePointer + 8 <= raf.length()) {
        raf.readFully(header)
        val id = String(header, 0, 4, Charsets.US_ASCII)
        val size = ByteBuffer.wrap(header, 4, 4).order(ByteOrder.LITTLE_ENDIAN).int.toLong() and 0xFFFFFFFFL
        val start = raf.filePointer
        when (id) {
          "fmt " -> {
            val fmt = ByteArray(16)
            raf.readFully(fmt)
            val b = ByteBuffer.wrap(fmt).order(ByteOrder.LITTLE_ENDIAN)
            val format = b.short.toInt()
            channels = b.short.toInt()
            sampleRate = b.int
            b.int // byte rate
            b.short // block align
            bits = b.short.toInt()
            if (format != 1) throw IOException("Expected PCM audio.")
          }
          "data" -> {
            if (channels != 1 || bits != 16 || sampleRate <= 0) {
              throw IOException("Expected a 16-bit mono recording.")
            }
            // A recording cut short may not have its sizes filled in; the data
            // then runs to the end of the file.
            val available = raf.length() - start
            val dataBytes = if (size == 0L || size > available) available else size
            return Wav(sampleRate, start, dataBytes - dataBytes % 2)
          }
        }
        raf.seek(start + size + (size and 1L))
      }
    }
    throw IOException("Could not read the recording.")
  }

  private fun encode(input: File, wav: Wav, partial: File) {
    val format = MediaFormat.createAudioFormat(MIME, wav.sampleRate, 1).apply {
      setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC)
      setInteger(MediaFormat.KEY_BIT_RATE, BIT_RATE)
      setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, CHUNK_BYTES)
    }
    val codec = MediaCodec.createEncoderByType(MIME)
    val muxer = MediaMuxer(partial.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    var muxerStarted = false
    var track = -1
    try {
      codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
      codec.start()
      RandomAccessFile(input, "r").use { raf ->
        raf.seek(wav.dataOffset)
        var remaining = wav.dataBytes
        var framesQueued = 0L
        var inputDone = false
        val info = MediaCodec.BufferInfo()
        val chunk = ByteArray(CHUNK_BYTES)
        while (true) {
          if (!inputDone) {
            val index = codec.dequeueInputBuffer(TIMEOUT_US)
            if (index >= 0) {
              val buffer = codec.getInputBuffer(index) ?: throw IOException("Encoder gave no input buffer.")
              val presentationUs = framesQueued * 1_000_000L / wav.sampleRate
              if (remaining <= 0) {
                codec.queueInputBuffer(index, 0, 0, presentationUs, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                inputDone = true
              } else {
                val count = minOf(remaining, minOf(buffer.capacity(), CHUNK_BYTES).toLong()).toInt()
                raf.readFully(chunk, 0, count)
                buffer.clear()
                buffer.put(chunk, 0, count)
                codec.queueInputBuffer(index, 0, count, presentationUs, 0)
                remaining -= count
                framesQueued += count / 2
              }
            }
          }
          val out = codec.dequeueOutputBuffer(info, TIMEOUT_US)
          when {
            out == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
              track = muxer.addTrack(codec.outputFormat)
              muxer.start()
              muxerStarted = true
            }
            out >= 0 -> {
              val encoded = codec.getOutputBuffer(out) ?: throw IOException("Encoder gave no output buffer.")
              val isConfig = info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG != 0
              if (info.size > 0 && !isConfig && muxerStarted) {
                encoded.position(info.offset)
                encoded.limit(info.offset + info.size)
                muxer.writeSampleData(track, encoded, info)
              }
              codec.releaseOutputBuffer(out, false)
              if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) break
            }
          }
        }
      }
      if (!muxerStarted) throw IOException("Could not encode the recording.")
    } finally {
      runCatching { codec.stop() }
      codec.release()
      if (muxerStarted) runCatching { muxer.stop() }
      runCatching { muxer.release() }
    }
  }
}
