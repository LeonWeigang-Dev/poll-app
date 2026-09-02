import { Injectable, inject } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { CreatePollInput, Poll, PollQuestion } from '../models/poll.model';
import { SupabaseService } from './supabase.service';

export interface VoteSelection {
  questionId: string;
  optionIds: string[];
}

interface VoteRow { id: string; }
interface OptionRow {
  id: string;
  text: string;
  position: number;
  votes?: VoteRow[];
}
interface QuestionRow {
  id: string;
  text: string;
  position: number;
  allow_multiple: boolean;
  options?: OptionRow[];
}
interface SurveyRow {
  id: string;
  title: string;
  category: string;
  description: string | null;
  end_date: string | null;
  created_at: string;
  questions?: QuestionRow[];
}

@Injectable({ providedIn: 'root' })
export class PollRepository {
  private readonly supabase = inject(SupabaseService);

  async getPolls(): Promise<Poll[]> {
    if (!this.supabase.client) return this.demoPolls();
    const { data, error } = await this.queryPolls();
    if (error) throw error;
    return (data as SurveyRow[] | null ?? []).map((row) => this.mapPoll(row));
  }

  async getPoll(id: string): Promise<Poll | null> {
    if (!this.supabase.client) return this.findDemoPoll(id);
    const { data, error } = await this.queryPoll(id);
    if (error) throw error;
    return data ? this.mapPoll(data as SurveyRow) : null;
  }

  async createPoll(input: CreatePollInput): Promise<Poll> {
    if (!this.supabase.client) return this.createDemoPoll(input);
    const survey = await this.insertSurvey(input);
    await this.insertQuestions(survey.id, input.questions);
    return this.getCreatedPoll(survey.id);
  }

  async submitVotes(
    surveyId: string,
    selections: VoteSelection[],
    voterId: string,
  ): Promise<void> {
    if (!this.supabase.client) return;
    const rows = this.voteRows(surveyId, selections, voterId);
    const { error } = await this.supabase.client.from('votes').insert(rows);
    if (error) throw error;
  }

  subscribeToVotes(surveyId: string, refresh: () => void): RealtimeChannel | null {
    if (!this.supabase.client) return null;
    return this.supabase.client
      .channel(`survey-votes-${surveyId}`)
      .on('postgres_changes', this.voteChangeFilter(surveyId), refresh)
      .subscribe();
  }

  async removeChannel(channel: RealtimeChannel | null): Promise<void> {
    if (!channel || !this.supabase.client) return;
    await this.supabase.client.removeChannel(channel);
  }

  private queryPolls() {
    return this.supabase.client!
      .from('surveys')
      .select('*, questions(*, options(*, votes(*)))')
      .order('end_date', { ascending: true, nullsFirst: false });
  }

  private queryPoll(id: string) {
    return this.supabase.client!
      .from('surveys')
      .select('*, questions(*, options(*, votes(*)))')
      .eq('id', id)
      .maybeSingle();
  }

  private async getCreatedPoll(id: string): Promise<Poll> {
    const poll = await this.getPoll(id);
    if (!poll) throw new Error('Survey could not be loaded after creation.');
    return poll;
  }

