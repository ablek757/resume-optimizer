'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

interface InterviewChatProps {
  messages: ChatMessage[];
  loading: boolean;
  finished: boolean;
  onSend: (text: string) => void;
  onFinish: () => void;
  onReview?: () => void;
}

interface SpeechRecognitionType {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

export default function InterviewChat({
  messages,
  loading,
  finished,
  onSend,
  onFinish,
  onReview,
}: InterviewChatProps) {
  const [input, setInput] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [playing, setPlaying] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speechRecognitionSupported =
    typeof window !== 'undefined' &&
    (('SpeechRecognition' in window) as boolean ||
      ('webkitSpeechRecognition' in window) as boolean);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const playTTS = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setPlaying(true);
    setVoiceError('');

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'TTS_NOT_CONFIGURED') {
          // Fallback to browser TTS
          speakWithBrowser(text.trim());
          return;
        }
        throw new Error(data.error || '语音合成失败');
      }

      if (data.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        audioRef.current = audio;
        audio.onended = () => setPlaying(false);
        audio.onerror = () => {
          setPlaying(false);
          speakWithBrowser(text.trim());
        };
        await audio.play();
      } else {
        speakWithBrowser(text.trim());
      }
    } catch (err) {
      console.error('TTS play error:', err);
      setPlaying(false);
      speakWithBrowser(text.trim());
    }
  }, []);

  const speakWithBrowser = (text: string) => {
    if (!('speechSynthesis' in window)) {
      setVoiceError('当前环境不支持语音播放');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.onstart = () => setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const stopAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
  };

  useEffect(() => {
    if (!voiceMode) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && !loading) {
      playTTS(lastMessage.content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading, voiceMode]);

  const initRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SR = (
      (window as unknown as { SpeechRecognition: SpeechRecognitionType }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition: SpeechRecognitionType }).webkitSpeechRecognition
    );
    if (!SR) return;

    const recognition: SpeechRecognitionInstance = new SR();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || '';
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      setVoiceTranscript(interimTranscript || finalTranscript);
      if (finalTranscript.trim()) {
        onSend(finalTranscript.trim());
        setVoiceTranscript('');
        setRecording(false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setVoiceError(`语音识别错误：${event.error}`);
      }
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognitionRef.current = recognition;
  }, [onSend]);

  useEffect(() => {
    if (voiceMode && speechRecognitionSupported && !recognitionRef.current) {
      initRecognition();
    }
  }, [voiceMode, speechRecognitionSupported, initRecognition]);

  const toggleRecording = () => {
    setVoiceError('');
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
    } else {
      setVoiceTranscript('');
      recognitionRef.current?.start();
      setRecording(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || finished) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex h-[600px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">模式：</span>
          <button
            onClick={() => {
              setVoiceMode(false);
              stopAudio();
            }}
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              !voiceMode ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            文字
          </button>
          <button
            onClick={() => setVoiceMode(true)}
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              voiceMode ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            语音
          </button>
        </div>
        {voiceMode && (
          <span className="text-xs text-slate-500">
            {speechRecognitionSupported ? '使用浏览器语音识别 + Qwen 语音合成' : '当前浏览器不支持语音识别'}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-4 flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              <div className="mb-1 text-xs opacity-70">
                {msg.role === 'user' ? '你' : '面试官'}
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"></div>
                面试官正在思考...
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 p-4">
        {finished ? (
          <div className="text-center">
            <p className="mb-3 text-sm text-slate-600">面试已结束</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={onFinish}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                返回准备区
              </button>
              {onReview && (
                <button
                  onClick={onReview}
                  className="rounded-lg border border-blue-300 bg-blue-50 px-5 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                  复盘本次模拟面试
                </button>
              )}
            </div>
          </div>
        ) : voiceMode ? (
          <div className="space-y-3">
            {voiceError && (
              <p className="text-center text-xs text-red-600">{voiceError}</p>
            )}
            {voiceTranscript && (
              <p className="text-center text-xs text-slate-600">
                识别中：{voiceTranscript}
              </p>
            )}
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={toggleRecording}
                disabled={loading || !speechRecognitionSupported}
                className={`flex h-14 w-14 items-center justify-center rounded-full shadow-md transition-transform active:scale-95 ${
                  recording
                    ? 'animate-pulse bg-red-500 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:cursor-not-allowed disabled:bg-slate-300`}
              >
                {recording ? (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
              {playing && (
                <button
                  type="button"
                  onClick={stopAudio}
                  className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  停止播放
                </button>
              )}
            </div>
            <p className="text-center text-xs text-slate-500">
              {recording ? '正在聆听，说完后自动发送' : '点击麦克风开始回答'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入你的回答..."
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              发送
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
