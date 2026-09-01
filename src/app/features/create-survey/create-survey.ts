import { Component, output, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { POLL_CATEGORIES } from '../../core/models/poll.model';
import { PollStoreService } from '../../core/services/poll-store.service';

@Component({
  selector: 'app-create-survey', standalone: true, imports: [ReactiveFormsModule],
  templateUrl: './create-survey.html', styleUrl: './create-survey.scss'
})
export class CreateSurveyComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(PollStoreService);
  readonly closed = output<void>();
  readonly published = output<void>();
  readonly categories = POLL_CATEGORIES;
  readonly form = this.fb.group({ title: ['', [Validators.required, Validators.maxLength(80)]], category: ['Team activities', Validators.required], endDate: [''], description: [''], questions: this.fb.array([this.questionGroup()]) });
  readonly answersPerQuestion = 3;
  saving = false;

  get questions(): FormArray { return this.form.controls.questions; }
  questionGroup() { return this.fb.group({ text: ['', Validators.required], answers: this.fb.array([this.answerControl(), this.answerControl(), this.answerControl()]) }); }
  answerControl() { return this.fb.control('', Validators.required); }
  answerControls(index: number): FormArray { return this.questions.at(index).get('answers') as FormArray; }
  addQuestion(): void { this.questions.push(this.questionGroup()); }
  addAnswer(questionIndex: number): void { this.answerControls(questionIndex).push(this.answerControl()); }
  removeQuestion(index: number): void { if (this.questions.length > 1) this.questions.removeAt(index); }
  removeAnswer(questionIndex: number, answerIndex: number): void { const answers = this.answerControls(questionIndex); if (answers.length > 2) answers.removeAt(answerIndex); }

  async publish(): Promise<void> {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const value = this.form.getRawValue();
    const result = await this.store.create({ title: value.title!, category: value.category!, description: value.description ?? '', endDate: value.endDate || null,
      questions: value.questions.map((question) => ({ text: question.text!, answers: question.answers.filter((answer): answer is string => !!answer && answer.trim().length > 0) })) });
    this.saving = false;
    if (result) this.published.emit();
  }
}
