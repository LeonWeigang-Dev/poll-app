import { Component, inject, output } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAX_ANSWERS, MIN_ANSWERS, POLL_CATEGORIES } from '../../core/models/poll.model';
import { PollStoreService } from '../../core/services/poll-store.service';

@Component({
  selector: 'app-create-survey',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})
export class CreateSurveyComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(PollStoreService);
  readonly closed = output<void>();
  readonly published = output<void>();
  readonly categories = POLL_CATEGORIES;
  readonly maxAnswers = MAX_ANSWERS;
  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(80)]],
    category: [POLL_CATEGORIES[0], Validators.required],
    endDate: [''],
    description: ['', Validators.maxLength(300)],
    questions: this.fb.array([this.createQuestion()]),
  });
  saving = false;

  get questions(): FormArray { return this.form.controls.questions; }

  answerControls(questionIndex: number): FormArray {
    return this.questions.at(questionIndex).get('answers') as FormArray;
  }

  addQuestion(): void { this.questions.push(this.createQuestion()); }

  addAnswer(questionIndex: number): void {
    const answers = this.answerControls(questionIndex);
    if (answers.length < MAX_ANSWERS) answers.push(this.createAnswer());
  }

  removeQuestion(index: number): void {
    if (this.questions.length > 1) this.questions.removeAt(index);
  }

  removeAnswer(questionIndex: number, answerIndex: number): void {
    const answers = this.answerControls(questionIndex);
    if (answers.length > MIN_ANSWERS) answers.removeAt(answerIndex);
  }

  hasQuestionError(index: number): boolean {
    const question = this.questions.at(index);
    return question.get('text')?.touched === true && !question.get('text')?.value?.trim();
  }

  hasAnswerError(questionIndex: number, answerIndex: number): boolean {
    const control = this.answerControls(questionIndex).at(answerIndex);
    return control.touched && !control.value?.trim();
  }

  async publish(): Promise<void> {
    if (!this.canPublish()) return this.markInvalid();
    this.saving = true;
    const result = await this.store.create(this.toCreateInput());
    this.saving = false;
    if (result) this.published.emit();
  }

  private createQuestion() {
    return this.fb.group({
      text: ['', Validators.required],
      answers: this.fb.array([this.createAnswer(), this.createAnswer()]),
    });
  }

  private createAnswer() { return this.fb.control('', Validators.required); }

  private canPublish(): boolean {
    return this.form.valid && this.questionsHaveValidAnswers() && this.endDateIsValid();
  }

  private markInvalid(): void { this.form.markAllAsTouched(); }

  private questionsHaveValidAnswers(): boolean {
    return this.questions.controls.every((question) => {
      const answers = (question.get('answers') as FormArray).controls;
      return answers.length >= MIN_ANSWERS && answers.length <= MAX_ANSWERS && answers.every((answer) => !!answer.value?.trim());
    });
  }

  endDateIsValid(): boolean {
    const value = this.form.controls.endDate.value;
    return !value || new Date(`${value}T23:59:59`).getTime() > Date.now();
  }

  private toCreateInput() {
    const value = this.form.getRawValue();
    return {
      title: value.title!.trim(), category: value.category!, description: value.description?.trim() ?? '',
      endDate: value.endDate ? new Date(`${value.endDate}T23:59:59`).toISOString() : null,
      questions: value.questions.map((question) => ({
        text: question.text!.trim(),
        answers: question.answers.map((answer) => answer?.trim() ?? ''),
      })),
    };
  }
}
