import { Injectable, inject } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { CreatePollInput, Poll } from '../models/poll.model';
import { SupabaseService } from './supabase.service';

export interface VoteSelection {
  questionId: string;
  optionId: string;
}

interface VoteRow { id: string; }
interface OptionRow { id: string; text: string; position: number; votes?: VoteRow[]; }
interface QuestionRow { id: string; text: string; position: number; options?: OptionRow[]; }
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
    const { data, error } = await this.supabase.client
      .from('surveys')
      .select('*, questions(*, options(*, votes(*)))')
      .order('end_date', { ascending: true });
    if (error) throw error;
    return (data as SurveyRow[] | null ?? []).map((row) => this.mapPoll(row));
  }

  async getPoll(id: string): Promise<Poll | null> {
    if (!this.supabase.client) return this.findDemoPoll(id);
    const { data, error } = await this.supabase.client
      .from('surveys')
      .select('*, questions(*, options(*, votes(*)))')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapPoll(data as SurveyRow) : null;
  }

  async createPoll(input: CreatePollInput): Promise<Poll> {
    if (!this.supabase.client) return this.createDemoPoll(input);
    const survey = await this.insertSurvey(input);
    await this.insertQuestions(survey.id, input.questions);
    const created = await this.getPoll(survey.id);
    if (!created) throw new Error('Survey could not be loaded after creation.');
    return created;
  }

  async submitVotes(surveyId: string, selections: VoteSelection[], voterId: string): Promise<void> {
    if (!this.supabase.client) return;
    const rows = selections.map((selection) => ({
      survey_id: surveyId,
      question_id: selection.questionId,
      option_id: selection.optionId,
      voter_id: voterId,
    }));
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
    if (channel && this.supabase.client) await this.supabase.client.removeChannel(channel);
  }

  private async insertSurvey(input: CreatePollInput): Promise<{ id: string }> {
    const { data, error } = await this.supabase.client!
      .from('surveys')
      .insert({ title: input.title, category: input.category, description: input.description, end_date: input.endDate })
      .select('id')
      .single();
    if (error) throw error;
    return data;
  }

  private async insertQuestions(surveyId: string, questions: CreatePollInput['questions']): Promise<void> {
    for (const [questionIndex, question] of questions.entries()) {
      const questionId = await this.insertQuestion(surveyId, question.text, questionIndex);
      await this.insertOptions(questionId, question.answers);
    }
  }

  private async insertQuestion(surveyId: string, text: string, position: number): Promise<string> {
    const { data, error } = await this.supabase.client!
      .from('questions')
      .insert({ survey_id: surveyId, text, position })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  private async insertOptions(questionId: string, answers: string[]): Promise<void> {
    const rows = answers.map((text, index) => ({ question_id: questionId, text, position: index }));
    const { error } = await this.supabase.client!.from('options').insert(rows);
    if (error) throw error;
  }

  private voteChangeFilter(surveyId: string) {
    return { event: '*', schema: 'public', table: 'votes', filter: `survey_id=eq.${surveyId}` } as const;
  }

  private findDemoPoll(id: string): Poll | null {
    return this.demoPolls().find((poll) => poll.id === id) ?? null;
  }

  private mapPoll(row: SurveyRow): Poll {
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      description: row.description ?? '',
      endDate: row.end_date ?? null,
      createdAt: row.created_at,
      questions: this.mapQuestions(row.questions ?? []),
    };
  }

  private mapQuestions(questions: QuestionRow[]): Poll['questions'] {
    return [...questions]
      .sort((a, b) => a.position - b.position)
      .map((question) => ({
        id: question.id,
        text: question.text,
        answers: (question.options ?? []).sort((a, b) => a.position - b.position).map((option) => ({
          id: option.id,
          text: option.text,
          votes: option.votes?.length ?? 0,
        })),
      }));
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
      id, title, category, description: 'We want to create an easy way for everyone to share their preferences and ideas.',
      endDate: this.demoEnd(days), createdAt: new Date().toISOString(), questions: this.demoQuestions(id),
    };
  }

  private demoEnd(days: number): string {
    return new Date(Date.now() + days * 86_400_000).toISOString();
  }

  private demoQuestions(id: string): Poll['questions'] {
    return [
      { id: `${id}-q1`, text: 'Which date would work best for you?', answers: this.demoAnswers(`${id}-a`, ['19.09.2025, Friday', '10.10.2025, Friday', '11.10.2025, Saturday', '31.10.2025, Friday'], [27, 43, 9, 21]) },
      { id: `${id}-q2`, text: 'Choose the activities you prefer', answers: this.demoAnswers(`${id}-b`, ['Outdoor adventure like kayaking', 'Office Costume Party', 'B.C. Bowling & Music', 'Beach party, Music & cocktails', 'Escape Room'], [0, 0, 50, 12, 38]) },
      { id: `${id}-q3`, text: 'What’s most important to you in a team event?', answers: this.demoAnswers(`${id}-c`, ['Team bonding', 'Food and drinks', 'Trying something new', 'Keeping it low-key and stress-free'], [44, 29, 9, 17]) },
      { id: `${id}-q4`, text: 'How long would you prefer the event to last?', answers: this.demoAnswers(`${id}-d`, ['Half-day', 'Full day', 'Evening only'], [14, 68, 17]) },
    ];
  }

  private demoAnswers(prefix: string, texts: string[], votes: number[]) {
    return texts.map((text, index) => ({ id: `${prefix}-${index}`, text, votes: votes[index] }));
  }

  private createDemoPoll(input: CreatePollInput): Poll {
    return {
      id: crypto.randomUUID(), title: input.title, category: input.category, description: input.description,
      endDate: input.endDate, createdAt: new Date().toISOString(), questions: this.createDemoQuestions(input),
    };
  }

  private createDemoQuestions(input: CreatePollInput): Poll['questions'] {
    return input.questions.map((question) => ({
      id: crypto.randomUUID(), text: question.text,
      answers: question.answers.map((text) => ({ id: crypto.randomUUID(), text, votes: 0 })),
    }));
  }
}
