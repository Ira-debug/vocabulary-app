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

    // iOS 需要：先播放一个空的 utterance 来"唤醒" speechSynthesis
    const wakeUp = new SpeechSynthesisUtterance('');
    wakeUp.lang = lang;
    window.speechSynthesis.speak(wakeUp);

    // 等待一小段时间后播放真正的内容
    setTimeout(() => {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = lang;
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;

      // 尝试获取英语语音
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en'));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);

      // iOS Safari hack：强制触发播放
      // 通过暂停和恢复来确保播放
      setTimeout(() => {
        if (!window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 50);

      // 超时保护
      setTimeout(resolve, 5000);
    }, 100);
  }

  // 其他浏览器播放方法
  speakOnOther(word, lang, resolve) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = lang;
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
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
  speakPraise(name = '易小城') {
    const text = `${name}，你真棒！`;
    return this.speakWord(text, 'zh-CN');
  }
}

export const audioService = new AudioService();
export default audioService;