import 'package:flutter/material.dart';
import 'package:google_mlkit_translation/google_mlkit_translation.dart';

import '../../services/voice_translation_service.dart';

class VoiceTranslatorScreen extends StatefulWidget {
  const VoiceTranslatorScreen({super.key});

  @override
  State<VoiceTranslatorScreen> createState() =>
      _VoiceTranslatorScreenState();
}

class _VoiceTranslatorScreenState
    extends State<VoiceTranslatorScreen> {
  TranslateLanguage _sourceLanguage =
      TranslateLanguage.english;

  TranslateLanguage _targetLanguage =
      TranslateLanguage.hindi;

  String _sourceText = '';
  String _translatedText = '';

  bool _isInitializing = true;
  bool _isListening = false;
  bool _isTranslating = false;

  String _status = 'Initializing translator...';

  final Map<TranslateLanguage, String> _languageNames = {
    TranslateLanguage.english: 'English',
    TranslateLanguage.hindi: 'Hindi',
    TranslateLanguage.bengali: 'Bengali',
    TranslateLanguage.gujarati: 'Gujarati',
    TranslateLanguage.kannada: 'Kannada',
    TranslateLanguage.marathi: 'Marathi',
    TranslateLanguage.tamil: 'Tamil',
    TranslateLanguage.telugu: 'Telugu',
    TranslateLanguage.urdu: 'Urdu',
    TranslateLanguage.arabic: 'Arabic',
    TranslateLanguage.french: 'French',
    TranslateLanguage.german: 'German',
    TranslateLanguage.spanish: 'Spanish',
  };

  final Map<TranslateLanguage, String> _speechLocales = {
    TranslateLanguage.english: 'en-US',
    TranslateLanguage.hindi: 'hi-IN',
    TranslateLanguage.bengali: 'bn-IN',
    TranslateLanguage.gujarati: 'gu-IN',
    TranslateLanguage.kannada: 'kn-IN',
    TranslateLanguage.marathi: 'mr-IN',
    TranslateLanguage.tamil: 'ta-IN',
    TranslateLanguage.telugu: 'te-IN',
    TranslateLanguage.urdu: 'ur-IN',
    TranslateLanguage.arabic: 'ar-SA',
    TranslateLanguage.french: 'fr-FR',
    TranslateLanguage.german: 'de-DE',
    TranslateLanguage.spanish: 'es-ES',
  };

  final Map<TranslateLanguage, String> _ttsLocales = {
    TranslateLanguage.english: 'en-US',
    TranslateLanguage.hindi: 'hi-IN',
    TranslateLanguage.bengali: 'bn-IN',
    TranslateLanguage.gujarati: 'gu-IN',
    TranslateLanguage.kannada: 'kn-IN',
    TranslateLanguage.marathi: 'mr-IN',
    TranslateLanguage.tamil: 'ta-IN',
    TranslateLanguage.telugu: 'te-IN',
    TranslateLanguage.urdu: 'ur-IN',
    TranslateLanguage.arabic: 'ar-SA',
    TranslateLanguage.french: 'fr-FR',
    TranslateLanguage.german: 'de-DE',
    TranslateLanguage.spanish: 'es-ES',
  };

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    try {
      await VoiceTranslationService.initialize();

      if (!mounted) return;

      setState(() {
        _isInitializing = false;
        _status = VoiceTranslationService.isSpeechAvailable
            ? 'Ready — tap the microphone and speak.'
            : 'Speech recognition is unavailable.';
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _isInitializing = false;
        _status = error.toString();
      });
    }
  }

  Future<void> _toggleListening() async {
    if (_isInitializing || _isTranslating) {
      return;
    }

    if (_isListening) {
      await VoiceTranslationService.stopListening();

      if (!mounted) return;

      setState(() {
        _isListening = false;
        _status = 'Processing your sentence...';
      });

      await _translateCurrentText();
      return;
    }

    setState(() {
      _sourceText = '';
      _translatedText = '';
      _isListening = true;
      _status = 'Listening... speak now.';
    });

    try {
      await VoiceTranslationService.startListening(
        localeId:
            _speechLocales[_sourceLanguage] ?? 'en-US',
        onResult: (text, isFinal) {
          if (!mounted) return;

          setState(() {
            _sourceText = text;

            if (isFinal) {
              _status = 'Translating...';
            }
          });
        },
      );
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _isListening = false;
        _status = 'Could not start speech recognition.';
      });
    }
  }

  Future<void> _translateCurrentText() async {
    final text = _sourceText.trim();

    if (text.isEmpty) {
      if (!mounted) return;

      setState(() {
        _status = 'No speech detected. Try again.';
      });

      return;
    }

    setState(() {
      _isTranslating = true;
      _status = 'Translating...';
    });

    try {
      final translated =
          await VoiceTranslationService.translate(
        text: text,
        sourceLanguage: _sourceLanguage,
        targetLanguage: _targetLanguage,
      );

      if (!mounted) return;

      setState(() {
        _translatedText = translated;
        _isTranslating = false;
        _status = 'Translation complete.';
      });

      await VoiceTranslationService.speak(
        text: translated,
        language:
            _ttsLocales[_targetLanguage] ?? 'en-US',
      );
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _isTranslating = false;
        _status = 'Translation failed. Please try again.';
      });
    }
  }

  Future<void> _speakTranslation() async {
    if (_translatedText.trim().isEmpty) {
      return;
    }

    await VoiceTranslationService.speak(
      text: _translatedText,
      language:
          _ttsLocales[_targetLanguage] ?? 'en-US',
    );
  }

  Future<void> _swapLanguages() async {
    if (_isListening || _isTranslating) {
      return;
    }

    setState(() {
      final oldSource = _sourceLanguage;
      _sourceLanguage = _targetLanguage;
      _targetLanguage = oldSource;

      final oldSourceText = _sourceText;
      _sourceText = _translatedText;
      _translatedText = oldSourceText;

      _status = 'Languages swapped.';
    });
  }

  String _languageName(TranslateLanguage language) {
    return _languageNames[language] ?? language.bcpCode;
  }

  @override
  void dispose() {
    VoiceTranslationService.stopListening();
    VoiceTranslationService.stopSpeaking();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Voice Translator'),
      ),
      body: SafeArea(
        child: _isInitializing
            ? const Center(
                child: CircularProgressIndicator(),
              )
            : SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Real-Time Conversation Translator',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Speak in one language and TravelBuddy will translate and speak it in the other language.',
                      style: TextStyle(
                        color: Colors.grey.shade700,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 24),

                    Row(
                      children: [
                        Expanded(
                          child: _LanguageSelector(
                            label: 'You speak',
                            value: _sourceLanguage,
                            languages: _languageNames,
                            onChanged: (value) {
                              setState(() {
                                _sourceLanguage = value;
                              });
                            },
                            languageName: _languageName,
                          ),
                        ),
                        const SizedBox(width: 10),
                        IconButton(
                          tooltip: 'Swap languages',
                          onPressed:
                              (_isListening ||
                                      _isTranslating)
                                  ? null
                                  : _swapLanguages,
                          icon: const Icon(
                            Icons.swap_horiz,
                            size: 30,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _LanguageSelector(
                            label: 'Translate to',
                            value: _targetLanguage,
                            languages: _languageNames,
                            onChanged: (value) {
                              setState(() {
                                _targetLanguage = value;
                              });
                            },
                            languageName: _languageName,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    _TranslationCard(
                      title: _languageName(_sourceLanguage),
                      text: _sourceText.isEmpty
                          ? 'Your speech will appear here...'
                          : _sourceText,
                      icon: Icons.mic_none,
                    ),

                    const SizedBox(height: 16),

                    _TranslationCard(
                      title: _languageName(_targetLanguage),
                      text: _translatedText.isEmpty
                          ? 'Translation will appear here...'
                          : _translatedText,
                      icon: Icons.translate,
                      trailing:
                          _translatedText.isEmpty
                              ? null
                              : IconButton(
                                  tooltip:
                                      'Speak translation',
                                  onPressed:
                                      _speakTranslation,
                                  icon: const Icon(
                                    Icons.volume_up,
                                  ),
                                ),
                    ),

                    const SizedBox(height: 28),

                    Center(
                      child: GestureDetector(
                        onTap: _toggleListening,
                        child: AnimatedContainer(
                          duration:
                              const Duration(
                            milliseconds: 200,
                          ),
                          width: 86,
                          height: 86,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _isListening
                                ? Colors.red
                                : Theme.of(context)
                                    .colorScheme
                                    .primary,
                            boxShadow: [
                              BoxShadow(
                                blurRadius:
                                    _isListening
                                        ? 24
                                        : 12,
                                spreadRadius:
                                    _isListening
                                        ? 5
                                        : 1,
                                color: (_isListening
                                        ? Colors.red
                                        : Theme.of(
                                            context,
                                          )
                                            .colorScheme
                                            .primary)
                                    .withValues(
                                      alpha: 0.25,
                                    ),
                              ),
                            ],
                          ),
                          child: Icon(
                            _isListening
                                ? Icons.stop
                                : Icons.mic,
                            color: Colors.white,
                            size: 40,
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 14),

                    Center(
                      child: Text(
                        _isListening
                            ? 'Tap to stop'
                            : 'Tap to speak',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),

                    const SizedBox(height: 18),

                    Center(
                      child: Text(
                        _status,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.grey.shade700,
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius:
                            BorderRadius.circular(12),
                      ),
                      child: const Row(
                        crossAxisAlignment:
                            CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.info_outline,
                            size: 20,
                          ),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'TravelBuddy uses on-device translation for supported languages. The first translation may take longer while language models are prepared.',
                              style: TextStyle(
                                fontSize: 13,
                                height: 1.4,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _LanguageSelector extends StatelessWidget {
  final String label;
  final TranslateLanguage value;
  final Map<TranslateLanguage, String> languages;
  final ValueChanged<TranslateLanguage> onChanged;
  final String Function(TranslateLanguage) languageName;

  const _LanguageSelector({
    required this.label,
    required this.value,
    required this.languages,
    required this.onChanged,
    required this.languageName,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 6),
        DropdownButtonFormField<TranslateLanguage>(
          initialValue: value,
          isExpanded: true,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            contentPadding:
                EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 10,
            ),
          ),
          items: languages.keys
              .map(
                (language) =>
                    DropdownMenuItem<TranslateLanguage>(
                  value: language,
                  child: Text(
                    languageName(language),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              )
              .toList(),
          onChanged: (language) {
            if (language != null) {
              onChanged(language);
            }
          },
        ),
      ],
    );
  }
}

class _TranslationCard extends StatelessWidget {
  final String title;
  final String text;
  final IconData icon;
  final Widget? trailing;

  const _TranslationCard({
    required this.title,
    required this.text,
    required this.icon,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.grey.shade300,
        ),
      ),
      child: Column(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              ?trailing,
            ],
          ),
          const SizedBox(height: 14),
          Text(
            text,
            style: const TextStyle(
              fontSize: 17,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}