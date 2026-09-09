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
    category: ['', Validators.required],
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
   * Evaluates all form controls and returns the first relevant validation error message.
   * @returns The active error message or null if the form is valid/untouched.
   */
  get validationErrorMessage(): string | null {
    if (!this.form.touched) return null;

    if (this.form.controls.title.hasError('required')) {
      return 'Survey name is required.';
    }

    // Neue Überprüfung für die Kategorie
    if (this.form.controls.category.hasError('required')) {
      return 'Please choose a category.';
    }

    if (this.form.controls.endDate.hasError('pastDate')) {
      return 'End date must be in the future.';
    }

    for (let qIndex = 0; qIndex < this.questions.length; qIndex++) {
      const questionGroup = this.questions.at(qIndex);
      if (questionGroup.controls.text.hasError('required')) {
        return `Question ${qIndex + 1} title is required.`;
      }

      const answersArray = questionGroup.controls.answers;
      for (let aIndex = 0; aIndex < answersArray.length; aIndex++) {
        const answerControl = answersArray.at(aIndex);
        if (answerControl.hasError('required')) {
          const prefix = ['A', 'B', 'C', 'D', 'E', 'F'][aIndex] ?? `${aIndex + 1}`;
          return `Question ${qIndex + 1}, Answer ${prefix} is required.`;
        }
      }
    }

    return null;
  }

  /**
   * Returns the question form array.
   * @returns The survey questions form array.
   */
  get questions(): FormArray < QuestionGroup > {
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
answerControl(): FormControl < string > {
  return this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]);
}

/**
 * Returns the answer controls for one question.
 * @param index - The question index.
 * @returns The answer form array.
 */
answerControls(index: number): FormArray < FormControl < string >> {
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
  if(answers.length < 6) answers.push(this.answerControl());
}

/**
 * Removes a question when at least one question remains.
 * @param index - The question index.
 */
removeQuestion(index: number): void {
  if(this.questions.length > 1) this.questions.removeAt(index);
}

/**
 * Removes an answer when at least two answers remain.
 * @param questionIndex - The question index.
 * @param answerIndex - The answer index.
 */
removeAnswer(questionIndex: number, answerIndex: number): void {
  const answers = this.answerControls(questionIndex);
  if(answers.length > 2) answers.removeAt(answerIndex);
}

  /**
   * Validates and publishes the current survey form.
   */
  async publish(): Promise < void> {
  if(this.form.invalid || this.saving()) return this.validateForm();
  this.store.clearError();
  this.saving.set(true);
  const result = await this.store.create(this.toInput());
  this.saving.set(false);
  if(result) this.handlePublishSuccess(result);
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
  private async navigateToSurvey(surveyId: string): Promise < void> {
  await this.router.navigate(['/survey', surveyId]);
  this.published.emit();
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
  private mapQuestions(questions: ReturnType < typeof this.form.getRawValue > ['questions']): CreateQuestionInput[] {
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