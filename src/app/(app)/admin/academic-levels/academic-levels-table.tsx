"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  deactivateAcademicLevelAction,
  reactivateAcademicLevelAction,
  moveAcademicLevelAction,
} from "./actions";
import { EditAcademicLevelForm } from "./edit-academic-level-form";
import type { AcademicLevelSummary } from "@/services/academic-level.service";

export function AcademicLevelsTable({ levels }: { levels: AcademicLevelSummary[] }) {
  if (levels.length === 0) {
    return <p className="text-sm text-ink-muted">No academic levels yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Sort order</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {levels.map((level, index) => (
          <TableRow key={level.academicLevelId}>
            <TableCell className="font-medium text-ink">{level.name}</TableCell>
            <TableCell className="text-ink-muted">{level.code}</TableCell>
            <TableCell className="text-ink-muted">
              <div className="flex items-center gap-2">
                <span>{level.sortOrder}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Move ${level.name} up`}
                    disabled={index === 0}
                    onClick={() => moveAcademicLevelAction(level.academicLevelId, "up")}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Move ${level.name} down`}
                    disabled={index === levels.length - 1}
                    onClick={() => moveAcademicLevelAction(level.academicLevelId, "down")}
                  >
                    ↓
                  </Button>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={level.isActive ? "success" : "danger"}>
                {level.isActive ? "Active" : "Deactivated"}
              </Badge>
            </TableCell>
            <TableCell className="text-right space-x-1.5">
              <EditAcademicLevelForm level={level} />
              {level.isActive ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="danger" size="sm">
                      Deactivate
                    </Button>
                  }
                  title="Deactivate this academic level?"
                  description={`${level.name} will be hidden from new assignments.`}
                  confirmLabel="Deactivate"
                  confirmVariant="danger"
                  onConfirm={() => deactivateAcademicLevelAction(level.academicLevelId)}
                />
              ) : (
                <ConfirmDialog
                  trigger={
                    <Button variant="secondary" size="sm">
                      Reactivate
                    </Button>
                  }
                  title="Reactivate this academic level?"
                  description={`${level.name} will be available again.`}
                  confirmLabel="Reactivate"
                  onConfirm={() => reactivateAcademicLevelAction(level.academicLevelId)}
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
