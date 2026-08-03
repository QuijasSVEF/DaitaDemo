import { useState, useEffect, useCallback } from 'react';
import { automatedWorkflow, LessonPlanGenerationStatus, GenerationStatusEvent } from '../services/assessment/automatedWorkflow';

interface GeneratingStudent {
  studentId: number;
  status: LessonPlanGenerationStatus;
}

export function useLessonPlanStatus(teacherUsername: string) {
  const [generatingStudents, setGeneratingStudents] = useState<Map<number, LessonPlanGenerationStatus>>(new Map());

  useEffect(() => {
    const unsubscribe = automatedWorkflow.onStatusChange((event: GenerationStatusEvent) => {
      if (event.teacherUsername !== teacherUsername) return;

      setGeneratingStudents(prev => {
        const next = new Map(prev);
        if (event.status === 'idle') {
          next.delete(event.studentId);
        } else {
          next.set(event.studentId, event.status);
        }
        return next;
      });
    });

    return unsubscribe;
  }, [teacherUsername]);

  const getStudentStatus = useCallback((studentId: number): LessonPlanGenerationStatus => {
    return generatingStudents.get(studentId) || 'idle';
  }, [generatingStudents]);

  const isAnyGenerating = Array.from(generatingStudents.values()).some(s => s === 'generating');

  const generatingList: GeneratingStudent[] = Array.from(generatingStudents.entries()).map(
    ([studentId, status]) => ({ studentId, status })
  );

  return {
    getStudentStatus,
    isAnyGenerating,
    generatingList,
    generatingStudents
  };
}
