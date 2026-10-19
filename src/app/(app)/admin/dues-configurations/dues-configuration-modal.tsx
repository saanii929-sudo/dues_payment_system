"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/finance/money";
import { cn } from "@/utils/cn";
import { createDuesConfigurationAction, updateDuesConfigurationAction } from "./actions";
import type { PaymentPeriodSummary } from "@/services/payment-period.service";
import type { FacultySummary } from "@/services/faculty.service";
import type { DepartmentSummary } from "@/services/department.service";
import type { AcademicLevelSummary } from "@/services/academic-level.service";
import type { StudentCategorySummary } from "@/services/student-category.service";
import type { DuesConfigurationSummary } from "@/services/dues-configuration.service";

const selectClassName =
  "flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const STEPS = ["Scope", "Details", "Review"] as const;

interface FormState {
  paymentPeriodId: string;
  facultyId: string;
  departmentId: string;
  academicLevelId: string;
  studentCategoryId: string;
  name: string;
  code: string;
  amount: string;
  effectiveDate: string;
  isMandatory: boolean;
}

function emptyState(): FormState {
  return {
    paymentPeriodId: "",
    facultyId: "",
    departmentId: "",
    academicLevelId: "",
    studentCategoryId: "",
    name: "",
    code: "",
    amount: "",
    effectiveDate: "",
    isMandatory: true,
  };
}

function stateFromExisting(config: DuesConfigurationSummary): FormState {
  return {
    paymentPeriodId: config.paymentPeriodId,
    facultyId: config.facultyId ?? "",
    departmentId: config.departmentId ?? "",
    academicLevelId: config.academicLevelId ?? "",
    studentCategoryId: config.studentCategoryId ?? "",
    name: config.name,
    code: config.code,
    amount: (config.amountPesewas / 100).toFixed(2),
    effectiveDate: new Date(config.effectiveDate).toISOString().slice(0, 10),
    isMandatory: config.isMandatory,
  };
}

export interface DuesConfigurationModalProps {
  trigger: React.ReactNode;
  paymentPeriods: PaymentPeriodSummary[];
  faculties: FacultySummary[];
  departments: DepartmentSummary[];
  academicLevels: AcademicLevelSummary[];
  studentCategories: StudentCategorySummary[];
  existing?: DuesConfigurationSummary;
}

