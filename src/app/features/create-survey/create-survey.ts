import { Component, inject, output } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CreateQuestionInput, POLL_CATEGORIES } from '../../core/models/poll.model';
import { PollStoreService } from '../../core/services/poll-store.service';

type QuestionGroup = FormGroup<{
  text: FormControl<string>;
  allowMultiple: FormControl<boolean>;
  answers: FormArray<FormControl<string>>;
}>;

@Component({
  selector: 'app-create-survey',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})
export class CreateSurveyComponent {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(PollStoreService);
  readonly closed = output<void>();
  readonly published = output<void>();
  readonly categories = POLL_CATEGORIES;
  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(80)]],
    category: ['Team activities', Validators.required],
    endDate: ['', this.futureDateValidator],
    description: ['', Validators.maxLength(500)],
    questions: this.fb.array([this.questionGroup()]),
  });
  saving = false;

  constructor() { this.store.clearError(); }

  get questions(): FormArray<QuestionGroup> { return this.form.controls.questions; }

  questionGroup(): QuestionGroup {
    return this.fb.nonNullable.group({
      text: ['', [Validators.required, Validators.maxLength(180)]],
      allowMultiple: [false],
      answers: this.fb.array([this.answerControl(), this.answerControl(), this.answerControl()]),
    });
  }

  answerControl(): FormControl<string> {
    return this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]);
  }

  answerControls(index: number): FormArray<FormControl<string>> {
    return this.questions.at(index).controls.answers;
  }
  addQuestion(): void { this.questions.push(this.questionGroup()); }

  addAnswer(questionIndex: number): void {
    const answers = this.answerControls(questionIndex);
    if (answers.length < 6) answers.push(this.answerControl());
  }

  removeQuestion(index: number): void {
    if (this.questions.length > 1) this.questions.removeAt(index);
  }

  removeAnswer(questionIndex: number, answerIndex: number): void {
    const answers = this.answerControls(questionIndex);
    if (answers.length > 2) answers.removeAt(answerIndex);
  }

  async publish(): Promise<void> {
    if (this.form.invalid || this.saving) return this.validateForm();
    this.store.clearError();
    this.saving = true;
    const input = this.toInput();
    const result = await this.store.create(input);
    this.saving = false;
    if (result) this.published.emit();
  }

  trackQuestion(index: number): number { return index; }

  private validateForm(): void {
    this.form.markAllAsTouched();
  }

  private toInput() {
    const value = this.form.getRawValue();
    return {
      title: value.title.trim(),
      category: value.category,
      endDate: value.endDate || null,
      description: value.description?.trim() ?? '',
      questions: this.mapQuestions(value.questions),
    };
  }

  private mapQuestions(questions: ReturnType<typeof this.form.getRawValue>['questions']): CreateQuestionInput[] {
    return questions.map((question) => ({
      text: question.text.trim(),
      allowMultiple: question.allowMultiple,
      answers: question.answers.map((answer, index) => ({
        label: answer.trim(),
        sort_number: index
      })),
    }));
  }

  private futureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    return new Date(`${control.value}T23:59:59`).getTime() > Date.now() ? null : { pastDate: true };
  }
}
