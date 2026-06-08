// 音频播放工具 - iOS Safari兼容版本
class AudioService {
  constructor() {
    this.audioContext = null;
    this.sounds = {};
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
    return new Promise((resolve, reject) => {
      // 确保在用户交互后调用
      this.init();

      if ('speechSynthesis' in window) {
        // 取消之前的发音
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = lang;
        utterance.rate = 0.8; // 稍慢一点，适合儿童
        utterance.pitch = 1;

        utterance.onend = () => resolve();
        utterance.onerror = (e) => reject(e);

        window.speechSynthesis.speak(utterance);
      } else {
        // 如果不支持，直接resolve
        resolve();
      }
    });
  }

  // 播放正确音效
  playCorrect() {
    try {
      this.init();
      if (this.audioContext.state === 'running') {
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
      if (this.audioContext.state === 'running') {
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

  // 播放鼓励语音
  speakEncouragement(type = 'correct') {
    const encouragements = {
      correct: ['太棒了！', '真厉害！', '非常好！', '答对了！', '你真聪明！'],
      wrong: ['再试试！', '加油！', '别灰心！', '你可以的！']
    };

    const list = encouragements[type];
    const text = list[Math.floor(Math.random() * list.length)];

    return this.speakWord(text, 'zh-CN');
  }

  // 播放表扬声音（连连看完成时）
  speakPraise(name = '易小城') {
    const text = `${name}，你真棒！`;
    return this.speakWord(text, 'zh-CN');
  }
}

export const audioService = new AudioService();
export default audioService;