export function DuesConfigurationModal({
  trigger,
  paymentPeriods,
  faculties,
  departments,
  academicLevels,
  studentCategories,
  existing,
}: DuesConfigurationModalProps) {
  const isEdit = Boolean(existing);
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<FormState>(() =>
    existing ? stateFromExisting(existing) : emptyState(),
  );
  const [pendingAction, setPendingAction] = React.useState<"draft" | "publish" | "save" | null>(
    null,
  );
  const pending = pendingAction !== null;
  const [error, setError] = React.useState<string | null>(null);

  function resetAndClose() {
    setOpen(false);
    setStep(0);
    setError(null);
    setForm(existing ? stateFromExisting(existing) : emptyState());
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const visibleDepartments = departments.filter(
    (department) => !form.facultyId || department.facultyId === form.facultyId,
  );

  const selectedPeriod = paymentPeriods.find((p) => p.paymentPeriodId === form.paymentPeriodId);
  const selectedFaculty = faculties.find((f) => f.facultyId === form.facultyId);
  const selectedDepartment = departments.find((d) => d.departmentId === form.departmentId);
  const selectedLevel = academicLevels.find((l) => l.academicLevelId === form.academicLevelId);
  const selectedCategory = studentCategories.find(
    (c) => c.studentCategoryId === form.studentCategoryId,
  );

  const scopeValid = Boolean(form.paymentPeriodId);
  const detailsValid = Boolean(form.name.trim() && form.code.trim() && form.amount && form.effectiveDate);

  async function submit(publish: boolean) {
    setPendingAction(isEdit ? "save" : publish ? "publish" : "draft");
    setError(null);
    try {
      const payload = {
        name: form.name,
        code: form.code,
        paymentPeriodId: form.paymentPeriodId,
        amount: form.amount,
        effectiveDate: form.effectiveDate,
        facultyId: form.facultyId || undefined,
        departmentId: form.departmentId || undefined,
        academicLevelId: form.academicLevelId || undefined,
        studentCategoryId: form.studentCategoryId || undefined,
        isMandatory: form.isMandatory,
      };

      if (isEdit && existing) {
        await updateDuesConfigurationAction(existing.duesConfigurationId, payload);
      } else {
        await createDuesConfigurationAction(payload, publish);
      }
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (next) {
          setForm(existing ? stateFromExisting(existing) : emptyState());
          setStep(0);
          setError(null);
        }
        setOpen(next);
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/40" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
            "rounded-lg border border-border bg-surface p-6 shadow-lg",
          )}
        >
          <Dialog.Title className="text-base font-semibold text-ink">
            {isEdit ? "Edit dues configuration" : "New dues configuration"}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Configure who this dues charge applies to, its amount, and when it takes effect.
          </Dialog.Description>

          <ol className="mt-4 flex items-center gap-2 text-xs font-medium text-ink-muted">
            {STEPS.map((label, index) => (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                    index === step
                      ? "border-ink bg-ink text-white"
                      : index < step
                        ? "border-success bg-success-muted text-success"
                        : "border-border text-ink-muted",
                  )}
                >
                  {index + 1}
                </span>
                <span className={index === step ? "text-ink" : undefined}>{label}</span>
                {index < STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-border" />}
              </li>
            ))}
          </ol>

          <div className="mt-5 space-y-4">
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dc-paymentPeriodId">Payment period</Label>
                  <select
                    id="dc-paymentPeriodId"
                    className={selectClassName}
                    value={form.paymentPeriodId}
                    onChange={(e) => set("paymentPeriodId", e.target.value)}
                  >
                    <option value="">Select a payment period</option>
                    {paymentPeriods.map((period) => (
                      <option key={period.paymentPeriodId} value={period.paymentPeriodId}>
                        {period.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-ink-muted">
                  Leave the fields below blank to apply this charge to everyone in the period.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dc-facultyId">Faculty (optional)</Label>
                    <select
                      id="dc-facultyId"
                      className={selectClassName}
                      value={form.facultyId}
                      onChange={(e) => {
                        set("facultyId", e.target.value);
                        if (
                          form.departmentId &&
                          departments.find((d) => d.departmentId === form.departmentId)
                            ?.facultyId !== e.target.value
                        ) {
                          set("departmentId", "");
                        }
                      }}
                    >
                      <option value="">All faculties</option>
                      {faculties.map((faculty) => (
                        <option key={faculty.facultyId} value={faculty.facultyId}>
                          {faculty.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dc-departmentId">Department (optional)</Label>
                    <select
                      id="dc-departmentId"
                      className={selectClassName}
                      value={form.departmentId}
                      onChange={(e) => set("departmentId", e.target.value)}
                    >
                      <option value="">All departments</option>
                      {visibleDepartments.map((department) => (
                        <option key={department.departmentId} value={department.departmentId}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dc-academicLevelId">Academic level (optional)</Label>
                    <select
                      id="dc-academicLevelId"
                      className={selectClassName}
                      value={form.academicLevelId}
                      onChange={(e) => set("academicLevelId", e.target.value)}
                    >
                      <option value="">All levels</option>
                      {academicLevels.map((level) => (
                        <option key={level.academicLevelId} value={level.academicLevelId}>
                          {level.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dc-studentCategoryId">Student category (optional)</Label>
                    <select
                      id="dc-studentCategoryId"
                      className={selectClassName}
                      value={form.studentCategoryId}
                      onChange={(e) => set("studentCategoryId", e.target.value)}
                    >
                      <option value="">All categories</option>
                      {studentCategories.map((category) => (
                        <option key={category.studentCategoryId} value={category.studentCategoryId}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dc-name">Name</Label>
                    <Input
                      id="dc-name"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="e.g. Departmental Dues"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dc-code">Code</Label>
                    <Input
                      id="dc-code"
                      value={form.code}
                      onChange={(e) => set("code", e.target.value)}
                      placeholder="e.g. DEPT-DUES"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dc-amount">Amount (GHS)</Label>
                    <Input
                      id="dc-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => set("amount", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dc-effectiveDate">Effective date</Label>
                    <Input
                      id="dc-effectiveDate"
                      type="date"
                      value={form.effectiveDate}
                      onChange={(e) => set("effectiveDate", e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="dc-isMandatory"
                    checked={form.isMandatory}
                    onChange={(e) => set("isMandatory", e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="dc-isMandatory">Mandatory</Label>
                </div>
              </div>
            )}

            {step === 2 && (
              <dl className="space-y-2.5 rounded-md border border-border bg-surface-muted p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Payment period</dt>
                  <dd className="font-medium text-ink">{selectedPeriod?.name ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Faculty</dt>
                  <dd className="font-medium text-ink">{selectedFaculty?.name ?? "All faculties"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Department</dt>
                  <dd className="font-medium text-ink">
                    {selectedDepartment?.name ?? "All departments"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Academic level</dt>
                  <dd className="font-medium text-ink">{selectedLevel?.name ?? "All levels"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Student category</dt>
                  <dd className="font-medium text-ink">
                    {selectedCategory?.name ?? "All categories"}
                  </dd>
                </div>
                <div className="my-1 h-px bg-border" />
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Name</dt>
                  <dd className="font-medium text-ink">{form.name || "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Code</dt>
                  <dd className="font-medium text-ink">{form.code || "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Amount</dt>
                  <dd className="font-medium text-ink">
                    {form.amount ? <Money amountPesewas={Math.round(Number(form.amount) * 100)} /> : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Effective date</dt>
                  <dd className="font-medium text-ink">
                    {form.effectiveDate ? new Date(form.effectiveDate).toLocaleDateString() : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Mandatory</dt>
                  <dd className="font-medium text-ink">{form.isMandatory ? "Yes" : "No"}</dd>
                </div>
                {isEdit && existing && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Status</dt>
                    <dd className="font-medium text-ink">{existing.status}</dd>
                  </div>
                )}
              </dl>
            )}

            {error && (
              <p className="rounded-md bg-danger-muted px-3 py-2 text-sm text-danger">{error}</p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div>
              {step > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() => setStep((s) => s - 1)}
                >
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" size="sm" disabled={pending}>
                  Cancel
                </Button>
              </Dialog.Close>
              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={step === 0 ? !scopeValid : !detailsValid}
                  onClick={() => setStep((s) => s + 1)}
                >
                  Next
                </Button>
              ) : isEdit ? (
                <Button type="button" size="sm" disabled={pending} onClick={() => submit(false)}>
                  {pendingAction === "save" ? "Saving…" : "Save changes"}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() => submit(false)}
                  >
                    {pendingAction === "draft" ? "Saving…" : "Save as draft"}
                  </Button>
                  <Button type="button" size="sm" disabled={pending} onClick={() => submit(true)}>
                    {pendingAction === "publish" ? "Publishing…" : "Publish now"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