  private async insertSurvey(input: CreatePollInput): Promise<{ id: string }> {
    const { data, error } = await this.supabase.client!
      .from('surveys')
      .insert({
        title: input.title,
        category: input.category,
        description: input.description || null,
        end_date: input.endDate,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data;
  }

  private async insertQuestions(
    surveyId: string,
    questions: CreatePollInput['questions'],
  ): Promise<void> {
    for (const [index, question] of questions.entries()) {
      const id = await this.insertQuestion(surveyId, question, index);
      await this.insertOptions(id, question.answers);
    }
  }

  private async insertQuestion(
    surveyId: string,
    question: CreatePollInput['questions'][number],
    position: number,
  ): Promise<string> {
    const { data, error } = await this.supabase.client!
      .from('questions')
      .insert({ survey_id: surveyId, text: question.text, position, allow_multiple: question.allowMultiple })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  private async insertOptions(questionId: string, answers: string[]): Promise<void> {
    const rows = answers.map((text, position) => ({ question_id: questionId, text, position }));
    const { error } = await this.supabase.client!.from('options').insert(rows);
    if (error) throw error;
  }

  private voteRows(surveyId: string, selections: VoteSelection[], voterId: string) {
    return selections.flatMap((selection) => selection.optionIds.map((optionId) => ({
      survey_id: surveyId,
      question_id: selection.questionId,
      option_id: optionId,
      voter_id: voterId,
    })));
  }

  private voteChangeFilter(surveyId: string) {
    return { event: '*', schema: 'public', table: 'votes', filter: `survey_id=eq.${surveyId}` } as const;
  }

  private mapPoll(row: SurveyRow): Poll {
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      description: row.description ?? '',
      endDate: row.end_date,
      createdAt: row.created_at,
      questions: this.mapQuestions(row.questions ?? []),
    };
  }

  private mapQuestions(questions: QuestionRow[]): PollQuestion[] {
    return [...questions].sort((a, b) => a.position - b.position).map((question) => ({
      id: question.id,
      text: question.text,
      allowMultiple: question.allow_multiple ?? false,
      answers: this.mapAnswers(question.options ?? []),
    }));
  }

  private mapAnswers(options: OptionRow[]) {
    return [...options]
      .sort((a, b) => a.position - b.position)
      .map((option) => ({ id: option.id, text: option.text, votes: option.votes?.length ?? 0 }));
  }

  private findDemoPoll(id: string): Poll | null {
    return this.demoPolls().find((poll) => poll.id === id) ?? null;
  }

  private demoPolls(): Poll[] {
    return [
      this.demoPoll('1', 'Let’s Plan the Next Team Event Together', 'Team activities', 1),
      this.demoPoll('2', 'Fit & wellness survey!', 'Healthy Lifestyle', 2),
      this.demoPoll('3', 'Gaming habits and favorite games!', 'Gaming', 3),
      this.demoPoll('4', 'Healthier future: Fit & wellness survey!', 'Healthy Lifestyle', -2),
      this.demoPoll('5', 'Community ideas for the next meetup', 'Community', -4),
    ];
  }

  private demoPoll(id: string, title: string, category: string, days: number): Poll {
    return {
      id,
      title,
      category,
      description: 'We want to create an easy way for everyone to share their preferences and ideas.',
      endDate: this.demoEnd(days),
      createdAt: new Date().toISOString(),
      questions: this.demoQuestions(id),
    };
  }

  private demoEnd(days: number): string {
    return new Date(Date.now() + days * 86_400_000).toISOString();
  }

  private demoQuestions(id: string): PollQuestion[] {
    return [
      this.demoQuestion(`${id}-q1`, 'Which date would work best for you?', false, ['19.09.2025, Friday', '10.10.2025, Friday', '11.10.2025, Saturday', '31.10.2025, Friday'], [27, 43, 9, 21]),
      this.demoQuestion(`${id}-q2`, 'Choose the activities you prefer', true, ['Outdoor adventure like kayaking', 'Office Costume Party', 'B.C. Bowling & Music', 'Beach party, Music & cocktails', 'Escape Room'], [0, 0, 50, 12, 38]),
      this.demoQuestion(`${id}-q3`, 'What’s most important to you in a team event?', false, ['Team bonding', 'Food and drinks', 'Trying something new', 'Keeping it low-key and stress-free'], [44, 29, 9, 17]),
      this.demoQuestion(`${id}-q4`, 'How long would you prefer the event to last?', false, ['Half-day', 'Full day', 'Evening only'], [14, 68, 18]),
    ];
  }

  private demoQuestion(id: string, text: string, allowMultiple: boolean, answers: string[], votes: number[]): PollQuestion {
    return { id, text, allowMultiple, answers: this.demoAnswers(`${id}-a`, answers, votes) };
  }

  private demoAnswers(prefix: string, texts: string[], votes: number[]) {
    return texts.map((text, index) => ({ id: `${prefix}-${index}`, text, votes: votes[index] ?? 0 }));
  }

  private createDemoPoll(input: CreatePollInput): Poll {
    return {
      id: crypto.randomUUID(),
      title: input.title,
      category: input.category,
      description: input.description,
      endDate: input.endDate,
      createdAt: new Date().toISOString(),
      questions: this.createDemoQuestions(input.questions),
    };
  }

  private createDemoQuestions(questions: CreatePollInput['questions']): PollQuestion[] {
    return questions.map((question) => ({
      id: crypto.randomUUID(),
      text: question.text,
      allowMultiple: question.allowMultiple,
      answers: question.answers.map((text) => ({ id: crypto.randomUUID(), text, votes: 0 })),
    }));
  }
}
