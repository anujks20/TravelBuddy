import 'dart:math';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';

class SirenService {
  SirenService._();

  static final AudioPlayer _player = AudioPlayer();

  static bool _isPlaying = false;

  static bool get isPlaying => _isPlaying;

  static Future<void> start() async {
    if (_isPlaying) {
      return;
    }

    // The siren audio will be generated as a WAV file
    // by the app at runtime.
    final bytes = _generateSirenWav();

    await _player.setReleaseMode(
      ReleaseMode.loop,
    );

    await _player.play(
      BytesSource(bytes),
      volume: 1.0,
    );

    _isPlaying = true;
  }

  static Future<void> stop() async {
    if (!_isPlaying) {
      return;
    }

    await _player.stop();

    _isPlaying = false;
  }

  static Future<void> dispose() async {
    await _player.dispose();

    _isPlaying = false;
  }

  static Uint8List _generateSirenWav() {
    const sampleRate = 44100;
    const durationSeconds = 2;
    const frequencyLow = 700.0;
    const frequencyHigh = 1200.0;

    final sampleCount =
        sampleRate * durationSeconds;

    final dataSize = sampleCount * 2;

    final buffer = BytesBuilder();

    buffer.add(
      _int32Bytes(
        0x46464952,
      ),
    );

    buffer.add(
      _int32Bytes(
        36 + dataSize,
      ),
    );

    buffer.add(
      _int32Bytes(
        0x45564157,
      ),
    );

    buffer.add(
      _int32Bytes(
        0x20746D66,
      ),
    );

    buffer.add(
      _int32Bytes(16),
    );

    buffer.add(
      _int16Bytes(1),
    );

    buffer.add(
      _int16Bytes(1),
    );

    buffer.add(
      _int32Bytes(sampleRate),
    );

    buffer.add(
      _int32Bytes(sampleRate * 2),
    );

    buffer.add(
      _int16Bytes(2),
    );

    buffer.add(
      _int16Bytes(16),
    );

    buffer.add(
      _int32Bytes(0x61746164),
    );

    buffer.add(
      _int32Bytes(dataSize),
    );

    final samples =
        <int>[];

    for (var i = 0;
        i < sampleCount;
        i++) {
      final progress =
          i / sampleRate;

      final cycle =
          (progress % 1.0);

      final frequency =
          cycle < 0.5
              ? frequencyLow
              : frequencyHigh;

      final envelope =
          min(
            1.0,
            i / (sampleRate * 0.02),
          );

      final wave =
          sin(
            2 *
                pi *
                frequency *
                progress,
          );

      final value =
          (wave *
                  26000 *
                  envelope)
              .round();

      samples.add(
        value & 0xFF,
      );

      samples.add(
        (value >> 8) & 0xFF,
      );
    }

    buffer.add(
      Uint8List.fromList(samples),
    );

    return buffer.toBytes();
  }

  static Uint8List _int16Bytes(int value) {
    final data = ByteData(2);

    data.setInt16(
      0,
      value,
      Endian.little,
    );

    return data.buffer.asUint8List();
  }

  static Uint8List _int32Bytes(int value) {
    final data = ByteData(4);

    data.setInt32(
      0,
      value,
      Endian.little,
    );

    return data.buffer.asUint8List();
  }
}
