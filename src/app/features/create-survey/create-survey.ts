import { Component, inject, output, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
  private readonly router = inject(Router);
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

  readonly saving = signal(false);
  readonly showSuccessToast = signal(false);

  /**
   * Clears the previous store error when the form is created.
   */
  constructor() {
    this.store.clearError();
  }

  /**
   * Returns the question form array.
   * @returns The survey questions form array.
   */
  get questions(): FormArray<QuestionGroup> {
    return this.form.controls.questions;
  }

  /**
   * Creates a new question form group.
   * @returns A configured question form group.
   */
  questionGroup(): QuestionGroup {
    return this.fb.nonNullable.group({
      text: ['', [Validators.required, Validators.maxLength(180)]],
      allowMultiple: [false],
      answers: this.fb.array([this.answerControl(), this.answerControl(), this.answerControl()]),
    });
  }

  /**
   * Creates a validated answer form control.
   * @returns A configured answer form control.
   */
  answerControl(): FormControl<string> {
    return this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]);
  }

  /**
   * Returns the answer controls for one question.
   * @param index - The question index.
   * @returns The answer form array.
   */
  answerControls(index: number): FormArray<FormControl<string>> {
    return this.questions.at(index).controls.answers;
  }

  /**
   * Adds a new question to the survey form.
   */
  addQuestion(): void {
    this.questions.push(this.questionGroup());
  }

  /**
   * Adds an answer while respecting the maximum number of answers.
   * @param questionIndex - The question index.
   */
  addAnswer(questionIndex: number): void {
    const answers = this.answerControls(questionIndex);
    if (answers.length < 6) answers.push(this.answerControl());
  }

  /**
   * Removes a question when at least one question remains.
   * @param index - The question index.
   */
  removeQuestion(index: number): void {
    if (this.questions.length > 1) this.questions.removeAt(index);
  }

  /**
   * Removes an answer when at least two answers remain.
   * @param questionIndex - The question index.
   * @param answerIndex - The answer index.
   */
  removeAnswer(questionIndex: number, answerIndex: number): void {
    const answers = this.answerControls(questionIndex);
    if (answers.length > 2) answers.removeAt(answerIndex);
  }

  /**
   * Validates and publishes the current survey form.
   */
  async publish(): Promise<void> {
    if (this.form.invalid || this.saving()) return this.validateForm();
    this.store.clearError();
    this.saving.set(true);
    const result = await this.store.create(this.toInput());
    this.saving.set(false);
    if (result) this.handlePublishSuccess(result);
  }

  /**
   * Handles the successful survey creation flow.
   * @param result - The created survey result.
   */
  private handlePublishSuccess(result: NonNullable<Awaited<ReturnType<PollStoreService['create']>>>): void {
    this.showSuccessToast.set(true);
    setTimeout(() => void this.navigateToSurvey(result.id), 3000);
  }

  /**
   * Navigates to the created survey and emits the publish event.
   * @param surveyId - The created survey identifier.
   */
  private async navigateToSurvey(surveyId: string): Promise<void> {
    await this.router.navigate(['/survey', surveyId]);
    this.published.emit();
  }

  /**
   * Returns the current index for Angular tracking.
   * @param index - The question index.
   * @returns The supplied index.
   */
  trackQuestion(index: number): number {
    return index;
  }

  /**
   * Marks every invalid form field as touched.
   */
  private validateForm(): void {
    this.form.markAllAsTouched();
  }

  /**
   * Converts the form value into the survey creation model.
   * @returns The normalized survey input.
   */
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

  /**
   * Maps form questions to repository input data.
   * @param questions - The raw question form values.
   * @returns The normalized question inputs.
   */
  private mapQuestions(questions: ReturnType<typeof this.form.getRawValue>['questions']): CreateQuestionInput[] {
    return questions.map((question) => ({
      text: question.text.trim(),
      allowMultiple: question.allowMultiple,
      answers: question.answers.map((answer, index) => ({ label: answer.trim(), sort_number: index })),
    }));
  }

  /**
   * Validates that a selected deadline is in the future.
   * @param control - The form control containing the deadline.
   * @returns A validation error or null.
   */
  private futureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const time = new Date(`${control.value}T23:59:59`).getTime();
    return time > Date.now() ? null : { pastDate: true };
  }
}
