export interface Poll {
  id: string;
  title: string;
  category: string;
  description: string;
  deadline: string | null;
  createdAt: string;
  questions: PollQuestion[];
}

export interface PollQuestion {
  id: string;
  text: string;
  answers: PollAnswer[];
}

export interface PollAnswer {
  id: string;
  text: string;
  votes: number;
}

export interface CreatePollInput {
  title: string;
  category: string;
  description: string;
  deadline: string | null;
  questions: CreateQuestionInput[];
}

export interface CreateQuestionInput {
  text: string;
  answers: string[];
}

export const POLL_CATEGORIES = [
  'Team activities',
  'Gaming',
  'Healthy Lifestyle',
  'Community',
  'Entertainment',
];
