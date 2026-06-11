// 音频播放工具 - iOS Safari兼容版本
class AudioService {
  constructor() {
    this.audioContext = null;
    this.sounds = {};
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  // 初始化音频上下文 - iOS Safari需要特殊处理
  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // iOS Safari需要手动激活AudioContext
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // 播放单词发音（使用Web Speech API）
  speakWord(word, lang = 'en-US') {
    return new Promise((resolve) => {
      // 确保初始化 AudioContext（iOS 需要）
      this.init();

      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      // iOS Safari 特殊处理
      if (this.isIOS) {
        this.speakOnIOS(word, lang, resolve);
      } else {
        this.speakOnOther(word, lang, resolve);
      }
    });
  }

  // iOS Safari 专用播放方法
  speakOnIOS(word, lang, resolve) {
    // 先取消之前的发音
    window.speechSynthesis.cancel();

    // 创建 utterance
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = lang;
    utterance.rate = 0.8;
    utterance.pitch = 1.2; // 稍高一点的音调，更像女声
    utterance.volume = 1;

    // 尝试获取女声语音
    const voices = window.speechSynthesis.getVoices();
    // 优先选择女声
    const femaleVoice = voices.find(v =>
      v.lang.startsWith(lang.split('-')[0]) &&
      (v.name.includes('Female') || v.name.includes('female') || v.name.includes('woman'))
    );
    const targetVoice = femaleVoice || voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    // iOS Safari 多种方法尝试
    // 方法1：直接播放
    window.speechSynthesis.speak(utterance);

    // 方法2：如果没有播放，尝试 pause/resume
    setTimeout(() => {
      if (!window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 100);

    // 方法3：如果还是没有播放，重新触发
    setTimeout(() => {
      if (!window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        const utterance2 = new SpeechSynthesisUtterance(word);
        utterance2.lang = lang;
        utterance2.rate = 0.8;
        utterance2.pitch = 1.2;
        utterance2.onend = () => resolve();
        utterance2.onerror = () => resolve();
        window.speechSynthesis.speak(utterance2);
      }
    }, 300);

    // 超时保护
    setTimeout(resolve, 6000);
  }

  // 其他浏览器播放方法
  speakOnOther(word, lang, resolve) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = lang;
    utterance.rate = 0.8;
    utterance.pitch = 1.2; // 稍高一点的音调，更像女声
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    // 优先选择女声
    const femaleVoice = voices.find(v =>
      v.lang.startsWith(lang.split('-')[0]) &&
      (v.name.includes('Female') || v.name.includes('female') || v.name.includes('woman'))
    );
    const targetVoice = femaleVoice || voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  }

  // 播放正确音效
  playCorrect() {
    try {
      this.init();
      if (this.audioContext && this.audioContext.state === 'running') {
        this.playTone(523.25, 0.1, 'sine'); // C5
        setTimeout(() => this.playTone(659.25, 0.1, 'sine'), 100); // E5
        setTimeout(() => this.playTone(783.99, 0.15, 'sine'), 200); // G5
      }
    } catch (e) {
      console.log('playCorrect error:', e);
    }
  }

  // 播放错误音效
  playWrong() {
    try {
      this.init();
      if (this.audioContext && this.audioContext.state === 'running') {
        this.playTone(200, 0.2, 'square');
        setTimeout(() => this.playTone(150, 0.3, 'square'), 150);
      }
    } catch (e) {
      console.log('playWrong error:', e);
    }
  }

  // 播放音调
  playTone(frequency, duration, type = 'sine') {
    if (!this.audioContext || this.audioContext.state !== 'running') {
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      console.log('playTone error:', e);
    }
  }

  // 播放表扬声音（连连看完成时）
  speakPraise(username = '小朋友') {
    const text = `${username}，你真棒！`;
    return this.speakWord(text, 'zh-CN');
  }

  // 播放掌声音效
  playApplause() {
    try {
      this.init();
      if (this.audioContext && this.audioContext.state === 'running') {
        // 模拟掌声：快速交替的短促音
        for (let i = 0; i < 12; i++) {
          setTimeout(() => {
            this.playTone(800 + Math.random() * 400, 0.08, 'square');
            this.playTone(600 + Math.random() * 300, 0.06, 'sawtooth');
          }, i * 80);
        }
      }
    } catch (e) {
      console.log('playApplause error:', e);
    }
  }

  // 播放表扬语音（女声 + 掌声）
  async playPraiseWithApplause(username = '小朋友') {
    // 先播放掌声
    this.playApplause();
    // 然后播放表扬语音
    await this.speakPraise(username);
  }
}

export const audioService = new AudioService();
export default audioService;