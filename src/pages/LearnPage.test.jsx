import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock ProgressContext
vi.mock('../context/ProgressContext', () => ({
  useProgress: () => ({
    getUnitProgress: vi.fn(() => ({ learnedWords: [], learned: 0, total: 12, percentage: 0 })),
    updateProgress: vi.fn(),
    addWrongWord: vi.fn(),
  }),
}));

import LearnPage from '../pages/LearnPage';

// Mock audioService
vi.mock('../utils/audioService', () => ({
  default: {
    speakWord: vi.fn().mockResolvedValue(undefined),
    playCorrect: vi.fn(),
    playWrong: vi.fn(),
  },
}));

import audioService from '../utils/audioService';
const mockSpeakWord = audioService.speakWord;
const mockPlayCorrect = audioService.playCorrect;
const mockPlayWrong = audioService.playWrong;

// Mock vocabularyBooks - 12个单词，分3组
vi.mock('../data/vocabularyBooks', () => ({
  vocabularyBooks: [
    {
      id: 'test-book',
      name: '测试单词本',
      units: [
        {
          id: 'test-unit',
          name: '测试单元',
          words: [
            { id: 'w1', english: 'apple', chinese: '苹果', phonetic: '/ˈæpl/', partOfSpeech: 'n.', example: 'I eat an apple.' },
            { id: 'w2', english: 'banana', chinese: '香蕉', partOfSpeech: 'n.' },
            { id: 'w3', english: 'orange', chinese: '橙子', partOfSpeech: 'n.' },
            { id: 'w4', english: 'grape', chinese: '葡萄', partOfSpeech: 'n.' },
            { id: 'w5', english: 'watermelon', chinese: '西瓜', partOfSpeech: 'n.' },
            { id: 'w6', english: 'strawberry', chinese: '草莓', partOfSpeech: 'n.' },
            { id: 'w7', english: 'peach', chinese: '桃子', partOfSpeech: 'n.' },
            { id: 'w8', english: 'pear', chinese: '梨', partOfSpeech: 'n.' },
            { id: 'w9', english: 'cherry', chinese: '樱桃', partOfSpeech: 'n.' },
            { id: 'w10', english: 'mango', chinese: '芒果', partOfSpeech: 'n.' },
            { id: 'w11', english: 'lemon', chinese: '柠檬', partOfSpeech: 'n.' },
            { id: 'w12', english: 'kiwi', chinese: '猕猴桃', partOfSpeech: 'n.' },
          ],
        },
      ],
    },
  ],
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderLearnPage(bookId = 'test-book', unitId = 'test-unit') {
  return render(
    <MemoryRouter initialEntries={[`/learn/${bookId}/${unitId}`]}>
      <Routes>
        <Route path="/learn/:bookId/:unitId" element={<LearnPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('LearnPage', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('学习阶段', () => {
    it('应该显示单元名称', async () => {
      renderLearnPage();
      await waitFor(() => expect(screen.getByText('测试单元')).toBeInTheDocument());
    });

    it('应该显示单词和释义', async () => {
      renderLearnPage();
      await waitFor(() => {
        expect(screen.getByText(/apple/)).toBeInTheDocument();
        expect(screen.getByText('苹果')).toBeInTheDocument();
      });
    });

    it('应该显示单词进度', async () => {
      renderLearnPage();
      await waitFor(() => expect(screen.getByText('1 / 12')).toBeInTheDocument());
    });

    it('最后一个单词时显示即将测试提示', async () => {
      const user = userEvent.setup();
      renderLearnPage();
      await waitFor(() => expect(screen.getByText(/apple/)).toBeInTheDocument());

      for (let i = 0; i < 4; i++) {
        await user.click(screen.getByRole('button', { name: '下一个' }));
      }
      await waitFor(() => expect(screen.getByText(/将自动进入测试/)).toBeInTheDocument());
    });
  });

  describe('自动进入测试', () => {
    it('学完最后一个单词后自动进入测试', async () => {
      const user = userEvent.setup();
      renderLearnPage();
      await waitFor(() => expect(screen.getByText(/apple/)).toBeInTheDocument());

      for (let i = 0; i < 4; i++) {
        await user.click(screen.getByRole('button', { name: '下一个' }));
      }

      await waitFor(() => expect(screen.getByText('测试')).toBeInTheDocument(), { timeout: 3000 });
    });
  });

  describe('测试阶段', () => {
    it('应该显示选择题界面', async () => {
      const user = userEvent.setup();
      renderLearnPage();
      await waitFor(() => expect(screen.getByText(/apple/)).toBeInTheDocument());

      for (let i = 0; i < 4; i++) {
        await user.click(screen.getByRole('button', { name: '下一个' }));
      }
      await waitFor(() => expect(screen.getByText(/测试/)).toBeInTheDocument(), { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText('苹果')).toBeInTheDocument();
      });
    });

    it('选择正确答案应该播放正确音效', async () => {
      const user = userEvent.setup();
      renderLearnPage();
      await waitFor(() => expect(screen.getByText(/apple/)).toBeInTheDocument());

      for (let i = 0; i < 4; i++) {
        await user.click(screen.getByRole('button', { name: '下一个' }));
      }
      await waitFor(() => expect(screen.getByText('苹果')).toBeInTheDocument(), { timeout: 3000 });

      mockPlayCorrect.mockClear();
      await user.click(screen.getByText('苹果'));
      expect(mockPlayCorrect).toHaveBeenCalled();
    });

    it('选择错误答案应该播放错误音效', async () => {
      const user = userEvent.setup();
      renderLearnPage();
      await waitFor(() => expect(screen.getByText(/apple/)).toBeInTheDocument());

      for (let i = 0; i < 4; i++) {
        await user.click(screen.getByRole('button', { name: '下一个' }));
      }
      await waitFor(() => expect(screen.getByText('苹果')).toBeInTheDocument(), { timeout: 3000 });

      mockPlayWrong.mockClear();
      // 找一个错误选项
      const wrongOptions = ['香蕉', '橙子', '葡萄', '西瓜', '草莓'];
      const wrongOption = wrongOptions.find(opt => screen.queryByText(opt));
      if (wrongOption) {
        await user.click(screen.getByText(wrongOption));
        expect(mockPlayWrong).toHaveBeenCalled();
      }
    });
  });

  describe('批次流程', () => {
    it('应该显示单元名称', async () => {
      renderLearnPage();
      await waitFor(() => expect(screen.getByText('测试单元')).toBeInTheDocument());
    });

    it('应该显示单词进度', async () => {
      renderLearnPage();
      await waitFor(() => expect(screen.getByText(/1 \/ 12/)).toBeInTheDocument());
    });
  });

  describe('错误状态', () => {
    it('找不到书本时显示错误', async () => {
      renderLearnPage('invalid-book', 'test-unit');
      await waitFor(() => expect(screen.getByText('找不到该单词本或单元')).toBeInTheDocument());
    });

    it('找不到单元时显示错误', async () => {
      renderLearnPage('test-book', 'invalid-unit');
      await waitFor(() => expect(screen.getByText('找不到该单词本或单元')).toBeInTheDocument());
    });
  });
});