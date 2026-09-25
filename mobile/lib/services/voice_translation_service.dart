import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:google_mlkit_translation/google_mlkit_translation.dart';
import 'package:speech_to_text/speech_to_text.dart';

class VoiceTranslationService {
  VoiceTranslationService._();

  static final SpeechToText _speech = SpeechToText();
  static final FlutterTts _tts = FlutterTts();

  static bool _speechInitialized = false;
  static OnDeviceTranslator? _translator;

  static Future<void> initialize() async {
    if (!_speechInitialized) {
      _speechInitialized = await _speech.initialize();
    }

    await _tts.setVolume(1.0);
    await _tts.setSpeechRate(0.48);
    await _tts.setPitch(1.0);
  }

  static bool get isSpeechAvailable => _speechInitialized;

  static bool get isListening => _speech.isListening;

  static Future<List<LocaleName>> getAvailableLocales() async {
    return _speech.locales();
  }

  static Future<void> startListening({
    required String localeId,
    required void Function(String text, bool isFinal) onResult,
    VoidCallback? onDone,
    void Function(Object error)? onError,
  }) async {
    if (!_speechInitialized) {
      await initialize();
    }

    if (!_speechInitialized) {
      throw Exception(
        'Speech recognition is not available on this device.',
      );
    }

    await _speech.listen(
      onResult: (result) {
        onResult(
          result.recognizedWords,
          result.finalResult,
        );
      },
      listenOptions: SpeechListenOptions(
        localeId: localeId,
        partialResults: true,
        cancelOnError: true,
        listenMode: ListenMode.dictation,
      ),
      onSoundLevelChange: null,
    );
  }

  static Future<void> stopListening() async {
    await _speech.stop();
  }

  static Future<void> cancelListening() async {
    await _speech.cancel();
  }

  static Future<void> translateAndSpeak({
    required String text,
    required TranslateLanguage sourceLanguage,
    required TranslateLanguage targetLanguage,
    required String ttsLanguage,
  }) async {
    if (text.trim().isEmpty) {
      return;
    }

    await _prepareTranslator(
      sourceLanguage,
      targetLanguage,
    );

    final translatedText =
        await _translator!.translateText(text);

    await _tts.setLanguage(ttsLanguage);
    await _tts.speak(translatedText);
  }

  static Future<String> translate({
    required String text,
    required TranslateLanguage sourceLanguage,
    required TranslateLanguage targetLanguage,
  }) async {
    if (text.trim().isEmpty) {
      return '';
    }

    await _prepareTranslator(
      sourceLanguage,
      targetLanguage,
    );

    return _translator!.translateText(text);
  }

  static Future<void> speak({
    required String text,
    required String language,
  }) async {
    if (text.trim().isEmpty) {
      return;
    }

    await _tts.setLanguage(language);
    await _tts.speak(text);
  }

  static Future<void> stopSpeaking() async {
    await _tts.stop();
  }

  static Future<void> _prepareTranslator(
    TranslateLanguage sourceLanguage,
    TranslateLanguage targetLanguage,
  ) async {
    if (sourceLanguage == targetLanguage) {
      await _translator?.close();
      _translator = null;
      return;
    }

    final modelManager =
        OnDeviceTranslatorModelManager();

    await modelManager.downloadModel(
      sourceLanguage.bcpCode,
    );

    await modelManager.downloadModel(
      targetLanguage.bcpCode,
    );

    await _translator?.close();

    _translator = OnDeviceTranslator(
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
    );
  }

  static Future<void> dispose() async {
    await _speech.cancel();
    await _tts.stop();
    await _translator?.close();
    _translator = null;
  }
}