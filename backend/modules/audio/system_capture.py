"""
Wingman AI - System Audio Capture (macOS)
Records what the Mac plays (e.g. the interviewer on Zoom/Meet) with ScreenCaptureKit.
Same interface as AudioCapture: start(), stop(), get_chunk() -> 16-bit PCM bytes.
Needs "Screen & System Audio Recording" permission for Wingman AI.
"""

import queue
import threading
from typing import Optional

import numpy as np
from loguru import logger

try:
    import objc
    import CoreMedia
    import ScreenCaptureKit as SCK
    from Foundation import NSObject
except ImportError:  # not macOS / bindings missing
    SCK = None


class SystemAudioUnavailable(Exception):
    pass


if SCK is not None:
    class _AudioOutput(NSObject, protocols=[objc.protocolNamed("SCStreamOutput")]):
        def initWithQueue_(self, q):
            self = objc.super(_AudioOutput, self).init()
            self.q = q
            return self

        def stream_didOutputSampleBuffer_ofType_(self, stream, sample_buffer, kind):
            if kind != SCK.SCStreamOutputTypeAudio:
                return
            block = CoreMedia.CMSampleBufferGetDataBuffer(sample_buffer)
            if block is None:
                return
            length = CoreMedia.CMBlockBufferGetDataLength(block)
            status, data = CoreMedia.CMBlockBufferCopyDataBytes(block, 0, length, None)
            if status == 0 and data:
                # ScreenCaptureKit delivers float32 samples; the pipeline expects int16 like the mic
                samples = np.frombuffer(bytes(data), dtype=np.float32)
                self.q.put((np.clip(samples, -1, 1) * 32767).astype(np.int16).tobytes())


def _wait(start, timeout: float = 10):
    """Run an async ScreenCaptureKit call and wait for its completion handler"""
    done = threading.Event()
    result = []

    def handler(*args):
        result.extend(args)
        done.set()

    start(handler)
    if not done.wait(timeout):
        raise SystemAudioUnavailable("macOS did not respond")
    return result


class SystemAudioCapture:
    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate
        self._audio_queue: "queue.Queue[bytes]" = queue.Queue()
        self._stream = None
        self._output = None

    def start(self):
        if SCK is None:
            raise SystemAudioUnavailable("System audio capture needs macOS 13+")
        content, error = _wait(SCK.SCShareableContent.getShareableContentWithCompletionHandler_)
        if error is not None or content is None or not content.displays():
            raise SystemAudioUnavailable(
                "Allow Wingman AI under System Settings → Privacy & Security → "
                "Screen & System Audio Recording, then restart Wingman"
            )

        content_filter = SCK.SCContentFilter.alloc().initWithDisplay_excludingWindows_(content.displays()[0], [])
        config = SCK.SCStreamConfiguration.new()
        config.setCapturesAudio_(True)
        config.setSampleRate_(self.sample_rate)
        config.setChannelCount_(1)
        config.setExcludesCurrentProcessAudio_(True)
        # Audio only: keep the (required) video stream tiny and slow
        config.setWidth_(2)
        config.setHeight_(2)
        config.setMinimumFrameInterval_(CoreMedia.CMTimeMake(1, 1))

        self._output = _AudioOutput.alloc().initWithQueue_(self._audio_queue)
        self._stream = SCK.SCStream.alloc().initWithFilter_configuration_delegate_(content_filter, config, None)
        ok, error = self._stream.addStreamOutput_type_sampleHandlerQueue_error_(
            self._output, SCK.SCStreamOutputTypeAudio, None, None
        )
        if not ok:
            raise SystemAudioUnavailable(f"Could not attach audio output: {error}")
        (error,) = _wait(self._stream.startCaptureWithCompletionHandler_)
        if error is not None:
            self._stream = None
            raise SystemAudioUnavailable(f"Could not start system audio capture: {error}")
        logger.info("System audio capture started")

    def stop(self):
        if self._stream is not None:
            try:
                _wait(self._stream.stopCaptureWithCompletionHandler_, timeout=3)
            except Exception as e:
                logger.warning(f"System audio stop: {e}")
            self._stream = None
            logger.info("System audio capture stopped")

    def get_chunk(self, timeout: float = 0) -> Optional[bytes]:
        try:
            return self._audio_queue.get(timeout=timeout)
        except queue.Empty:
            return None
